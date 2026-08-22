// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MeritPool v2 — arisan/ROSCA berbasis Merit Queue & discount auction.
 *
 * Alur pool:
 *   OPEN    : anggota join (bayar kontribusi cycle 1) sampai penuh
 *   ACTIVE  : cycle 1..totalCycles berjalan; tiap cycle punya deadline;
 *             Tier 0-3 pemenang = designation bertanda tangan backend (Merit Queue);
 *             Tier 4-5 pemenang = bid terendah yang valid (max diskon 15%);
 *             surplus lelang dibagi 60% anggota / 25% reserve / 15% treasury
 *   COMPLETED : semua cycle selesai — tiap anggota mendapat tepat satu payout opportunity
 *
 * Join = komitmen penuh: anggota yang menang lebih awal tetap wajib berkontribusi
 * sampai cycle terakhir; kegagalan tercatat sebagai missed (penalti merit di off-chain).
 */
contract MeritPool is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    IERC20 public mcToken;
    address public backendSigner;
    address public reserveAddress;
    address public treasuryAddress;

    // Batas keras spesifikasi: diskon auction maksimum 15% (1500 bps)
    uint256 public constant MAX_DISCOUNT_BPS_CAP = 1500;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // Split surplus default 60/25/15 (configurable admin, harus <= 10000 total)
    uint256 public surplusMemberBps = 6000;
    uint256 public surplusReserveBps = 2500;

    struct PoolConfig {
        uint256 poolId;
        string name;
        uint256 tierRequired;
        uint256 contributionAmount;
        uint256 maxMembers;
        uint256 totalCycles;
        uint256 cycleDuration;
        bool isAuctionMode;
        uint256 maxDiscountBps;
    }

    enum PoolStatus { OPEN, ACTIVE, COMPLETED }

    struct PoolState {
        PoolStatus status;
        uint256 round;
        uint256 currentCycle;
        uint256 cycleDeadline;
        uint256 collectedThisCycle;
        address[] members;
    }

    mapping(uint256 => PoolConfig) public pools;
    mapping(uint256 => PoolState) private _states;

    // [poolId][cycle][member] — cycle 1 terisi saat join
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasContributed;
    // [poolId][member] — garansi satu payout opportunity per anggota per round
    mapping(uint256 => mapping(address => bool)) public hasWon;
    // [poolId][member] — jumlah cycle yang didefault
    mapping(uint256 => mapping(address => uint256)) public missedCycles;
    // [poolId][cycle][member] — bid auction (0 = belum bid)
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public bids;
    // [poolId][cycle] — daftar bidder (urutan = waktu bid; tie-break pakai urutan ini)
    mapping(uint256 => mapping(uint256 => address[])) private _bidders;
    // [poolId][cycle] — pemenang hasil Merit Queue (Tier 0-3, fallback auction)
    mapping(uint256 => mapping(uint256 => address)) public designatedWinner;
    // [poolId][round][cycle] — riwayat pemenang (awet lintas round)
    mapping(uint256 => mapping(uint256 => mapping(uint256 => address))) public cycleWinner;
    // Kompatibilitas frontend: pemenang cycle terakhir
    mapping(uint256 => address) public lastWinner;

    event PoolJoined(uint256 indexed poolId, uint256 indexed round, uint256 indexed cycle, address user);
    event PoolActivated(uint256 indexed poolId, uint256 indexed round, uint256 cycleDeadline);
    event ContributionPaid(uint256 indexed poolId, uint256 indexed round, uint256 indexed cycle, address user, uint256 amount);
    event WinnerDesignated(uint256 indexed poolId, uint256 indexed round, uint256 indexed cycle, address winner);
    event BidPlaced(uint256 indexed poolId, uint256 indexed round, uint256 indexed cycle, address bidder, uint256 amount);
    event CycleSettled(uint256 indexed poolId, uint256 indexed round, uint256 indexed cycle, address winner, uint256 payout, uint256 surplus);
    event SurplusDistributed(uint256 indexed poolId, uint256 indexed round, uint256 indexed cycle, uint256 toMembers, uint256 toReserve, uint256 toTreasury);
    event DefaultRecorded(uint256 indexed poolId, uint256 indexed round, uint256 indexed cycle, address member);
    event PoolCompleted(uint256 indexed poolId, uint256 indexed round);
    event PoolReopened(uint256 indexed poolId, uint256 indexed round);

    constructor(
        address _mcToken,
        address _backendSigner,
        address _reserve,
        address _treasury
    ) Ownable(msg.sender) {
        require(_mcToken != address(0) && _backendSigner != address(0), "Alamat token/signer wajib");
        require(_reserve != address(0) && _treasury != address(0), "Alamat reserve/treasury wajib");
        mcToken = IERC20(_mcToken);
        backendSigner = _backendSigner;
        reserveAddress = _reserve;
        treasuryAddress = _treasury;

        // 6 pool sesuai spesifikasi §5/§77 (durasi cycle = pacing testnet, bukan produksi)
        pools[0] = PoolConfig(0, "Basic Pool", 0, 50 ether, 3, 3, 10 minutes, false, MAX_DISCOUNT_BPS_CAP);
        pools[1] = PoolConfig(1, "Standard Pool", 1, 100 ether, 5, 5, 15 minutes, false, MAX_DISCOUNT_BPS_CAP);
        pools[2] = PoolConfig(2, "Growth Pool", 2, 200 ether, 5, 5, 15 minutes, false, MAX_DISCOUNT_BPS_CAP);
        pools[3] = PoolConfig(3, "Trusted Pool", 3, 100 ether, 10, 10, 20 minutes, false, MAX_DISCOUNT_BPS_CAP);
        pools[4] = PoolConfig(4, "Elite Pool", 4, 100 ether, 5, 5, 15 minutes, true, MAX_DISCOUNT_BPS_CAP);
        pools[5] = PoolConfig(5, "Prime Pool", 5, 500 ether, 5, 5, 30 minutes, true, MAX_DISCOUNT_BPS_CAP);
    }

    // ------------------------------------------------------------------
    // MODIFIERS
    // ------------------------------------------------------------------

    modifier validPool(uint256 poolId) {
        require(pools[poolId].contributionAmount > 0, "Pool tidak ditemukan");
        _;
    }

    // ------------------------------------------------------------------
    // ANGGOTA: JOIN / KONTRIBUSI
    // ------------------------------------------------------------------

    /**
     * @notice Join pool saat OPEN. Pembayaran kontribusi cycle 1 dibayar di sini.
     * @param poolId ID pool (0-5)
     * @param userTier Tier user saat ini (dari backend, mencegah manipulasi)
     * @param signature Tanda tangan backend atas (msg.sender, userTier)
     */
    function joinPool(uint256 poolId, uint256 userTier, bytes calldata signature)
        external
        whenNotPaused
        nonReentrant
        validPool(poolId)
    {
        PoolConfig memory pool = pools[poolId];
        PoolState storage state = _states[poolId];
        require(state.status == PoolStatus.OPEN, "Pool tidak sedang membuka pendaftaran");
        require(state.members.length < pool.maxMembers, "Pool sudah penuh");
        require(userTier >= pool.tierRequired, "Tier Anda tidak mencukupi untuk pool ini");
        require(!hasContributed[poolId][1][msg.sender], "Anda sudah bergabung di pool ini");

        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, userTier));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        require(ethSignedMessageHash.recover(signature) == backendSigner, "Signature tidak valid / dimanipulasi");

        mcToken.safeTransferFrom(msg.sender, address(this), pool.contributionAmount);

        state.members.push(msg.sender);
        state.collectedThisCycle += pool.contributionAmount;
        hasContributed[poolId][1][msg.sender] = true;

        emit PoolJoined(poolId, state.round, 1, msg.sender);

        if (state.members.length == pool.maxMembers) {
            state.status = PoolStatus.ACTIVE;
            state.currentCycle = 1;
            state.cycleDeadline = block.timestamp + pool.cycleDuration;
            emit PoolActivated(poolId, state.round, state.cycleDeadline);
        }
    }

    /**
     * @notice Bayar kontribusi cycle berjalan (cycle >= 2) sebelum deadline.
     */
    function contribute(uint256 poolId)
        external
        whenNotPaused
        nonReentrant
        validPool(poolId)
    {
        PoolConfig memory pool = pools[poolId];
        PoolState storage state = _states[poolId];
        require(state.status == PoolStatus.ACTIVE, "Pool tidak aktif");
        require(state.currentCycle >= 2, "Kontribusi cycle 1 dibayar saat join");
        require(block.timestamp <= state.cycleDeadline, "Deadline cycle sudah lewat");
        require(_isMember(state, msg.sender), "Bukan anggota pool ini");
        require(!hasContributed[poolId][state.currentCycle][msg.sender], "Sudah berkontribusi cycle ini");

        mcToken.safeTransferFrom(msg.sender, address(this), pool.contributionAmount);

        state.collectedThisCycle += pool.contributionAmount;
        hasContributed[poolId][state.currentCycle][msg.sender] = true;

        emit ContributionPaid(poolId, state.round, state.currentCycle, msg.sender, pool.contributionAmount);
    }

    // ------------------------------------------------------------------
    // MERIT QUEUE (Tier 0-3, fallback auction): designation oleh backend
    // ------------------------------------------------------------------

    /**
     * @notice Backend menetapkan pemenang cycle berjalan sesuai urutan Merit Queue (§46).
     * Kontrak memaksa: anggota, belum pernah menang, sudah berkontribusi cycle ini.
     */
    function designateWinner(uint256 poolId, address winner, bytes calldata signature)
        external
        whenNotPaused
        validPool(poolId)
    {
        PoolState storage state = _states[poolId];
        require(state.status == PoolStatus.ACTIVE, "Pool tidak aktif");
        require(winner != address(0), "Pemenang tidak valid");
        require(_isMember(state, winner), "Pemenang bukan anggota pool");
        require(!hasWon[poolId][winner], "Pemenang sudah pernah mendapat payout");
        require(hasContributed[poolId][state.currentCycle][winner], "Pemenang belum berkontribusi cycle ini");

        bytes32 messageHash = keccak256(
            abi.encodePacked(poolId, state.round, state.currentCycle, winner)
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        require(ethSignedMessageHash.recover(signature) == backendSigner, "Signature designation tidak valid");

        designatedWinner[poolId][state.currentCycle] = winner;
        emit WinnerDesignated(poolId, state.round, state.currentCycle, winner);
    }

    // ------------------------------------------------------------------
    // AUCTION (Tier 4-5): reverse auction, bid terendah valid menang
    // ------------------------------------------------------------------

    /**
     * @notice Pasang/replace bid. Syarat: anggota aktif, sudah kontribusi cycle ini,
     * belum pernah menang, dan amount >= totalYield * (1 - maxDiscount).
     * Bid sendiri hanya bisa diganti dengan nilai LEBIH RENDAH (anti-manipulasi).
     */
    function placeBid(uint256 poolId, uint256 amount)
        external
        whenNotPaused
        validPool(poolId)
    {
        PoolConfig memory pool = pools[poolId];
        PoolState storage state = _states[poolId];
        require(pool.isAuctionMode, "Pool ini bukan mode auction");
        require(state.status == PoolStatus.ACTIVE, "Pool tidak aktif");
        require(_isMember(state, msg.sender), "Bukan anggota pool ini");
        require(!hasWon[poolId][msg.sender], "Anda sudah pernah mendapat payout");
        require(hasContributed[poolId][state.currentCycle][msg.sender], "Kontribusi cycle ini belum dibayar");
        require(amount >= _minValidBid(pool), "Bid di bawah batas diskon maksimum");
        require(amount <= pool.contributionAmount * pool.maxMembers, "Bid melebihi nominal pool");

        uint256 existing = bids[poolId][state.currentCycle][msg.sender];
        if (existing > 0) {
            require(amount < existing, "Bid baru harus lebih rendah dari bid sebelumnya");
        } else {
            _bidders[poolId][state.currentCycle].push(msg.sender);
        }

        bids[poolId][state.currentCycle][msg.sender] = amount;
        emit BidPlaced(poolId, state.round, state.currentCycle, msg.sender, amount);
    }

    function _minValidBid(PoolConfig memory pool) internal pure returns (uint256) {
        return (pool.contributionAmount * pool.maxMembers * (BPS_DENOMINATOR - pool.maxDiscountBps)) / BPS_DENOMINATOR;
    }

    // ------------------------------------------------------------------
    // SETTLEMENT (permissionless — bisa dipanggil keeper/siapa pun)
    // ------------------------------------------------------------------

    /**
     * @notice Tutup cycle berjalan: bayar pemenang, bagi surplus, catat default.
     * @param fallbackWinner Pemenang cadangan (dipakai auction tanpa bid / designation belum disimpan)
     * @param fallbackSignature Tanda tangan backend untuk fallbackWinner
     */
    function settleCycle(uint256 poolId, address fallbackWinner, bytes calldata fallbackSignature)
        external
        whenNotPaused
        nonReentrant
        validPool(poolId)
    {
        PoolConfig memory pool = pools[poolId];
        PoolState storage state = _states[poolId];
        require(state.status == PoolStatus.ACTIVE, "Pool tidak aktif");

        bool allIn = _allContributed(poolId, state);
        bool hasBids = _bidders[poolId][state.currentCycle].length > 0;
        bool deadlinePassed = block.timestamp >= state.cycleDeadline;
        require(
            deadlinePassed || (allIn && (!pool.isAuctionMode || hasBids)),
            "Cycle belum bisa ditutup (deadline / kelengkapan kontribusi)"
        );

        Settlement memory s = _computeSettlement(poolId, pool, state, fallbackWinner, fallbackSignature);

        // ---- EFFECTS (semua state dulu, tanpa interaksi) ----
        uint256 cycle = state.currentCycle;
        state.collectedThisCycle = 0;
        hasWon[poolId][s.winner] = true;
        cycleWinner[poolId][state.round][cycle] = s.winner;
        lastWinner[poolId] = s.winner;
        designatedWinner[poolId][cycle] = address(0);

        uint256 toReserve;
        uint256 toTreasury;

        if (s.surplus > 0) {
            uint256 memberShare = (s.surplus * surplusMemberBps) / BPS_DENOMINATOR;
            toReserve = (s.surplus * surplusReserveBps) / BPS_DENOMINATOR;
            toTreasury = s.surplus - memberShare - toReserve; // termasuk dust pembulatan

            (s.surplusBeneficiaries, s.perMemberSurplus) = _memberSurplusBeneficiaries(poolId, state, cycle, s.winner, memberShare);
            if (s.surplusBeneficiaries.length == 0) {
                toTreasury += memberShare; // tak ada penerima valid -> treasury
                memberShare = 0;
                s.perMemberSurplus = 0;
                delete s.surplusBeneficiaries;
            }
        }

        // Catat anggota yang gagal kontribusi cycle ini
        _recordDefaults(poolId, state, cycle);

        if (cycle == pool.totalCycles) {
            state.status = PoolStatus.COMPLETED;
        } else {
            state.currentCycle = cycle + 1;
            state.cycleDeadline = block.timestamp + pool.cycleDuration;
        }

        emit CycleSettled(poolId, state.round, cycle, s.winner, s.payout, s.surplus);

        // ---- INTERACTIONS ----
        if (s.payout > 0) mcToken.safeTransfer(s.winner, s.payout);
        for (uint256 i = 0; i < s.surplusBeneficiaries.length; i++) {
            mcToken.safeTransfer(s.surplusBeneficiaries[i], s.perMemberSurplus);
        }
        if (toReserve > 0) mcToken.safeTransfer(reserveAddress, toReserve);
        if (toTreasury > 0) mcToken.safeTransfer(treasuryAddress, toTreasury);

        if (s.surplus > 0) {
            emit SurplusDistributed(
                poolId,
                state.round,
                cycle,
                s.perMemberSurplus * s.surplusBeneficiaries.length,
                toReserve,
                toTreasury
            );
        }

        if (state.status == PoolStatus.COMPLETED) {
            emit PoolCompleted(poolId, state.round);
        }
    }

    struct Settlement {
        address winner;
        uint256 payout;
        uint256 surplus;
        address[] surplusBeneficiaries;
        uint256 perMemberSurplus;
    }

    function _computeSettlement(
        uint256 poolId,
        PoolConfig memory pool,
        PoolState storage state,
        address fallbackWinner,
        bytes calldata fallbackSignature
    ) internal returns (Settlement memory s) {
        uint256 cycle = state.currentCycle;
        uint256 collected = state.collectedThisCycle;

        if (pool.isAuctionMode && _bidders[poolId][cycle].length > 0) {
            // Bid terendah menang; tie dipecahkan urutan bid pertama
            address[] memory bidders = _bidders[poolId][cycle];
            uint256 lowest = type(uint256).max;
            address lowestBidder;
            for (uint256 i = 0; i < bidders.length; i++) {
                uint256 bidAmount = bids[poolId][cycle][bidders[i]];
                require(bidAmount > 0 && hasContributed[poolId][cycle][bidders[i]] && !hasWon[poolId][bidders[i]], "Bid tidak valid");
                if (bidAmount < lowest) {
                    lowest = bidAmount;
                    lowestBidder = bidders[i];
                }
            }
            s.winner = lowestBidder;
            s.payout = lowest <= collected ? lowest : collected;
        } else {
            address winner = designatedWinner[poolId][cycle];
            if (winner == address(0) && fallbackWinner != address(0)) {
                _applyFallbackDesignation(poolId, state, fallbackWinner, fallbackSignature);
                winner = fallbackWinner;
            }
            require(winner != address(0), "Pemenang belum ditetapkan (designation/fallback)");
            // Kasus ekstrem (semua anggota default, collected == 0): slot payout tetap hangus
            require(
                hasContributed[poolId][cycle][winner] || collected == 0,
                "Pemenang tidak kontribusi cycle ini"
            );
            s.winner = winner;
            uint256 nominal = pool.contributionAmount * pool.maxMembers;
            s.payout = collected <= nominal ? collected : nominal;
        }

        s.surplus = collected > s.payout ? collected - s.payout : 0;
    }

    /// @dev Hitung penerima surplus anggota (kontributor cycle yang bukan pemenang) + jatah per orang.
    function _memberSurplusBeneficiaries(
        uint256 poolId,
        PoolState storage state,
        uint256 cycle,
        address winner,
        uint256 memberShare
    ) internal view returns (address[] memory beneficiaries, uint256 perMember) {
        if (memberShare == 0) return (beneficiaries, 0);
        address[] memory members = state.members;
        uint256 count;
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] != winner && hasContributed[poolId][cycle][members[i]]) {
                count++;
            }
        }
        if (count == 0) return (beneficiaries, 0);
        perMember = memberShare / count;
        if (perMember == 0) return (beneficiaries, 0);
        beneficiaries = new address[](count);
        uint256 idx;
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] != winner && hasContributed[poolId][cycle][members[i]]) {
                beneficiaries[idx++] = members[i];
            }
        }
    }

    function _recordDefaults(uint256 poolId, PoolState storage state, uint256 cycle) internal returns (uint256) {
        address[] memory members = state.members;
        uint256 missed;
        for (uint256 i = 0; i < members.length; i++) {
            if (!hasContributed[poolId][cycle][members[i]]) {
                missedCycles[poolId][members[i]] += 1;
                missed++;
                emit DefaultRecorded(poolId, state.round, cycle, members[i]);
            }
        }
        return missed;
    }

    function _applyFallbackDesignation(
        uint256 poolId,
        PoolState storage state,
        address fallbackWinner,
        bytes calldata fallbackSignature
    ) internal {
        require(fallbackWinner != address(0), "Fallback tidak valid");
        require(_isMember(state, fallbackWinner), "Fallback bukan anggota pool");
        require(!hasWon[poolId][fallbackWinner], "Fallback sudah pernah mendapat payout");
        require(
            hasContributed[poolId][state.currentCycle][fallbackWinner] || state.collectedThisCycle == 0,
            "Fallback tidak kontribusi cycle ini"
        );
        bytes32 messageHash = keccak256(
            abi.encodePacked(poolId, state.round, state.currentCycle, fallbackWinner)
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        require(ethSignedMessageHash.recover(fallbackSignature) == backendSigner, "Signature fallback tidak valid");
        designatedWinner[poolId][state.currentCycle] = fallbackWinner;
        emit WinnerDesignated(poolId, state.round, state.currentCycle, fallbackWinner);
    }

    // ------------------------------------------------------------------
    // ADMIN
    // ------------------------------------------------------------------

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function setBackendSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Signer tidak valid");
        backendSigner = newSigner;
    }

    function setReserveAddress(address newReserve) external onlyOwner {
        require(newReserve != address(0), "Reserve tidak valid");
        reserveAddress = newReserve;
    }

    function setTreasuryAddress(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Treasury tidak valid");
        treasuryAddress = newTreasury;
    }

    /// @notice Atur split surplus. Treasury menerima sisa. Contoh testnet: (6000, 2500) -> treasury 1500.
    function setSurplusSplit(uint256 memberBps, uint256 reserveBps) external onlyOwner {
        require(memberBps + reserveBps <= BPS_DENOMINATOR, "Total split melebihi 100%");
        surplusMemberBps = memberBps;
        surplusReserveBps = reserveBps;
    }

    /// @notice Testnet-only: buka ulang pool yang COMPLETED untuk kohort baru (round naik).
    function reopenPool(uint256 poolId) external onlyOwner validPool(poolId) {
        PoolConfig memory pool = pools[poolId];
        PoolState storage state = _states[poolId];
        require(state.status == PoolStatus.COMPLETED, "Hanya pool COMPLETED yang bisa dibuka ulang");

        address[] memory members = state.members;
        for (uint256 i = 0; i < members.length; i++) {
            delete hasWon[poolId][members[i]];
            delete missedCycles[poolId][members[i]];
            for (uint256 c = 1; c <= pool.totalCycles; c++) {
                delete hasContributed[poolId][c][members[i]];
                delete bids[poolId][c][members[i]];
            }
        }
        for (uint256 c = 1; c <= pool.totalCycles; c++) {
            delete _bidders[poolId][c];
            delete designatedWinner[poolId][c];
        }

        state.status = PoolStatus.OPEN;
        state.round += 1;
        state.currentCycle = 0;
        state.cycleDeadline = 0;
        state.collectedThisCycle = 0;
        state.members = new address[](0);

        emit PoolReopened(poolId, state.round);
    }

    // ------------------------------------------------------------------
    // VIEWS
    // ------------------------------------------------------------------

    function getPoolState(uint256 poolId)
        external
        view
        validPool(poolId)
        returns (uint8 status, uint256 round, uint256 activeCycle, uint256 deadline, uint256 collectedThisCycle, uint256 memberCount)
    {
        PoolState storage state = _states[poolId];
        return (
            uint8(state.status),
            state.round,
            state.currentCycle,
            state.cycleDeadline,
            state.collectedThisCycle,
            state.members.length
        );
    }

    function getPoolMembers(uint256 poolId) external view validPool(poolId) returns (address[] memory) {
        return _states[poolId].members;
    }

    function getCurrentMembersCount(uint256 poolId) external view validPool(poolId) returns (uint256) {
        return _states[poolId].members.length;
    }

    function currentCycle(uint256 poolId) external view validPool(poolId) returns (uint256) {
        return _states[poolId].currentCycle;
    }

    function minValidBid(uint256 poolId) external view validPool(poolId) returns (uint256) {
        return _minValidBid(pools[poolId]);
    }

    function getBidCount(uint256 poolId) external view validPool(poolId) returns (uint256) {
        PoolState storage state = _states[poolId];
        return _bidders[poolId][state.currentCycle].length;
    }

    function getLowestBid(uint256 poolId) external view validPool(poolId) returns (address bidder, uint256 amount) {
        PoolState storage state = _states[poolId];
        address[] memory bidders = _bidders[poolId][state.currentCycle];
        uint256 lowest = type(uint256).max;
        for (uint256 i = 0; i < bidders.length; i++) {
            uint256 bidAmount = bids[poolId][state.currentCycle][bidders[i]];
            if (bidAmount > 0 && bidAmount < lowest) {
                lowest = bidAmount;
                bidder = bidders[i];
            }
        }
        amount = lowest == type(uint256).max ? 0 : lowest;
    }

    function isSettleable(uint256 poolId) external view validPool(poolId) returns (bool) {
        PoolConfig memory pool = pools[poolId];
        PoolState storage state = _states[poolId];
        if (state.status != PoolStatus.ACTIVE) return false;
        bool allIn = _allContributed(poolId, state);
        bool hasBids = _bidders[poolId][state.currentCycle].length > 0;
        return block.timestamp >= state.cycleDeadline || (allIn && (!pool.isAuctionMode || hasBids));
    }

    // ------------------------------------------------------------------
    // INTERNAL
    // ------------------------------------------------------------------

    function _isMember(PoolState storage state, address account) internal view returns (bool) {
        uint256 len = state.members.length;
        for (uint256 i = 0; i < len; i++) {
            if (state.members[i] == account) return true;
        }
        return false;
    }

    function _allContributed(uint256 poolId, PoolState storage state) internal view returns (bool) {
        uint256 cycle = state.currentCycle;
        address[] memory members = state.members;
        for (uint256 i = 0; i < members.length; i++) {
            if (!hasContributed[poolId][cycle][members[i]]) return false;
        }
        return members.length > 0;
    }
}

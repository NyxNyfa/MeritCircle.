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
 * @title MeritPool
 * @notice Mesin Arisan Multi-Kelompok (Multi-Cohort) berbasis Merit Score & Reverse Auction.
 *
 * FITUR MULTI-KELOMPOK (COHORT):
 * - Setiap poolId (0..5) memiliki cohort bertingkat (1, 2, 3...).
 * - Ketika sebuah kelompok mencapai maxMembers, kelompok tersebut otomatis ACTIVE
 *   dan kelompok baru dibuka (0 anggota) sehingga pendaftar berikutnya masuk kelompok baru.
 * - Anggota yang sudah terikat melihat kelompoknya sendiri (status ACTIVE, 3/3, bayar iuran).
 * - Pengguna di luar kelompok melihat kelompok pembentukan baru (0/3, status OPEN, tombol Join).
 * - Ketika seluruh siklus dalam suatu kelompok selesai, anggota otomatis unlocked.
 */
contract MeritPool is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    IERC20 public mcToken;
    address public backendSigner;
    address public reserveAddress;
    address public treasuryAddress;

    uint256 public constant MAX_DISCOUNT_BPS_CAP = 1500;
    uint256 public constant BPS_DENOMINATOR = 10_000;

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

    // [poolId] => cohortId yang saat ini membuka pendaftaran (1, 2, 3...)
    mapping(uint256 => uint256) public currentCohort;
    // [poolId] => jumlah kelompok yang saat ini berstatus ACTIVE
    mapping(uint256 => uint256) public activeCohortCount;
    // [poolId][cohortId] => state kelompok
    mapping(uint256 => mapping(uint256 => PoolState)) internal _cohortStates;

    // [user][poolId] => cohortId tempat user terdaftar (0 jika belum terdaftar / sudah selesai)
    mapping(address => mapping(uint256 => uint256)) public userCohort;

    // [poolId][cohortId][cycle][member] => status bayar
    mapping(uint256 => mapping(uint256 => mapping(uint256 => mapping(address => bool)))) public hasContributed;
    // [poolId][cohortId][member] => apakah sudah pernah menang payout di cohort ini
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasWon;
    // [poolId][cohortId][member] => default counter
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public missedCycles;
    // [poolId][cohortId][cycle][member] => bid lelang
    mapping(uint256 => mapping(uint256 => mapping(uint256 => mapping(address => uint256)))) public bids;
    // [poolId][cohortId][cycle] => daftar bidder
    mapping(uint256 => mapping(uint256 => mapping(uint256 => address[]))) internal _bidders;
    // [poolId][cohortId][cycle] => pemenang hasil Merit Queue
    mapping(uint256 => mapping(uint256 => mapping(uint256 => address))) public designatedWinner;
    // [poolId][cohortId][cycle] => riwayat pemenang
    mapping(uint256 => mapping(uint256 => mapping(uint256 => address))) public cycleWinner;
    // Pemenang terakhir per pool
    mapping(uint256 => address) public lastWinner;

    event PoolJoined(uint256 indexed poolId, uint256 indexed cohortId, uint256 cycle, address user);
    event PoolActivated(uint256 indexed poolId, uint256 indexed cohortId, uint256 cycleDeadline);
    event ContributionPaid(uint256 indexed poolId, uint256 indexed cohortId, uint256 cycle, address user, uint256 amount);
    event WinnerDesignated(uint256 indexed poolId, uint256 indexed cohortId, uint256 cycle, address winner);
    event BidPlaced(uint256 indexed poolId, uint256 indexed cohortId, uint256 cycle, address bidder, uint256 amount);
    event CycleSettled(uint256 indexed poolId, uint256 indexed cohortId, uint256 cycle, address winner, uint256 payout, uint256 surplus);
    event SurplusDistributed(uint256 indexed poolId, uint256 indexed cohortId, uint256 cycle, uint256 toMembers, uint256 toReserve, uint256 toTreasury);
    event PoolCompleted(uint256 indexed poolId, uint256 indexed cohortId);

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

        // 6 pool sesuai spesifikasi (durasi 1 menit untuk testing cepat)
        pools[0] = PoolConfig(0, "Basic Pool", 0, 50 ether, 3, 3, 1 minutes, false, MAX_DISCOUNT_BPS_CAP);
        pools[1] = PoolConfig(1, "Standard Pool", 1, 100 ether, 5, 5, 1 minutes, false, MAX_DISCOUNT_BPS_CAP);
        pools[2] = PoolConfig(2, "Growth Pool", 2, 200 ether, 5, 5, 1 minutes, false, MAX_DISCOUNT_BPS_CAP);
        pools[3] = PoolConfig(3, "Trusted Pool", 3, 100 ether, 10, 10, 1 minutes, false, MAX_DISCOUNT_BPS_CAP);
        pools[4] = PoolConfig(4, "Elite Pool", 4, 100 ether, 5, 5, 1 minutes, true, MAX_DISCOUNT_BPS_CAP);
        pools[5] = PoolConfig(5, "Prime Pool", 5, 500 ether, 5, 5, 1 minutes, true, MAX_DISCOUNT_BPS_CAP);

        for (uint256 i = 0; i < 6; i++) {
            currentCohort[i] = 1;
        }
    }

    modifier validPool(uint256 poolId) {
        require(pools[poolId].contributionAmount > 0, "Pool tidak ditemukan");
        _;
    }

    // ------------------------------------------------------------------
    // JOIN & CONTRIBUTE
    // ------------------------------------------------------------------

    /**
     * @notice Bergabung ke pool. Pengguna otomatis masuk ke cohort pembentukan saat ini.
     */
    function joinPool(uint256 poolId, uint256 userTier, bytes calldata signature)
        external
        whenNotPaused
        nonReentrant
        validPool(poolId)
    {
        PoolConfig memory pool = pools[poolId];
        require(userTier >= pool.tierRequired, "Tier tidak mencukupi");
        require(userCohort[msg.sender][poolId] == 0, "Anda sudah terdaftar di kelompok pool ini");

        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, userTier));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        require(ethSignedMessageHash.recover(signature) == backendSigner, "Signature tidak valid");

        uint256 cohortId = currentCohort[poolId];
        if (cohortId == 0) {
            cohortId = 1;
            currentCohort[poolId] = 1;
        }

        PoolState storage state = _cohortStates[poolId][cohortId];
        require(state.status == PoolStatus.OPEN, "Kelompok tidak buka");
        require(state.members.length < pool.maxMembers, "Kelompok penuh");

        mcToken.safeTransferFrom(msg.sender, address(this), pool.contributionAmount);

        state.members.push(msg.sender);
        state.collectedThisCycle += pool.contributionAmount;
        hasContributed[poolId][cohortId][1][msg.sender] = true;
        userCohort[msg.sender][poolId] = cohortId;

        emit PoolJoined(poolId, cohortId, 1, msg.sender);

        // Jika anggota sudah genap, aktifkan kelompok ini dan buka kelompok berikutnya!
        if (state.members.length == pool.maxMembers) {
            state.status = PoolStatus.ACTIVE;
            state.currentCycle = 1;
            state.cycleDeadline = block.timestamp + pool.cycleDuration;
            activeCohortCount[poolId] += 1;

            // Buka kelompok baru (cohortId + 1)
            currentCohort[poolId] = cohortId + 1;
            _cohortStates[poolId][cohortId + 1].status = PoolStatus.OPEN;

            emit PoolActivated(poolId, cohortId, state.cycleDeadline);
        }
    }

    /**
     * @notice Bayar iuran siklus berjalan (siklus >= 2).
     */
    function contribute(uint256 poolId)
        external
        whenNotPaused
        nonReentrant
        validPool(poolId)
    {
        uint256 cohortId = userCohort[msg.sender][poolId];
        require(cohortId > 0, "Bukan anggota kelompok di pool ini");

        PoolConfig memory pool = pools[poolId];
        PoolState storage state = _cohortStates[poolId][cohortId];
        require(state.status == PoolStatus.ACTIVE, "Kelompok tidak aktif");
        require(state.currentCycle >= 2, "Iuran siklus 1 dibayar saat join");
        require(!hasContributed[poolId][cohortId][state.currentCycle][msg.sender], "Sudah bayar iuran siklus ini");

        mcToken.safeTransferFrom(msg.sender, address(this), pool.contributionAmount);

        state.collectedThisCycle += pool.contributionAmount;
        hasContributed[poolId][cohortId][state.currentCycle][msg.sender] = true;

        emit ContributionPaid(poolId, cohortId, state.currentCycle, msg.sender, pool.contributionAmount);
    }

    // ------------------------------------------------------------------
    // AUCTION (Tier 4-5)
    // ------------------------------------------------------------------

    function placeBid(uint256 poolId, uint256 amount)
        external
        whenNotPaused
        validPool(poolId)
    {
        uint256 cohortId = userCohort[msg.sender][poolId];
        require(cohortId > 0, "Bukan anggota kelompok di pool ini");

        PoolConfig memory pool = pools[poolId];
        PoolState storage state = _cohortStates[poolId][cohortId];
        require(pool.isAuctionMode, "Bukan mode auction");
        require(state.status == PoolStatus.ACTIVE, "Kelompok tidak aktif");
        require(!hasWon[poolId][cohortId][msg.sender], "Sudah pernah menang payout");
        require(hasContributed[poolId][cohortId][state.currentCycle][msg.sender], "Belum bayar iuran siklus ini");
        require(amount >= _minValidBid(pool), "Bid di bawah batas diskon");
        require(amount <= pool.contributionAmount * pool.maxMembers, "Bid melebihi nominal");

        uint256 existing = bids[poolId][cohortId][state.currentCycle][msg.sender];
        if (existing > 0) {
            require(amount < existing, "Bid baru harus lebih rendah");
        } else {
            _bidders[poolId][cohortId][state.currentCycle].push(msg.sender);
        }

        bids[poolId][cohortId][state.currentCycle][msg.sender] = amount;
        emit BidPlaced(poolId, cohortId, state.currentCycle, msg.sender, amount);
    }

    function _minValidBid(PoolConfig memory pool) internal pure returns (uint256) {
        return (pool.contributionAmount * pool.maxMembers * (BPS_DENOMINATOR - pool.maxDiscountBps)) / BPS_DENOMINATOR;
    }

    // ------------------------------------------------------------------
    // SETTLEMENT
    // ------------------------------------------------------------------

    function settleCycle(uint256 poolId, uint256 cohortId, address fallbackWinner, bytes calldata fallbackSignature)
        public
        whenNotPaused
        nonReentrant
        validPool(poolId)
    {
        PoolConfig memory pool = pools[poolId];
        PoolState storage state = _cohortStates[poolId][cohortId];
        require(state.status == PoolStatus.ACTIVE, "Kelompok tidak aktif");

        bool allIn = _allContributed(poolId, cohortId, state);
        bool hasBids = _bidders[poolId][cohortId][state.currentCycle].length > 0;
        bool deadlinePassed = block.timestamp >= state.cycleDeadline;
        require(deadlinePassed || (allIn && (!pool.isAuctionMode || hasBids)), "Belum bisa disettle");

        Settlement memory s = _computeSettlement(poolId, cohortId, pool, state, fallbackWinner, fallbackSignature);

        uint256 cycle = state.currentCycle;
        state.collectedThisCycle = 0;
        hasWon[poolId][cohortId][s.winner] = true;
        cycleWinner[poolId][cohortId][cycle] = s.winner;
        lastWinner[poolId] = s.winner;

        uint256 toReserve;
        uint256 toTreasury;
        if (s.surplus > 0) {
            uint256 memberShare = (s.surplus * surplusMemberBps) / BPS_DENOMINATOR;
            toReserve = (s.surplus * surplusReserveBps) / BPS_DENOMINATOR;
            toTreasury = s.surplus - memberShare - toReserve;

            (s.surplusBeneficiaries, s.perMemberSurplus) = _memberSurplusBeneficiaries(poolId, cohortId, state, cycle, s.winner, memberShare);
            if (s.surplusBeneficiaries.length == 0) {
                toTreasury += memberShare;
                s.perMemberSurplus = 0;
                delete s.surplusBeneficiaries;
            }
        }

        if (cycle == pool.totalCycles) {
            state.status = PoolStatus.COMPLETED;
            if (activeCohortCount[poolId] > 0) {
                activeCohortCount[poolId] -= 1;
            }
            // Buka kunci seluruh anggota kelompok ini agar bisa daftar lagi
            for (uint256 i = 0; i < state.members.length; i++) {
                userCohort[state.members[i]][poolId] = 0;
            }
            emit PoolCompleted(poolId, cohortId);
        } else {
            state.currentCycle = cycle + 1;
            state.cycleDeadline = block.timestamp + pool.cycleDuration;
        }

        emit CycleSettled(poolId, cohortId, cycle, s.winner, s.payout, s.surplus);

        // Transfer payout langsung ke pemenang
        if (s.payout > 0) {
            mcToken.safeTransfer(s.winner, s.payout);
        }
        for (uint256 i = 0; i < s.surplusBeneficiaries.length; i++) {
            mcToken.safeTransfer(s.surplusBeneficiaries[i], s.perMemberSurplus);
        }
        if (toReserve > 0) mcToken.safeTransfer(reserveAddress, toReserve);
        if (toTreasury > 0) mcToken.safeTransfer(treasuryAddress, toTreasury);
    }

    // Overload kompatibilitas lama: settle kelompok aktif pertama
    function settleCycle(uint256 poolId, address fallbackWinner, bytes calldata fallbackSignature) external {
        uint256 c = currentCohort[poolId];
        if (c > 1 && _cohortStates[poolId][c - 1].status == PoolStatus.ACTIVE) {
            settleCycle(poolId, c - 1, fallbackWinner, fallbackSignature);
        } else {
            settleCycle(poolId, c, fallbackWinner, fallbackSignature);
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
        uint256 cohortId,
        PoolConfig memory pool,
        PoolState storage state,
        address fallbackWinner,
        bytes calldata fallbackSignature
    ) internal returns (Settlement memory s) {
        uint256 cycle = state.currentCycle;
        uint256 collected = state.collectedThisCycle;

        if (pool.isAuctionMode && _bidders[poolId][cohortId][cycle].length > 0) {
            address[] memory bidders = _bidders[poolId][cohortId][cycle];
            uint256 lowest = type(uint256).max;
            address lowestBidder;
            for (uint256 i = 0; i < bidders.length; i++) {
                uint256 bidAmount = bids[poolId][cohortId][cycle][bidders[i]];
                if (bidAmount > 0 && hasContributed[poolId][cohortId][cycle][bidders[i]] && !hasWon[poolId][cohortId][bidders[i]]) {
                    if (bidAmount < lowest) {
                        lowest = bidAmount;
                        lowestBidder = bidders[i];
                    }
                }
            }
            s.winner = lowestBidder;
            s.payout = lowest <= collected ? lowest : collected;
        } else {
            address winner = designatedWinner[poolId][cohortId][cycle];
            if (winner == address(0) && fallbackWinner != address(0)) {
                bytes32 messageHash = keccak256(abi.encodePacked(poolId, cohortId, cycle, fallbackWinner));
                bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
                require(ethSignedMessageHash.recover(fallbackSignature) == backendSigner, "Signature designation salah");
                winner = fallbackWinner;
            }
            require(winner != address(0), "Pemenang belum ditetapkan");
            s.winner = winner;
            uint256 nominal = pool.contributionAmount * pool.maxMembers;
            s.payout = collected <= nominal ? collected : nominal;
        }
        s.surplus = collected > s.payout ? collected - s.payout : 0;
    }

    function _memberSurplusBeneficiaries(
        uint256 poolId,
        uint256 cohortId,
        PoolState storage state,
        uint256 cycle,
        address winner,
        uint256 memberShare
    ) internal view returns (address[] memory beneficiaries, uint256 perMember) {
        if (memberShare == 0) return (beneficiaries, 0);
        address[] memory members = state.members;
        uint256 count;
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] != winner && hasContributed[poolId][cohortId][cycle][members[i]]) {
                count++;
            }
        }
        if (count == 0) return (beneficiaries, 0);
        beneficiaries = new address[](count);
        uint256 idx;
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] != winner && hasContributed[poolId][cohortId][cycle][members[i]]) {
                beneficiaries[idx++] = members[i];
            }
        }
        perMember = memberShare / count;
    }

    function designateWinner(uint256 poolId, uint256 cohortId, address winner, bytes calldata signature) external {
        PoolState storage state = _cohortStates[poolId][cohortId];
        require(state.status == PoolStatus.ACTIVE, "Kelompok tidak aktif");
        require(winner != address(0) && _isMember(state, winner), "Pemenang tidak valid");
        require(!hasWon[poolId][cohortId][winner], "Pemenang sudah pernah menang");
        require(hasContributed[poolId][cohortId][state.currentCycle][winner], "Belum bayar");

        bytes32 messageHash = keccak256(abi.encodePacked(poolId, cohortId, state.currentCycle, winner));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        require(ethSignedMessageHash.recover(signature) == backendSigner, "Signature tidak valid");

        designatedWinner[poolId][cohortId][state.currentCycle] = winner;
        emit WinnerDesignated(poolId, cohortId, state.currentCycle, winner);
    }

    // ------------------------------------------------------------------
    // VIEWS & GETTERS
    // ------------------------------------------------------------------

    /**
     * @notice Mengembalikan status pool personal untuk user:
     * - Jika user terdaftar di cohort aktif, kembalikan status cohort milik user.
     * - Jika user belum terdaftar, kembalikan status cohort pembentukan terbuka saat ini.
     */
    function getPoolState(uint256 poolId, address user)
        public
        view
        validPool(poolId)
        returns (
            uint8 status,
            uint256 round,
            uint256 activeCycle,
            uint256 deadline,
            uint256 collectedThisCycle,
            uint256 memberCount,
            uint256 cohortId,
            uint256 activeGroups
        )
    {
        activeGroups = activeCohortCount[poolId];
        uint256 userC = user != address(0) ? userCohort[user][poolId] : 0;

        if (userC > 0) {
            cohortId = userC;
        } else {
            cohortId = currentCohort[poolId];
            if (cohortId == 0) cohortId = 1;
        }

        PoolState storage state = _cohortStates[poolId][cohortId];
        return (
            uint8(state.status),
            state.round,
            state.currentCycle,
            state.cycleDeadline,
            state.collectedThisCycle,
            state.members.length,
            cohortId,
            activeGroups
        );
    }

    function getPoolState(uint256 poolId)
        external
        view
        validPool(poolId)
        returns (uint8 status, uint256 round, uint256 activeCycle, uint256 deadline, uint256 collectedThisCycle, uint256 memberCount)
    {
        (status, round, activeCycle, deadline, collectedThisCycle, memberCount, , ) = getPoolState(poolId, msg.sender);
    }

    function getCohortState(uint256 poolId, uint256 cohortId)
        external
        view
        validPool(poolId)
        returns (uint8 status, uint256 round, uint256 activeCycle, uint256 deadline, uint256 collectedThisCycle, uint256 memberCount)
    {
        PoolState storage state = _cohortStates[poolId][cohortId];
        return (
            uint8(state.status),
            state.round,
            state.currentCycle,
            state.cycleDeadline,
            state.collectedThisCycle,
            state.members.length
        );
    }

    function getCohortMembers(uint256 poolId, uint256 cohortId) external view returns (address[] memory) {
        return _cohortStates[poolId][cohortId].members;
    }

    function currentCycle(uint256 poolId, uint256 cohortId) external view returns (uint256) {
        return _cohortStates[poolId][cohortId].currentCycle;
    }

    function currentCycle(uint256 poolId) external view returns (uint256) {
        uint256 c = currentCohort[poolId];
        for (uint256 i = 1; i <= c; i++) {
            if (_cohortStates[poolId][i].status == PoolStatus.ACTIVE) {
                return _cohortStates[poolId][i].currentCycle;
            }
        }
        return _cohortStates[poolId][c].currentCycle;
    }

    function minValidBid(uint256 poolId) external view returns (uint256) {
        return _minValidBid(pools[poolId]);
    }

    function getBidCount(uint256 poolId, uint256 cohortId) external view returns (uint256) {
        PoolState storage state = _cohortStates[poolId][cohortId];
        return _bidders[poolId][cohortId][state.currentCycle].length;
    }

    function getLowestBid(uint256 poolId, uint256 cohortId) external view returns (address bidder, uint256 amount) {
        PoolState storage state = _cohortStates[poolId][cohortId];
        address[] memory bidders = _bidders[poolId][cohortId][state.currentCycle];
        uint256 lowest = type(uint256).max;
        for (uint256 i = 0; i < bidders.length; i++) {
            uint256 bidAmount = bids[poolId][cohortId][state.currentCycle][bidders[i]];
            if (bidAmount > 0 && bidAmount < lowest) {
                lowest = bidAmount;
                bidder = bidders[i];
            }
        }
        amount = lowest == type(uint256).max ? 0 : lowest;
    }

    function isSettleable(uint256 poolId, uint256 cohortId) public view returns (bool) {
        PoolConfig memory pool = pools[poolId];
        PoolState storage state = _cohortStates[poolId][cohortId];
        if (state.status != PoolStatus.ACTIVE) return false;
        bool allIn = _allContributed(poolId, cohortId, state);
        bool hasBids = _bidders[poolId][cohortId][state.currentCycle].length > 0;
        return block.timestamp >= state.cycleDeadline || (allIn && (!pool.isAuctionMode || hasBids));
    }

    function isSettleable(uint256 poolId) external view returns (bool) {
        uint256 c = currentCohort[poolId];
        for (uint256 i = 1; i <= c; i++) {
            if (isSettleable(poolId, i)) return true;
        }
        return false;
    }

    function _isMember(PoolState storage state, address account) internal view returns (bool) {
        for (uint256 i = 0; i < state.members.length; i++) {
            if (state.members[i] == account) return true;
        }
        return false;
    }

    function _allContributed(uint256 poolId, uint256 cohortId, PoolState storage state) internal view returns (bool) {
        uint256 cycle = state.currentCycle;
        for (uint256 i = 0; i < state.members.length; i++) {
            if (!hasContributed[poolId][cohortId][cycle][state.members[i]]) return false;
        }
        return state.members.length > 0;
    }
}

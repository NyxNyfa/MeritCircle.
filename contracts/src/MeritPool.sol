// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract MeritPool {
    using ECDSA for bytes32;

    IERC20 public mcToken;
    address public backendSigner; // Alamat dompet backend untuk validasi Tier

    struct PoolConfig {
        uint256 poolId;
        string name;
        uint256 tierRequired;
        uint256 contributionAmount;
        uint256 maxMembers;
        uint256 totalYield;
        bool isAuctionMode;
    }

    // Pemetaan konfigurasi 6 Pool kita
    mapping(uint256 => PoolConfig) public pools;
    
    // Melacak putaran (cycle) ke-berapa untuk setiap pool
    mapping(uint256 => uint256) public currentCycle;
    
    // Menyimpan daftar alamat anggota yang sudah ikut di cycle saat ini
    mapping(uint256 => mapping(uint256 => address[])) public cycleMembers;
    
    // Mencegah 1 orang ikut 2 kali di cycle yang sama
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasJoined;

    // Melacak ALAMAT pemenang siklus sebelumnya (Frontend akan mengubahnya jadi Username)
    mapping(uint256 => address) public lastWinner;

    // Events untuk dibaca oleh Frontend / The Graph
    event PoolJoined(uint256 indexed poolId, uint256 indexed cycleId, address indexed user);
    event CycleCompleted(uint256 indexed poolId, uint256 indexed cycleId, address winner, uint256 prizeAmount);

    constructor(address _mcToken, address _backendSigner) {
        mcToken = IERC20(_mcToken);
        backendSigner = _backendSigner;

        // Inisialisasi 6 Pool Sesuai Blueprint
        // Rumus Amount: n * 10**18 (Karena desimal token standar adalah 18)
        
        // Tier 0: Basic Pool (50 MC, 3 Orang)
        pools[0] = PoolConfig(0, "Basic Pool", 0, 50 ether, 3, 150 ether, false);
        
        // Tier 1: Standard Pool (100 MC, 5 Orang)
        pools[1] = PoolConfig(1, "Standard Pool", 1, 100 ether, 5, 500 ether, false);
        
        // Tier 2: Growth Pool (200 MC, 5 Orang)
        pools[2] = PoolConfig(2, "Growth Pool", 2, 200 ether, 5, 1000 ether, false);
        
        // Tier 3: Trusted Pool (100 MC, 10 Orang)
        pools[3] = PoolConfig(3, "Trusted Pool", 3, 100 ether, 10, 1000 ether, false);
        
        // Tier 4: Elite Pool (100 MC, 5 Orang, Auction)
        pools[4] = PoolConfig(4, "Elite Pool", 4, 100 ether, 5, 500 ether, true);
        
        // Tier 5: Prime Pool (500 MC, 5 Orang, Auction)
        pools[5] = PoolConfig(5, "Prime Pool", 5, 500 ether, 5, 2500 ether, true);
    }

    /**
     * @dev Fungsi utama untuk join arisan.
     * @param poolId ID Pool (0 sampai 5)
     * @param userTier Tier user saat ini (didapat dari database lewat backend)
     * @param signature Tanda tangan digital dari backend untuk mencegah manipulasi tier
     */
    function joinPool(uint256 poolId, uint256 userTier, bytes calldata signature) external {
        PoolConfig memory pool = pools[poolId];
        require(pool.contributionAmount > 0, "Pool tidak ditemukan");
        require(userTier >= pool.tierRequired, "Tier Anda tidak mencukupi untuk pool ini");

        // 1. Verifikasi Signature Backend (Keamanan tingkat tinggi)
        // Backend akan menandatangani pesan berisi (Address User + Tier User)
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, userTier));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        require(ethSignedMessageHash.recover(signature) == backendSigner, "Signature tidak valid / dimanipulasi");

        uint256 cycleId = currentCycle[poolId];

        // 2. Validasi Member
        require(!hasJoined[poolId][cycleId][msg.sender], "Anda sudah bergabung di siklus ini");
        require(cycleMembers[poolId][cycleId].length < pool.maxMembers, "Pool siklus ini sudah penuh");

        // 3. Tarik Iuran MC Token dari User ke Kontrak (User wajib melakukan 'approve' MC Token dulu)
        require(mcToken.transferFrom(msg.sender, address(this), pool.contributionAmount), "Gagal menarik MC Token. Pastikan saldo & allowance cukup");

        // 4. Masukkan ke dalam daftar anggota
        cycleMembers[poolId][cycleId].push(msg.sender);
        hasJoined[poolId][cycleId][msg.sender] = true;

        emit PoolJoined(poolId, cycleId, msg.sender);

        // 5. Jika kapasitas penuh, langsung selesaikan siklus (Kocok Pemenang)
        if (cycleMembers[poolId][cycleId].length == pool.maxMembers) {
            _executeCycleCompletion(poolId, cycleId, pool);
        }
    }

    /**
     * @dev Fungsi internal untuk menyelesaikan putaran Arisan
     */
    function _executeCycleCompletion(uint256 poolId, uint256 cycleId, PoolConfig memory pool) internal {
        address[] memory members = cycleMembers[poolId][cycleId];
        address winner;

        if (pool.isAuctionMode) {
            // [MVP PLACEHOLDER]: Logika sistem lelang eksklusif (Bidding Phase).
            // Sementara untuk MVP, kita samakan dengan random agar sistem bisa berjalan dulu tanpa error.
            // Di fase pengembangan selanjutnya, kita akan mengganti bagian ini dengan Smart Contract Lelang.
            uint256 randomIndex = _pseudoRandom() % members.length;
            winner = members[randomIndex];
        } else {
            // Logika Standard Pool: Pilih 1 pemenang acak menggunakan Pseudo-Random
            uint256 randomIndex = _pseudoRandom() % members.length;
            winner = members[randomIndex];
        }

        // Simpan alamat pemenang agar bisa dibaca Frontend (untuk diubah jadi Username)
        lastWinner[poolId] = winner;

        // Kirim Total Hadiah (Total Yield) ke Pemenang
        require(mcToken.transfer(winner, pool.totalYield), "Gagal mengirim hadiah ke pemenang");

        emit CycleCompleted(poolId, cycleId, winner, pool.totalYield);

        // Reset siklus ke putaran selanjutnya
        currentCycle[poolId]++;
    }

    /**
     * @dev Generator angka acak sederhana. 
     * Catatan CTO: Di mainnet produksi, kita wajib menggunakan Chainlink VRF agar tidak bisa diretas validator.
     */
    function _pseudoRandom() private view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender)));
    }

    // --- Fungsi Helper untuk Frontend UI ---

    function getPoolMembers(uint256 poolId) external view returns (address[] memory) {
        uint256 cycleId = currentCycle[poolId];
        return cycleMembers[poolId][cycleId];
    }
    
    function getCurrentMembersCount(uint256 poolId) external view returns (uint256) {
        uint256 cycleId = currentCycle[poolId];
        return cycleMembers[poolId][cycleId].length;
    }
}
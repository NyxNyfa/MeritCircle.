# Changelog

Semua perubahan penting pada proyek Merit Circle akan didokumentasikan dalam file ini.

Format changelog ini mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/),
dan proyek ini menganut [Semantic Versioning](https://semver.org/lang/id/).

---

## [Unreleased]

### Added
- **Multi-Cohort Architecture**: Mesin arisan v3 berbasis kelompok dinamis (`cohortId`) pada `MeritPool.sol`.
- **Reverse Auction Engine**: Fitur lelang terbalik (discount bidding hingga 15%) untuk Pool Tier 4 (Elite) dan Tier 5 (Prime).
- **Merit Queue Designation**: Logika penentuan urutan payout deterministik berbasis Merit Score dan tenure.
- **Auto-Settle Keeper**: Layanan penjaga siklus otomatis yang menyelesaikan putaran begitu kelompok penuh atau tenggat waktu tercapai.
- **In-Memory Nonce Buffering**: Mekanisme fallback cache memory untuk menahan latensi koneksi remote pooler database pada autentikasi wallet.
- **Docker Compose Setup**: Orkestrasi PostgreSQL 16, Redis 7, dan Next.js standalone runner.
- **GitHub Actions Workflows**: Integrasi otomatis CI, Release, dan CodeQL Security scanning.

### Fixed
- **MC Token Swap Misconfiguration**: Memperbaiki alamat kontrak swap lokal chain `31337` di `contracts.ts` yang sebelumnya mengarah ke address kosong tanpa bytecode.
- **Auction View Arity Mismatch**: Memperbaiki pemanggilan `getLowestBid` dan `getBidCount` pada `dashboard/page.tsx` dan `pools/[id]/page.tsx` agar meneruskan `cohortId` sesuai signature kontrak.
- **Indexer Event Decoding**: Menyesuaikan ABI event indexer dengan indexing log aktual `MeritPool.sol` serta menambahkan penanganan auto-reset kursor saat chain lokal di-restart.

---

## [0.1.0-alpha] - 2026-09-08

### Added
- Rilis perdana platform arisan Web3 berbasis Next.js 16 + Foundry.
- 6 tingkatan pool: Basic, Standard, Growth, Trusted, Elite, Prime.
- Tokenomics ERC-20 Merit Circle Token (`MCircle.sol`) dan kontrak swap native currency (`TokenSwap.sol`).
- Integrasi Wallet Connect, Wagmi v3, dan Viem.

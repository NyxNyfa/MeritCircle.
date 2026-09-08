# ⭕ Merit Circle (Arisan On-Chain Web3)

<div align="center">

```
  __  __           _ _      _____ _           _       
 |  \/  |         (_) |    / ____(_)         | |      
 | \  / | ___ _ __ _| |_  | |     _ _ __ ___ | | ___  
 | |\/| |/ _ \ '__| | __| | |    | | '__/ __|| |/ _ \ 
 | |  | |  __/ |  | | |_  | |____| | | | (__ | |  __/ 
 |_|  |_|\___|_|  |_|\__|  \_____|_|_|  \___||_|\___| 
```

**Protokol Tabungan & Kredit Bergulir (ROSCA / Arisan) Terdesentralisasi dengan Algoritma Merit Scoring & Lelang Terbalik (Reverse Auction)**

[![CI Build](https://img.shields.io/github/actions/workflow/status/NyxNyfa/MeritCircle/ci.yml?branch=main&style=for-the-badge&logo=github)](https://github.com/NyxNyfa/MeritCircle/actions)
[![CodeQL Security](https://img.shields.io/github/actions/workflow/status/NyxNyfa/MeritCircle/codeql.yml?branch=main&style=for-the-badge&logo=github&label=CodeQL)](https://github.com/NyxNyfa/MeritCircle/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16.3.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Foundry](https://img.shields.io/badge/Foundry-v0.2.0-orange?style=for-the-badge&logo=solidity)](https://getfoundry.sh/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)

[Demo Interaktif](http://localhost:3000) · [Laporkan Bug](https://github.com/NyxNyfa/MeritCircle/issues/new?template=bug_report.md) · [Ajukan Fitur](https://github.com/NyxNyfa/MeritCircle/issues/new?template=feature_request.md)

</div>

---

## 📝 Deskripsi Proyek

**Merit Circle** adalah platform keuangan sosial terdesentralisasi (DeFi / SocialFi) yang mendigitalkan tradisi kearifan lokal **Arisan** (Rotating Savings and Credit Association / ROSCA) ke dalam smart contract Ethereum Virtual Machine (EVM).

Berbeda dengan sistem arisan konvensional yang rentan terhadap risiko gagal bayar, admin bodong, atau sengketa penarikan dana, Merit Circle mengunci dana 100% secara non-custodial menggunakan smart contract escrow. Platform ini memperkenalkan dua pilar inovasi:
1. **Merit Scoring System**: Algoritma reputasi on-chain yang mengevaluasi kepatuhan, keaktifan, dan rekam jejak pembayaran tanpa memerlukan agunan fisik (*uncollateralized reputation-gated access*).
2. **Reverse Auction Mechanism**: Mekanisme lelang diskon untuk peserta tier atas yang membutuhkan likuiditas darurat, di mana surplus pemotongan diskon dibagikan kembali ke anggota kelompok yang patuh dan kas cadangan DAO.

```
[SCREENSHOT_PLACEHOLDER: Tampilan Dashboard Utama & Kartu Arisan Multi-Cohort]
[GIF_PLACEHOLDER: Animasi Alur Pendaftaran, Swap Token MC, dan Pengundian Siklus]
```

---

## 📑 Daftar Isi

- [⭕ Merit Circle (Arisan On-Chain Web3)](#-merit-circle-arisan-on-chain-web3)
  - [📝 Deskripsi Proyek](#-deskripsi-proyek)
  - [📑 Daftar Isi](#-daftar-isi)
  - [✨ Fitur Utama](#-fitur-utama)
  - [🛠️ Tech Stack](#️-tech-stack)
  - [🚀 Quick Start](#-quick-start)
    - [Prasyarat Sistem](#prasyarat-sistem)
    - [Langkah Instalasi (Copy-Paste Ready)](#langkah-instalasi-copy-paste-ready)
  - [⚙️ Konfigurasi Environment](#️-konfigurasi-environment)
  - [📁 Struktur Folder Proyek](#-struktur-folder-proyek)
  - [🔌 API Reference / Endpoint Backend](#-api-reference--endpoint-backend)
  - [🧪 Panduan Pengujian (Testing)](#-panduan-pengujian-testing)
  - [🚢 Deployment Target](#-deployment-target)
  - [🐳 Panduan Docker](#-panduan-docker)
  - [🤝 Panduan Kontribusi](#-panduan-kontribusi)
  - [🗺️ Roadmap Pengembangan](#️-roadmap-pengembangan)
  - [❓ Pertanyaan Umum (FAQ)](#-pertanyaan-umum-faq)
  - [📄 Lisensi](#-lisensi)
  - [🙏 Acknowledgments \& Ucapan Terima Kasih](#-acknowledgments--ucapan-terima-kasih)
  - [👨‍💻 Author \& Pengembang](#-author--pengembang)

---

## ✨ Fitur Utama

- 🪙 **Non-Custodial Escrow**: Dana simpanan peserta tersimpan aman di smart contract `MeritPool.sol` tanpa ada perantara yang dapat menyalahgunakan dana.
- 👥 **Multi-Cohort Architecture**: Satu jenis arisan dapat menampung ribuan anggota secara simultan dengan pembentukan kelompok (*cohort*) baru secara instan tanpa masa tunggu.
- 📊 **Dynamic Merit Score**: Perhitungan skor reputasi (0–100) berbasis 6 parameter objektif: *on-time rate*, *completion ratio*, *consistency*, *tenure*, *payout history*, dan *behavioral hygiene*.
- 🏷️ **Tier Progression (Tier 0 - 5)**: Membuka akses ke pool arisan bernominal lebih tinggi (Basic, Standard, Growth, Trusted, Elite, Prime) seiring naiknya skor reputasi.
- 📉 **Reverse Auction (Tier 4 & 5)**: Penawaran diskon payout maksimal 15% untuk anggota yang membutuhkan dana darurat, mendistribusikan surplus 60% ke anggota lain, 25% ke Reserve Pool, dan 15% ke Treasury.
- 🔄 **Integrated Token Swap**: Kontrak swap instan native coin (ETH/tBNB) ke token ekosistem `MCircle` (1 ETH/tBNB = 10.000 MC).
- 🤖 **Auto-Settle Keeper**: Layanan otomasi terdistribusi yang mengeksekusi settlement dan transfer hadiah begitu kapasitas kelompok penuh atau batas waktu siklus tercapai.
- 🔔 **Real-Time Notification Engine**: Peringatan tagihan iuran, konfirmasi transaksi on-chain, dan pengumuman pemenang melalui antarmuka web dan browser notification.

---

## 🛠️ Tech Stack

| Komponen | Teknologi | Versi | Peran & Kegunaan |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | Next.js (App Router) | `16.3.1` | SSR/SSG rendering, routing antarmuka modern, dan middleware |
| **UI Library** | React | `19.2.8` | Komponen interaktif reaktif dan state management hook |
| **Styling & Design** | Vanilla CSS + TailwindCSS | `v4.0` | Token desain HSL sleek dark mode, micro-animations, glassmorphism |
| **Web3 Wallet Client** | Wagmi & Viem | `^3.7.6` / `^2.55` | Koneksi wallet Web3 (MetaMask/WalletConnect), query, dan mutasi RPC |
| **Smart Contracts** | Solidity | `^0.8.20` | Logika kontrak `MCircle.sol`, `TokenSwap.sol`, dan `MeritPool.sol` |
| **Contract Toolchain** | Foundry (Forge & Anvil) | `Nightly` | Pengujian smart contract, gas optimization, dan local testnet node |
| **Database ORM** | Prisma | `^6.19.3` | Skema database, query type-safe, dan auto-migration |
| **Database Engine** | PostgreSQL | `16` | Penyimpanan data relasional off-chain, ledger, dan riwayat iuran |
| **Cache & Session** | In-Memory / Redis | `7-alpine` | Penanganan buffering nonce dan penahan beban concurrent request |
| **DevOps & CI/CD** | Docker & GitHub Actions | `v4` | Kontainerisasi multi-stage build dan pipeline automated testing |

---

## 🚀 Quick Start

### Prasyarat Sistem
Pastikan perangkat Anda telah terpasang:
- **Node.js**: `v20.x` atau lebih baru
- **Package Manager**: `pnpm` (`npm install -g pnpm@9`)
- **Foundry**: Foundry toolkit (`curl -L https://foundry.paradigm.xyz | bash` lalu `foundryup`)
- **Git**: Versi terbaru

---

### Langkah Instalasi (Copy-Paste Ready)

#### 1. Clone Repository & Install Dependensi
```bash
git clone https://github.com/NyxNyfa/MeritCircle..git
cd MeritCircle
pnpm install
```

#### 2. Konfigurasi Environment File
```bash
cp .env.example apps/web/.env
```

#### 3. Jalankan Blockchain Lokal Anvil (Terminal 1)
```bash
anvil --port 8545 --block-time 1
```

#### 4. Deploy Smart Contract ke Anvil (Terminal 2)
```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

#### 5. Setup Database & Jalankan Web Dev Server (Terminal 3)
```bash
cd apps/web
npx prisma db push
npx prisma db seed
pnpm dev
```

Buka peramban Anda di `http://localhost:3000` dan sambungkan wallet MetaMask ke jaringan RPC lokal `http://127.0.0.1:8545` (Chain ID: `31337`).

---

## ⚙️ Konfigurasi Environment

Variabel konfigurasi yang didukung di `apps/web/.env`:

| Variabel | Deskripsi | Default Value | Wajib |
| :--- | :--- | :--- | :---: |
| `DATABASE_URL` | PostgreSQL connection string pooler/direct | `postgresql://...` | **Ya** |
| `CHAIN_ID` | Target EVM chain ID (`31337` Anvil / `97` BSC) | `31337` | **Ya** |
| `RPC_URL` | Endpoint RPC EVM node blockchain | `http://127.0.0.1:8545` | **Ya** |
| `BACKEND_PRIVATE_KEY` | Private key signer otorisasi backend ECDSA | `0x59c699...` | **Ya** |
| `KEEPER_PRIVATE_KEY` | Private key eksekutor transaksi auto-settle | `0xac0974...` | Tidak |
| `JWT_SECRET` | Secret key penandatanganan session cookie | `super-secret-key-32-chars` | **Ya** |
| `NEXT_PUBLIC_APP_URL` | Base URL aplikasi publik | `http://localhost:3000` | **Ya** |

---

## 📁 Struktur Folder Proyek

```
merit-circle/
├── .github/
│   ├── ISSUE_TEMPLATE/       # Template bug report, feature request & config
│   ├── workflows/            # Pipeline CI, automated release, dan CodeQL analysis
│   ├── CODEOWNERS            # Aturan kepemilikan kode per subdirektori
│   ├── dependabot.yml        # Otomasi pembaruan dependensi dependabot
│   └── FUNDING.yml           # Informasi pendanaan proyek
├── apps/
│   └── web/                  # Aplikasi Fullstack Next.js (Frontend & API)
│       ├── prisma/           # Skema model data Prisma & skrip database seeding
│       ├── public/           # Aset statis gambar, ikon, dan manifest
│       ├── scripts/          # Skrip verifikasi DoD, testing auth, dan simulasi ekonomi
│       └── src/
│           ├── app/          # Halaman Next.js App Router (dashboard, swap, pools)
│           ├── components/   # Komponen UI (SwapWidget, PoolCard, Sidebar, Modal)
│           ├── config/       # Alamat kontrak per-chain, ABI, dan Wagmi config
│           └── lib/          # Logika Merit Engine, indexer, designation, dan auth
├── contracts/                # Smart Contract Foundry
│   ├── src/                  # MCircle.sol, TokenSwap.sol, MeritPool.sol
│   ├── script/               # Skrip deployment Solidity Deploy.s.sol
│   └── test/                 # Pengujian unit test Foundry
├── docs/                     # Dokumentasi arsitektur, ADR, dan panduan runbook
├── .editorconfig             # Standar formatting editor
├── .env.example              # Template variabel konfigurasi environment
├── .eslintrc.json            # Konfigurasi static linter ESLint
├── .gitignore                # Pengecualian berkas git
├── .prettierrc               # Konfigurasi format kode Prettier
├── CHANGELOG.md              # Riwayat pembaruan versi (Keep a Changelog)
├── CONTRIBUTING.md           # Panduan lengkap bagi kontributor kode
├── CODE_OF_CONDUCT.md        # Pedoman kode etik komunitas
├── docker-compose.yml        # Orkestrasi container PostgreSQL, Redis, dan Web
├── Dockerfile                # Multi-stage optimized Docker packaging
├── LICENSE                   # Lisensi open-source MIT
├── Makefile                  # Perintah automasi pengembangan (make dev, make test)
├── package.json              # Konfigurasi root monorepo & linting scripts
├── pnpm-workspace.yaml       # Definisi monorepo pnpm
└── README.md                 # Dokumentasi utama proyek
```

---

## 🔌 API Reference / Endpoint Backend

Semua respons dikembalikan dalam format standar `application/json`.

| Method | Endpoint | Autentikasi | Deskripsi Singkat |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/auth/nonce` | Publik | Mendapatkan nonce kriptografis sekali pakai untuk login wallet |
| `POST` | `/api/users/register` | Signature | Mendaftarkan akun wallet baru dengan username unik |
| `GET` | `/api/users/:address` | Publik | Mengambil profil user, nilai Merit Score, dan tier |
| `GET` | `/api/pools` | Publik | Mengambil katalog 6 pool arisan dan statistik on-chain |
| `POST` | `/api/pools/signature`| Wallet Auth | Memverifikasi kelayakan tier dan menghasilkan izin `joinPool` |
| `POST` | `/api/pools/join` | Bearer Token | Sinkronisasi metadata pendaftaran pool off-chain |
| `POST` | `/api/pools/designation`| Internal | Menghitung pemenang siklus berbasis formula Merit Queue |
| `POST` | `/api/pools/auto-settle`| Keeper | Otomatisasi penyelesaian siklus dan transfer hadiah pemenang |
| `GET` | `/api/me/notifications` | Bearer Token | Mengambil daftar notifikasi iuran dan pengumuman pemenang |

---

## 🧪 Panduan Pengujian (Testing)

### 1. Validasi Otomatis Definition of Done (DoD)
Jalankan pengujian end-to-end menyeluruh terhadap spesifikasi protokol:
```bash
pnpm verify:dod
```
*Memvalidasi 15 kriteria fungsional termasuk aturan Tier, batasan diskon lelang, audit ledger finansial, dan keterbukaan saldo escrow.*

### 2. Pengujian Smart Contracts (Foundry)
```bash
cd contracts
forge test -vvv
```

### 3. Type Checking & Static Linting
```bash
pnpm typecheck
pnpm lint
```

---

## 🚢 Deployment Target

### Deploy ke BNB Smart Chain (BSC) Testnet:
1. Pastikan wallet deployer memiliki saldo tBNB untuk gas fee.
2. Atur environment variable:
   ```bash
   export PRIVATE_KEY="0x[PRIVATE_KEY_DEPLOYER]"
   export BACKEND_PRIVATE_KEY="0x[PRIVATE_KEY_BACKEND]"
   ```
3. Jalankan skrip deploy:
   ```bash
   cd contracts
   forge script script/Deploy.s.sol --rpc-url https://bsc-testnet-dataseed.bnbchain.org --broadcast --verify
   ```
4. Salin alamat kontrak hasil keluaran console ke dalam `apps/web/src/config/contracts.ts` pada konfigurasi chain `97`.

---

## 🐳 Panduan Docker

Menjalankan seluruh ekosistem (PostgreSQL 16, Redis 7, dan Next.js Production Build) menggunakan Docker Compose:

```bash
# Build dan jalankan seluruh container di background
docker-compose up -d --build

# Periksa status container
docker-compose ps

# Membaca live logs aplikasi web
docker-compose logs -f web

# Mematikan seluruh container dan menghapus volume data
docker-compose down -v
```

---

## 🤝 Panduan Kontribusi

Kami sangat mengapresiasi kontribusi dari komunitas! Silakan baca panduan lengkap pada [CONTRIBUTING.md](CONTRIBUTING.md) sebelum mengajukan perubahan kode.

1. Fork repository ini.
2. Buat feature branch: `git checkout -b feat/fitur-keren`.
3. Commit perubahan sesuai konvensi [Conventional Commits](https://www.conventionalcommits.org/).
4. Pastikan `pnpm typecheck` dan `pnpm lint` lulus tanpa peringatan.
5. Buka Pull Request ke branch `main`.

---

## 🗺️ Roadmap Pengembangan

- [x] Arsitektur Multi-Cohort Smart Contract (`MeritPool.sol` v3)
- [x] Reverse Auction dengan batasan diskon 15% dan surplus splitting (60/25/15)
- [x] Algoritma Merit Scoring Engine (§14) terintegrasi
- [x] Dukungan transaksi instan Token Swap ERC-20 (`TokenSwap.sol`)
- [x] Layanan background Keeper untuk auto-settlement siklus
- [ ] Integrasi Chainlink Automation untuk desentralisasi keeper settlement
- [ ] Integrasi Chainlink VRF untuk fallback undian probabilitas tertimbang (*weighted lottery*)
- [ ] Dukungan Multi-Token Arisan (USDT, USDC, DAI)
- [ ] Ekstensi Mobile WebApp (PWA / Push Notifications native)
- [ ] Implementasi Account Abstraction (ERC-4337) untuk pendaftaran tanpa biaya gas (*gasless sponsored transactions*)

---

## ❓ Pertanyaan Umum (FAQ)

<details>
<summary><b>1. Apa yang terjadi jika ada anggota arisan yang gagal membayar iuran pada siklus berjalan?</b></summary>
Smart contract mencatat status anggota tersebut sebagai <i>Default</i>. Skor reputasi Merit Score akun tersebut akan dipotong secara signifikan dan status penalti tercatat on-chain. Seluruh sisa kewajiban pembayaran tetap tercatat sebagai utang (<i>Obligation</i>) yang harus dilunasi sebelum akun dapat bergabung ke kelompok arisan lainnya.
</details>

<details>
<summary><b>2. Bagaimana sistem menentukan pemenang arisan pada pool non-lelang?</b></summary>
Penetapan pemenang pada pool Tier 0–3 menggunakan sistem <b>Merit Queue</b> (§46). Peserta yang belum pernah menang dengan skor reputasi tertinggi dan masa keanggotaan (<i>tenure</i>) terlama mendapatkan prioritas pertama untuk menerima payout.
</details>

<details>
<summary><b>3. Mengapa token yang digunakan adalah Merit Circle (MC) dan bukan langsung native ETH/BNB?</b></summary>
Standar token ERC-20 memungkinkan sistem escrow mengontrol izin penarikan (<i>allowance approval</i>), pemotongan iuran otomatis berkala, surplus splitting presisi tanpa pembulatan desimal native gas, dan interoperabilitas dengan protokol staking di masa mendatang.
</details>

<details>
<summary><b>4. Apakah pengembang atau admin memiliki akses untuk menarik dana yang terkumpul?</b></summary>
<b>Sama sekali tidak.</b> Kontrak <code>MeritPool.sol</code> didesain non-custodial. Dana iuran hanya dapat dicairkan melalui fungsi <code>settleCycle()</code> yang secara otomatis mentransfer seluruh nominal hadiah langsung ke alamat wallet pemenang siklus terkait.
</details>

<details>
<summary><b>5. Bagaimana cara mendapatkan token MC untuk pengujian di jaringan lokal?</b></summary>
Anda cukup membuka halaman <b>/swap</b> pada aplikasi, memasukkan nominal ETH yang diinginkan, dan menekan tombol <i>Tukar Token</i>. Kontrak <code>TokenSwap.sol</code> akan langsung mencetak token MC ke wallet Anda dengan rasio 1 ETH = 10.000 MC.
</details>

---

## 📄 Lisensi

Didistribusikan di bawah lisensi terbuka **MIT License**. Lihat berkas [LICENSE](LICENSE) untuk informasi lebih lanjut.

---

## 🙏 Acknowledgments & Ucapan Terima Kasih

- [OpenZeppelin](https://www.openzeppelin.com/) — Standar kontrak ERC-20, SafeERC20, dan ReentrancyGuard yang aman.
- [Foundry Paradigm](https://getfoundry.sh/) — Toolkit pengembangan smart contract tercepat dan terandal.
- [Wagmi](https://wagmi.sh/) & [Viem](https://viem.sh/) — Pustaka integrasi Ethereum TypeScript terbaik.
- [TailwindCSS](https://tailwindcss.com/) & [Lucide Icons](https://lucide.dev/) — Sistem utilitas desain dan ikonografi antarmuka.

---

## 👨‍💻 Author & Pengembang

**NyxNyfa**
- GitHub: [@NyxNyfa](https://github.com/NyxNyfa)
- Repository: [MeritCircle](https://github.com/NyxNyfa/MeritCircle..git)
- Email: `dev@meritcircle.xyz`

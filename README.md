# Merit Circle

> **Build merit. Unlock liquidity.**  
> *(Bangun reputasi, buka akses likuiditas)*

Merit Circle adalah platform arisan Web3 berbasis skor reputasi yang beroperasi di jaringan **BNB Smart Chain Testnet** menggunakan tBNB. Platform ini memadukan mekanisme arisan tradisional dengan transparansi smart contract terdesentralisasi, sistem tiering reputasi on-chain, liquidity auction dengan penawaran diskon, dan penalti keterlambatan terotomatisasi tanpa jaminan (*uncollateralized*) dan tanpa KYC terpusat.

---

## 🏛️ Arsitektur Monorepo

Proyek ini dibangun sebagai monorepo modern menggunakan **pnpm workspaces** dan TypeScript:

```text
MeritCircle/
├── apps/
│   ├── backend/             # Express.js + Prisma ORM + PostgreSQL/Supabase REST API
│   └── web/                 # Next.js 14 App Router + Tailwind CSS + Glassmorphism UI
├── packages/
│   ├── contracts/           # Solidity smart contracts (Hardhat, OpenZeppelin, BNB Testnet)
│   ├── domain/              # Pure TypeScript business logic (reputasi, tier, lelang, penalti)
│   └── ui/                  # Shared component library, tokens, & CSS design system
├── scripts/
│   └── sync-env.js          # Skrip sinkronisasi variabel lingkungan otomatis antar-workspace
├── docker-compose.yml       # Konfigurasi container database PostgreSQL lokal
├── install.md               # Panduan instalasi dan environment setup lengkap
└── deploy.md                # Panduan deployment produksi (Vercel, Render, Supabase, Testnet)
```

---

## 🛡️ Aturan Kritis Produk (Core Rules)

- **Network**: BNB Smart Chain Testnet only (tBNB).
- **Tanpa Jaminan & Tanpa KYC**: Partisipasi berbasis riwayat dan skor reputasi yang terverifikasi.
- **Group Size == Cycle Count**: Jumlah anggota dalam kelompok sama persis dengan total siklus pembayaran.
- **Siklus 30 Hari**: Durasi siklus adalah 30 hari kalender, dengan **Payment Window** 10 hari pertama di tiap siklus.
- **Akses Lelang**: Hanya anggota Tier 4 ke atas (Auction Pool) yang dapat mengajukan penawaran lelang likuiditas.
- **Lelang Siklus Non-Final**: Lelang hanya berlangsung pada siklus non-final (siklus 1 s.d. N-1).
- **Final Cycle Rule (NO FINAL SURPLUS)**: Pada siklus terakhir, seluruh saldo kelompok yang tersisa dibayarkan penuh kepada penerima giliran terakhir sehingga saldo contract pool menjadi tepat 0.
- **Penalti Keterlambatan**: Pengurangan -10 reputasi per hari keterlambatan setelah hari ke-10 (maksimal -100 per siklus).
- **Persyaratan Bergabung**: Dompet Web3 terkoneksi + Username unik terdaftar + Email terverifikasi (+40 reputasi).

---

## ⚡ Prasyarat Sistem

- **Node.js**: v20.x atau lebih baru
- **pnpm**: v9.x atau lebih baru
- **Docker**: (Opsional untuk menjalankan PostgreSQL lokal via Docker Compose)
- **Web3 Wallet**: MetaMask atau dompet EVM lainnya yang dikonfigurasi ke BNB Smart Chain Testnet (Chain ID `97`).

---

## 🚀 Panduan Memulai Cepat (Quick Start)

### 1. Instalasi Dependensi
```bash
pnpm install
```

### 2. Konfigurasi Environment
Salin template konfigurasi lingkungan dan sesuaikan variabel yang dibutuhkan:
```bash
cp .env.example .env
node scripts/sync-env.js
```

### 3. Setup Database & Seed Demo Data
Jalankan PostgreSQL lokal via Docker (atau gunakan database Supabase eksternal):
```bash
# Menjalankan PostgreSQL lokal
docker compose up -d

# Generate client dan sinkronkan skema database
pnpm prisma:generate
pnpm db:push

# Masukkan data demo lengkap (pools, groups, users, admin, mock cycles)
pnpm db:seed-demo
```

### 4. Menjalankan Server Aplikasi
Jalankan backend API dan web frontend secara bersamaan di terminal terpisah:

**Terminal 1 — Backend API:**
```bash
pnpm dev:backend
# Backend berjalan di http://localhost:4000
```

**Terminal 2 — Web Frontend:**
```bash
pnpm dev:web
# Web application berjalan di http://localhost:3000
```

---

## 🧪 Pengujian & Build

Seluruh paket dan aplikasi telah terintegrasi dengan test suite otomatis dan type checking:

```bash
# Menjalankan seluruh unit & integration tests (Domain, Smart Contracts, Backend)
pnpm test

# Menjalankan type checking di seluruh workspace
pnpm typecheck

# Menjalankan build produksi untuk seluruh aplikasi & paket
pnpm build
```

---

## 📖 Dokumentasi Lanjutan

- [Panduan Instalasi & Konfigurasi Lokal (`install.md`)](./install.md)
- [Panduan Deployment Produksi Cloud & Smart Contract (`deploy.md`)](./deploy.md)

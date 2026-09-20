# 🚀 Panduan Deployment Merit Circle ke Production & Demo

Dokumen ini adalah panduan komprehensif langkah demi langkah (*step-by-step*) untuk melakukan deployment Merit Circle secara penuh: mulai dari pendaftaran layanan cloud yang dibutuhkan, pengisian variabel lingkungan (`.env`), deployment Smart Contract di BNB Smart Chain Testnet, penyediaan database cloud PostgreSQL, hingga hosting Backend API dan Frontend Web.

---

## 📋 1. Layanan yang Harus Anda Daftarkan (Checklist)

Berikut adalah daftar layanan eksternal yang perlu Anda siapkan/daftarkan sebelum memulai:

| No | Layanan / Platform | Biaya | Fungsi | Wajib/Opsional | Link Pendaftaran |
|---|---|---|---|---|---|
| 1 | **Supabase** (atau **Neon.tech**) | Gratis (*Free Tier*) | Database PostgreSQL Cloud (Serverless) | **Wajib** | [supabase.com](https://supabase.com) / [neon.tech](https://neon.tech) |
| 2 | **MetaMask** (atau Rabby) | Gratis | Web3 Wallet untuk deploy contract & interaksi transaksi arisan | **Wajib** | [metamask.io](https://metamask.io) |
| 3 | **BNB Testnet Faucet** | Gratis | Mendapatkan tBNB untuk gas fee smart contract | **Wajib** | [BNB Faucet](https://testnet.binance.org/faucet-smart) |
| 4 | **Railway** (atau **Render.com**) | Gratis / Trial | Hosting Backend Express.js + Prisma ORM | **Wajib (Deploy)** | [railway.app](https://railway.app) / [render.com](https://render.com) |
| 5 | **Vercel** | Gratis (*Hobby*) | Hosting Frontend Next.js 16 Web App | **Wajib (Deploy)** | [vercel.com](https://vercel.com) |
| 6 | **Resend** (Opsional) | Gratis (3.000 email/bln) | Layanan pengiriman email OTP sungguhan | Opsional (Default: `console`) | [resend.com](https://resend.com) |

> 💡 **Catatan Penting:** Untuk `JWT_SECRET`, Anda **tidak perlu mendaftar ke mana-mana**. Itu adalah string rahasia acak yang Anda buat sendiri.

---

## 🔑 2. Panduan Lengkap Pengisian `.env`

File `.env` di root direktori proyek mengontrol konfigurasi backend, smart contract, dan frontend. Salin dari `.env.example`:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

Berikut rincian cara mengisi setiap variabel:

### A. Konfigurasi Server Backend
```env
NODE_ENV=production
PORT=4000
```
- **`NODE_ENV`**: Gunakan `development` untuk pengujian lokal, atau `production` saat di server live.
- **`PORT`**: Port default backend (4000). Platform seperti Railway/Render biasanya mengisi variabel `PORT` secara otomatis.

---

### B. Konfigurasi Database (`DATABASE_URL`) — **Paling Penting**
```env
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"
```

**Cara Mendapatkan `DATABASE_URL` dari Supabase:**
1. Login ke [Supabase Dashboard](https://supabase.com/dashboard).
2. Klik **New Project**, masukkan nama proyek (misal `merit-circle-db`) dan password database yang kuat. **Simpan password ini baik-baik!**
3. Pilih Region terdekat (contoh: `Singapore - ap-southeast-1` atau `Tokyo - ap-northeast-1`).
4. Setelah proyek selesai dibuat (~1-2 menit), buka menu **Project Settings** (ikon gear di kiri bawah) ➔ **Database**.
5. Gulir ke bawah ke bagian **Connection string**, pilih tab **URI**.
6. Pilih mode:
   - **Session / Direct (Port 5432):** Cocok untuk Prisma migrasi dan query umum.
   - **Transaction (Port 6543):** Jika menggunakan connection pooling, tambahkan `&pgbouncer=true`.
7. Salin string koneksi tersebut, lalu ganti `[YOUR-PASSWORD]` dengan password yang Anda buat di Langkah 2.
8. Pastikan di ujung URL terdapat `?sslmode=require`.

---

### C. Konfigurasi Keamanan & Autentikasi (`JWT_SECRET`)
```env
JWT_SECRET=super_secret_jwt_passphrase_for_hackathon_demo_32chars_min_2026
JWT_EXPIRES_IN=7d
```
- **`JWT_SECRET`**: Tidak perlu mendaftar ke mana pun. Masukkan string acak minimal 32 karakter bebas (huruf, angka, simbol).
- **`JWT_EXPIRES_IN`**: Masa berlaku sesi token login (contoh: `7d` untuk 7 hari).

---

### D. Konfigurasi Email Provider (`EMAIL_PROVIDER`)
```env
# Opsi 1: Tanpa daftar (Default - Sangat direkomendasikan untuk demo & hackathon)
EMAIL_PROVIDER=console
EMAIL_OTP_EXPIRES_MINUTES=10
EMAIL_OTP_MAX_REQUESTS_PER_HOUR=5

# Opsi 2: Menggunakan Resend (Kirim email nyata)
# EMAIL_PROVIDER=resend
# RESEND_API_KEY=re_123456789...
# EMAIL_FROM=noreply@domainanda.com
```
- Jika `EMAIL_PROVIDER=console`: Anda **tidak perlu mendaftar email service**. Setiap kali user meminta kode OTP login/verifikasi, kodenya langsung dicetak di log terminal backend!
- Jika ingin kirim email sungguhan, daftar di [resend.com](https://resend.com), dapatkan API Key, lalu masukkan ke `RESEND_API_KEY`.

---

### E. Konfigurasi Smart Contract & Blockchain (BNB Testnet)
```env
# BNB Smart Chain Testnet Network
NEXT_PUBLIC_BNB_TESTNET_CHAIN_ID=97
NEXT_PUBLIC_BNB_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/

# Private key akun deployer (harus memiliki saldo tBNB)
DEPLOYER_PRIVATE_KEY=0x_private_key_metamask_anda

# Alamat kontrak setelah di-deploy (diisi setelah menjalankan skrip deploy)
CONTRACT_ADDRESS=0x_contract_address_hasil_deploy
NEXT_PUBLIC_CONTRACT_ADDRESS=0x_contract_address_hasil_deploy

# Demo payment simulator flag
NEXT_PUBLIC_DEMO_PAYMENT_MODE=true
```

**Cara Mendapatkan `DEPLOYER_PRIVATE_KEY` & Saldo tBNB:**
1. Buka ekstensi **MetaMask** di browser Anda.
2. Buat akun baru khusus untuk deploy / testing (jangan gunakan akun utama aset real!).
3. Salin alamat wallet (Address), lalu klaim **tBNB gratis** di:
   - [BNB Chain Testnet Faucet](https://testnet.binance.org/faucet-smart)
   - Atau Discord BNB Chain: [discord.gg/bnbchain](https://discord.gg/bnbchain) di channel `#testnet-faucet`.
4. Di MetaMask, klik menu titik tiga di samping nama akun ➔ **Account details** ➔ **Show private key**.
5. Masukkan password MetaMask Anda, lalu salin Private Key dan tempel ke `DEPLOYER_PRIVATE_KEY=` di file `.env`.

---

### F. URL Komunikasi Frontend & Backend
```env
# Pengaturan Lokal:
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000

# Pengaturan Production (Ganti dengan domain deployment Anda):
# NEXT_PUBLIC_APP_URL=https://meritcircle.vercel.app
# NEXT_PUBLIC_API_URL=https://meritcircle-backend.up.railway.app
```

---

## 🛠️ 3. Langkah 1: Inisialisasi Database Cloud (Supabase)

Setelah `DATABASE_URL` diisi dengan kredensial Supabase Anda di file `.env`:

```powershell
# 1. Generate Prisma ORM Client
pnpm prisma:generate

# 2. Push skema database ke Supabase (Otomatis membuat seluruh tabel)
pnpm db:push

# 3. Masukkan data awal demo hackathon (Admin, Demo Users, 12 Pool Katalog)
pnpm db:seed-demo
```

> **Verifikasi:** Buka dashboard Supabase Anda ➔ masuk ke menu **Table Editor**. Anda akan melihat tabel `User`, `Pool`, `Group`, `Cycle`, `Contribution`, `Auction`, `Bid`, `RewardLedger`, dan `AuditLog` sudah terisi dengan data awal!

---

## ⛓️ 4. Langkah 2: Deploy Smart Contract ke BNB Testnet

Deploy smart contract `MeritCircleCore` ke jaringan BNB Smart Chain Testnet (Chain ID 97):

```powershell
# Jalankan perintah deploy testnet
pnpm --filter "@merit-circle/contracts" run deploy:testnet
```

**Output Terminal yang Diharapkan:**
```text
Deploying MeritCircleCore with account: 0xAbC123...
Account balance: 0.5 BNB
✅ MeritCircleCore deployed to: 0x9B1234567890abcdef1234567890abcdef123456
Deployer configured with Admin, Pool Creator, Settler, and Pauser roles.
```

**Langkah Lanjutan:**
Salin alamat kontrak yang muncul (`0x9B...`) ke file `.env`:
```env
CONTRACT_ADDRESS=0x9B1234567890abcdef1234567890abcdef123456
NEXT_PUBLIC_CONTRACT_ADDRESS=0x9B1234567890abcdef1234567890abcdef123456
```
Jalankan sinkronisasi environment:
```powershell
node scripts/sync-env.js
```

---

## ☁️ 5. Langkah 3: Deploy Backend API (Express.js)

### Pilihan Utama: Deploy ke Railway (Rekomendasi Terbaik)

Railway adalah platform hosting PaaS yang sangat mudah untuk monorepo Node.js dan Prisma.

1. Buka [railway.app](https://railway.app) dan login dengan akun GitHub Anda.
2. Klik **New Project** ➔ **Deploy from GitHub repo** ➔ pilih repositori `MeritCircle`.
3. Klik pada service yang baru dibuat ➔ masuk ke tab **Settings**:
   - **Root Directory:** Ubah menjadi `/` (atau kosongkan).
   - **Build Command:**
     ```bash
     pnpm install && pnpm --filter "@merit-circle/backend" run prisma:generate && pnpm --filter "@merit-circle/backend" run build
     ```
   - **Start Command:**
     ```bash
     pnpm --filter "@merit-circle/backend" run start
     ```
4. Masuk ke tab **Variables** dan tambahkan variabel lingkungan:
   - `NODE_ENV` = `production`
   - `PORT` = `4000` (atau biarkan Railway mengatur secara otomatis)
   - `DATABASE_URL` = (Connection string Supabase Anda)
   - `JWT_SECRET` = (String rahasia JWT Anda)
   - `EMAIL_PROVIDER` = `console`
   - `NEXT_PUBLIC_BNB_TESTNET_CHAIN_ID` = `97`
   - `NEXT_PUBLIC_BNB_TESTNET_RPC_URL` = `https://data-seed-prebsc-1-s1.binance.org:8545/`
   - `CONTRACT_ADDRESS` = (Alamat smart contract hasil deploy)
5. Masuk ke tab **Networking** ➔ Klik **Generate Domain** (contoh hasil: `meritcircle-backend.up.railway.app`).
6. **Verifikasi Backend:** Buka di browser `https://meritcircle-backend.up.railway.app/health`.
   Respon yang sukses:
   ```json
   { "status": "ok", "timestamp": "2026-09-18T..." }
   ```

---

### Alternatif: Deploy ke Render.com (Gratis)

1. Buka [render.com](https://render.com) ➔ Buat **New Web Service**.
2. Hubungkan ke repositori GitHub Anda.
3. Konfigurasi Service:
   - **Name:** `merit-circle-backend`
   - **Language:** `Node`
   - **Build Command:**
     ```bash
     pnpm install && pnpm prisma:generate && pnpm --filter "@merit-circle/backend" run build
     ```
   - **Start Command:**
     ```bash
     pnpm --filter "@merit-circle/backend" run start
     ```
4. Masukkan seluruh **Environment Variables** persis seperti di Railway di atas.
5. Klik **Create Web Service**.

---

## 🌐 6. Langkah 4: Deploy Frontend Web (Next.js 16) ke Vercel

Vercel adalah platform resmi pembuat Next.js dengan dukungan penuh untuk Next.js 16 App Router & Turbopack.

1. Buka [vercel.com](https://vercel.com) dan login dengan akun GitHub Anda.
2. Klik **Add New...** ➔ **Project** ➔ Import repositori `MeritCircle`.
3. Pada halaman konfigurasi project:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** Klik **Edit** dan pilih folder **`apps/web`**. (Sangat penting!).
   - **Build and Output Settings:** Biarkan default.
4. Buka bagian **Environment Variables** dan tambahkan variabel berikut:

| Key | Value (Contoh) | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://meritcircle-backend.up.railway.app` | **Wajib:** Arahkan ke domain Backend live Anda |
| `NEXT_PUBLIC_APP_URL` | `https://meritcircle.vercel.app` | Domain frontend Anda di Vercel |
| `NEXT_PUBLIC_BNB_TESTNET_CHAIN_ID` | `97` | BNB Testnet Chain ID |
| `NEXT_PUBLIC_BNB_TESTNET_RPC_URL` | `https://data-seed-prebsc-1-s1.binance.org:8545/` | RPC Node Provider |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | `0x9B1234...` | Alamat Smart Contract yang sudah di-deploy |
| `NEXT_PUBLIC_DEMO_PAYMENT_MODE` | `true` | Aktifkan simulator interaktif demo Web3 |

5. Klik tombol **Deploy**.
6. Tunggu proses build selesai (~1-2 menit). Vercel akan memberikan domain publik (contoh: `https://meritcircle.vercel.app`).

---

## 🔄 7. Langkah 5: Sinkronisasi & Konfigurasi Akhir (Post-Deploy)

Setelah Frontend dan Backend Anda sama-sama memiliki domain live:

1. **Update `NEXT_PUBLIC_APP_URL` di Backend (Railway/Render):**
   - Buka dashboard Backend (Railway/Render).
   - Tambahkan variabel: `NEXT_PUBLIC_APP_URL` = `https://meritcircle.vercel.app` (domain Vercel Anda).
   - Simpan / redeploy agar backend mengenali origin frontend.

2. **Update `NEXT_PUBLIC_API_URL` di Frontend (Vercel):**
   - Pastikan variabel `NEXT_PUBLIC_API_URL` di Vercel sudah sesuai persis dengan domain backend Anda tanpa tanda slash di akhir (contoh: `https://meritcircle-backend.up.railway.app`).

---

## ✅ 8. Checklist Pengujian & Verifikasi Live (Smoke Test)

Setelah deployment selesai, lakukan verifikasi mandiri pada web live Anda:

- [ ] **1. Health Check Backend:** Buka `https://backend-domain/health` ➔ Status `"ok"`.
- [ ] **2. Akses Landing Page:** Buka `https://frontend-domain/` ➔ Logo Merit Circle, UI darkmatter glassmorphism, dan tombol *Launch App / Connect Wallet* tampil sempurna.
- [ ] **3. Connect Wallet:** Klik Connect Wallet menggunakan MetaMask pada jaringan **BNB Smart Chain Testnet (Chain ID 97)**.
- [ ] **4. Autentikasi Demo:** Masuk ke menu profile / onboarding, verifikasi akun demo.
- [ ] **5. Katalog Pool:** Buka `/pools` ➔ 12 Katalog Pool (Tier 1–5) dari database Supabase muncul dengan status `ACTIVE`.
- [ ] **6. Payment Hub:** Buka `/pay` ➔ Cek simulasi pembayaran tagihan siklus aktif.
- [ ] **7. Auction Room:** Buka `/auction` ➔ Pastikan tabel lelang dan penawaran diskon dapat diakses.
- [ ] **8. Admin Console:** Buka `/admin` ➔ Telemetri sistem real-time, manajemen grup, aksi demo *"Fill group with demo users"*, dan log audit dapat beroperasi dengan baik.

---

## ❓ 9. Panduan Kendala Umum (*Troubleshooting*)

### 1. Error: `PrismaClientInitializationError: Can't reach database server`
* **Penyebab:** Database Supabase sedang idle/paused atau connection string salah/memerlukan SSL.
* **Solusi:**
  - Pastikan menambahkan `?sslmode=require` di akhir `DATABASE_URL`.
  - Jika menggunakan connection pooler Supabase, pastikan menggunakan port `6543` dengan parameter `&pgbouncer=true`, atau port direct `5432`.
  - Cek di dashboard Supabase apakah project Anda berstatus *Active*.

### 2. Error: `CORS Policy Blocked` di Browser Console
* **Penyebab:** Frontend Vercel memanggil Backend di domain yang berbeda dan di-block oleh browser.
* **Solusi:** Backend Merit Circle sudah menggunakan `app.use(cors())` secara terbuka untuk kemudahan demo hackathon. Pastikan Anda tidak salah menuliskan protokol `https://` pada `NEXT_PUBLIC_API_URL`.

### 3. Error: `ProviderError: insufficient funds for gas * price + value` saat Deploy Contract
* **Penyebab:** Saldo tBNB pada akun deployer Anda kosong atau kurang dari biaya gas (~0.05 tBNB).
* **Solusi:** Masukkan alamat wallet deployer ke [BNB Testnet Faucet](https://testnet.binance.org/faucet-smart) untuk mendapatkan tBNB gratis sebelum menjalankan skrip deploy.

### 4. Tombol Sidebar Toggle di Desktop
* Tombol buka/tutup sidebar berada di sisi kiri **Topbar**. Anda juga dapat menekan kombinasi keyboard **`Ctrl + B`** (atau **`Cmd + B`** di Mac) kapan saja untuk memperluas atau menyembunyikan sidebar navigasi.

---

*Selamat! Aplikasi Merit Circle Anda kini telah siap digunakan dan dipresentasikan untuk Hackathon! 🎉*

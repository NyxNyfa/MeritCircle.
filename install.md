# Panduan Instalasi & Menjalankan Merit Circle (Hackathon MVP)

Dokumen ini berisi panduan lengkap langkah demi langkah (*step-by-step*) untuk menginstal, mengonfigurasi database, menjalankan backend & frontend, serta melakukan verifikasi demo hackathon.

---

## 1. Prasyarat Sistem (*Prerequisites*)

Pastikan perangkat Anda telah terpasang:
- **Node.js**: Versi `>= 20.0.0` ([Unduh Node.js](https://nodejs.org/))
- **pnpm**: Versi `>= 9.0.0` (Install via `npm install -g pnpm`)
- **Git**: Untuk clone repositori
- **PostgreSQL Database**:
  - **Opsi 1 (Paling Mudah / Cloud Gratis — Rekomendasi):** Gunakan [Neon.tech](https://neon.tech) atau [Supabase](https://supabase.com) (Gratis, langsung dapat connection string URL PostgreSQL tanpa perlu install software di laptop).
  - **Opsi 2 (Docker):** Jika memiliki Docker Desktop, jalankan `docker compose up -d`.
  - **Opsi 3 (Lokal Windows):** Install PostgreSQL dari [postgresql.org](https://www.postgresql.org/download/windows/).

---

## 2. Struktur Monorepo

Merit Circle menggunakan pnpm workspaces:
- `apps/backend`: Express.js REST API, autentikasi wallet, Prisma ORM, arisan engine, dan admin module.
- `apps/web`: React Web App untuk user marketplace dan Admin Control Panel.
- `packages/contracts`: Solidity Smart Contracts (Hardhat, OpenZeppelin) untuk BNB Smart Chain Testnet.
- `packages/domain`: Logika inti bisnis ROSCA, clamping reputasi 0–1000, aturan siklus, dan kalkulasi carryover.
- `packages/ui`: Design system, design tokens, dan komponen UI reusable.

---

## 3. Langkah Instalasi Step-by-Step

### Langkah 1: Kloning Repositori & Instalasi Dependensi
Buka terminal (PowerShell atau Bash) di direktori kerja Anda:

```bash
# Masuk ke direktori proyek
cd MeritCircle

# Install seluruh dependensi monorepo
pnpm install
```

---

### Langkah 2: Konfigurasi Environment (`.env`)
Salin file `.env.example` menjadi `.env` di root direktori proyek:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

Buka file `.env` dan perbarui nilai `DATABASE_URL`:

```env
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public

# CONTOH 1: Jika menggunakan PostgreSQL Lokal / Docker
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/merit_circle?schema=public"

# CONTOH 2: Jika menggunakan Cloud Database (Neon / Supabase)
DATABASE_URL="postgresql://neondb_owner:xxxxxx@ep-xxxxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
```

> **Catatan:** Nilai bawaan lainnya di `.env` (seperti `JWT_SECRET`, `PORT=4000`, `NEXT_PUBLIC_BNB_TESTNET_CHAIN_ID=97`) sudah memiliki nilai default yang siap digunakan untuk demo hackathon.

---

### Langkah 3: Menyiapkan Database PostgreSQL

Pilih salah satu cara berikut untuk menyediakan database:

#### Opsi A — Cloud PostgreSQL Gratis (Paling Cepat / Tanpa Install):
1. Buka [https://neon.tech](https://neon.tech) atau [https://supabase.com](https://supabase.com) dan buat akun/proyek gratis.
2. Salin connection string PostgreSQL yang diberikan.
3. Tempel URL tersebut ke variabel `DATABASE_URL` di file `.env`.

#### Opsi B — Menggunakan Docker (Jika Docker Desktop terpasang):
Cukup jalankan container PostgreSQL dengan docker-compose:
```bash
docker compose up -d
```

#### Opsi C — PostgreSQL Lokal (Windows Service):
Pastikan service PostgreSQL berjalan di port 5432 dan buat database bernama `merit_circle`:
```sql
CREATE DATABASE merit_circle;
```

---

### Langkah 4: Sinkronisasi Schema & Seed Data Demo

Jalankan perintah berikut secara berurutan (bisa langsung dari root repositori):

```bash
# 1. Generate Prisma Client
pnpm prisma:generate

# 2. Push schema ke database (otomatis membuat tabel di PostgreSQL / Supabase)
pnpm db:push

# 3. Jalankan seed demo idempoten
pnpm db:seed-demo
```

> **Tips:** Skrip di atas sudah dilengkapi fitur *auto-sync* environment sehingga perubahan `.env` di root akan otomatis tersinkronisasi ke `apps/backend/.env`.

**Data yang berhasil diisi oleh Seed Demo:**
- **Akun Admin:** `admin@meritcircle.local` (Role: `ADMIN`, Reputasi: 1000 pts / Tier 5).
- **Demo Users:** `demo-tier1` s.d. `demo-tier5` dengan reputasi dan tier sesuai level arisan.
- **12 Katalog Pool:** Mulai dari `START-1` (Tier 1), Citizen (`CIT-1..3`), Builder (`BLD-1..3`), Trusted (`TRU-1`, `TRU-A1..A2`), hingga Prime (`PRM-A1..A2`).
- **Demo Forming Groups:** Grup arisan `FORMING` siap uji coba.

---

### Langkah 5: Menjalankan Backend Server

Nyalakan server backend di port 4000:

```bash
# Menggunakan shortcut root:
pnpm dev:backend

# Atau menggunakan filter:
pnpm --filter "@merit-circle/backend" run dev
```

**Verifikasi:**
Buka browser Anda di `http://localhost:4000/api/health`. Respon yang diharapkan:
```json
{
  "status": "ok",
  "service": "merit-circle-backend",
  "timestamp": "2026-09-17T..."
}
```

---

### Langkah 6: Kompilasi & Menjalankan Frontend Web

Build atau jalankan aplikasi web frontend:

```bash
# Jalankan dev server web (port 3000)
pnpm dev:web

# Atau lakukan build produksi & typecheck:
pnpm --filter "@merit-circle/web" run typecheck
pnpm --filter "@merit-circle/web" run build
```

---

## 4. Pengujian & Verifikasi Otomatis

Jalankan verifikasi sistem untuk memastikan seluruh invariant ekonomi dan teknis berjalan sempurna:

```powershell
# 1. Demo Check (Validasi berkas & aturan invariant)
powershell -ExecutionPolicy Bypass -File scripts/demo-check.ps1

# 2. Jalankan 97 Unit Tests Backend
pnpm --filter "@merit-circle/backend" run test

# 3. Validasi Loop Resmi Phase 13
powershell -ExecutionPolicy Bypass -File scripts/validate.ps1 phase-13-admin-demo-smoke
```

Semua perintah di atas harus menghasilkan **0 error** dan status `PHASE_OK`.

---

## 5. Rute Navigasi Aplikasi

Setelah backend dan web menyala, Anda dapat mengakses rute-rute berikut:

### Portal Pengguna:
- `/` — Landing page & Connect Wallet
- `/dashboard` — Ringkasan portofolio, grup aktif, dan tagihan
- `/pools` — Marketplace katalog ROSCA pool
- `/pay` — Payment hub kontribusi arisan
- `/auction` — Ruang penawaran lelang diskon
- `/reputation` — Profil skor reputasi (0–1000) dan histori event
- `/settings` — Pengaturan profil dan verifikasi email

### Portal Admin (Hackathon Management):
- `/admin` — Overview telemetri sistem real-time
- `/admin/users` — Roster partisipan dan formulir penyesuaian reputasi
- `/admin/pools` — Manajemen katalog pool (Create / Pause / Activate)
- `/admin/groups` — Roster grup arisan
- `/admin/groups/[groupId]` — Detail grup, siklus, buku besar reward, dan aksi demo *"Fill group with demo users"*
- `/admin/auctions` — Kontrol lelang (Open / Close / Settle Cycle)
- `/admin/reputation` — Distribusi Tier 1–5 dan leaderboard reputasi
- `/admin/audit` — Log audit immutable atas semua tindakan administratif

---

## 6. Solusi Kendala (*Troubleshooting*)

### 1. `Environment variable not found: DATABASE_URL`
* **Penyebab:** Prisma CLI dijalankan di dalam direktori `apps/backend` dan membutuhkan file `.env`.
* **Solusi:** Cukup jalankan `pnpm db:push` atau `node scripts/sync-env.js`. Skrip ini otomatis menyalin `DATABASE_URL` dari root `.env` ke `apps/backend/.env`.

### 2. Supabase Connection & SSL
* **Tips Supabase:** Gunakan connection string dengan `sslmode=require` atau connection pooler Supabase (port 5432 atau 6543 dengan `?pgbouncer=true` jika menggunakan mode transaction).
* Contoh format:
  ```env
  DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"
  ```

### 3. Mengulangi Data Demo dari Awal (*Reset*)
Jika Anda ingin me-reset database dan mengulang data awal:
```bash
pnpm db:push --force-reset
pnpm db:seed-demo
```

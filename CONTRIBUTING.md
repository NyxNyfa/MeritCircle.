# Panduan Kontribusi Merit Circle 🤝

Terima kasih atas minat Anda untuk berkontribusi pada **Merit Circle**! Proyek ini bertujuan menghadirkan sistem tabungan dan kredit bergulir (Arisan) terdesentralisasi yang adil, transparan, dan teruji secara matematis di atas blockchain.

Dokumen ini berisi pedoman lengkap tentang alur kerja, standar kode, dan prosedur pengajuan perubahan.

---

## 📜 1. Ringkasan Kode Etik (Code of Conduct)
Kami berkomitmen menciptakan komunitas yang inklusif, ramah, dan bebas dari pelecehan. Setiap kontributor diharapkan:
- Menggunakan bahasa yang santun dan profesional.
- Terbuka terhadap kritik konstruktif dan kolaborasi.
- Mengutamakan keamanan dana pengguna dan integritas smart contract.

---

## 🍴 2. Alur Kerja Kontribusi (Git Workflow)

1. **Fork** repository ke akun GitHub pribadi Anda.
2. **Clone** repository lokal:
   ```bash
   git clone https://github.com/NyxNyfa/MeritCircle..git
   cd MeritCircle
   ```
3. **Buat branch baru** dari branch `develop` (atau `main` jika `develop` belum ada) dengan konvensi penamaan:
   - `feat/nama-fitur` : Untuk penambahan fitur baru
   - `fix/nama-bug` : Untuk perbaikan bug
   - `docs/nama-dokumen` : Untuk pembaruan dokumentasi
   - `refactor/nama-refactor` : Untuk perapian kode tanpa mengubah perilaku
   - `test/nama-test` : Untuk penambahan unit/e2e test
4. **Lakukan commit** secara berkala dengan format Conventional Commits.
5. **Push branch** Anda ke fork pribadi.
6. **Buka Pull Request (PR)** ke branch `main` repository utama dengan mengisi [PR Template](.github/PULL_REQUEST_TEMPLATE.md).

---

## 💬 3. Konvensi Pesan Commit (Conventional Commits)
Gunakan format standar berikut:
```
<type>(<scope>): <deskripsi singkat>

[opsional body penjelasan]
[opsional footer: Closes #123]
```

**Tipe yang diperbolehkan:**
- `feat`: Fitur baru untuk pengguna
- `fix`: Perbaikan bug
- `docs`: Perubahan dokumentasi saja
- `style`: Format kode (white-space, formatting, semicolons)
- `refactor`: Perubahan kode yang bukan bugfix maupun fitur
- `perf`: Optimasi performa
- `test`: Menambah atau memperbaiki test
- `chore`: Tugas build, tooling, dependency update

*Contoh:*
```
fix(contracts): fix getLowestBid arity in contracts.ts ABI
feat(auction): add discount calculation widget to Elite pool modal
```

---

## 💻 4. Menyiapkan Lingkungan Development

### Prasyarat:
- Node.js 20.x ke atas
- `pnpm` v9.x (`npm install -g pnpm`)
- [Foundry](https://getfoundry.sh/) (`curl -L https://foundry.paradigm.xyz | bash` lalu `foundryup`)
- Docker Desktop (opsional untuk database PostgreSQL lokal)

### Langkah Setup:
```bash
# 1. Install dependensi
pnpm install

# 2. Salin environment
cp .env.example apps/web/.env

# 3. Jalankan blockchain lokal Anvil di terminal 1
anvil --port 8545

# 4. Deploy smart contract ke Anvil di terminal 2
make deploy-local

# 5. Generate Prisma & jalankan dev server di terminal 3
make db-generate
make dev
```

---

## 🎨 5. Standar Kode & Style Guide

- **TypeScript**:
  - Dilarang keras menggunakan tipe `any`. Gunakan tipe data eksplisit, interface, atau generics.
  - Tangani semua kemungkinan nilai `null` atau `undefined` secara defensif.
- **Smart Contracts (Solidity)**:
  - Gunakan pragma solidity `^0.8.20`.
  - Jalankan `forge fmt` sebelum melakukan commit.
  - Setiap fungsi eksternal yang mengubah state wajib memiliki modifier `nonReentrant` dan `whenNotPaused` jika relevan.
- **Keamanan**:
  - Jangan pernah menulis API key, secret, atau private key di dalam kode sumber.
  - Selalu gunakan variabel environment (`process.env.NAMA_VARIABLE`).

---

## 🧪 6. Pengujian & Validasi

Sebelum mengajukan Pull Request, pastikan seluruh tahapan ini lulus dengan status zero-error:
```bash
# Typecheck TypeScript
pnpm typecheck

# Linting
pnpm lint

# Validasi otomatis Definition of Done
pnpm verify:dod
```

---

## 🐛 7. Melaporkan Bug atau Mengajukan Fitur

- **Bug Report**: Gunakan template [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md). Sertakan langkah reproduksi dan log console.
- **Feature Request**: Gunakan template [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md). Jelaskan latar belakang masalah dan usulan solusi teknis.

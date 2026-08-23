# Runbook Deploy & Operasional — Merit Pool Testnet

Panduan lengkap menjalankan Merit Pool dari nol hingga staging, plus prosedur operasional.
Status proyek: **testnet-first MVP** (spesifikasi v0.1). MC = working token testnet, BUKAN token
resmi Merit Circle ($MC → $BEAM). Validasi ulang identitas token & legalitas sebelum mainnet.

---

## 1. Prasyarat

| Tool | Versi | Catatan |
|---|---|---|
| Node.js | ≥ 20 LTS | |
| pnpm | ≥ 9 | `corepack enable` |
| Foundry (forge/cast/anvil) | latest | https://book.getfoundry.sh |
| PostgreSQL | 14+ | lokal atau managed (Supabase/Neon) |

## 2. Matriks Environment

### `contracts/.env`
```
PRIVATE_KEY=0x...          # deployer (wajib ber-tBNB utk chain 97)
BACKEND_PRIVATE_KEY=0x...  # signer tier/designation (BEDA dari deployer disarankan)
RESERVE_ADDRESS=0x...      # opsional; default = deployer
TREASURY_ADDRESS=0x...     # opsional; default = deployer
```

### `apps/web/.env`
```
DATABASE_URL=postgresql://...
BACKEND_PRIVATE_KEY=0x...      # HARUS sama dengan contracts
CHAIN_ID=31337                 # 31337 (Anvil) / 97 (BSC Testnet)
RPC_URL=http://127.0.0.1:8545  # RPC sesuai chain
ENABLE_BACKEND_JOBS=true       # indexer + keeper + default-check cron
KEEPER_PRIVATE_KEY=0x...       # opsional: auto-settle (gas testnet)
RESEND_API_KEY=re_...          # opsional: email verifikasi nyata
EMAIL_FROM="Merit Pool <onboarding@resend.dev>"
DEFAULT_GRACE_MINUTES=10       # tenggang sebelum default tercatat
ADMIN_WALLET=0x...             # akses /api/admin/*
```

## 3. Kontrak

### Anvil (development)
```bash
cd contracts
anvil --port 8545                    # terminal terpisah
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url http://127.0.0.1:8545 --private-key $PRIVATE_KEY --broadcast
# Alamat deterministik anvil fresh (nonce 0-2) sudah terisi di apps/web/src/config/contracts.ts
# Jika state anvil tidak fresh -> salin alamat baru dari output ke CHAIN_CONTRACTS[31337]
forge test                           # wajib: 28/28 PASS
```

### BNB Testnet 97
```bash
# 1. Fund deployer di faucet (butuh login GitHub): https://testnet.bnbchain.org/faucet-smart
# 2. Deploy:
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://bsc-testnet-dataseed.bnbchain.org --private-key $PRIVATE_KEY --broadcast
# 3. Salin alamat hasil deploy ke CHAIN_CONTRACTS[97] di apps/web/src/config/contracts.ts
# 4. Set CHAIN_ID=97 + RPC_URL BSC di apps/web/.env
```

## 4. Database

```bash
cd apps/web
npx prisma migrate deploy            # produksi/staging
npx prisma migrate dev               # development (buat migrasi baru)
npx tsx prisma/seed.ts               # data awal 6 pool + user test
```

## 5. Aplikasi Web

```bash
cd apps/web
npm install
npm run dev        # http://localhost:3000
npm run build      # verifikasi production build
```

Backend jobs (indexer/keeper/default-check) aktif hanya saat `ENABLE_BACKEND_JOBS=true`,
dijalankan via `src/instrumentation.ts` saat server boot.

## 6. Staging (Vercel + Postgres Managed)

1. Buat database (Supabase/Neon) → isi `DATABASE_URL` (pakai connection pooling).
2. Import repo ke Vercel → set seluruh env matriks §2 pada project settings
   (`ENABLE_BACKEND_JOBS=true` dan `KEEPER_PRIVATE_KEY` hanya jika instance long-running;
   serverless Vercel TIDAK mendukung interval instrumentation — jalankan jobs via
   panggilan berkala `POST /api/cron/*` bila tersedia, atau host worker terpisah).
3. Jalankan `prisma migrate deploy` dari CI/lokal ke DB staging.
4. Domain + RPC publik (https://bsc-testnet-dataseed.bnbchain.org).

> Catatan arsitektur: indexer interval memakai in-process scheduler. Untuk platform
> serverless, gunakan worker terpisah (container kecil / Railway / Fly.io) dengan env sama.

## 7. Checklist Pasca-Deploy

- [ ] `curl -X POST $HOST/api/auth/nonce -H 'Content-Type: application/json' -d '{"address":"0x0.."}'` → 200 nonce
- [ ] `POST /api/pools/designation {"poolIdOnChain":0}` → 409 "tidak ACTIVE" (bukan 500) = kontrak+DB sinkron
- [ ] Log server menampilkan `[jobs] backend jobs dimulai`
- [ ] `IndexerCursor.lastBlock` bertambah (cek DB)
- [ ] Swap tBNB→MC sukses; join Basic Pool oleh 3 akun → settle → payout diterima
- [ ] `DATABASE_URL=... npx tsx scripts/verify-dod.ts` → 15 PASS

## 8. Prosedur Operasional

| Situasi | Aksi |
|---|---|
| Darurat (bug/eksploit) | `pause()` via wallet owner (cast sendMeritPool pause) → investigasi → `unpause()` |
| Pool COMPLETED, buka kohort baru | `reopenPool(poolId)` owner-only (round++ , state reset) |
| Rotasi backend signer | `setBackendSigner(newAddr)` + update BACKEND_PRIVATE_KEY di web lalu restart |
| Simulasi default | Turunkan deadline: tunggu cycle lewat tanpa bayar; default-check cron + kontrak merekam |
| Reset total dev | Restart Anvil fresh → deploy ulang → sinkron alamat → `prisma migrate reset` + seed |

## 9. Keamanan & Batas Pra-Mainnet

- Kontrak: owner multisig wajib di mainnet; audit eksternal wajib; VRF untuk tie-breaker.
- Backend: rate limiting + anti-Sybil (email/wallet/device signals) belum aktif penuh di MVP.
- Legal: klasifikasi produk (tabungan? pembiayaan? kustodian?) harus dinilai penasihat hukum
  per yurisdiksi sebelum nilai nyata dipertaruhkan (spesifikasi §71).
- Token: ganti MC_TEST menjadi token final hanya setelah keputusan legal/branding (§56, §82).

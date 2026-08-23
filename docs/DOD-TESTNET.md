# Definition of Done — MVP Testnet (Spesifikasi §81)

Status verifikasi per item. Jalankan ulang kapan saja:

```bash
cd apps/web
DATABASE_URL=... npx tsx scripts/verify-dod.ts      # cek otomatis (DB + on-chain + logika)
npx tsx scripts/simulate-economy.ts                 # simulasi ekonomi §24
cd ../contracts && forge test                       # 28 test kontrak
```

Terakhir diverifikasi: 2026-08-22 · **15 PASS · 0 FAIL · 4 MANUAL**

## Checklist

| # | Butir §81 | Status | Bukti |
|---|---|---|---|
| 1 | User dapat connect wallet | 👤 MANUAL | Landing → Connect Wallet → dashboard (wagmi, BSC-97/Anvil) |
| 2 | User dapat verifikasi email | ✅ PASS | `/api/auth/email/send-verification` + `/api/auth/email/verify` + badge profil |
| 3 | Merit Score awal = 0 | ✅ PASS | `calculateTier` 13 kasus uji; register membuat score 0 |
| 4 | Tampil di Tier 0 | ✅ PASS | Band tier sesuai §14 (0/1–20/21–50/51–75/76–90/91–100) |
| 5 | Dapat masuk Basic Pool | ✅ PASS | E2E `e2e-lifecycle.ts`: 3 user join pool 0 |
| 6 | Kontribusi MC | ✅ PASS | 9 contributions PAID di DB (indexer) |
| 7 | Sistem menentukan urutan payout | ✅ PASS | Designation backend-signed `(poolId, round, cycle, winner)` |
| 8 | Payout dieksekusi | ✅ PASS | 3 payouts terekam + tx_hash |
| 9 | Merit naik | ✅ PASS | 6 reputation_events positif |
| 10 | Progres ke Tier 1 & pool terbuka | ✅ PASS | User E2E mencapai Tier 2 setelah 1 pool; akses tier-turun aktif |
| 11 | Bid auction Tier 4–5 | 👤 MANUAL | forge `test_Auction_*` (butuh state Elite aktif untuk live) |
| 12 | Invalid bid ditolak | 👤 MANUAL | forge `test_Auction_MinBidEnforced`, `BidReplaceDownOnly`, dll. |
| 13 | Diskon ≤ 15% | ✅ PASS | `minValidBid(Elite) = 425 MC` = 85% × 500 (bacaan on-chain live) |
| 14 | Lowest valid bid wins | 👤 MANUAL | forge `test_Auction_LowestBidWins_SurplusSplitExact` |
| 15 | Surplus dihitung | 👤 MANUAL | forge split eksak 60/25/15 + simulator invarian I5 |
| 16 | Previous winner ditampilkan | ✅ PASS | `pool.lastWinnerUsername` terisi via indexer |
| 17 | Obligation terlihat s.d. selesai | ✅ PASS | Model Obligation + panel profil + missedCycles |
| 18 | Tanpa faucet di dashboard | ✅ PASS | Grep UI: nol referensi faucet |
| 19 | Audit trail kejadian finansial | ✅ PASS | tx_hash pada payouts/contributions + reputation_events ledger |
| 20 | Skenario default dapat disimulasikan | ✅ PASS | Simulator 42 skenario (1/2/10/20/50/100%) — semua invarian OK |

## Hasil Simulasi Ekonomi (ringkas)

- **Konservasi dana**: total koleksi == total distribusi (winner+surplus) di seluruh 42 skenario.
- **Exposure struktural = 0**: payout selalu ≤ koleksi cycle berjalan (tidak ada payout tanpa cadangan).
- **Eksposur riil** = iuran gagal bayar (outstanding obligation), proporsional dengan default rate; slot payout hangus muncul pada default ekstrem (100%).
- **Auction surplus mengalir benar** saat tanpa default (Elite ≈ 189 MC/round → 114 anggota / 47 reserve / 28 treasury).

## Catatan MANUAL (4 butir)

Butir manual memiliki bukti automated (Foundry 28/28 PASS) namun belum dieksekusi live terhadap
state Elite yang sedang berjalan di Anvil/97 — akan tertutup otomatis saat closed beta (Fase 5)
dengan kohort nyata di pool auction.

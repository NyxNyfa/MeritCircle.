Berikut **PRD.md final** untuk **Merit Circle**, sudah menggabungkan seluruh keputusan dari awal sampai revisi terakhir (carryover reward tanpa final surplus, BNB Testnet, smart contract lengkap, tier, penalty, group system, dan pool variations).

```markdown
# PRD — Merit Circle

**Document Owner:** Product Team  
**Status:** Final — Hackathon MVP  
**Version:** 1.0.0  
**Network:** BNB Smart Chain Testnet  
**Product Type:** Web3 Reputation-Based Arisan / Liquidity Circle  

---

## 1. Executive Summary

**Merit Circle** adalah aplikasi arisan Web3 berbasis reputasi di BNB Smart Chain Testnet.

Pengguna:

1. Login dengan wallet.
2. Melengkapi profil dasar.
3. Membangun reputation point.
4. Mendapatkan tier.
5. Mengikuti pool arisan sesuai tier.
6. Masuk ke dalam kelompok kecil.
7. Membayar iuran setiap siklus.
8. Mengikuti auction untuk mendapatkan payout lebih awal pada pool spesial.
9. Menjaga kewajiban pembayaran sampai seluruh siklus selesai.
10. Meningkatkan reputasi melalui perilaku pembayaran yang baik.

### Tagline

> **Build merit. Unlock liquidity.**

Versi Indonesia:

> **Bangun reputasi, buka akses likuiditas.**

### Prinsip utama

```text
Build reputation
↓
Unlock tier
↓
Join circle
↓
Contribute
↓
Access liquidity
↓
Repay consistently
↓
Grow reputation
```

---

## 2. Product Vision

Merit Circle bertujuan mengubah arisan tradisional menjadi sistem yang:

- Transparan.
- Berbasis reputasi.
- Dapat diverifikasi di blockchain.
- Memiliki mekanisme liquidity auction.
- Memberi insentif untuk perilaku pembayaran yang baik.
- Memberi penalti untuk keterlambatan.
- Mudah digunakan oleh pengguna biasa.

Blockchain bekerja di belakang layar. Pengguna tidak perlu memahami konsep teknis DeFi secara mendalam.

### Fokus Hackathon

Versi ini dibangun untuk hackathon Web3 dengan batasan:

- Menggunakan BNB Testnet.
- Tidak menggunakan uang nyata.
- Tidak menggunakan QRIS/payment gateway fiat.
- Tidak menggunakan collateral.
- Tidak menggunakan KYC berat.
- Fokus pada mekanisme reputasi, group, contribution, auction, dan settlement.

---

## 3. Problem

Arisan tradisional memiliki beberapa masalah:

1. Kurang transparan dalam penentuan urutan penerima.
2. Sulit memverifikasi riwayat pembayaran anggota.
3. Risiko anggota telat atau gagal bayar.
4. Tidak ada sistem reputasi yang dapat dibawa lintas komunitas.
5. Tidak ada mekanisme objektif untuk menentukan siapa yang paling layak menerima dana lebih awal.
6. Administrasi manual rawan kesalahan.

Merit Circle mencoba menyelesaikan masalah ini dengan:

- Reputation point.
- Tier system.
- Smart contract settlement.
- Auction untuk liquidity lebih awal.
- Penalty otomatis untuk keterlambatan.
- Audit trail on-chain dan off-chain.

---

## 4. Product Goals

### MVP harus mampu

1. User connect wallet di BNB Testnet.
2. User melengkapi profil.
3. User melakukan verifikasi email.
4. Sistem menghitung reputation point.
5. Sistem menentukan tier.
6. User melihat pool sesuai tier.
7. User join pool.
8. Sistem membentuk group.
9. Group aktif saat anggota terpenuhi.
10. User membayar iuran dengan BNB Testnet ke smart contract.
11. Basic Pool melakukan payout berbasis urutan reputasi.
12. Auction Pool membuka auction pada siklus non-final.
13. Risk engine memeriksa eligibility.
14. Lowest valid bid menang.
15. Surplus auction dibawa ke siklus berikutnya.
16. Siklus final membayar full reward pool.
17. Sistem mencatat keterlambatan dan penalty.
18. Reputasi naik/turun sesuai perilaku.
19. Admin panel tersedia untuk demo.

### Non-Goals MVP

Jangan dibangun dulu:

- Native token.
- DAO governance.
- Cross-chain.
- KYC nasional.
- Collateral.
- Protection reserve kompleks.
- AI credit scoring.
- ZK identity.
- Production fiat payment rails.
- Multi-currency.
- Mobile native app.

---

## 5. User Roles

### 5.1 User

Dapat:

- Connect wallet.
- Melengkapi profil.
- Verifikasi email.
- Melihat reputation dan tier.
- Melihat pool.
- Join pool.
- Melihat group dan siklus.
- Membayar iuran.
- Mengikuti auction pada pool spesial.
- Melihat riwayat pembayaran.
- Melihat riwayat reputation point.

### 5.2 Admin

Dapat:

- Membuat pool.
- Mengatur variasi pool.
- Force start group.
- Force settle cycle.
- Menambah/mengurangi reputation point untuk demo.
- Melihat audit log.
- Mengelola user yang bermasalah.
- Menghentikan pool jika diperlukan.

### 5.3 System / Smart Contract

Bertanggung jawab untuk:

- Mencatat pembayaran iuran.
- Menyimpan dana group.
- Menghitung reward pool.
- Menyimpan carried reward.
- Menjalankan payout.
- Mengeluarkan event on-chain.

---

## 6. Core User Journey

```text
User connect wallet di BNB Testnet
↓
User melengkapi profil
↓
User verifikasi email
↓
Sistem menghitung reputation point
↓
User mendapat tier
↓
User melihat pool yang tersedia
↓
User join pool
↓
Sistem memasukkan user ke group
↓
Group aktif setelah anggota terpenuhi
↓
Siklus pertama dimulai
↓
User membayar iuran dalam 10 hari pertama
↓
Jika Basic Pool:
    payout ditentukan berdasarkan urutan reputasi
↓
Jika Auction Pool:
    auction dibuka pada siklus non-final
    user eligible submit bid
    lowest valid bid menang
    sisa reward dibawa ke siklus berikutnya
↓
Siklus final:
    penerima terakhir menerima full reward pool
↓
Group selesai
↓
Reputasi diperbarui berdasarkan perilaku pembayaran
```

---

## 7. Profile System

### 7.1 Field profil

| Field | Required untuk join pool | Menambah reputation |
|---|---:|---:|
| Wallet address | Yes | Yes |
| Username | Yes | Yes |
| Email | Yes | Yes |
| Email verified | Yes | Yes |
| X / Twitter | No | Yes |
| Telegram | No | Yes |
| Discord | No | Yes |
| Foto profil | No | Yes |

### 7.2 Aturan minimum join pool

User hanya boleh join pool jika:

```text
Username terisi
+
Email verified
```

User boleh browse pool tanpa profil lengkap, tetapi tidak bisa join.

### 7.3 Validasi email

Email verification menggunakan provider eksternal.

Flow:

```text
User input email
↓
Backend generate OTP/token
↓
Backend kirim email via provider
↓
User input OTP atau klik link
↓
Backend verifikasi
↓
Email verified
↓
Reputation point ditambah
```

---

## 8. Reputation System

Merit Circle menggunakan reputation point:

```text
Minimum: 0
Maximum: 1000
```

Reputation point bukan skor kredit tradisional, tetapi representasi perilaku pengguna di dalam aplikasi.

### 8.1 Reward point

| Aksi | Point |
|---|---:|
| Connect wallet pertama kali | +10 |
| Set username | +10 |
| Input email | +10 |
| Verifikasi email | +40 |
| Tambah X | +5 |
| Tambah Telegram | +5 |
| Tambah Discord | +5 |
| Upload foto profil | +15 |
| Join pool pertama | +20 |
| Bayar iuran tepat waktu | +50 per siklus |
| Bayar sebelum hari ke-3 | +10 bonus |
| Menyelesaikan seluruh siklus dalam satu group | +100 |
| Menang auction dan menyelesaikan semua kewajiban | +50 bonus |

### 8.2 Penalty point

| Aksi | Point |
|---|---:|
| Telat bayar iuran | -10 per hari setelah hari ke-10 |
| Maximum penalty per siklus | -100 |
| Tidak bayar sampai settlement dan membutuhkan force settle | -150 |
| Gagal menyelesaikan group / default berat | -300 |
| Fake profile / spam / fraud | -100 sampai -300 |

### 8.3 Aturan point

```text
Point tidak boleh kurang dari 0.
Point tidak boleh lebih dari 1000.
Semua perubahan point dicatat sebagai reputation event.
Point dapat dipengaruhi oleh aksi user, sistem, dan admin adjustment.
```

### 8.4 Reputation event types

```text
WALLET_CONNECTED
USERNAME_SET
EMAIL_VERIFIED
SOCIAL_X_ADDED
SOCIAL_TELEGRAM_ADDED
SOCIAL_DISCORD_ADDED
AVATAR_UPLOADED
PROFILE_COMPLETED
JOIN_POOL
CONTRIBUTION_ON_TIME
CONTRIBUTION_EARLY_BONUS
CONTRIBUTION_LATE
CONTRIBUTION_UNPAID
GROUP_COMPLETED
AUCTION_SUCCESSFULLY_REPAID
ADMIN_ADJUSTMENT
```

---

## 9. Tier System

### 9.1 Tier table

| Point | Tier | Nama | Max Active Groups |
|---:|---:|---|---:|
| 0 - 100 | Tier 1 | Newcomer | 1 |
| 101 - 400 | Tier 2 | Citizen | 2 |
| 401 - 700 | Tier 3 | Builder | 3 |
| 701 - 900 | Tier 4 | Trusted | 4 |
| 901 - 1000 | Tier 5 | Prime | 5 |

### 9.2 Fungsi tier

Tier menentukan:

1. Pool yang dapat diakses.
2. Jumlah active group maksimum.
3. Eligibility untuk Auction Pool.
4. Akses ke pool dengan kontribusi lebih besar.

### 9.3 Aturan akses pool

```text
User dapat mengikuti pool jika:
pool.minimumTier <= user.tier
```

Contoh:

```text
Tier 1 → Pool tanpa tier / Tier 1
Tier 2 → Pool Tier 1 + Tier 2
Tier 3 → Pool Tier 1 + Tier 2 + Tier 3
Tier 4 → Pool Tier 1 + Tier 2 + Tier 3 + Tier 4 + Auction Tier 4
Tier 5 → Semua pool termasuk Prime Auction
```

---

## 10. Pool System

Merit Circle memiliki dua mode pool:

```text
1. Basic Pool
2. Auction Pool
```

### 10.1 Basic Pool

Basic Pool adalah arisan biasa tanpa auction.

Aturan:

```text
Tidak ada auction.
Setiap siklus satu anggota menerima payout.
Urutan penerima ditentukan berdasarkan reputasi saat group aktif.
Jika reputasi sama, urutan ditentukan secara acak.
Setiap anggota hanya boleh menerima payout satu kali per group.
Semua anggota tetap wajib bayar iuran sampai semua siklus selesai.
```

Untuk Basic Pool:

```text
Reward pool = total iuran siklus berjalan
Payout = full reward pool
Carried reward = 0
```

### 10.2 Auction Pool

Auction Pool adalah pool spesial dengan mekanisme liquidity auction.

Aturan:

```text
Minimal Tier 4.
Auction hanya berjalan pada siklus non-final.
Siklus final tidak menggunakan auction discount.
User yang sudah menerima payout tidak boleh menang lagi di group yang sama.
User harus sudah bayar iuran siklus berjalan untuk bisa bid.
Lowest valid bid menang.
Sisa reward dibawa ke siklus berikutnya.
Siklus terakhir membayar full reward pool.
```

### 10.3 Pool parameters

Setiap pool memiliki:

```text
poolId
name
description
mode
minimumTier
groupSize
cycleCount
cycleDurationDays
paymentWindowDays
auctionOpenDay
auctionCloseDay
settlementDay
contributionAmountWei
maxDiscountBps
status
```

Contoh:

```text
poolId: CIT-2
name: Citizen Circle B
mode: BASIC
minimumTier: 2
groupSize: 5
cycleCount: 5
cycleDurationDays: 30
paymentWindowDays: 10
contributionAmountWei: 1500000000000000
status: ACTIVE
```

Contoh Auction Pool:

```text
poolId: TRU-A1
name: Trusted Auction A
mode: AUCTION
minimumTier: 4
groupSize: 5
cycleCount: 5
cycleDurationDays: 30
paymentWindowDays: 10
auctionOpenDay: 11
auctionCloseDay: 25
settlementDay: 30
contributionAmountWei: 5000000000000000
maxDiscountBps: 1000
status: ACTIVE
```

Keterangan:

```text
maxDiscountBps 1000 = 10%
```

---

## 11. Pool Catalog

Berikut katalog pool untuk hackathon.

### 11.1 Tier 1 / Starter

| Pool ID | Nama | Mode | Min Tier | Group Size | Kontribusi | Siklus |
|---|---|---|---:|---:|---:|---:|
| START-1 | Starter Circle | Basic | Tier 1 | 3 | 0.0005 BNB | 3 |

### 11.2 Tier 2 Citizen

Tier 2 memiliki 3 variasi pool.

| Pool ID | Nama | Mode | Min Tier | Group Size | Kontribusi | Siklus |
|---|---|---|---:|---:|---:|---:|
| CIT-1 | Citizen Circle A | Basic | Tier 2 | 3 | 0.001 BNB | 3 |
| CIT-2 | Citizen Circle B | Basic | Tier 2 | 5 | 0.0015 BNB | 5 |
| CIT-3 | Citizen Circle C | Basic | Tier 2 | 7 | 0.002 BNB | 7 |

### 11.3 Tier 3 Builder

| Pool ID | Nama | Mode | Min Tier | Group Size | Kontribusi | Siklus |
|---|---|---|---:|---:|---:|---:|
| BLD-1 | Builder Circle A | Basic | Tier 3 | 5 | 0.002 BNB | 5 |
| BLD-2 | Builder Circle B | Basic | Tier 3 | 7 | 0.003 BNB | 7 |
| BLD-3 | Builder Circle C | Basic | Tier 3 | 10 | 0.004 BNB | 10 |

### 11.4 Tier 4 Trusted

| Pool ID | Nama | Mode | Min Tier | Group Size | Kontribusi | Siklus | Max Discount |
|---|---|---|---:|---:|---:|---:|---:|
| TRU-1 | Trusted Basic A | Basic | Tier 4 | 5 | 0.005 BNB | 5 | - |
| TRU-A1 | Trusted Auction A | Auction | Tier 4 | 5 | 0.005 BNB | 5 | 10% |
| TRU-A2 | Trusted Auction B | Auction | Tier 4 | 7 | 0.004 BNB | 7 | 12% |

### 11.5 Tier 5 Prime

| Pool ID | Nama | Mode | Min Tier | Group Size | Kontribusi | Siklus | Max Discount |
|---|---|---|---:|---:|---:|---:|---:|
| PRM-A1 | Prime Auction A | Auction | Tier 5 | 10 | 0.01 BNB | 10 | 15% |
| PRM-A2 | Prime Auction B | Auction | Tier 5 | 5 | 0.02 BNB | 5 | 20% |

Catatan:

```text
Jumlah kontribusi dapat disesuaikan untuk demo hackathon
agar tidak terlalu berat terhadap limit faucet BNB Testnet.
```

---

## 12. Group System

Pool memiliki kapasitas member tidak terbatas, tetapi anggota dibagi menjadi group kecil.

### 12.1 Konsep group

```text
Pool
├── Group 1
├── Group 2
├── Group 3
└── Group N
```

Setiap group memiliki:

```text
groupId
poolId
groupNumber
status
memberCount
memberLimit
startDate
currentCycle
```

### 12.2 Group size

```text
groupSize = jumlah anggota per kelompok
cycleCount = groupSize
```

Contoh:

```text
Pool dengan groupSize 3
→ setiap kelompok berisi 3 orang
→ setiap kelompok menjalankan 3 siklus
```

### 12.3 Group formation

Saat user join pool:

```text
Sistem mencari group dengan status FORMING yang masih memiliki slot.
Jika ada, user dimasukkan ke group tersebut.
Jika tidak ada, sistem membuat group baru.
Jika group menjadi penuh, group berubah menjadi ACTIVE.
```

Contoh:

```text
Pool group size = 3

User 1 join → Group 1 FORMING
User 2 join → Group 1 FORMING
User 3 join → Group 1 ACTIVE
User 4 join → Group 2 FORMING
User 5 join → Group 2 FORMING
User 6 join → Group 2 ACTIVE
```

### 12.4 Group status

```text
FORMING
ACTIVE
COMPLETED
FAILED
CANCELLED
```

Keterangan:

| Status | Penjelasan |
|---|---|
| FORMING | Menunggu anggota terpenuhi |
| ACTIVE | Siklus sedang berjalan |
| COMPLETED | Semua siklus selesai |
| FAILED | Group gagal karena masalah berat |
| CANCELLED | Group dibatalkan sebelum aktif |

### 12.5 Group locking

```text
Selama group masih FORMING, user boleh leave.
Setelah group ACTIVE, user tidak boleh leave.
User wajib menyelesaikan seluruh siklus.
```

---

## 13. Cycle System

Setiap group menjalankan siklus sebanyak jumlah anggota.

### 13.1 Durasi siklus

```text
1 siklus = 30 hari
```

### 13.2 Timeline siklus

```text
Day 0
Cycle dimulai

Day 0 - Day 10
Payment window
Semua anggota wajib bayar iuran

Day 10
Payment deadline

Day 11
Late payment mulai dihitung
Auction dibuka untuk Auction Pool

Day 11 - Day 25
Auction window untuk Auction Pool

Day 25
Auction ditutup

Day 26 - Day 29
Risk check / settlement preparation

Day 30
Settlement
Payout dikirim
Cycle selesai
```

### 13.3 Cycle status

```text
UPCOMING
PAYMENT_OPEN
PAYMENT_CLOSED
AUCTION_OPEN
AUCTION_CLOSED
SETTLING
COMPLETED
FAILED
```

---

## 14. Contribution System

Setiap anggota wajib membayar iuran setiap siklus.

### 14.1 Contribution object

```text
contributionId
groupId
cycleId
userId
amountWei
status
dueDate
paidAt
txHash
lateDays
penaltyPoint
```

### 14.2 Contribution status

```text
PENDING
PAID_ON_TIME
PAID_LATE
UNPAID
```

### 14.3 Payment window

```text
Hari 0 sampai hari 10
```

Jika user membayar sebelum hari ke-3:

```text
Berpotensi mendapat early payment bonus.
```

Jika user membayar setelah hari ke-10:

```text
Dihitung late.
Mendapat penalty point.
```

---

## 15. Payment with BNB Testnet

Pembayaran dilakukan langsung ke smart contract menggunakan BNB Testnet.

### 15.1 Payment flow

```text
User membuka halaman payment
↓
Sistem menampilkan:
    groupId
    cycleNumber
    contributionAmount
    contract address
↓
User klik Pay
↓
Wallet memanggil function payContribution()
↓
User mengirim BNB Testnet sesuai jumlah iuran
↓
Smart contract menerima pembayaran
↓
Smart contract emit ContributionPaid
↓
Backend indexer membaca event
↓
Backend memperbarui status kontribusi
↓
Sistem memberi atau mengurangi reputation point sesuai waktu bayar
```

### 15.2 Validasi pembayaran

Backend harus memverifikasi:

```text
Transaction hash valid
Transaction success
From address sesuai dengan user
To address sesuai contract
Value sesuai contribution amount
Cycle valid
User adalah member group
Pembayaran belum pernah diproses
```

### 15.3 Idempotency

```text
Setiap transaction hash hanya boleh diproses satu kali.
Backend harus mencegah double crediting.
```

---

## 16. Late Payment Penalty

### 16.1 Aturan

Keterlambatan dihitung setelah hari ke-10.

```text
Day 11 = telat 1 hari = -10
Day 12 = telat 2 hari = -20
Day 13 = telat 3 hari = -30
...
Day 20 = telat 10 hari = -100
Day 21 dan seterusnya = tetap -100
```

Formula:

```text
daysLate = jumlah hari setelah hari ke-10
penaltyPoint = min(daysLate * 10, 100)
```

### 16.2 Contoh

| Waktu bayar | Days late | Penalty |
|---|---:|---:|
| Day 10 | 0 | 0 |
| Day 11 | 1 | -10 |
| Day 12 | 2 | -20 |
| Day 15 | 5 | -50 |
| Day 20 | 10 | -100 |
| Day 25 | 15 | -100 |

### 16.3 Penalty per siklus

Penalty dihitung per siklus.

Jika user telat di 2 siklus:

```text
Penalty siklus A + Penalty siklus B
```

### 16.4 Contoh kasus

Kasus:

```text
User belum bayar iuran siklus 2.
Pada siklus 3 hari ke-11, user membayar:
- iuran siklus 2
- iuran siklus 3
```

Maka:

```text
Siklus 2 sudah sangat telat → penalty maksimal -100
Siklus 3 telat 1 hari → penalty -10
Total penalty = -110
Total pembayaran = 2 x kontribusi
```

---

## 17. Auction System

Auction hanya berlaku untuk Auction Pool dan hanya pada siklus non-final.

### 17.1 Auction timeline

```text
Day 11 - Day 25 : Auction dibuka
Day 25           : Auction ditutup
Day 26 - Day 29  : Risk check dan seleksi winner
Day 30           : Settlement
```

### 17.2 Auction object

```text
auctionId
groupId
cycleId
status
rewardPoolWei
minimumPayoutWei
maxDiscountBps
bestBidder
bestBidAmountWei
openAt
closeAt
settlementAt
```

### 17.3 Auction status

```text
SCHEDULED
OPEN
CLOSED
SETTLED
CANCELLED
NO_VALID_BID
```

### 17.4 Eligibility untuk submit bid

User boleh submit bid jika:

```text
Pool mode = AUCTION
Cycle bukan final
Auction sedang terbuka
User adalah member group
User sudah bayar iuran siklus berjalan
User belum pernah menerima payout di group ini
User tier >= pool minimum tier
User tidak sedang dibatasi karena fraud/default
```

### 17.5 Bid rules

```text
Bid adalah jumlah payout yang bersedia diterima user.
Bid lebih rendah berarti user meminta discount lebih besar.
Bid tidak boleh lebih rendah dari minimum payout.
Bid tidak boleh lebih tinggi dari reward pool.
Bid terbaik adalah lowest valid bid.
Jika ada bid sama, bid paling awal menang.
```

### 17.6 Maximum discount

```text
maxDiscountBps menentukan discount maksimum.
```

Contoh:

```text
Reward pool = 0.0033 BNB
Max discount = 10%
Minimum payout = 0.0033 x 90% = 0.00297 BNB
```

Bid di bawah 0.00297 BNB:

```text
INVALID
```

---

## 18. Reward Carryover System

Ini adalah mekanisme final untuk surplus auction.

### 18.1 Prinsip utama

```text
Tidak ada final surplus.
Semua sisa reward harus habis pada siklus terakhir.
```

### 18.2 Formula reward pool

Untuk setiap siklus:

```text
baseReward = groupSize x contributionAmount
carriedReward = sisa reward dari siklus sebelumnya
rewardPool = baseReward + carriedReward
```

### 18.3 Siklus pertama

```text
carriedReward = 0
rewardPool = baseReward
```

### 18.4 Siklus non-final

```text
rewardPool = baseReward + carriedReward
winnerPayout = winning bid
newCarriedReward = rewardPool - winnerPayout
```

`newCarriedReward` dibawa ke siklus berikutnya.

### 18.5 Siklus final

```text
finalRewardPool = baseReward + carriedReward
finalPayout = finalRewardPool
newCarriedReward = 0
```

### 18.6 Contoh 3 orang, 3 siklus

Konfigurasi:

```text
Group size: 3
Kontribusi: 0.001 BNB
Total iuran per siklus: 0.003 BNB
```

#### Siklus 1

```text
Reward pool = 0.003 BNB
Winner bid = 0.0027 BNB
Payout = 0.0027 BNB
Carried reward = 0.0003 BNB
```

#### Siklus 2

```text
Reward pool = 0.003 + 0.0003 = 0.0033 BNB
Winner bid = 0.0030 BNB
Payout = 0.0030 BNB
Carried reward = 0.0003 BNB
```

#### Siklus 3 final

```text
Reward pool = 0.003 + 0.0003 = 0.0033 BNB
Penerima terakhir menerima full 0.0033 BNB
Carried reward = 0
```

### 18.7 Tidak ada final surplus

```text
Tidak ada distribusi final surplus.
Tidak ada claim final surplus.
Tidak ada final treasury distribution.
Siklus terakhir harus menghabiskan seluruh reward pool.
```

---

## 19. Final Cycle Settlement

### 19.1 Aturan final cycle

```text
Cycle final adalah cycle terakhir dalam group.
Cycle final tidak menggunakan auction discount.
Penerima terakhir menerima seluruh reward pool.
```

### 19.2 Penentuan penerima final

Dalam kondisi normal:

```text
Karena setiap anggota hanya boleh menerima payout satu kali,
pada siklus terakhir hanya tersisa satu anggota yang belum menerima payout.
```

Maka:

```text
Penerima final = satu-satunya member yang belum menerima payout.
```

### 19.3 Validasi final settlement

```text
Cycle adalah cycle terakhir.
Semua member sudah membayar iuran cycle final.
Recipient adalah member group.
Recipient belum pernah menerima payout.
Group belum completed.
```

### 19.4 Setelah final settlement

```text
groupBalance = 0
carriedReward = 0
group status = COMPLETED
```

---

## 20. Basic Pool Settlement

Untuk Basic Pool:

```text
Tidak ada auction.
Tidak ada carried reward.
Setiap siklus membayar full reward pool.
```

Formula:

```text
rewardPool = groupSize x contributionAmount
payout = rewardPool
carriedReward = 0
```

Urutan penerima:

```text
Berdasarkan reputation snapshot saat group aktif.
Jika reputasi sama, gunakan random.
```

---

## 21. Risk Engine / Eligibility Engine

Karena versi hackathon tidak menggunakan collateral dan KYC, risk engine disederhanakan.

### 21.1 Join pool risk check

```text
if username empty:
    reject

if email not verified:
    reject

if user.tier < pool.minimumTier:
    reject

if user.activeGroupCount >= tier.maxActiveGroups:
    reject

if pool.status != ACTIVE:
    reject

if user.banned:
    reject

else:
    allow
```

### 21.2 Auction bid risk check

```text
if pool.mode != AUCTION:
    reject

if cycle.isFinalCycle:
    reject

if auction.status != OPEN:
    reject

if user not member:
    reject

if user has not paid current cycle contribution:
    reject

if user has received payout in this group:
    reject

if bid < minimumPayout:
    reject

if bid > rewardPool:
    reject

else:
    eligible
```

### 21.3 Multi group limit

```text
Tier 1: max 1 active group
Tier 2: max 2 active groups
Tier 3: max 3 active groups
Tier 4: max 4 active groups
Tier 5: max 5 active groups
```

Active group dihitung dari:

```text
Group FORMING + Group ACTIVE
```

Group COMPLETED tidak dihitung.

---

## 22. Smart Contract Architecture

### 22.1 Contract name

```text
MeritCircleCore
```

### 22.2 Module logis

```text
Pool Module
Group Module
Contribution Module
Auction Module
Reward Carryover Module
Settlement Module
Access Control Module
Pause Module
```

### 22.3 Network

```text
BNB Smart Chain Testnet
Chain ID: 97
Currency: tBNB
```

### 22.4 Roles

```text
DEFAULT_ADMIN_ROLE
POOL_CREATOR_ROLE
SETTLER_ROLE
PAUSER_ROLE
```

---

## 23. Smart Contract Data Structures

### 23.1 Pool

```solidity
struct Pool {
    string name;
    uint8 mode; // 0 = BASIC, 1 = AUCTION
    uint256 contributionAmount;
    uint8 groupSize;
    uint8 cycleCount;
    uint8 paymentWindowDays;
    uint8 auctionOpenDay;
    uint8 auctionCloseDay;
    uint8 settlementDay;
    uint16 maxDiscountBps;
    uint8 minimumTier;
    bool active;
}
```

### 23.2 Group

```solidity
struct Group {
    uint256 poolId;
    uint256 groupNumber;
    uint256 startDate;
    uint8 memberCount;
    uint8 currentCycle;
    bool completed;
    bool paused;
}
```

### 23.3 Auction state

```solidity
struct AuctionState {
    bool exists;
    address bestBidder;
    uint256 bestBidAmount;
}
```

### 23.4 Mapping penting

```solidity
mapping(uint256 => Pool) public pools;
mapping(uint256 => Group) public groups;

mapping(uint256 => address[]) public groupMembers;
mapping(uint256 => mapping(address => bool)) public isMember;

mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasPaid;
mapping(uint256 => mapping(address => bool)) public hasReceivedPayout;

mapping(uint256 => uint256) public groupBalance;
mapping(uint256 => uint256) public carriedReward;

mapping(uint256 => mapping(uint256 => AuctionState)) public auctions;
```

---

## 24. Smart Contract Functions

### 24.1 Create pool

```solidity
function createPool(
    string memory name,
    uint8 mode,
    uint256 contributionAmount,
    uint8 groupSize,
    uint8 cycleCount,
    uint8 paymentWindowDays,
    uint8 auctionOpenDay,
    uint8 auctionCloseDay,
    uint8 settlementDay,
    uint16 maxDiscountBps,
    uint8 minimumTier
) external onlyRole(POOL_CREATOR_ROLE)
```

### 24.2 Register group

```solidity
function registerGroup(
    uint256 poolId,
    uint256 groupNumber,
    address[] memory members
) external onlyRole(SETTLER_ROLE)
```

Behavior:

```text
Simpan group.
Simpan member.
Set startDate = block.timestamp.
Set currentCycle = 1.
Set groupBalance = 0.
Set carriedReward = 0.
```

### 24.3 Pay contribution

```solidity
function payContribution(
    uint256 groupId,
    uint256 cycle
) external payable whenNotPaused
```

Validasi:

```text
Group exists.
Cycle valid.
msg.sender is member.
msg.sender has not paid this cycle.
msg.value == pool.contributionAmount.
```

Effect:

```solidity
hasPaid[groupId][cycle][msg.sender] = true;
groupBalance[groupId] += msg.value;
```

Event:

```solidity
event ContributionPaid(
    uint256 groupId,
    uint256 cycle,
    address payer,
    uint256 amount,
    uint256 timestamp
);
```

### 24.4 Submit bid

```solidity
function submitBid(
    uint256 groupId,
    uint256 cycle,
    uint256 payoutAmount
) external whenNotPaused
```

Validasi:

```text
Pool mode auction.
Cycle bukan final.
Auction terbuka berdasarkan waktu.
msg.sender adalah member.
msg.sender sudah bayar cycle ini.
msg.sender belum menerima payout.
payoutAmount >= minimumPayout.
payoutAmount <= rewardPool.
payoutAmount lebih baik dari best bid.
```

Effect:

```solidity
auctions[groupId][cycle].bestBidder = msg.sender;
auctions[groupId][cycle].bestBidAmount = payoutAmount;
```

Event:

```solidity
event BidSubmitted(
    uint256 groupId,
    uint256 cycle,
    address bidder,
    uint256 payoutAmount
);
```

### 24.5 Settle auction cycle non-final

```solidity
function settleAuctionCycle(
    uint256 groupId,
    uint256 cycle
) external onlyRole(SETTLER_ROLE)
```

Validasi:

```text
Cycle bukan final.
Auction sudah selesai.
Semua member sudah bayar.
Ada best bidder.
Best bidder belum menerima payout.
```

Logic:

```solidity
uint256 rewardPool = groupBalance[groupId];
uint256 winnerPayout = auctions[groupId][cycle].bestBidAmount;

require(winnerPayout > 0, "No valid bid");
require(winnerPayout <= rewardPool, "Payout exceeds reward pool");

groupBalance[groupId] -= winnerPayout;
carriedReward[groupId] = rewardPool - winnerPayout;
hasReceivedPayout[groupId][winner] = true;
groups[groupId].currentCycle += 1;
```

Transfer:

```solidity
payable(winner).transfer(winnerPayout);
```

Event:

```solidity
event AuctionCycleSettled(
    uint256 groupId,
    uint256 cycle,
    address winner,
    uint256 rewardPool,
    uint256 winnerPayout,
    uint256 carriedReward
);
```

### 24.6 Settle basic cycle

```solidity
function settleBasicCycle(
    uint256 groupId,
    uint256 cycle,
    address recipient
) external onlyRole(SETTLER_ROLE)
```

Validasi:

```text
Pool mode basic.
Cycle valid.
Recipient adalah member.
Recipient belum menerima payout.
Semua member sudah bayar.
```

Logic:

```solidity
uint256 rewardPool = groupBalance[groupId];

groupBalance[groupId] = 0;
hasReceivedPayout[groupId][recipient] = true;
groups[groupId].currentCycle += 1;
```

Transfer:

```solidity
payable(recipient).transfer(rewardPool);
```

Event:

```solidity
event BasicCycleSettled(
    uint256 groupId,
    uint256 cycle,
    address recipient,
    uint256 rewardPool
);
```

### 24.7 Settle final cycle

```solidity
function settleFinalCycle(
    uint256 groupId,
    uint256 cycle,
    address recipient
) external onlyRole(SETTLER_ROLE)
```

Validasi:

```text
Cycle adalah cycle terakhir.
Semua member sudah bayar.
Recipient adalah member.
Recipient belum menerima payout.
```

Logic:

```solidity
uint256 finalRewardPool = groupBalance[groupId];

groupBalance[groupId] = 0;
carriedReward[groupId] = 0;
hasReceivedPayout[groupId][recipient] = true;
groups[groupId].completed = true;
```

Transfer:

```solidity
payable(recipient).transfer(finalRewardPool);
```

Event:

```solidity
event FinalCycleSettled(
    uint256 groupId,
    uint256 cycle,
    address recipient,
    uint256 finalRewardPool
);
```

### 24.8 Force settle cycle

Untuk demo dan edge case.

```solidity
function forceSettleCycle(
    uint256 groupId,
    uint256 cycle,
    address recipient,
    uint256 payoutAmount,
    bool isFinal
) external onlyRole(DEFAULT_ADMIN_ROLE)
```

Rules:

```text
Hanya admin.
Harus dicatat di audit log off-chain.
Jika isFinal = true, payoutAmount harus sama dengan groupBalance.
```

### 24.9 Pause controls

```solidity
function pause() external onlyRole(PAUSER_ROLE)
function unpause() external onlyRole(PAUSER_ROLE)
```

---

## 25. Smart Contract Events

```solidity
event PoolCreated(
    uint256 poolId,
    string name,
    uint8 mode,
    uint256 contributionAmount,
    uint8 groupSize,
    uint8 cycleCount
);

event GroupRegistered(
    uint256 groupId,
    uint256 poolId,
    uint256 groupNumber,
    uint256 startDate
);

event ContributionPaid(
    uint256 groupId,
    uint256 cycle,
    address payer,
    uint256 amount
);

event BidSubmitted(
    uint256 groupId,
    uint256 cycle,
    address bidder,
    uint256 payoutAmount
);

event AuctionCycleSettled(
    uint256 groupId,
    uint256 cycle,
    address winner,
    uint256 rewardPool,
    uint256 winnerPayout,
    uint256 carriedReward
);

event BasicCycleSettled(
    uint256 groupId,
    uint256 cycle,
    address recipient,
    uint256 rewardPool
);

event FinalCycleSettled(
    uint256 groupId,
    uint256 cycle,
    address recipient,
    uint256 finalRewardPool
);

event GroupCompleted(
    uint256 groupId,
    uint256 completedAt
);
```

---

## 26. Off-chain Database Schema

### 26.1 users

```text
id
walletAddress
status
createdAt
updatedAt
```

### 26.2 profiles

```text
userId
username
email
emailVerifiedAt
avatarUrl
xUrl
telegramUrl
discordHandle
updatedAt
```

### 26.3 reputations

```text
userId
points
tier
updatedAt
```

### 26.4 reputation_events

```text
id
userId
type
points
reason
referenceType
referenceId
createdAt
```

### 26.5 pools

```text
id
poolIdExternal
name
description
mode
minimumTier
groupSize
cycleCount
cycleDurationDays
paymentWindowDays
auctionOpenDay
auctionCloseDay
settlementDay
contributionAmountWei
maxDiscountBps
status
createdAt
```

### 26.6 groups

```text
id
poolId
groupNumber
status
memberCount
startDate
currentCycle
contractGroupId
completedAt
createdAt
```

### 26.7 group_members

```text
id
groupId
userId
joinedAt
payoutSlot
hasReceivedPayout
status
```

### 26.8 cycles

```text
id
groupId
cycleNumber
startDate
paymentDeadline
auctionOpenAt
auctionCloseAt
settlementAt
isFinalCycle
status
```

### 26.9 contributions

```text
id
cycleId
groupId
userId
amountWei
status
dueDate
paidAt
txHash
lateDays
penaltyPoint
```

### 26.10 auctions

```text
id
cycleId
groupId
status
rewardPoolWei
minimumPayoutWei
maxDiscountBps
bestBidder
bestBidAmountWei
openAt
closeAt
settlementAt
```

### 26.11 bids

```text
id
auctionId
userId
bidAmountWei
status
txHash
createdAt
```

Bid status:

```text
VALID
INVALID
WINNING
LOSE
CANCELLED
```

### 26.12 cycle_reward_ledger

```text
id
groupId
cycleNumber
baseRewardWei
carriedRewardWei
rewardPoolWei
payoutWei
remainingCarryRewardWei
isFinalCycle
createdAt
```

### 26.13 payouts

```text
id
cycleId
groupId
recipientUserId
amountWei
type
txHash
paidAt
```

Payout type:

```text
BASIC_CYCLE
AUCTION_CYCLE
FINAL_CYCLE
FORCE_SETTLE
```

### 26.14 contract_transactions

```text
id
type
txHash
status
groupId
cycleId
amountWei
fromAddress
toAddress
blockNumber
createdAt
```

### 26.15 audit_logs

```text
id
actorId
actorType
action
entityType
entityId
metadata
createdAt
```

---

## 27. API Design

### 27.1 Auth

```http
POST /api/auth/nonce
POST /api/auth/verify
POST /api/auth/logout
GET  /api/auth/session
```

### 27.2 Profile

```http
GET   /api/profile
PATCH /api/profile
POST  /api/profile/avatar
```

### 27.3 Email verification

```http
POST /api/email/verify/request
POST /api/email/verify/confirm
```

### 27.4 Reputation

```http
GET /api/reputation/me
GET /api/reputation/me/history
```

### 27.5 Eligibility

```http
GET /api/eligibility/join
GET /api/users/me/group-limit
```

Response contoh:

```json
{
  "tier": 2,
  "tierName": "Citizen",
  "maxActiveGroups": 2,
  "currentActiveGroups": 1,
  "remainingSlots": 1
}
```

### 27.6 Pools

```http
GET  /api/pools
GET  /api/pools/:poolId
POST /api/pools/:poolId/join
```

### 27.7 Groups

```http
GET /api/groups/me
GET /api/groups/:groupId
GET /api/groups/:groupId/members
GET /api/groups/:groupId/cycles
GET /api/groups/:groupId/reward-ledger
```

### 27.8 Cycles

```http
GET /api/cycles/:cycleId
GET /api/cycles/:cycleId/contributions
GET /api/cycles/:cycleId/penalty-preview
```

### 27.9 Payments

```http
POST /api/cycles/:cycleId/payment-intent
POST /api/contributions/confirm
GET  /api/contributions/me
```

### 27.10 Auctions

```http
GET  /api/cycles/:cycleId/auction
POST /api/auctions/:auctionId/bids
GET  /api/auctions/:auctionId/bids
GET  /api/auctions/:auctionId/result
```

### 27.11 Payouts

```http
GET /api/payouts/me
GET /api/groups/:groupId/payouts
```

### 27.12 Admin

```http
POST /api/admin/pools
GET  /api/admin/pools
GET  /api/admin/groups
POST /api/admin/groups/:groupId/register
POST /api/admin/groups/:groupId/force-start
POST /api/admin/cycles/:cycleId/settle
POST /api/admin/cycles/:cycleId/force-settle
POST /api/admin/reputation/add
POST /api/admin/reputation/reduce
GET  /api/admin/audit-logs
```

---

## 28. External API Providers

### 28.1 Email verification

Provider rekomendasi:

```text
Resend
```

Alternatif:

```text
Postmark
AWS SES
Mailgun
```

Fungsi:

```text
Kirim email verifikasi.
Kirim OTP.
Kirim reminder pembayaran.
```

### 28.2 Avatar storage

Provider rekomendasi:

```text
Cloudinary
```

Alternatif:

```text
Supabase Storage
UploadThing
```

### 28.3 BNB Testnet RPC

Provider:

```text
NodeReal
Ankr
Public BNB Testnet RPC
```

Fungsi:

```text
Baca transaction.
Verifikasi payment.
Baca event.
Kirim transaction settlement.
```

### 28.4 BscScan Testnet

Fungsi:

```text
Debug transaction.
Lihat contract event.
Helper untuk UI.
```

### 28.5 Cache / OTP / rate limit

Provider:

```text
Upstash Redis
```

### 28.6 Cron / scheduler

Provider:

```text
Vercel Cron
Upstash QStash
```

Fungsi:

```text
Menandai late payment.
Membuka auction.
Menutup auction.
Trigger settlement.
Menghitung penalty.
```

### 28.7 Monitoring

Provider:

```text
Sentry
```

---

## 29. Tech Stack

### 29.1 Frontend

```text
Next.js
TypeScript
Tailwind CSS
wagmi
viem
RainbowKit atau ConnectKit
```

### 29.2 Backend

```text
Next.js API Routes
Prisma
```

### 29.3 Database

```text
PostgreSQL
```

Hosting:

```text
Supabase / Neon / Vercel Postgres
```

### 29.4 Cache

```text
Upstash Redis
```

### 29.5 Blockchain

```text
Solidity
Hardhat
OpenZeppelin
BNB Smart Chain Testnet
```

### 29.6 Email

```text
Resend
```

### 29.7 Storage

```text
Cloudinary / Supabase Storage
```

---

## 30. Frontend Pages

### 30.1 Landing Page

Route:

```text
/
```

Isi:

```text
Hero section
Penjelasan produk
Cara kerja
Daftar pool
Disclaimer BNB Testnet
Button Connect Wallet
```

### 30.2 Connect Wallet

Route:

```text
/connect
```

Fitur:

```text
Connect MetaMask
Switch ke BNB Testnet
Sign message login
```

### 30.3 Onboarding / Profile

Route:

```text
/onboarding
```

Form:

```text
Username
Email
X
Telegram
Discord
Foto profil
Verify email
```

### 30.4 Dashboard

Route:

```text
/dashboard
```

Menampilkan:

```text
Wallet address
Username
Avatar
Reputation point
Tier
Max active groups
Active groups
Tagihan iuran terdekat
Status pembayaran
Auction aktif
Notification
```

### 30.5 Pool Marketplace

Route:

```text
/pools
```

Fitur:

```text
Filter berdasarkan tier
Filter berdasarkan mode
Pool cards
Join button
```

### 30.6 Pool Detail

Route:

```text
/pools/[poolId]
```

Menampilkan:

```text
Pool info
Minimum tier
Group size
Contribution
Cycle duration
Auction rules jika auction
Join button
```

### 30.7 Group Detail

Route:

```text
/groups/[groupId]
```

Menampilkan:

```text
Group status
Member list
Current cycle
Payment status
Reward ledger
Carried reward
Auction status
Payout schedule
```

### 30.8 Payment

Route:

```text
/pay
```

Menampilkan:

```text
Tagihan aktif
Amount
Due date
Late penalty preview
Pay button
Transaction hash
```

### 30.9 Auction

Route:

```text
/auction
```

Menampilkan:

```text
Reward pool
Carried reward
Minimum payout
Max discount
Bid input
Current best bid
Eligibility status
Submit bid button
```

### 30.10 Reputation

Route:

```text
/reputation
```

Menampilkan:

```text
Total point
Tier
Progress ke tier berikutnya
Reward history
Penalty history
Payment behavior
```

### 30.11 Settings

Route:

```text
/settings
```

Fitur:

```text
Edit profile
Change avatar
Verify email
Connected wallet
```

---

## 31. Admin Panel

### 31.1 Admin Dashboard

Route:

```text
/admin
```

Menampilkan:

```text
Total users
Total pools
Total groups
Active cycles
Payment status
Auction status
Late users
Contract balance
```

### 31.2 Admin Pool

Route:

```text
/admin/pools
```

Fitur:

```text
Create pool
Edit pool
Activate pool
Pause pool
```

### 31.3 Admin Group

Route:

```text
/admin/groups
```

Fitur:

```text
Force start group
Register group ke contract
Force settle cycle
Force complete group
```

### 31.4 Admin Reputation

Route:

```text
/admin/reputation
```

Fitur:

```text
Lihat point user
Add point
Reduce point
Set tier demo
Reset point
```

### 31.5 Admin Audit

Route:

```text
/admin/audit
```

Menampilkan:

```text
Admin actions
Force settlement
Reputation adjustment
Group override
```

---

## 32. Security Requirements

### 32.1 Smart contract

Wajib:

```text
OpenZeppelin AccessControl
ReentrancyGuard
Pausable
Safe arithmetic
Role-based settlement
Event untuk semua aksi penting
```

### 32.2 Backend

Wajib:

```text
Wallet signature verification
JWT/session validation
Rate limiting
Input validation
Idempotent payment processing
Audit logging
Authorization untuk admin endpoint
```

### 32.3 Payment

Wajib:

```text
Jangan percaya txHash tanpa verifikasi receipt.
Cek from address.
Cek value.
Cek contract address.
Cek double payment.
Gunakan wei, bukan floating point.
```

### 32.4 Data

```text
PII tidak disimpan di blockchain.
Email hanya disimpan off-chain.
Social media disimpan sebagai profil off-chain.
```

---

## 33. Edge Cases

### 33.1 User belum username / email verified

```text
Tidak boleh join pool.
```

### 33.2 User mencapai batas active group

```text
Reject join.
```

### 33.3 Group belum penuh

```text
User berstatus menunggu.
```

### 33.4 User telat bayar

```text
Penalty dihitung harian.
```

### 33.5 User telat di banyak siklus

```text
Penalty dihitung per siklus.
```

### 33.6 User sudah menerima payout

```text
Tidak boleh menang auction lagi di group yang sama.
```

### 33.7 Tidak ada bid valid

```text
Gunakan fallback recipient.
Payout full reward pool.
Carried reward = 0.
```

### 33.8 Ada member belum bayar saat settlement

```text
Settlement tertunda.
Admin dapat force settle untuk demo.
```

### 33.9 Siklus final

```text
Tidak ada auction discount.
Penerima terakhir menerima full reward pool.
Carried reward harus 0.
```

### 33.10 Contract balance tidak cocok dengan expected reward

```text
Gunakan actual groupBalance untuk settlement.
Catat discrepancy di audit log.
```

---

## 34. MVP Acceptance Criteria

### 34.1 Auth & profile

- [ ] User dapat connect wallet.
- [ ] User dapat login dengan signature.
- [ ] User dapat set username.
- [ ] User dapat input email.
- [ ] User dapat verifikasi email.
- [ ] User dapat upload avatar.
- [ ] User dapat menambah social media.
- [ ] Sistem menghitung reputation point.
- [ ] Sistem menentukan tier.

### 34.2 Pool & group

- [ ] Admin dapat membuat pool.
- [ ] User dapat melihat pool sesuai tier.
- [ ] User dapat join pool jika username dan email verified.
- [ ] Sistem membentuk group.
- [ ] Group aktif setelah anggota terpenuhi.
- [ ] User tidak bisa leave group aktif.

### 34.3 Payment

- [ ] User dapat membayar iuran dengan BNB Testnet.
- [ ] Pembayaran masuk ke smart contract.
- [ ] Backend membaca event on-chain.
- [ ] Status kontribusi berubah menjadi paid.
- [ ] Sistem mendeteksi late payment.
- [ ] Sistem menghitung penalty point.

### 34.4 Basic Pool

- [ ] Sistem menentukan urutan penerima.
- [ ] Payout dikirim ke penerima.
- [ ] Setiap anggota menerima maksimal satu kali per group.
- [ ] Group selesai setelah semua siklus.

### 34.5 Auction Pool

- [ ] Auction terbuka pada siklus non-final.
- [ ] User eligible dapat submit bid.
- [ ] Bid invalid ditolak.
- [ ] Lowest valid bid menang.
- [ ] Winner menerima payout.
- [ ] Sisa reward dibawa ke siklus berikutnya.
- [ ] Reward pool siklus berikutnya bertambah sesuai carried reward.
- [ ] Siklus final membayar full reward pool.
- [ ] Tidak ada final surplus.

### 34.6 Reputation

- [ ] Reward point bertambah untuk aksi positif.
- [ ] Penalty point bertambah untuk telat bayar.
- [ ] Tier berubah sesuai point.
- [ ] Reputation history tercatat.

### 34.7 Admin

- [ ] Admin dapat create pool.
- [ ] Admin dapat force start group.
- [ ] Admin dapat force settle cycle.
- [ ] Admin dapat add/reduce reputation point.
- [ ] Admin action tercatat di audit log.

---

## 35. Development Phases

### Phase 1 — Foundation

```text
Project setup
Wallet connect
Login signature
Database
Profile
Email verification
Reputation point
Tier
```

### Phase 2 — Pool & Group

```text
Pool catalog
Join pool
Group formation
Active group limit
Group detail
```

### Phase 3 — Smart Contract Payment

```text
Deploy MeritCircleCore
registerGroup
payContribution
Event indexer
Payment confirmation
```

### Phase 4 — Basic Pool

```text
Payout schedule
settleBasicCycle
Payout tracking
```

### Phase 5 — Auction Pool

```text
Auction page
submitBid
Best bid tracking
Eligibility check
settleAuctionCycle
Reward carryover
```

### Phase 6 — Final Cycle & Penalty

```text
settleFinalCycle
Late penalty engine
Penalty preview
Final reward payout
```

### Phase 7 — Admin & Demo

```text
Admin dashboard
Force settle
Reputation adjustment
Audit log
Demo data
```

### Phase 8 — Testing & Polish

```text
Smart contract test
Backend test
Frontend polish
Hackathon demo scenario
Error handling
```

---

## 36. Hackathon Demo Scenario

### Demo 1 — User baru

```text
Connect wallet
Lengkapi profil
Verifikasi email
Dapat Tier 1
Join Starter Circle
Bayar iuran
```

### Demo 2 — Basic Pool

```text
3 user masuk group
Group aktif
Cycle 1 bayar
Cycle 1 payout
Cycle 2 bayar
Cycle 2 payout
Cycle 3 final payout
Group completed
```

### Demo 3 — Auction Pool

```text
Admin set user menjadi Tier 4
User join Trusted Auction A
5 user masuk group
Group aktif
Cycle 1 bayar
Auction dibuka
User submit bid
Winner menang
Carried reward masuk cycle 2
Cycle 2 auction lagi
Cycle final membayar full reward
```

### Demo 4 — Late payment

```text
User tidak bayar sampai hari ke-11
UI menampilkan penalty -10
Hari ke-12 penalty -20
User bayar
Sistem mencatat penalty
Reputation turun
```

---

## 37. Definition of Success

Merit Circle hackathon MVP dianggap berhasil jika:

### 37.1 Functional success

```text
User bisa login dengan wallet.
User bisa membangun reputasi.
User bisa join pool.
Group terbentuk otomatis.
Pembayaran BNB Testnet masuk ke smart contract.
Payout dapat dikirim.
Auction berjalan.
Carried reward berfungsi.
Siklus final menghabiskan reward pool.
Reputation berubah sesuai perilaku.
```

### 37.2 Economic clarity

```text
Tidak ada final surplus.
Semua reward pool dapat dijelaskan.
Semua carried reward dapat diaudit.
Semua payout memiliki transaction hash.
```

### 37.3 Demo readiness

```text
Admin dapat menyiapkan demo account.
Admin dapat force start group.
Admin dapat force settle cycle.
Demo dapat berjalan tanpa tergantung pada user eksternal.
```

---

## 38. Deferred Features

Fitur berikut tidak dikerjakan pada hackathon MVP:

```text
Native token
DAO governance
Cross-chain
KYC nasional
Collateral
Protection reserve kompleks
AI credit scoring
ZK identity
Multi-currency
Fiat payment gateway
Production wallet custody
Dispute resolution kompleks
Legal compliance penuh
```

---

## 39. Final Product Formula

```text
WALLET IDENTITY
↓
PROFILE
↓
EMAIL VERIFICATION
↓
REPUTATION POINT
↓
TIER
↓
POOL ACCESS
↓
GROUP FORMATION
↓
CONTRIBUTION
↓
BASIC POOL / AUCTION POOL
↓
BASIC POOL:
    REPUTATION-BASED PAYOUT
↓
AUCTION POOL:
    LOWEST VALID BID WINS
    CARRIED REWARD TO NEXT CYCLE
↓
FINAL CYCLE:
    LAST MEMBER RECEIVES FULL REWARD POOL
↓
GROUP COMPLETED
↓
REPUTATION UPDATED
↓
HIGHER TIER
↓
MORE ACCESS
```

---

## 40. Final Rules

```text
1. User wajib punya username dan email verified untuk join pool.
2. Pool memiliki mode Basic dan Auction.
3. Auction Pool minimal Tier 4.
4. Group terbentuk otomatis saat anggota terpenuhi.
5. Group size = jumlah siklus.
6. Satu siklus = 30 hari.
7. Payment window = 10 hari.
8. Auction window = hari ke-11 sampai ke-25.
9. Settlement = hari ke-30.
10. Pembayaran menggunakan BNB Testnet ke smart contract.
11. Telat bayar dikenakan -10 per hari setelah hari ke-10.
12. Penalty maksimal -100 per siklus.
13. Penalty dihitung per siklus.
14. User boleh ikut banyak group sesuai tier.
15. Basic Pool tidak memakai auction.
16. Auction Pool memakai auction pada siklus non-final.
17. Sisa reward auction dibawa ke siklus berikutnya.
18. Siklus final membayar full reward pool.
19. Tidak ada final surplus.
20. Semua aksi penting dicatat di database dan audit log.
```

---

## 41. Final Summary

Merit Circle adalah aplikasi arisan Web3 berbasis reputasi dengan mekanisme:

```text
Reputation-gated pool access
+
Group-based ROSCA cycles
+
BNB Testnet contribution settlement
+
Liquidity auction untuk pool spesial
+
Reward carryover tanpa final surplus
+
Reputation reward and penalty
```

Versi hackathon ini fokus membuktikan mekanisme inti:

```text
Wallet login
Profil
Reputasi
Tier
Pool
Group
Kontribusi
Auction
Carryover reward
Final settlement
```

Tanpa membebani sistem dengan:

```text
KYC berat
Collateral
Fiat payment
Token
DAO
Cross-chain
```

Dengan scope ini, Merit Circle dapat didemokan secara jelas sebagai prototipe Web3 consumer finance yang sederhana, transparan, dan berbasis reputasi.
```
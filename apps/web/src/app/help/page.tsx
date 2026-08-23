import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pusat Bantuan — Merit Pool',
}

const ARTICLES: Array<{ id: string; q: string; a: Array<string> }> = [
  {
    id: 'apa-itu',
    q: '1. Apa itu Merit Pool?',
    a: [
      'Merit Pool adalah sistem tabungan bersama (arisan) berbasis reputasi on-chain. Sekelompok anggota berkontribusi secara berkala dalam "cycle", dan setiap cycle satu anggota menerima payout sesuai gilirannya.',
      'Berbeda dari arisan konvensional, urutan payout ditentukan oleh Merit Score — bukan undian gelap — sehingga anggota yang paling konsisten mendapat prioritas dan akses ke pool yang lebih besar.',
    ],
  },
  {
    id: 'merit-score',
    q: '2. Bagaimana Merit Score bekerja?',
    a: [
      'Merit Score adalah angka 0–100 yang dihitung dari perilaku Anda di aplikasi, bukan dari saldo wallet atau usia akun.',
      'Komponennya: ketepatan iuran (35%), penyelesaian pool (25%), konsistensi (15%), lama partisipasi (10%), kelengkapan payout (10%), dan catatan perilaku (5%).',
      'Skor naik saat Anda membayar tepat waktu dan menyelesaikan pool; skor turun saat Anda terlambat atau default.',
    ],
  },
  {
    id: 'tier',
    q: '3. Bagaimana tier bekerja?',
    a: [
      'Tier diambil dari Merit Score: 0 → Tier 0 (Basic), 1–20 → Tier 1 (Standard), 21–50 → Tier 2 (Growth), 51–75 → Tier 3 (Trusted), 76–90 → Tier 4 (Elite), 91–100 → Tier 5 (Prime).',
      'Tier lebih tinggi dapat mengakses SEMUA pool di bawahnya, tetapi tidak bisa masuk pool di atas tier-nya. Kenaikan tier tidak mengubah pool yang sedang berjalan.',
    ],
  },
  {
    id: 'join-pool',
    q: '4. Cara bergabung ke pool',
    a: [
      'Buka Dashboard, pilih pool yang sesuai tier Anda, lalu tekan Join Pool. Iuran cycle pertama dibayarkan pada saat bergabung.',
      'Pool langsung aktif ketika kapasitas anggota terpenuhi. Pastikan saldo MC cukup sebelum join — Anda bisa membelinya lewat menu Swap.',
    ],
  },
  {
    id: 'setelah-join',
    q: '5. Apa yang terjadi setelah bergabung?',
    a: [
      'Anda terikat komitmen sampai seluruh cycle pool selesai. Setiap cycle punya deadline; bayar iuran sebelum deadline lewat tombol Bayar Iuran.',
      'Ketika semua anggota membayar di sebuah cycle (atau deadline tercapai), cycle ditutup dan payout dikirim ke penerima giliran tersebut.',
    ],
  },
  {
    id: 'auction',
    q: '6. Apa itu lelang (auction)?',
    a: [
      'Lelang hanya ada di Tier 4 (Elite) dan Tier 5 (Prime). Anggota menawarkan jumlah payout yang bersedia diterima untuk mempercepat likuiditas.',
      'Bid terendah yang valid menang. Syaratnya: Anda anggota aktif, iuran cycle berjalan sudah dibayar, belum pernah menang di round ini, dan bid minimal 85% dari nominal pool.',
    ],
  },
  {
    id: 'diskon',
    q: '7. Apa itu diskon?',
    a: [
      'Diskon adalah selisih antara nominal pool dan payout yang diterima pemenang lelang. Contoh: pool 500 MC, bid menang 450 MC → diskon 50 MC (10%).',
      'Diskon maksimum yang diizinkan adalah 15%. Bid di bawah batas ini otomatis ditolak kontrak.',
    ],
  },
  {
    id: 'surplus',
    q: '8. Apa itu Auction Surplus?',
    a: [
      'Surplus adalah total diskon dari semua mekanisme lelang pada satu cycle. Ia dibagikan: 60% untuk anggota non-pemenang yang membayar cycle itu, 25% ke Protection Reserve, dan 15% ke Treasury protokol.',
      'Surplus BUKAN imbal hasil tetap — ia hanya muncul jika ada anggota yang berlombang mempercepat payout. Jangan mengharapkan angka tertentu.',
    ],
  },
  {
    id: 'miss-contribution',
    q: '9. Apa yang terjadi jika saya telat membayar?',
    a: [
      'Setelah deadline, Anda masuk masa tenggang (grace period) dan menerima peringatan. Jika tidak dibayar sampai tenggang habis, cycle itu dicatat sebagai default.',
      'Konsekuensi: Merit Score turun, keterlambatan terlihat di profil, dan slot payout Anda bisa hangus bila giliran jatuh di cycle yang Anda gagal bayar. Kewajiban membayar sisa cycle tetap berjalan.',
    ],
  },
  {
    id: 't0-t3-vs-t4-t5',
    q: '10. Bedanya Tier 0–3 dan Tier 4–5?',
    a: [
      'Tier 0–3 memakai Merit Queue: urutan payout ditentukan backend berdasar merit, tenure, dan aturan adil — tanpa lelang.',
      'Tier 4–5 memakai lelang diskon eksklusif: anggota bisa berebut percepatan payout dengan menawarkan diskon, dan surplusnya dibagikan ke anggota lain.',
    ],
  },
  {
    id: 'komitmen',
    q: '11. Mengapa saya harus menyelesaikan seluruh pool?',
    a: [
      'Ekonomi arisan hanya adil kalau semua anggota menepati janji. Payout Anda datang dari iuran anggota lain — begitu juga sebaliknya.',
      'Setelah menerima payout, kewajiban Anda TIDAK berakhir. Anggota yang pergi setelah menang merusak pool dan merit mereka akan dipenalti berat.',
    ],
  },
  {
    id: 'wallet',
    q: '12. Cara menghubungkan / memutus wallet & verifikasi tanda tangan',
    a: [
      'Hubungkan wallet lewat tombol Connect Wallet di landing page atau sidebar. Gunakan MetaMask atau wallet injeksi lain yang mendukung jaringan testnet aktif.',
      'Mengapa saya diminta menandatangani pesan? Itu adalah verifikasi kepemilikan wallet: server mengirim kode acak (nonce) dan Anda menandatanganinya. Dengan begitu sistem yakin address yang terdaftar benar-benar milik Anda — address saja bersifat publik, sehingga tanpa langkah ini siapa pun bisa mendaftar atau mengedit profil atas nama orang lain.',
      'Anda hanya perlu melakukan ini SEKALI setiap 24 jam (saat pertama mendaftar atau saat sesi kedaluwarsa). Setelahnya semua aksi — bergabung pool, edit profil, notifikasi — berjalan otomatis tanpa popup tanda tangan.',
      'Untuk memutus: buka sidebar dan tekan Disconnect Wallet. Data profil Anda tetap tersimpan dan bisa dilanjutkan kapan saja dengan wallet yang sama.',
    ],
  },
  {
    id: 'testnet-disclaimer',
    q: '13. Disclaimer Testnet',
    a: [
      'Seluruh fitur ini berjalan di testnet. Token MC yang digunakan adalah working token tanpa nilai finansial — BUKAN token resmi Merit Circle ($MC telah dimigrasi ke $BEAM).',
      'Tidak ada janji imbal hasil, tidak ada penjualan token, dan tidak ada nilai uang nyata. Fase ini bertujuan memvalidasi perilaku pengguna dan simulasi ekonomi sebelum pertimbangan mainnet.',
    ],
  },
]

export default function HelpCenterPage() {
  return (
    <div className="min-h-screen bg-[#10131A] text-[#E2E2E9] font-sans selection:bg-[#3E63FF]/30">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(106.83%_148.48%_at_10%_20%,_rgba(62,99,255,0.15)_0%,_rgba(62,99,255,0)_50%)]" />

      <main className="relative max-w-5xl mx-auto px-6 py-12">
        <Link href="/dashboard" className="font-mono-label text-mono-label uppercase text-[#A9C7FF] hover:text-[#3E63FF]">
          ← Kembali
        </Link>

        <header className="mt-8 mb-10">
          <h1 className="font-headline-lg text-headline-lg md:text-5xl tracking-tighter">Pusat Bantuan</h1>
          <p className="mt-3 font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">
            Semua yang perlu Anda tahu tentang Merit Pool — dari cara kerja merit hingga apa yang
            terjadi jika melewatkan iuran.
          </p>
        </header>

        {/* Navigasi cepat */}
        <nav className="glass-panel rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
          {ARTICLES.map((art) => (
            <a key={art.id} href={`#${art.id}`} className="text-xs text-on-surface-variant hover:text-[#5B7CFF] transition-colors truncate">
              {art.q}
            </a>
          ))}
        </nav>

        <div className="mt-8 space-y-4 pb-16">
          {ARTICLES.map((art) => (
            <section key={art.id} id={art.id} className="glass-panel rounded-2xl p-6 scroll-mt-6">
              <h2 className="font-semibold text-lg text-[#E2E2E9]">{art.q}</h2>
              <div className="mt-3 space-y-2.5">
                {art.a.map((paragraph, i) => (
                  <p key={i} className="text-sm text-on-surface-variant leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}

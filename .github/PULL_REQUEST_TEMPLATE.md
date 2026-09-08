## 📌 Deskripsi Perubahan
<!-- Jelaskan secara ringkas apa yang diubah atau ditambahkan dalam PR ini -->

## 🔗 Terkait Issue
<!-- Tautkan issue yang diselesaikan, contoh: Closes #12, Fixes #34 -->
Closes #

## 🏷️ Tipe Perubahan
- [ ] 🐛 Bug fix (perbaikan yang tidak merusak fungsionalitas lama)
- [ ] ✨ Feature (penambahan fitur baru yang backwards-compatible)
- [ ] 💥 Breaking change (perubahan yang menyebabkan fungsi sebelumnya tidak kompatibel)
- [ ] 📝 Documentation update (pembaruan dokumentasi atau panduan)
- [ ] ⚡ Performance improvement / Refactoring
- [ ] 🧪 Testing (penambahan atau perbaikan unit/e2e test)
- [ ] 🔧 DevOps / Tooling / CI-CD

## 🧪 Langkah Pengujian
<!-- Jelaskan langkah-langkah yang dilakukan untuk memverifikasi perubahan ini -->
1. Jalankan `pnpm test` atau `forge test`
2. Jalankan skrip verifikasi `npx tsx scripts/verify-dod.ts`
3. Uji interaksi UI pada rute yang terdampak

## ✅ Checklist Kontributor
- [ ] Kode mengikuti konvensi penamaan (`camelCase`, `snake_case`) dan style guide proyek.
- [ ] Tipe TypeScript eksplisit tanpa menggunakan `any`.
- [ ] Tidak ada hardcoded secret, private key, atau endpoint pribadi.
- [ ] Unit test atau skrip validasi e2e telah dijalankan dan lulus 100%.
- [ ] `pnpm lint` dan `pnpm build` (atau `tsc --noEmit`) bebas dari error.
- [ ] Dokumentasi atau komentar kode yang relevan telah diperbarui.

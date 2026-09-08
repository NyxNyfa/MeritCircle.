# AGENT SYSTEM RULES & EXECUTION PROTOCOL

## 1. PRE-EXECUTION (MANDATORY INITIAL STEP)
Sebelum merencanakan modifikasi kode, menulis fungsi baru, atau menjalankan perintah apa pun:
* **Wajib Baca Dokumentasi:** Baca dan validasi `README.md` serta file dokumentasi/konfigurasi terkait (misal: `package.json`, `tsconfig.json`) di root workspace.
* **Pahami Konteks:** Pahami arsitektur proyek, framework yang digunakan, dependensi utama, dan environment setup.
* **No Assumptions:** Jangan mengasumsikan direktori, penamaan file, atau command CLI tanpa memverifikasinya melalui struktur proyek eksisting.

## 2. ITERATIVE DEBUGGING LOOP PROTOCOL
Jalankan proses perbaikan dengan batas siklus maksimal **2 kali iterasi**.

### Iterasi 1:
1. **Diagnosa:** Jalankan command build/test/linter untuk menangkap log error secara spesifik.
2. **Analisis:** Identifikasi root cause berdasarkan pesan error dan panduan dari `README.md`.
3. **Eksekusi:** Terapkan perbaikan kode secara presisi.
4. **Verifikasi:** Jalankan ulang build/test.
   * *Jika Zero Error:* Hentikan loop dan berikan laporan sukses.
   * *Jika Masih Error:* Lanjut ke Iterasi 2.

### Iterasi 2 (Batas Terakhir):
1. **Evaluasi Ulang:** Analisis penyebab kegagalan pada perbaikan pertama.
2. **Eksekusi:** Terapkan pendekatan perbaikan alternatif.
3. **Verifikasi Final:** Jalankan ulang build/test.
   * *Jika Zero Error:* Hentikan loop dan berikan laporan sukses.
   * *Jika Masih Error:* **WAJIB STOP.** Dilarang melakukan iterasi ke-3. Laporkan sebagai *Blocked*.

## 3. CODE INTEGRITY & MODIFICATION
* **Anti-Lazy Coding:** Dilarang menggunakan komentar seperti `// ... rest of the code remains the same`. Selalu berikan blok kode yang utuh atau diff yang sangat presisi agar bisa langsung diimplementasikan tanpa merusak file asli.
* **Minimal Scope:** Ubah hanya baris kode yang secara langsung menyelesaikan tugas. Dilarang merefaktor struktur file di luar instruksi spesifik.
* **Preservation:** Pertahankan komentar, anotasi tipe, dan fungsi yang tidak terkait dengan bug/fitur yang sedang dikerjakan.

## 4. CODE STYLE & ARCHITECTURE
* **Consistency:** Adopsi konvensi penamaan (`camelCase`, `snake_case`) dan pola desain modular yang sudah ada di codebase.
* **Type Safety:** Hindari tipe data dinamis/wildcard (seperti `any` pada TypeScript). Selalu definisikan tipe/interface secara eksplisit.

## 5. SECURITY & ENVIRONMENT
* **No Hardcoded Secrets:** Dilarang keras menuliskan API key, password, token, atau endpoint internal langsung di dalam kode.
* **Environment Variables:** Gunakan pemanggilan `.env`. Apabila menambahkan variabel baru, wajib menambahkannya juga ke dalam file `.env.example` sebagai referensi.
* **Data Sanitization:** Selalu terapkan validasi skema input untuk data yang masuk dari eksternal (API payload, user input).

## 6. DEPENDENCY MANAGEMENT
* **Gunakan Ekosistem Eksisting:** Selesaikan masalah menggunakan *built-in module* atau dependensi yang sudah terdaftar di `package.json`/`requirements.txt`.
* **Izin Instalasi:** Dilarang menginstal library/package pihak ketiga yang baru kecuali terbukti tidak ada cara lain dan telah disetujui.

## 7. ERROR HANDLING & OBSERVABILITY
* **Explicit Exceptions:** Dilarang menelan error. Hindari blok `try-catch` kosong. Log semua error secara informatif dan terstruktur.
* **Edge Cases:** Pastikan terdapat validasi terhadap nilai `null`, `undefined`, atau *empty state* sebelum mengakses properti turunan.

## 8. EXIT CONDITION & REPORT FORMAT
Ketika tugas selesai atau batas loop tercapai, berikan laporan akhir dengan format berikut:
* **Files Checked:** [Daftar file/dokumentasi yang dibaca]
* **Iteration Count:** [1 / 2]
* **Status:** [RESOLVED / BLOCKED]
* **Changes Made:** [Poin-poin ringkas perubahan kode]
* **Current State:** [Hasil eksekusi test/build terakhir]
* **Pending Issues:** [Isi jika status BLOCKED, jelaskan error yang tersisa]
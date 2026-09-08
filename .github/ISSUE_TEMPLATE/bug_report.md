name: 🐛 Bug Report
description: Laporkan adanya bug atau perilaku tak terduga pada Merit Circle
title: "[BUG] <deskripsi singkat masalah>"
labels: ["bug", "triage"]
body:
  - type: markdown
    attributes:
      value: |
        Terima kasih telah meluangkan waktu untuk melaporkan bug! Mohon isi template berikut agar kami dapat mereproduksinya secara akurat.
  - type: textarea
    id: description
    attributes:
      label: Deskripsi Bug
      description: Jelaskan apa yang terjadi secara jelas dan ringkas.
      placeholder: Contoh - Token MC tidak bertambah setelah konfirmasi swap di Anvil...
    validations:
      required: true
  - type: textarea
    id: reproduction
    attributes:
      label: Langkah Mereproduksi
      description: Langkah-langkah detail untuk mereproduksi masalah.
      placeholder: |
        1. Buka halaman '/swap'
        2. Masukkan 0.1 ETH untuk ditukar ke MC
        3. Klik 'Tukar Token' dan konfirmasi di MetaMask
        4. Periksa saldo MC pada wallet
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Perilaku yang Diharapkan
      description: Apa yang seharusnya terjadi?
      placeholder: Saldo MC bertambah 1.000 MC dan notifikasi sukses muncul di UI.
    validations:
      required: true
  - type: textarea
    id: context
    attributes:
      label: Konteks Lingkungan (Environment)
      description: Informasi environment pengujian.
      value: |
        - OS: [e.g. Windows 11 / macOS / Ubuntu]
        - Browser: [e.g. Chrome 124, Brave, Firefox]
        - Wallet: [e.g. MetaMask 11.14.0, Rabby]
        - Chain ID / Jaringan: [e.g. 31337 Anvil / 97 BSC Testnet]
        - Commit / Versi: [e.g. commit hash atau tag]
    validations:
      required: true
  - type: textarea
    id: logs
    attributes:
      label: Log & Error Console
      description: Tempelkan output log browser, RPC revert error, atau terminal log.
      render: shell

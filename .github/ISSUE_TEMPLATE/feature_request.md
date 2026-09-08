name: 🚀 Feature Request
description: Sarankan fitur baru atau peningkatan fungsionalitas untuk Merit Circle
title: "[FEAT] <deskripsi singkat fitur>"
labels: ["enhancement", "feature"]
body:
  - type: markdown
    attributes:
      value: |
        Terima kasih telah berkontribusi memberikan ide peningkatan untuk ekosistem Merit Circle!
  - type: textarea
    id: problem
    attributes:
      label: Apakah ada masalah yang mendasari usulan ini?
      description: Jelaskan friksi atau batasan yang Anda alami saat menggunakan platform.
      placeholder: Contoh - Pengguna kesulitan memperkirakan potensi diskon reverse auction tanpa kalkulator simulasi...
    validations:
      required: true
  - type: textarea
    id: solution
    attributes:
      label: Solusi yang Diusulkan
      description: Jelaskan fitur yang Anda harapkan dan bagaimana cara kerjanya.
      placeholder: Tambahkan komponen slider kalkulator bid lelang di modal kartu arisan Elite...
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatif yang Pernah Dipertimbangkan
      description: Apakah ada pendekatan alternatif lain yang sempat terpikirkan?
  - type: textarea
    id: acceptance_criteria
    attributes:
      label: Kriteria Penerimaan (Acceptance Criteria)
      description: Daftar kriteria agar fitur ini dianggap selesai.
      value: |
        - [ ] Kriteria 1
        - [ ] Kriteria 2
        - [ ] Kriteria 3
    validations:
      required: true

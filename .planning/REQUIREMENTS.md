# Project Requirements

## Functional Requirements

### 1. Ingestion & Natural Language Parsing
- **REQ-ING-01**: Sistem harus dapat menerima respons Google Form dan memproses input teks/suara.
- **REQ-ING-02**: Parser harus mampu mengekstrak nominal, wallet sumber, wallet tujuan (jika transfer), kategori, dan keterangan dari kalimat bahasa alami Indonesia.
- **REQ-ING-03**: Parser harus mendukung input jamak yang dipisahkan oleh tanda koma dalam satu respons form.
- **REQ-ING-04**: Normalizer harus mengubah kata angka dan singkatan satuan uang (`k`, `rb`, `ribu`, `jt`, `juta`) menjadi angka floating-point/integer yang valid.

### 2. Wallet & Balance Tracking
- **REQ-WAL-01**: Setiap transaksi (Income, Expense, Transfer) harus memperbarui saldo wallet yang relevan.
- **REQ-WAL-02**: Mendukung saldo awal (opening balance) dan menghitung saldo berjalan secara akurat.

### 3. Budgeting & Monitoring
- **REQ-BDG-01**: Mendukung pengaturan limit anggaran per kategori pengeluaran.
- **REQ-BDG-02**: Memberikan status peringatan visual (`Aman`, `Waspada`, `Over Budget`) ketika pengeluaran mendekati atau melampaui limit.

### 4. Visual Dashboard & Reports
- **REQ-DSH-01**: Dashboard harus menampilkan ringkasan keuangan bulanan dan sepanjang waktu.
- **REQ-DSH-02**: Dashboard harus menyediakan tabel ranking konsumsi pengeluaran per kategori dari terbesar ke terkecil lengkap dengan porsi persentase.
- **REQ-DSH-03**: Dashboard harus menampilkan kartu KPI (Konsumsi Terbesar, Total Pengeluaran, Rata-rata per Kategori) serta diagram Donut Chart otomatis.

### 5. Automation & Archiving
- **REQ-AUT-01**: Mendukung transaksi berulang (recurring transactions) terjadwal harian via time-driven trigger.
- **REQ-AUT-02**: Mendukung backup transaksi bulanan ke Google Drive dalam format file ZIP terkompresi.
- **REQ-AUT-03**: Mendukung deteksi dan sinkronisasi otomatis belanja inventaris rumah tangga ke spreadsheet eksternal.

## Non-Functional Requirements
- **REQ-NFR-01**: Semua fungsi kode Google Apps Script harus berukuran maksimal 50 baris (`CODING_STANDARD.md`).
- **REQ-NFR-02**: Akses ke Spreadsheet hanya diperbolehkan melalui layer Repository.
- **REQ-NFR-03**: Parser harus berupa pure functions tanpa dependensi ke Spreadsheet.
- **REQ-NFR-04**: Seluruh nama sheet dan nama kolom tidak boleh di-hardcode.

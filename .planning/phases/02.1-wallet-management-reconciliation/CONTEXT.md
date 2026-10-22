# Phase 2.1: Wallet Management & Balance Reconciliation with Leak/Discrepancy Detection

## Context & Intent
Pengguna ingin mengelola dompet/rekening secara langsung via Telegram Bot, baik menambah wallet baru maupun melakukan pencocokan/penyesuaian saldo (reconciliation/opname kas).
Ketika pengguna mencocokkan saldo nominal yang baru pada sebuah wallet:
1. Jika saldo baru lebih besar dari saldo tercatat: selisih dimasukkan sebagai transaksi **Pemasukan** (misal: "Penyesuaian Saldo Masuk" / "Bunga Bank / Pendapatan Tak Tercatat").
2. Jika saldo baru lebih kecil dari saldo tercatat: ada **selisih uang hilang / belum tercatat** (misal: pengeluaran kecil harian seperti biaya parkir, biaya admin bulanan, atau transaksi rekursif yang belum tercatat).
3. Pengguna meminta **algoritma deteksi selisih uang hilang** untuk menganalisis dan menduga penyebab selisih tersebut (apakah mendekati biaya admin bank bulanan, akumulasi parkir, atau transaksi berulang dari sheet `Recurring Transactions` / riwayat transaksi bulanan).

## Key Requirements & Scope
1. **Command Manajemen Wallet**:
   - `/tambahwallet <nama> [tipe] [saldo_awal]` : Menambah rekening/wallet baru langsung dari Telegram.
   - `/setwallet <nama> <nominal_baru>` atau `/cocokkan <nama> <nominal_baru>` : Melakukan opname/penyesuaian saldo wallet.
2. **Logika Rekonsiliasi Saldo (Pemasukan vs Pengeluaran Selisih)**:
   - Hitung saldo sistem saat ini vs nominal baru pengguna.
   - `delta = nominalBaru - saldoSistem`.
   - Jika `delta > 0`: Otomatis catat transaksi `Pemasukan` (Kategori: `Penyesuaian Saldo`, Deskripsi: `Penyesuaian saldo masuk [Wallet]`).
   - Jika `delta < 0`: Otomatis catat transaksi `Pengeluaran` (Nominal: `|delta|`, Kategori: `Penyesuaian Saldo` / `Biaya Tak Terduga`).
3. **Algoritma Deteksi Selisih Uang Hilang**:
   - Menganalisis besaran selisih `|delta|` terhadap pola transaksi keuangan:
     - Pola Administrasi Bank: Kelipatan/nominal umum admin bank (misal: Rp 6.500, Rp 7.500, Rp 10.000, Rp 15.000, Rp 17.000, Rp 20.000).
     - Pola Parkir / Uang Kecil: Kelipatan Rp 2.000, Rp 3.000, atau Rp 5.000 (contoh: selisih Rp 10.000 = ~5x parkir motor / 2x parkir mobil).
     - Pola Recurring Transaction: Mencocokkan `|delta|` dengan daftar jadwal di sheet `Recurring Transactions` yang statusnya aktif dan belum tereksekusi pada bulan ini.
     - Pola Pengeluaran Rutin Historis: Mencari transaksi pengeluaran di masa lalu yang memiliki nominal identik atau subset kombinasi nominal yang mendekati `|delta|`.
   - Mengembalikan saran/rekomendasi cerdas pada pesan Telegram (contoh: *"Ditemukan selisih berkurang Rp 15.000. Kemungkinan: Biaya Admin Bank Mandiri bulanan atau ~3x bayar parkir."*).
4. **Pembaruan Real-Time**:
   - Setelah rekonsiliasi, saldo wallet, sheet transactions, dashboard, dan laporan otomatis diperbarui secara instan.


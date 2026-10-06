# Project Overview: Financial Tracker Pro

## Purpose
Financial Tracker berbasis Google Spreadsheet dengan Natural Language Parser untuk mencatat dan mengelola keuangan pribadi.

## Primary Goals
- Mengurangi jumlah klik dan interaksi form yang repetitif.
- Memungkinkan pencatatan transaksi menggunakan satu kalimat bahasa alami (teks atau input suara Google Form).
- Menyediakan visibilitas penuh terhadap arus kas, saldo multi-wallet, kepatuhan anggaran, serta analisis konsumsi bulanan.

## Core Features
1. **Natural Language Parser**: Parsing teks transaksi satu/banyak baris (dipisahkan koma), normalisasi satuan nominal (`k`, `rb`, `jt`).
2. **Multi-Wallet Management**: Pelacakan saldo per rekening/dompet, pembukuan transfer antar wallet.
3. **Budgeting & Warnings**: Penetapan limit anggaran per kategori dengan batas peringatan (`warning`).
4. **Loan Tracking**: Manajemen pencairan pinjaman, tenor, cicilan, dan status pelunasan.
5. **Dashboard Visual**: Analisis konsumsi bulanan per kategori, kartu KPI, dan Donut Chart interaktif.
6. **Reporting**: Laporan arus kas, ringkasan saldo, dan riwayat transaksi.
7. **Recurring Transactions**: Pemrosesan otomatis transaksi rutin harian/mingguan/bulanan.
8. **Automated Archiving**: Backup transaksi lama ke CSV terkompresi di Google Drive.
9. **Household Inventory Sync**: Sinkronisasi otomatis transaksi belanja ke spreadsheet inventaris rumah tangga.

## Target Audience
Personal use (Single user).

## Explicit Non-Goals
- ❌ ERP multi-perusahaan.
- ❌ Multi-user authorization & permission management.
- ❌ Online SQL/NoSQL database server eksternal (Google Sheets digunakan sebagai database).


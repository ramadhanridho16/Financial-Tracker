# Phase 1.1: Jenis Utang & Rekening Pinjaman Terpisah

## Context & Intent
Pengguna ingin agar pinjaman/utang (`Hutang`) memiliki akun/wallet tersendiri (tipe `Loan` atau `Pinjaman / Kredit`) yang terpisah dari rekening operasional utama (rekening debit / tabungan biasa seperti BCA, BRI, Mandiri, Tunai).
Rekening pinjaman berbeda dari rekening asli/debit karena pinjaman merepresentasikan rekening kredit/pencairan/kewajiban tersendiri.

## Key Requirements & Scope
1. **Dukungan Wallet Type `Loan` / `Kredit`**:
   - Di sheet `Wallets`, wallet dapat memiliki `Type`: `"Loan"` (atau `"Pinjaman"` / `"Kredit"`), selain `"Bank"`, `"E-Wallet"`, `"Cash"`.
   - Fungsi pembentukan wallet baru (`createWallet` / `ensureWalletExists`) untuk menampung rekening pinjaman baru secara otomatis atau manual.
2. **Integrasi Loan Wizard (`/kredit`)**:
   - Saat mencatat pinjaman baru via `/kredit` atau `saveLoan`:
     - Opsi untuk otomatis membuat atau memilih **Wallet Pinjaman / Kredit** (contoh: `Kredit Mandiri`, `Cicilan Vario`, `Pinjaman Koperasi`).
     - Menentukan **Wallet Pencairan** (rekening debit tempat dana masuk, misal: `BCA`) atau **Wallet Pembayaran** (rekening debit tempat cicilan dipotong).
3. **Pencatatan Transaksi & Saldo**:
   - Saat pinjaman dicairkan:
     - Bisa dicatat sebagai pencairan ke wallet tujuan (debit) dari rekening pinjaman (credit/liability), atau penyesuaian saldo pinjaman.
   - Saat pembayaran cicilan (`bayar cicilan vario 500rb via bca`):
     - Memotong wallet debit (`BCA`) dan mengupdate status kewajiban pinjaman.
4. **Tampilan & Reporting**:
   - Command `/saldo` / `/wallet` menampilkan pengelompokan yang jelas antara Rekening Operasional (Bank/Cash/E-Wallet) dan Rekening Pinjaman / Kredit (`Loan`), sehingga total saldo riil kas pengguna tidak tercampur dengan plafon/baki kredit pinjaman.
   - Dashboard dan Report tetap konsisten dengan prinsip akuntansi yang bersih.


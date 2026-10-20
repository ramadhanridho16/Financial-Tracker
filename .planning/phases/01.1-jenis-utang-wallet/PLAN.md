# Execution Plan - Phase 1.1: Jenis Utang & Wallet Pinjaman Terpisah

## Goal Backward
Menyediakan pengelolaan rekening pinjaman terpisah (Loan Wallet) sehingga setiap utang/kredit baru memiliki wallet tersendiri dan tidak tercampur dengan rekening debit operasional (tabungan/tunai), serta memperbarui wizard `/kredit` dan command `/saldo` agar transparan dan akurat.

---

## Wave Breakdown

### Wave 1: Core Configuration & Wallet Service Support
- [ ] **Task 1.1: Constants & Config Enhancement**
  - Perbarui [`src/config/Config.js`](file:///g:/Spreadsheet%20Tracker/Financial%20Tracker/src/config/Config.js) untuk menambahkan tipe wallet `WALLET_TYPE: { BANK: "Bank", EWALLET: "E-Wallet", CASH: "Cash", LOAN: "Loan" }`.
- [ ] **Task 1.2: Wallet CRUD & Type Filtering**
  - Di [`src/services/Wallet.js`](file:///g:/Spreadsheet%20Tracker/Financial%20Tracker/src/services/Wallet.js), tambahkan:
    - `createWallet(walletName, walletType, openingBalance, notes)`
    - `getWalletsByType(type)`
    - `getOperationalWallets()` (Bank, E-Wallet, Cash) vs `getLoanWallets()` (Loan)
    - Pastikan `getTotalWalletBalance()` hanya mengakumulasi rekening kas operasional, atau menyediakan `getTotalOperationalBalance()` dan `getTotalLoanBalance()`.

### Wave 2: Loan Wizard & Loan Service Integration
- [ ] **Task 2.1: Auto-Provisioning Loan Wallet in Loan Creation**
  - Di [`src/services/Loan.js`](file:///g:/Spreadsheet%20Tracker/Financial%20Tracker/src/services/Loan.js), saat `saveLoan` dijalankan:
    - Otomatis membuat atau mengaitkan Wallet Pinjaman khusus (contoh: `Loan - [Nama Pinjaman]`, tipe `"Loan"`).
    - Jika pinjaman berupa utang baru yang dicairkan ke rekening debit, buat transaksi pencairan awal atau pencatatan saldo yang sesuai.
- [ ] **Task 2.2: Enhancing Loan Wizard (`/kredit`)**
  - Di [`src/services/LoanWizardService.js`](file:///g:/Spreadsheet%20Tracker/Financial%20Tracker/src/services/LoanWizardService.js):
    - Tambahkan langkah pemilihan/konfirmasi rekening pencairan (rekening debit operasional, misal `BCA`) dan rekening pinjaman baru.
    - Format ringkasan konfirmasi card menampilkan rekening debit penerima serta nama rekening pinjaman yang dibuat.

### Wave 3: Telegram Bot Commands & Reporting Output
- [ ] **Task 3.1: Segmented `/saldo` Command Output**
  - Di [`src/services/BotCommands.js`](file:///g:/Spreadsheet%20Tracker/Financial%20Tracker/src/services/BotCommands.js) (`handleSaldoCommand`):
    - Tampilkan bagian:
      1. 💳 *Rekening Debit & Kas Operasional* (BCA, BRI, Tunai, dsb.)
      2. 🤝 *Rekening Pinjaman / Kredit* (Kredit Mandiri, Cicilan Motor, dsb.)
      3. Total Kas Bersih vs Total Kewajiban Pinjaman.
- [ ] **Task 3.2: Update `/utang` & Dashboard Summary**
  - Tampilkan nama Wallet Pinjaman terkait di rincian `/utang`.

### Wave 4: Validation & Clasp Deployment
- [ ] **Task 4.1: Unit & Integration Testing**
  - Uji alur pembuatan wallet pinjaman, pemisahan saldo kas vs saldo kredit, dan alur pelunasan angsuran.
- [ ] **Task 4.2: Clasp Push & Versioning**
  - Push kode bersih ke Google Apps Script dan buat version baru.


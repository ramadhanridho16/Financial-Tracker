# Execution Plan - Phase 2.1: Wallet Commands, Balance Reconciliation & Leak Detection

## Goal Backward
Menyediakan kemampuan bagi pengguna untuk menambah wallet baru dan menyesuaikan nominal saldo wallet langsung via command Telegram Bot, secara otomatis mencatat selisihnya sebagai transaksi riil (Pemasukan jika lebih, Pengeluaran jika kurang), serta menerapkan algoritma cerdas pendeteksi selisih uang hilang (pola biaya admin bank, biaya parkir harian, maupun transaksi rekursif bulanan).

---

## Wave Breakdown

### Wave 1: Core Service for Wallet Reconciliation & Leak Detection Algorithm
- [ ] **Task 1.1: Deteksi Pola Selisih Uang (Leak Analyzer Engine)**
  - Buat helper / service analitik pendeteksi selisih uang:
    - Analisis kecocokan dengan jadwal di sheet `Recurring Transactions` (apakah ada nominal langganan/tagihan berulang yang mirip).
    - Analisis kecocokan dengan biaya administrasi bank standar (misal: 6.500 transfer online, 10.000 - 17.500 admin kartu/buku tabungan bulanan).
    - Analisis kecocokan dengan pengeluaran mikro harian (kelipatan parkir 2.000 / 3.000 / 5.000).
    - Analisis riwayat transaksi pengeluaran serupa pada bulan berjalan.
- [ ] **Task 1.2: Service Rekonsiliasi Saldo Wallet**
  - Di `src/services/Wallet.js`:
    - Fungsi `reconcileWalletBalance(walletName, targetBalance, note)`:
      - Validasi wallet ada dan ambil saldo sistem saat ini.
      - Hitung `delta = targetBalance - currentBalance`.
      - Jika `delta === 0`: Return pesan saldo sudah cocok/sesuai.
      - Jika `delta > 0`: Simpan transaksi `Pemasukan` sebesar `delta` (Kategori: `Penyesuaian Saldo`, Catatan: `Penyesuaian Saldo Kas/Bank`).
      - Jika `delta < 0`: Jalankan algoritma deteksi pola uang hilang untuk mendapatkan diagnosis, lalu simpan transaksi `Pengeluaran` sebesar `|delta|`.
      - Perbarui saldo wallet di sheet dan refresh dashboard.

### Wave 2: Telegram Bot Commands Implementation
- [ ] **Task 2.1: Implementasi `/tambahwallet`**
  - Di `src/services/BotCommands.js`:
    - Syntax: `/tambahwallet <nama> [tipe: Bank/E-Wallet/Cash/Loan] [saldo_awal]`
    - Panggil `createWallet(name, type, openingBalance)` dan `updateWalletBalances()`.
    - Respon konfirmasi kartu wallet baru yang siap digunakan.
- [ ] **Task 2.2: Implementasi `/setwallet` & `/cocokkan` (Opname Saldo)**
  - Di `src/services/BotCommands.js`:
    - Syntax: `/setwallet <nama_wallet> <nominal_baru>` atau `/cocokkan <nama_wallet> <nominal_baru>`
    - Contoh: `/cocokkan bca 1.450.000` atau `/setwallet tunai 250k`
    - Tampilkan laporan detail:
      - Saldo Sebelumnya vs Saldo Baru
      - Jenis Penyesuaian (Surplus / Defisit)
      - Dugaan Cerdas Asal Selisih (jika defisit/uang hilang): biaya admin, perkiraan parkir, atau transaksi berulang yang lupa tercatat.
- [ ] **Task 2.3: Registrasi Command & Bantuan**
  - Daftarkan perintah baru di `initializeBotCommands()` dan perbarui pesan `/bantuan` & `/help`.

### Wave 3: Integration Testing & Verification
- [ ] **Task 3.1: Unit Test Node.js**
  - Uji parser command `/tambahwallet`, `/setwallet`, kalkulasi delta, dan akurasi diagnosis algoritma uang hilang.
  - Verifikasi keutuhan regression test (`tests/inventory_sync.test.js` & `tests/home_inventory_notification.test.js`).
- [ ] **Task 3.2: Deployment & Live Web App Verification**
  - Unggah perubahan ke Google Apps Script via `clasp push --force`.
  - Buat version baru dan redeploy.
  - Uji via `curl.exe` ke endpoint GET Web App.


# Execution Plan - Phase 3.1: Transaction Correction & Discrepancy Reconciliation

## Goal Backward
Menyediakan fitur koreksi dan rekonsiliasi data yang lengkap dan mudah digunakan melalui Telegram Bot untuk menangani kesalahan input (salah nominal, salah kategori, salah wallet, duplikasi) dan penyesuaian selisih dana (dana belum tercatat, transaksi terlewat), serta memastikan setiap perubahan data secara matematis menyelaraskan kembali saldo wallet, kuota budget, dan dashboard keuangan dengan pengujian debugging yang menyeluruh.

---

## Wave Breakdown

### Wave 1: Core Transaction Modification & Undo Service
- [ ] **Task 1.1: Service Pembatalan Transaksi Terakhir (`undoLastTransaction`)**
  - Di `src/services/Transaction.js`:
    - Fungsi `undoLastTransaction()`:
      - Mengambil data baris transaksi terakhir di sheet `Transactions`.
      - Memvalidasi bahwa ada transaksi yang bisa dibatalkan (bukan baris header).
      - Menghapus baris transaksi terakhir tersebut via `sheet.deleteRow(lastRow)`.
      - Memanggil `updateWalletBalances()` untuk memulihkan saldo wallet secara otomatis.
      - Return objek transaksi yang dibatalkan beserta saldo wallet sebelum dan sesudah pembatalan.
- [ ] **Task 1.2: Service Koreksi Transaksi (`updateTransactionField`)**
  - Di `src/services/Transaction.js`:
    - Fungsi `updateTransactionField(targetIndexOrId, field, newValue)`:
      - Menentukan baris target (transaksi terakhir jika targetIndex tidak ditentukan, atau berdasarkan nomor urut dari riwayat terbaru).
      - Mendukung pembaruan kolom:
        - `nominal` (dengan validasi angka dan penyesuaian saldo)
        - `kategori` (dengan penyesuaian budget siklus gajian)
        - `wallet` (menyesuaikan saldo kedua wallet: wallet lama bertambah, wallet baru berkurang)
        - `keterangan` / `deskripsi`
      - Memanggil `updateWalletBalances()` dan return status perubahan sebelum vs sesudah.
- [ ] **Task 1.3: Service Penghapusan Transaksi Berdasarkan Urutan Terbaru (`deleteTransactionByRecentIndex`)**
  - Di `src/services/Transaction.js`:
    - Fungsi `deleteTransactionByRecentIndex(recentIndex)`:
      - Memetakan nomor urut 1 s/d N (dari daftar `/terakhir`) ke indeks baris riil di sheet.
      - Menghapus baris transaksi tersebut dan memanggil `updateWalletBalances()`.
      - Return objek transaksi yang berhasil dihapus.

---

### Wave 2: Telegram Bot Commands Implementation
- [ ] **Task 2.1: Implementasi Perintah `/undo` dan `/bataltransaksi`**
  - Di `src/services/BotCommands.js`:
    - Menghubungkan ke `undoLastTransaction()`.
    - Respon konfirmasi:
      ```text
      🗑️ Transaksi Terakhir Berhasil Dibatalkan!
      ----------------------------------------
      • Transaksi: Pengeluaran Rp 500.000 (Makanan & Minuman)
      • Keterangan: makan siang
      • Rekening: BCA
      • Saldo BCA Dikembalikan: Rp 1.500.000 ➔ Rp 2.000.000
      ----------------------------------------
      ✅ Kuota budget dan saldo telah dipulihkan.
      ```
- [ ] **Task 2.2: Implementasi Perintah `/koreksi` (Interaktif & Fleksibel)**
  - Di `src/services/BotCommands.js`:
    - Jika dipanggil tanpa argumen (`/koreksi`):
      - Tampilkan 3 transaksi terakhir beserta panduan aksi cepat.
    - Format perintah:
      - `/koreksi nominal <nominal_baru>` (misal `/koreksi nominal 50k`)
      - `/koreksi kategori <kategori_baru>` (misal `/koreksi kategori Makanan & Minuman`)
      - `/koreksi wallet <wallet_baru>` (misal `/koreksi wallet Mandiri`)
      - `/koreksi keterangan <keterangan_baru>` (misal `/koreksi keterangan makan bakso`)
      - `/koreksi <nomor> <field> <nilai_baru>` (misal `/koreksi 2 nominal 75k`)
    - Tampilkan kartu konfirmasi perbandingan data *Sebelum* vs *Sesudah*.
- [ ] **Task 2.3: Implementasi Perintah `/hapustransaksi <nomor>`**
  - Di `src/services/BotCommands.js`:
    - Syntax: `/hapustransaksi <nomor>` (nomor sesuai daftar `/terakhir`).
    - Menghapus transaksi yang dipilih dan memperbarui saldo.
- [ ] **Task 2.4: Implementasi Perintah `/sesuaikan` (Rekonsiliasi Dana Belum Tercatat)**
  - Di `src/services/BotCommands.js`:
    - Syntax: `/sesuaikan <wallet> <nominal_fisik> [alasan/catatan]`
    - Alias: `/adjust`, `/opname`.
    - Contoh:
      - `/sesuaikan bca 1.750.000 dana freelance belum tercatat`
      - `/sesuaikan tunai 150k lupa catat jajan & parkir`
    - Mencatat transaksi penyesuaian (Pemasukan jika lebih, Pengeluaran jika kurang) dengan catatan spesifik alasan yang dimasukkan.
- [ ] **Task 2.5: Registrasi Registry & Pembaruan Pesan `/bantuan`**
  - Daftarkan perintah baru di `initializeBotCommands()`.
  - Perbarui dokumentasi `/bantuan` dan `/help`.

---

### Wave 3: Comprehensive Debugging, Testing & Verification
- [ ] **Task 3.1: Test Suite Lokal Node.js (`tests/discrepancy_correction.test.js`)**
  - Uji alur `/undo`:
    - Transaksi belanja 500k memotong saldo dari 2jt ➔ 1.5jt.
    - Saat `/undo`, transaksi terhapus dan saldo kembali ke 2jt.
  - Uji alur `/koreksi nominal`:
    - Transaksi 500k diubah menjadi 50k.
    - Saldo wallet berubah dari 1.5jt ➔ 1.95jt secara tepat.
  - Uji alur `/koreksi wallet`:
    - Transaksi dipindahkan dari BCA ke Mandiri.
    - Saldo BCA bertambah kembali, saldo Mandiri berkurang.
  - Uji alur `/koreksi kategori`:
    - Kategori diubah dari Transportasi ke Makanan & Minuman.
    - Penggunaan budget Makanan & Minuman otomatis terupdate.
  - Uji alur `/hapustransaksi <nomor>`.
  - Uji alur `/sesuaikan` dengan alasan custom penyesuaian dana.
  - Uji kasus batas (*edge cases*): sheet kosong, nomor urut tidak valid, nominal tidak valid, wallet tidak ada.
  - Pengujian regresi seluruh suite (`payday_budget.test.js`, `instant_budget_feedback.test.js`, `inventory_sync.test.js`, `home_inventory_notification.test.js`).
- [ ] **Task 3.2: Deployment & Verifikasi Apps Script**
  - Unggah ke Google Apps Script via `clasp push --force`.
  - Deploy versi baru via `clasp deploy`.
  - Verifikasi endpoint Web App via `curl.exe`.

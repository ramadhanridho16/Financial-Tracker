# Context - Phase 3.1: Transaction Correction & Discrepancy Reconciliation

## 1. Problem Statement & User Intent
Pengguna menyampaikan kebutuhan:
> *"Please create a feature for me to correct discrepancies—for instance, in cases of input errors or funds that haven't been recorded yet. Sometimes I may not have logged everything, or a transaction might have been overlooked, so there are instances where the figures need to be adjusted. Please build this as a Telegram bot, and ensure that you perform debugging while testing it."*

Dalam aktivitas pencatatan keuangan harian melalui bot, kesalahan manusia dan selisih dana sering terjadi:
1. **Kesalahan Input (*Input Errors*):**
   * Salah ketik nominal (misal ingin input `50k` tapi terketik `500k`).
   * Salah memilih wallet/rekening sumber (misal bayar pakai QRIS BCA tapi tercatat Tunai).
   * Salah deteksi kategori atau deskripsi transaksi.
   * Transaksi terduplikasi secara tidak sengaja.
2. **Dana Belum Tercatat / Transaksi Terlewat (*Overlooked Funds / Discrepancies*):**
   * Pengguna lupa mencatat beberapa pengeluaran kecil (parkir, tips, jajan tunai), sehingga saldo fisik dompet/rekening lebih kecil daripada yang tercatat di sistem.
   * Pengguna menerima dana tunai/transfer yang belum sempat di-input ke bot, sehingga saldo fisik lebih besar daripada saldo sistem.
3. **Kebutuhan Pengguna di Telegram:**
   * Pengguna memerlukan fitur koreksi yang cepat, intuitif, dan aman langsung via Telegram bot tanpa harus membuka Google Spreadsheet secara manual.
   * Setiap penyesuaian harus secara otomatis menyelaraskan kembali saldo wallet, penggunaan budget siklus gajian, dan dashboard keuangan.
   * Pengujian dan *debugging* yang komprehensif untuk memastikan tidak terjadi inkonsistensi data.

---

## 2. Technical Analysis & Architecture

### A. Penyimpanan Data di Sheet `Transactions`
* Kolom standar:
  `Timestamp | Tanggal | Jenis | Wallet | Wallet Tujuan | Kategori | Keterangan | Nominal | Catatan`
* Transaksi paling baru berada di baris paling bawah (*last row*).
* `getTransactions()` membaca seluruh baris transaksi.
* `getWalletBalances()` menghitung saldo wallet secara agregasi dinamis dari `openingBalance + income - expense + transferIn - transferOut`.
* Jika satu baris transaksi dihapus atau diubah di sheet `Transactions`, pemanggilan `updateWalletBalances()` akan langsung menyelaraskan seluruh saldo wallet secara matematis.

### B. Mekanisme Fitur Koreksi Telegram

#### 1. Pembatalan Transaksi Cepat (`/undo` atau `/bataltransaksi`)
* Membatalkan/menghapus 1 transaksi terakhir yang baru saja di-input.
* Mengembalikan saldo wallet dan kuota budget ke kondisi sebelum transaksi tersebut dicatat.
* Menampilkan konfirmasi detail transaksi yang telah dibatalkan beserta saldo wallet terkini.

#### 2. Koreksi Bagian Tertentu (`/koreksi`)
* Mengubah elemen dari transaksi terakhir (atau transaksi nomor tertentu dari `/terakhir`):
  * `/koreksi nominal <nominal_baru>` (misal `/koreksi nominal 50k`)
  * `/koreksi kategori <kategori_baru>` (misal `/koreksi kategori Makanan & Minuman`)
  * `/koreksi wallet <wallet_baru>` (misal `/koreksi wallet BCA`)
  * `/koreksi keterangan <keterangan_baru>` (misal `/koreksi keterangan makan bakso`)
  * `/koreksi <nomor> nominal <nominal_baru>` (misal `/koreksi 2 nominal 75k`)
* Memperbarui baris sheet yang bersangkutan, menghitung ulang saldo wallet, dan memperbarui status budget.

#### 3. Penghapusan Transaksi Spesifik (`/hapustransaksi <nomor>`)
* Berdasarkan daftar transaksi dari perintah `/terakhir` (nomor 1 s/d 5).
* Menghapus baris transaksi yang dipilih dan menyelaraskan saldo.

#### 4. Penyesuaian Selisih Dana Fisik (`/sesuaikan <wallet> <nominal_fisik> [alasan]`)
* Memperluas rekonsiliasi saldo:
  * Jika saldo fisik > saldo sistem: mencatat transaksi `Pemasukan` (Penyesuaian Saldo Masuk: *alasan*).
  * Jika saldo fisik < saldo sistem: mencatat transaksi `Pengeluaran` (Penyesuaian Saldo Keluar: *alasan*).
* Menyimpan alasan/catatan yang diberikan pengguna (misal: "Uang belum tercatat", "Lupa catat pengeluaran tunai").

---

## 3. Scope of Work & Acceptance Criteria

1. **Perintah `/undo` / `/bataltransaksi`:** Menghapus transaksi terakhir dengan aman, memperbarui saldo wallet, dan memberikan respon konfirmasi.
2. **Perintah `/koreksi`:** Mendukung pengeditan field `nominal`, `kategori`, `wallet`, dan `keterangan` baik untuk transaksi terakhir maupun transaksi bernomor.
3. **Perintah `/hapustransaksi <nomor>`:** Menghapus transaksi tertentu yang tampil pada daftar `/terakhir`.
4. **Perintah `/sesuaikan` (alias `/adjust` / `/opname`):** Mencocokkan saldo fisik dengan saldo sistem dan mencatat selisih beserta alasan penyesuaian.
5. **Dukungan Menu Bantuan & Debugging:**
   * Menampilkan panduan interaktif jika pengguna hanya mengetik `/koreksi`.
   * Unit test suite `tests/discrepancy_correction.test.js` mencakup pengujian pembatalan, pengeditan parsial, rekonsiliasi selisih dana, dan pengujian kasus batas (*edge cases*).


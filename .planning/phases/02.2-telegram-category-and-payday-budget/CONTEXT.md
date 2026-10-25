# Context - Phase 2.2: Telegram Category Ingestion & Payday (25th) Budget Cycle Management

## 1. Problem Statement & User Intent
Pengguna ingin kemudahan mengelola kategori transaksi dan anggaran pengeluaran (*budget*) langsung dari Telegram Bot tanpa harus membuka Google Spreadsheet secara manual:
1. **Input Kategori Baru via Telegram**: Pengguna dapat menambahkan kategori baru (beserta kata kunci deteksi) langsung melalui obrolan Telegram.
2. **Penentuan Budget via Telegram**: Pengguna dapat menentukan dan memperbarui limit nominal budget bulanan per kategori dengan mudah.
3. **Siklus Anggaran Berbasis Hari Gajian (Tanggal 25 Tiap Bulan)**: Mengingat tanggal 25 adalah hari gajian, siklus budget tidak lagi dihitung berdasarkan kalender standar (1 s/d 31), melainkan **dari tanggal 25 bulan berjalan hingga tanggal 24 bulan berikutnya** (misal: 25 Oktober - 24 November).
4. **Otomatisasi Pembaruan Tiap Tanggal 25**: Sistem secara otomatis mengevaluasi budget periode lalu, memperpanjang/merollover alokasi budget untuk siklus baru, dan mengirimkan notifikasi rekap gajian ke Telegram pada tanggal 25 pagi.

---

## 2. Existing Schema & Codebase Analysis

### A. Sheet `Budget`
Berdasarkan data dan tangkapan layar Google Spreadsheet:
* Kolom A: `Budget ID` (Prefix: `BGT`)
* Kolom B: `Category` (Nama kategori, misal: `Makanan`, `Transport`, `Hiburan`)
* Kolom C: `Period Type` (`Payday` / `Monthly`)
* Kolom D: `Period Value` (Format rentang siklus, e.g. `2026-10-25_2026-11-24` atau tag periode `2026-10`)
* Kolom E: `Limit` (Nominal plafon anggaran, misal: `2500000`)
* Kolom F: `Warning` (Ambang batas peringatan persentase, default `80` atau nominal)
* Kolom G: `Active` (Boolean `TRUE`/`FALSE`)
* Kolom H: `Created At`
* Kolom I: `Updated At`

### B. Sheet `Dictionary` (Kategori & Keyword)
* Kolom: `Keyword`, `Kategori`, `Subkategori`, `Merchant`, `Default Jenis`, `Alias`, `Priority`
* Engine `Category.js` memetakan teks transaksi ke kategori berdasarkan pencarian keyword & alias di sheet ini.

### C. Telegram Bot Commands (`src/services/BotCommands.js`)
* Sudah memiliki command `/kategori` (hanya melihat daftar) dan `/budget` (hanya melihat daftar limit).
* Memerlukan penambahan command interaktif/operasional:
  * `/tambahkategori` (menambah kategori + kata kunci baru)
  * `/setbudget` (mengatur limit nominal & warning per kategori)
  * `/hapusbudget` (menonaktifkan budget kategori tertentu)
  * Peningkatan `/budget` untuk menampilkan pemakaian aktual & sisa kuota periode gajian berjalan.

---

## 3. Core Architectural Decisions

### 1. Payday Cycle Engine (Tanggal 25 - Tanggal 24)
* Disediakan fungsi utilitas khusus di `src/services/Budget.js`:
  ```javascript
  function getPaydayPeriod(date, paydayDate = 25)
  ```
* Aturan:
  * Jika hari transaksi $\ge 25$: Periode dimulai dari tanggal 25 bulan ini s/d 24 bulan depan.
  * Jika hari transaksi $< 25$: Periode dimulai dari tanggal 25 bulan lalu s/d 24 bulan ini.
* Semua perhitungan `getBudgetUsage(category)` dan `/budget` dihitung berdasarkan transaksi pengeluaran dalam rentang tanggal siklus gajian aktif.

### 2. Auto-Rollover & Notifikasi Gajian (Tanggal 25)
* Jadwal clock trigger (atau evaluasi harian jam 07:00 WIB):
  * Jika hari ini adalah tanggal 25:
    1. Hitung performa budget periode 25 bulan lalu - 24 bulan ini.
    2. Perbarui `Period Value` atau aktifkan alokasi kuota untuk siklus baru tanpa menghapus limit yang telah diatur (user tidak perlu input ulang jika nominalnya tetap).
    3. Kirim notifikasi Telegram: Ucapan selamat gajian, rekap performa budget periode lalu, dan daftar alokasi budget baru.

### 3. Real-Time Transaction Warning Badge
* Ketika transaksi pengeluaran dicatat (di `src/services/TelegramBot.js` atau pipeline penerimaan transaksi):
  * Sistem mengecek apakah kategori transaksi memiliki budget aktif pada periode gajian saat ini.
  * Jika akumulasi belanja telah mencapai $\ge 80\%$ (warning) atau $\ge 100\%$ (over budget), struk balasan Telegram otomatis menyertakan peringatan visual:
    `⚠️ Peringatan Budget: Makanan telah terpakai 85% (Rp 1.700.000 / Rp 2.000.000)!`

---

## 4. Acceptance Criteria
1. Pengguna dapat mengetik `/tambahkategori <Nama Kategori> [keyword1, keyword2]` dan data tersimpan ke sheet `Dictionary`.
2. Pengguna dapat mengetik `/setbudget <Kategori> <Nominal> [Warning%]` (misal: `/setbudget Makanan 2.5jt 80`) dan data tersimpan/terupdate di sheet `Budget`.
3. Perintah `/budget` menampilkan progress bar / persentase pemakaian budget aktual terhadap siklus gajian aktif (25 s/d 24).
4. Siklus gajian 25-ke-24 berjalan akurat dan transaksi otomatis dicek terhadap tanggal periode ini.
5. Pemicu otomatis tanggal 25 mengirim pesan rekapitulasi gajian & rollover budget ke chat Telegram.
6. Struk transaksi Telegram memunculkan peringatan jika pengeluaran kategori mendekati atau melebihi limit budget.
7. Seluruh unit test lokal Node.js lolos 100% dan terverifikasi di Google Apps Script.

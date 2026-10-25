# Context - Phase 2.3: Real-Time Instant Budget Feedback & Keyword Mapping Alignment

## 1. Problem Statement & User Inquiry
Pengguna menanyakan:
> *"Aku mengatur budget anggaran berdasarkan kategori transaksi yang ada. Apakah jika aku memesan dari kategori makanan & minuman apakah bisa langsung mengurangi dari budget?"*

Secara arsitektur, sistem pada Phase 2.2 sudah menghitung pemotongan budget secara real-time dinamis pada siklus gajian aktif (25 Oktober – 24 November). Namun terdapat 3 aspek *user experience* dan keandalan data yang perlu disempurnakan:

1. **Umpan Balik Instan pada Struk Transaksi (*Instant Budget Feedback*):**
   * Saat ini, informasi budget pada struk Telegram hanya muncul jika pemakaian telah mencapai ambang batas peringatan ($\ge 80\%$).
   * Jika pengguna baru belanja Rp 35.000 (pemakaian 3.5%), struk transaksi tidak menampilkan sisa kuota budget, sehingga pengguna bertanya-tanya apakah transaksi tersebut sudah memotong budget atau belum.
   * **Solusi:** Menampilkan *badge* sisa kuota budget pada **setiap** transaksi pengeluaran yang memiliki budget aktif (misal: `🎯 Sisa Budget Makanan & Minuman: Rp 965.000 (Terpakai 3.5%)`).

2. **Penyelarasan Kata Kunci (*Dictionary Keyword Mapping*):**
   * Di sheet `Budget`, pengguna menggunakan nama kategori resmi: **`Makanan & Minuman`** (dengan tanda ampersand `&`).
   * Perlu dipastikan seluruh variasi kata kunci makanan & minuman (seperti `makan`, `minum`, `kopi`, `sarapan`, `lunch`, `dinner`, `gofood`, `shopeefood`, `grabfood`, `snack`, `jajan`, `mie`, `nasi`, `ayam`) di sheet `Dictionary` benar-benar terpetakan ke kategori resmi `Makanan & Minuman`.
   * Sistem juga harus fleksibel mengenali pencarian budget baik dengan kata `Makanan`, `Minuman`, maupun `Makanan & Minuman`.

3. **Pencarian Cepat Kuota Spesifik (`/budget <kategori>`):**
   * Memberikan kemudahan bagi pengguna untuk mengetik `/budget Makanan` atau `/budget Makanan & Minuman` untuk langsung mengecek sisa kuota kategori tersebut secara instan tanpa harus melihat daftar panjang seluruh kategori.

---

## 2. Existing Schema & Technical Analysis

* **Sheet `Budget` (Baris Aktif):**
  * `Budget ID`: `BD000001`
  * `Category`: `Makanan & Minuman`
  * `Limit`: `1.000.000`
  * `Period Type`: `Payday` (Siklus 25 s/d 24)
* **Kalkulasi Pemotongan:**
  * Fungsi `getCategoryExpenseInPaydayPeriod("Makanan & Minuman")` mencari seluruh transaksi pengeluaran dalam rentang `2026-10-25 s/d 2026-11-24` yang kategorinya cocok.
  * Sisa kuota dihitung: `Limit - Total Expense`.
* **Receipt Formatter (`src/services/TelegramBot.js`):**
  * Fungsi `formatTelegramTransactionReceipt` perlu menampilkan blok kuota anggaran aktif secara elegan di bawah rincian saldo wallet.

---

## 3. Scope of Work

1. **Struk Transaksi Telegram:**
   * Tampilkan status budget kategori pada setiap transaksi pengeluaran yang memiliki budget aktif, menampilkan:
     * Kategori & Progress Bar singkat
     * Nominal pengeluaran saat ini / Plafon limit
     * Sisa kuota aman yang masih bisa dibelanjakan
2. **Kesesuaian Fleksibel Nama Kategori (*Fuzzy & Alias Matching*):**
   * Pencocokan kategori di `getBudgetByCategory` mendukung alias (misal: user input `makanan` otomatis mencocokkan ke budget `Makanan & Minuman`).
3. **Command `/budget <kategori>`:**
   * Memungkinkan pengguna mengecek status satu kategori saja.
4. **Verifikasi & Sinkronisasi Dictionary:**
   * Memastikan keyword makanan & minuman populer terhubung ke `Makanan & Minuman`.


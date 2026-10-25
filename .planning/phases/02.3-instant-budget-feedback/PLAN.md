# Execution Plan - Phase 2.3: Real-Time Instant Budget Feedback & Keyword Mapping Alignment

## Goal Backward
Memastikan setiap transaksi pengeluaran (seperti pembelian makanan & minuman) secara instan dan transparan mengurangi sisa kuota budget yang bersangkutan, menampilkan informasi sisa kuota langsung pada struk transaksi Telegram tanpa harus menunggu batas peringatan 80%, mendukung pencocokan kategori yang fleksibel (misal kata `makanan` otomatis terhubung ke `Makanan & Minuman`), serta menyediakan perintah cepat `/budget <kategori>` untuk melihat sisa kuota spesifik.

---

## Wave Breakdown

### Wave 1: Flexible Category Matching & Instant Receipt Feedback
- [x] **Task 1.1: Pencocokan Kategori Cerdas (*Fuzzy & Alias Matching*)**
  - Di `src/services/Budget.js`:
    - Perbarui fungsi `getBudgetByCategory(category)`:
      - Cek kecocokan persis (*exact normalized match*).
      - Jika tidak ditemukan, cek kecocokan substring/alias (contoh: input `"Makanan"` atau `"Minuman"` otomatis cocok dengan `"Makanan & Minuman"`).
      - Menghindari kegagalan deteksi akibat perbedaan penulisan simbol `&` vs `dan`.
- [x] **Task 1.2: Umpan Balik Sisa Budget Instan pada Struk Transaksi**
  - Di `src/services/TelegramBot.js`:
    - Perbarui fungsi `formatTelegramTransactionReceipt`:
      - Untuk setiap transaksi `EXPENSE` yang kategorinya memiliki budget aktif:
        - Tampilkan kartu status sisa kuota langsung di struk (bahkan saat pemakaian masih 1% - 79%).
        - Format visual:
          ```text
          🎯 Kuota Anggaran Makanan & Minuman:
          • Terpakai: Rp 35.000 / Rp 1.000.000 (3.5%)
          • Sisa Kuota: Rp 965.000 | ✅ Aman
          ```
        - Jika mencapai $\ge 80\%$ atau $\ge 100\%$, ubah badge menjadi `⚡ Waspada` atau `🚨 Over Budget`.

---

### Wave 2: Targeted Command `/budget <kategori>` & Dictionary Alignment
- [x] **Task 2.1: Dukungan Parameter pada Command `/budget`**
  - Di `src/services/BotCommands.js`:
    - Syntax: `/budget [nama_kategori]`
    - Jika argumen diberikan (misal `/budget Makanan` atau `/budget Makanan & Minuman`):
      - Tampilkan kartu detail khusus untuk kategori tersebut:
        - Limit, realisasi belanja siklus gajian aktif, persentase terpakai, sisa kuota, dan progress bar.
    - Jika tanpa argumen: tampilkan ringkasan seluruh budget aktif seperti biasa.
- [x] **Task 2.2: Helper Pemetaan Kata Kunci Makanan & Minuman**
  - Di `src/Category.js`:
    - Pastikan kata kunci umum kuliner (`makan`, `minum`, `kopi`, `sarapan`, `gofood`, `grabfood`, `shopeefood`, `jajan`, `lunch`, `dinner`) terhubung ke kategori resmi `Makanan & Minuman`.

---

### Wave 3: Integration Testing & Verification
- [x] **Task 3.1: Test Suite Lokal Node.js (`tests/instant_budget_feedback.test.js`)**
  - Uji pencocokan nama kategori fleksibel (`Makanan` ➔ `Makanan & Minuman`).
  - Uji kemunculan sisa budget pada struk transaksi bernilai kecil (misal Rp 25.000).
  - Uji command `/budget Makanan & Minuman`.
  - Uji regresi terhadap seluruh test suite (`payday_budget.test.js`, `inventory_sync.test.js`, `home_inventory_notification.test.js`).
- [x] **Task 3.2: Deployment & Verifikasi Apps Script**
  - Unggah pembaruan ke Google Apps Script via `clasp push --force`.
  - Deploy versi baru via `clasp deploy`.


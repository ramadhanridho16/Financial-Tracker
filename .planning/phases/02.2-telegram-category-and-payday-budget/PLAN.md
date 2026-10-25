# Execution Plan - Phase 2.2: Telegram Category Ingestion & Payday (25th) Budget Cycle Management

## Goal Backward
Menyediakan antarmuka pengelolaan kategori transaksi dan limit anggaran (*budget*) secara instan melalui Telegram Bot, serta mengotomatisasi siklus anggaran berbasis hari gajian pengguna (setiap tanggal 25 hingga tanggal 24 bulan berikutnya). Sistem secara cerdas menghitung pemakaian anggaran secara riil per siklus gajian, memunculkan peringatan ambang batas pada struk transaksi, dan mengirimkan rekap evaluasi serta perpanjangan kuota (*rollover*) otomatis ke Telegram setiap tanggal 25 pagi.

---

## Wave Breakdown

### Wave 1: Core Service - Payday Cycle Engine & Budget Upsert
- [ ] **Task 1.1: Engine Perhitungan Siklus Gajian (Payday Cycle Engine)**
  - Di `src/services/Budget.js`:
    - Fungsi `getPaydayPeriod(date, paydayDate = 25)`:
      - Menghitung rentang tanggal aktif:
        - Jika hari $\ge 25$: `startDate = YYYY-MM-25`, `endDate = (YYYY-MM+1)-24 23:59:59`.
        - Jika hari $< 25$: `startDate = (YYYY-MM-1)-25`, `endDate = YYYY-MM-24 23:59:59`.
      - Menangani pergantian tahun (Desember - Januari) secara presisi.
      - Return `{ startDate, endDate, periodKey, label }` (contoh label: `"25 Okt 2026 - 24 Nov 2026"`).
- [ ] **Task 1.2: Perhitungan Pengeluaran Riil per Siklus Gajian**
  - Di `src/services/Budget.js`:
    - Fungsi `getCategoryExpenseInPaydayPeriod(category, paydayDate = 25)`:
      - Ambil rentang periode gajian saat ini.
      - Filter transaksi `EXPENSE` yang berada dalam rentang `startDate` s/d `endDate` dengan kategori yang cocok.
      - Return total nominal pengeluaran kategori tersebut pada siklus gajian aktif.
- [ ] **Task 1.3: Upsert Budget & Input Kategori Baru**
  - Di `src/services/Budget.js`:
    - Fungsi `upsertBudget(category, limit, warningPct, periodType)`:
      - Normalisasi nama kategori dan pastikan kategori valid.
      - Jika budget kategori sudah ada: update `Limit`, `Warning`, `Period Type`, dan `Updated At`.
      - Jika belum ada: buat entri baru via `saveBudget(...)`.
  - Di `src/Category.js`:
    - Fungsi `saveNewCategory(categoryName, keywords, defaultType)`:
      - Validasi keunikan kategori di sheet `Dictionary`.
      - Tambahkan baris baru ke sheet `Dictionary` dengan keyword, kategori, dan default tipe transaksi.
      - Refresh cache dictionary.

---

### Wave 2: Telegram Bot Commands Implementation
- [ ] **Task 2.1: Implementasi Command `/tambahkategori`**
  - Di `src/services/BotCommands.js`:
    - Syntax: `/tambahkategori <nama_kategori> [keyword1, keyword2, ...]`
    - Contoh: `/tambahkategori Skincare sunscreen, serum, cleanser` atau `/tambahkategori Olahraga gym, badminton`
    - Panggil `saveNewCategory(...)`.
    - Respon konfirmasi rapi ke user bahwa kategori telah tersimpan di Dictionary dan siap digunakan dalam transaksi maupun alokasi budget.
- [ ] **Task 2.2: Implementasi Command `/setbudget` & `/hapusbudget`**
  - Di `src/services/BotCommands.js`:
    - Syntax: `/setbudget <kategori> <nominal> [warning%]`
    - Dukung fleksibilitas nominal uang (contoh: `2.5jt`, `500k`, `250rb`, `2.500.000`).
    - Default warning persentase: `80%`.
    - Contoh pemakaian: `/setbudget Makanan 2.5jt` atau `/setbudget Transport 600k 85`.
    - Tampilkan kartu konfirmasi budget dengan rincian limit, peringatan, dan masa siklus gajian aktif (25 s/d 24).
    - Syntax `/hapusbudget <kategori>`: melakukan soft delete/nonaktifkan budget.
- [ ] **Task 2.3: Peningkatan Tampilan Command `/budget`**
  - Di `src/services/BotCommands.js`:
    - Tampilkan header periode: `📅 Siklus Gajian Aktif: 25 Okt 2026 - 24 Nov 2026`
    - Untuk setiap kategori budget aktif:
      - Tampilkan progress bar visual: `[██████░░░░] 60%`
      - Pemakaian aktual vs Limit: `Rp 1.200.000 / Rp 2.000.000`
      - Sisa kuota aman: `Rp 800.000`
      - Status badge: `✅ Aman`, `⚡ Waspada (≥80%)`, atau `🚨 Over Budget (≥100%)`.
    - Total ringkasan seluruh budget.
- [ ] **Task 2.4: Pendaftaran Registry & Dokumentasi Bantuan**
  - Daftarkan `/tambahkategori`, `/setbudget`, `/hapusbudget` di `initializeBotCommands()`.
  - Perbarui pesan `/bantuan` & `/help`.

---

### Wave 3: Real-Time Transaction Warning & Automated 25th Payday Trigger
- [ ] **Task 3.1: Struk Transaksi Telegram dengan Indikator Budget**
  - Di `src/services/TelegramBot.js`:
    - Setelah transaksi pengeluaran berhasil dicatat, periksa apakah kategori memiliki budget aktif.
    - Hitung total akumulasi pengeluaran kategori dalam siklus gajian.
    - Jika mencapai persentase warning ($\ge 80\%$) atau over budget ($\ge 100\%$), sisipkan blok peringatan di bagian bawah struk:
      ```text
      ⚠️ PERINGATAN ANGGARAN:
      Kategori 'Makanan' telah terpakai 85%!
      Terpakai: Rp 1.700.000 / Rp 2.000.000
      Sisa Kuota: Rp 300.000 (s.d. 24 Nov)
      ```
- [ ] **Task 3.2: Automated Payday Rollover & Rekap Notifikasi (Tanggal 25 Tiap Bulan)**
  - Di `src/services/Budget.js` & `src/trigger/Trigger.js`:
    - Fungsi `processPaydayBudgetRollover()`:
      - Dijalankan pada trigger pagi (07:00 WIB).
      - Deteksi: `if (new Date().getDate() === 25)`.
      - Evaluasi siklus gajian bulan lalu (25 bulan sebelumnya s/d 24 bulan ini):
        - Hitung total pengeluaran vs total budget.
        - Identifikasi kategori yang hemat/surplus dan kategori yang *over budget*.
      - Rollover otomatis: kuota budget diperbarui untuk siklus gajian baru (25 bulan ini s/d 24 bulan depan) tanpa perlu input ulang dari user.
      - Kirimkan pesan ucapan & evaluasi ke Telegram:
        ```text
        🎉 SELAMAT HARI GAJIAN!
        Periode Anggaran Baru Telah Aktif: 25 Okt 2026 - 24 Nov 2026

        📊 Rekapitulasi Anggaran Bulan Lalu:
        • Total Anggaran: Rp 5.000.000
        • Realisasi Belanja: Rp 4.650.000 (Hemat Rp 350.000 👏)
        • Kategori Melebihi Kuota: Hiburan (+Rp 150.000)

        🎯 Alokasi Anggaran Bulan Ini:
        • Makanan: Rp 2.500.000
        • Transport: Rp 800.000
        • Belanja: Rp 1.700.000

        💡 Ingin ubah nominal? Gunakan command /setbudget <Kategori> <Nominal>
        ```

---

### Wave 4: Integration Testing & Verification
- [ ] **Task 4.1: Test Suite Lokal Node.js (`tests/payday_budget.test.js`)**
  - Uji kalkulasi tanggal siklus gajian:
    - Transaksi tanggal 25 Oktober ➔ Periode `2026-10-25 s/d 2026-11-24`
    - Transaksi tanggal 5 November ➔ Periode `2026-10-25 s/d 2026-11-24`
    - Transaksi tanggal 24 November ➔ Periode `2026-10-25 s/d 2026-11-24`
    - Transaksi tanggal 25 Desember ➔ Periode `2026-12-25 s/d 2027-01-24`
  - Uji parser nominal angka (`2.5jt`, `500k`, `2.500.000`).
  - Uji logika `upsertBudget`, `saveNewCategory`, dan kalkulasi persentase warning.
  - Uji eksekusi seluruh suite pengujian (`inventory_sync.test.js` dan `home_inventory_notification.test.js`).
- [ ] **Task 4.2: Deployment & Verifikasi Apps Script**
  - Unggah perubahan via Google Clasp: `clasp push --force`.
  - Verifikasi keutuhan kode di remote.

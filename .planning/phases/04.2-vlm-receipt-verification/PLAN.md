# Phase 4.2 Plan: Gemini Vision (VLM) Receipt Ingestion & Telegram Human-in-the-Loop Verification

## Objective
Mengintegrasikan Vision-Language Model (VLM) Google Gemini Flash (`gemini-2.5-flash`) ke dalam bot Telegram Financial Tracker untuk memproses struk belanja secara holistik dengan pemahaman semantik dan rekonstruksi teks tertutup, serta menambahkan sistem verifikasi interaktif (*"YA" / "TIDAK" / Koreksi Teks*) sebelum data dicatat ke sheet `Transactions`.

---

## Execution Waves

### Wave 1: Core VLM Infrastructure & Receipt Reasoning Engine
- **Task 1.1**: Buat `src/repositories/GeminiVisionRepository.js`
  - Client REST API Google Gemini multimodal menggunakan `UrlFetchApp.fetch`.
  - Mengonversi Blob gambar ke Base64 via `Utilities.base64Encode`.
  - Mengambil API Key dari `PropertiesService` (`GEMINI_API_KEY`) dengan fallback ke sheet `Settings`.
  - Model: `gemini-2.5-flash` dengan konfigurasi `response_mime_type: "application/json"`.
  - Error handling untuk kuota, invalid key, atau gangguan koneksi.
- **Task 1.2**: Buat `src/services/ReceiptVlmService.js`
  - Prompt engineering semantik khusus struk kasir Indonesia:
    - Membedakan jumlah item dalam kurung `Total (2)` dengan nominal rupiah di sebelahnya.
    - Melakukan rekonsiliasi aritmatika silang: `item × harga satuan` vs `subtotal` vs `total bayar`.
    - Menangani teks tertutup jempol/lipatan kertas (*occlusion handling*).
  - Normalisasi kategori hasil VLM terhadap sheet `Dictionary`.
  - Pembentukan kartu tampilan verifikasi untuk Telegram.

---

### Wave 2: Telegram Bot Human-in-the-Loop State Machine & Kredensial
- **Task 2.1**: Update `src/services/TelegramBot.js`
  - Alur Foto: Mengunduh foto Telegram ➔ Simpan foto ke Google Drive ➔ Panggil VLM ➔ Simpan draft transaksi ke `CacheService` (`pending_receipt_<chatId>`, TTL 900s) ➔ Kirim kartu verifikasi ke pengguna.
  - Alur Teks: Cek apakah pengguna memiliki draft struk pending di `CacheService`:
    - Jika input `"YA"` / `"Y"`: Simpan transaksi ke sheet `Transactions`, sinkronkan inventaris & saldo, lalu kirim resi sukses.
    - Jika input `"TIDAK"` / `"BATAL"`: Hapus draft dari cache, batalkan pencatatan.
    - Jika input koreksi (misal `"34k bca"` atau `"34000"`): Ekstrak nominal/wallet baru dari teks pengguna, perbarui draft, lalu simpan ke spreadsheet.
- **Task 2.2**: Update `src/services/BotCommands.js`
  - Daftarkan perintah `/setgeminikey <api_key>` untuk menyimpan API key ke `PropertiesService`.
  - Daftarkan perintah `/cekkey` untuk melihat status keaktifan Gemini API Key tanpa mengekspos seluruh isi key.

---

### Wave 3: Testing, Verification, & Deployment
- **Task 3.1**: Pengujian Simulasi End-to-End
  - Uji alur struk foto dengan simulasi kasus nyata (Toko Kopi Tahan Banting, Rp 34.000).
  - Uji validasi respons `"YA"` ➔ pastikan nominal yang masuk ke `Transactions` adalah Rp 34.000 (bukan Rp 2).
  - Uji validasi respons `"TIDAK"` ➔ pastikan draft dibatalkan.
  - Uji validasi respons koreksi teks ➔ pastikan input pengguna diutamakan.
- **Task 3.2**: Deploy & Dokumentasi
  - Jalankan `clasp push --force`, `clasp version`, dan `clasp redeploy`.
  - Perbarui status di `ROADMAP.md` dan `STATE.md`.
  - Berikan panduan cara mendapatkan & memasukkan Gemini API Key kepada pengguna.

---

## Quality Gates & Verification Criteria
- [ ] Semua fungsi berukuran $\le 50$ baris (`CODING_STANDARD.md`).
- [ ] JSDoc lengkap pada seluruh fungsi baru.
- [ ] Tidak ada akses Spreadsheet di luar Repository.
- [ ] Tidak ada penulisan data ke `Transactions` sebelum pengguna mengonfirmasi `"YA"` atau memberikan koreksi.
- [ ] Kasus struk `Total (2) 34.000` berhasil diparsing tepat sebagai Rp 34.000.

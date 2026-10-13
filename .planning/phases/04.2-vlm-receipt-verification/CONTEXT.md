# Phase 4.2 Context: Vision-Language Model (VLM) Receipt Parsing & Verification

## 1. Executive Summary
Fase ini meng-upgrade pemindaian struk belanja dari OCR karakter terisolasi (Drive OCR regex) menjadi **Vision-Language Model (VLM)** berbasis Google Gemini Flash (`gemini-2.5-flash` / `gemini-1.5-flash`), dilengkapi dengan mekanisme **Human-in-the-Loop Verification ("YA" / "TIDAK" / Koreksi Langsung)** pada Telegram Bot sebelum data ditulis ke Google Spreadsheet.

---

## 2. Background & Problem Statement
- **Kelemahan OCR Lama**:
  - Hanya mencocokkan karakter terisolasi tanpa pemahaman semantik visual struk kasir.
  - Pada struk kasir nyata (misal *Toko Kopi Tahan Banting*), baris `Total (2) 34.000` salah dideteksi sebagai nominal `Rp 2` karena regex angka pertama setelah kata "Total".
  - Teks yang sebagian tertutup jempol/lipatan kertas (*...total*, *...al (2)*) gagal direkonstruksi.
  - Transaksi langsung tersimpan otomatis ke sheet `Transactions` tanpa konfirmasi pengguna, sehingga data keliru masuk ke database.

---

## 3. Locked Decisions (Hasil Diskusi)

### A. VLM Engine & Semantic Reasoning
- Menggunakan **Google Gemini API** (`gemini-2.5-flash` via Google AI Studio).
- Memproses seluruh citra secara holistik (token visual/patch), bukan OCR huruf terisolasi.
- Menggunakan penalaran semantik struk kasir:
  - Melakukan validasi aritmatika silang: `qty × harga satuan` vs `subtotal` vs `total bayar` vs `kembali`.
  - Jika sebagian teks tertutup jempol (misal `...al (2) 34.000`), model menyimpulkan bahwa itu adalah `Total (2 item)` sebesar `Rp 34.000` dengan memverifikasi baris item (`2x @17.000 = 34.000`).
- Meminta output JSON terstruktur murni (`response_mime_type: "application/json"`).

### B. Alur Validasi Human-in-the-Loop di Telegram
1. Pengguna mengirim foto struk ke Telegram Bot.
2. Bot memproses via Gemini VLM dan menyimpan draft transaksi sementara ke `CacheService` (`receipt_verify_<chatId>`).
3. Bot menampilkan kartu verifikasi:
   ```text
   🧾 Hasil Pindaian Struk (Gemini VLM):
   • Merchant: Tahan Banting Coffee
   • Total Belanja: Rp 34.000
   • Rincian Item:
     - 2x Kopi Susu Spanish L (@17.000)
   • Estimasi Kategori: Makanan & Minuman
   • Wallet Default: BRI

   ⚠️ Apakah data di atas sudah benar?
   👉 Balas 'YA' untuk simpan ke sheet Transactions
   👉 Balas 'TIDAK' untuk batalkan
   👉 Atau ketik langsung koreksi (misal: '34rb bca' / '34000')
   ```
4. **Cabang Respons Pengguna**:
   - Jika pengguna membalas **`YA`**: Data disimpan ke sheet `Transactions`, saldo wallet & dashboard diperbarui, dan bot membalas struk transaksi final.
   - Jika pengguna membalas **`TIDAK`** atau **`BATAL`**: Sesi draft dihapus dari cache, tidak ada data yang masuk ke spreadsheet.
   - Jika pengguna membalas teks koreksi (misal `34k bca`): Sistem memadukan data merchant dari VLM dengan nominal/wallet koreksi pengguna, lalu menyimpannya secara akurat.

### C. Manajemen Kredensial API Key
- Pengguna dapat menyetel API Key kapan saja melalui Telegram Bot menggunakan perintah:
  `/setgeminikey <API_KEY_ANDA>`
- API Key disimpan secara terenkripsi aman pada Google Apps Script `PropertiesService.getScriptProperties()` dengan key `GEMINI_API_KEY`.
- Fallback opsi: Nilai juga dapat diambil dari sheet `Settings` (parameter `Gemini API Key`) atau `Config.js`.

### D. Penyimpanan File Bukti Gambar
- Citra struk asli tetap diunggah ke Google Drive pada folder `Financial Tracker Receipts` agar URL tautan bukti transaksi tetap dapat dilihat di spreadsheet.

---

## 4. Technical Constraints
- Maksimal 50 baris per fungsi (`CODING_STANDARD.md`).
- Seluruh fungsi memiliki JSDoc.
- Zero spreadsheet access di luar Repository.
- Penanganan timeout/error jaringan graceful jika Gemini API tidak dapat dijangkau.


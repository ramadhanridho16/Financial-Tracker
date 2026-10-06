# Phase Research: Phase 4.3 Bot Messaging Integration (Telegram & OCR)

## 1. Domain & Platform Analysis

### Telegram Bot API
- **Token Bot**: `8627740740:AAEa2UbSqUqdGJI-msg9nW6qg9-V9pWzxu8` (dibuat via `@BotFather`).
- **Komunikasi**:
  - Inbound: Webhook HTTPS dikirim langsung oleh Telegram ke Google Apps Script Web App URL via HTTP POST (`doPost(e)`).
  - Outbound: `UrlFetchApp.fetch("https://api.telegram.org/bot<TOKEN>/<method>")`.
- **Keamanan & Otorisasi**:
  - Whitelist Telegram User ID / Chat ID agar hanya pemilik akun yang dapat membaca saldo atau mencatat transaksi.
  - Secret token opsional via header `X-Telegram-Bot-Api-Secret-Token`.
  - Token bot disimpan secara aman di `CONFIG.TELEGRAM.BOT_TOKEN` dengan opsi override via `PropertiesService.getScriptProperties()` atau sheet `Settings`.

### Standar Testing Web App (`doGet` dan `doPost`)
Untuk memastikan kemudahan pengujian layaknya menu parser spreadsheet:
- **`doGet(e)`**:
  - Menerima request GET dari browser atau pengujian terminal.
  - Mengembalikan status kesehatan server (`{"status": "OK", "bot": "FinancialTrackerBot", "timestamp": ...}`).
  - Mendukung query parameter pengujian:
    - `?action=status`: Cek status Webhook Telegram & info bot.
    - `?action=test&text=...`: Simulasi eksekusi parsing teks transaksi langsung via browser.
- **`doPost(e)`**:
  - Menerima update JSON dari Telegram Webhook.
  - Menerima pengujian manual via terminal (`curl -X POST ...`) atau simulasi internal.
- **Menu Spreadsheet Testing**:
  - Tersedia menu pengujian langsung di spreadsheet (sebagaimana menu "Proses Transaksi Pending"):
    - "Uji Koneksi Bot Telegram"
    - "Simulasi Pesan Teks Telegram"
    - "Simulasi Struk OCR Telegram"
    - "Pasang Webhook Telegram"
    - "Cek Status Webhook"

## 2. Metode OCR (Receipt Extraction) Tanpa Merusak Parser

### Prinsip Utama: *Adapter Pattern*
- Parser yang sudah ada (`src/parser/Parser.js` dan `src/normalizer/Normalizer.js`) adalah **pure function** dan **tidak boleh dirusak atau diubah perilakunya**.
- OCR bertindak sebagai **pre-processing adapter**:
  ```
  [ Foto Struk Belanja / Invoice ]
                ↓
    [ Telegram getFile & Download ]
                ↓
    [ Google Drive OCR Engine ]
  (Drive.Files.insert with {ocr: true, ocrLanguage: 'id'})
                ↓
    [ Raw Extracted Text ]
                ↓
  [ Adaptor: Extract Merchant, Date & Total ]
                ↓
  [ Existing Normalizer & Parser ] -> (Sama persis dengan input teks biasa!)
                ↓
    [ Transaction Service (saveTransaction) ]
  (Disertai URL file struk pada kolom Bukti Invoice)
  ```

### Keunggulan Desain OCR Adaptor:
1. **Zero Regression**: Parser teks biasa tetap berfungsi 100% seperti semula.
2. **Fleksibilitas**: User bisa kirim teks biasa (`Makan siang 25k bca`) ATAU kirim foto struk langsung di chat.
3. **Penyimpanan Arsip**: Foto struk disimpan di Google Drive folder `Financial Tracker Receipts`, dan link dokumen disimpan otomatis ke kolom `Bukti Invoice` pada sheet `Transactions`.

## 3. Supported Bot Interactions
1. **Teks Alami**: `Beli kopi 25rb bri`, `Transfer mandiri ke bca 500rb`.
2. **Foto Struk (OCR)**: Pengiriman gambar struk kasir/minimarket/restoran dengan ekstraksi otomatis.
3. **Perintah Cepat (Slash Commands)**:
   - `/start` atau `/bantuan`: Panduan cara penggunaan dan contoh kalimat.
   - `/saldo`: Daftar seluruh wallet dan saldo terkini (`Wallet.js`).
   - `/ringkasan`: Ringkasan pengeluaran bulan ini dan kategori terbesar (`Dashboard.js`).
   - `/ping`: Uji latency dan koneksi bot.

## 4. Kepatuhan Standar Arsitektur (`CODING_STANDARD.md`)
- `TelegramRepository.js`: Komunikasi HTTP Telegram (`sendMessage`, `getFile`, `setWebhook`, dll.).
- `OcrRepository.js`: Integrasi Google Drive OCR untuk konversi gambar struk menjadi teks.
- `TelegramBot.js`: Routing pesan, command dispatcher, verifikasi user ID, dan generator format struk balasan.
- `Webhook.js`: Handler entrypoint `doGet(e)` dan `doPost(e)`.
- Semua fungsi maksimal 50 baris dengan dokumentasi JSDoc.

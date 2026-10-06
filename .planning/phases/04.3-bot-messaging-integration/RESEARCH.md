# Phase Research: Phase 4.3 Bot Messaging Integration

## 1. Domain & Platform Analysis

### Telegram Bot API vs WhatsApp
- **Telegram Bot API (Recommended & Primary)**:
  - Zero subscription cost, free API tokens via `@BotFather`.
  - Native Webhook support sending HTTPS POST requests directly to Google Apps Script Web App URL.
  - Rich Markdown/HTML formatting support for receipts and balance reports.
  - Instant setup without Meta Business Verification, Facebook Developer App reviews, or payment methods.
- **WhatsApp Cloud API (Secondary / Future)**:
  - Requires Meta Business account verification, permanent access tokens, and webhook challenge handshakes (`hub.challenge`).
  - Telegram provides a drastically superior developer experience for personal financial tracking.

### Webhook Architecture in Google Apps Script
- **Entrypoint**: `doPost(e)` deployed as Web App (`Execute as: Me`, `Who has access: Anyone`).
- **Payload Structure**: Telegram sends JSON via `e.postData.contents`:
  ```json
  {
    "update_id": 10000,
    "message": {
      "message_id": 123,
      "from": { "id": 12345678, "first_name": "User" },
      "chat": { "id": 12345678, "type": "private" },
      "date": 1696500000,
      "text": "Beli kopi 25rb bri"
    }
  }
  ```
- **Security & Authorization**:
  - Whitelist check against authorized Telegram User IDs stored in `PropertiesService.getScriptProperties()` or `Settings` sheet.
  - Secret token check via `X-Telegram-Bot-Api-Secret-Token` header.
  - Unauthorized messages are dropped or given an unauthorized alert, protecting personal financial spreadsheets.

## 2. Integration Pipeline with Financial Tracker Core
```
[ User sends Telegram text ]
              ↓
  [ Google Apps Script doPost(e) ]
              ↓
   [ Security & User ID Check ]
              ↓
 [ Command Router (/saldo, /bantuan, /ringkasan, or Raw Text) ]
              ↓
    [ Parser & Normalizer ] (Beli kopi 25rb bri)
              ↓
     [ Transaction Service ] (saveTransaction)
              ↓
 [ Wallet Balance & Dashboard Refresh ]
              ↓
 [ Telegram Outbound Reply (UrlFetchApp) ] -> "✅ Transaksi Berhasil Dicatat: ..."
```

## 3. Supported Bot Interactions
1. **Pencatatan Transaksi Alami**:
   - Contoh: `Makan siang 35k bca`, `Beli bensin 50rb mandiri`, `Transfer bri ke jago 200rb`.
   - Menghasilkan respon ringkas konfirmasi nominal, wallet, kategori, dan sisa saldo wallet.
2. **Perintah Cepat (Slash Commands)**:
   - `/start` atau `/bantuan`: Panduan cara mencatat transaksi dan daftar perintah.
   - `/saldo` atau `/wallet`: Menampilkan daftar semua wallet aktif beserta saldo saat ini.
   - `/ringkasan` atau `/dashboard`: Menampilkan total pemasukan, pengeluaran bulan ini, dan kategori terbesar.
   - `/batal` (opsional): Menghapus transaksi terakhir jika ada kesalahan input.

## 4. Architectural Rules Compliance (`CODING_STANDARD.md`)
- **Single Responsibility**:
  - `src/repositories/TelegramRepository.js`: Komunikasi HTTP eksternal (`UrlFetchApp.fetch`) untuk `sendMessage`, `setWebhook`, `getWebhookInfo`.
  - `src/services/TelegramBot.js`: Validasi user, routing pesan, formatting pesan respon, koordinasi dengan `Parser` & `TransactionService`.
  - `src/bootstrap/Main.js` / Webhook router: Menerima event `doPost(e)`.
- **Maksimal 50 baris per fungsi**: Semua fungsi dipecah menjadi helper modular.
- **Konfigurasi Tanpa Hardcode**: Token dan Webhook URL disimpan di `PropertiesService` atau `Settings`.

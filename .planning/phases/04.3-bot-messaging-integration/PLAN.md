# Plan: Phase 4.3 Bot Messaging Integration (Telegram & OCR)

## Phase Objective
Menghubungkan Financial Tracker dengan Telegram Bot menggunakan Webhook Google Apps Script (`doPost` dan `doGet`), mengintegrasikan ekstraksi foto struk belanja via OCR tanpa merusak sistem parser yang ada, serta menyediakan standar pengujian `GET`/`POST` dan menu simulasi spreadsheet.

---

## Token & Konfigurasi
- **Bot Token**: `8627740740:AAEa2UbSqUqdGJI-msg9nW6qg9-V9pWzxu8`
- **Bot Username**: Terdaftar via `@BotFather`
- **Konfigurasi Target**: `CONFIG.TELEGRAM` pada `src/config/Config.js` dengan opsi override melalui sheet `Settings` / `ScriptProperties`.

---

## Architectural Diagram
```
Telegram User ──> Telegram Bot API ──> GAS Webhook (doPost / doGet)
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
              [Photo / Receipt]                                [Text Message]
                      │                                               │
               OcrRepository                                   Command Router
          (Drive OCR Adapter)                             /saldo, /ringkasan, /bantuan
                      │                                               │
             Raw Extracted Text                                       │
                      └───────────────────────┬───────────────────────┘
                                              ▼
                                 [Existing Normalizer & Parser]
                                   (100% Pure, Zero Regression)
                                              ▼
                                 [Existing Transaction Pipeline]
                                        saveTransaction()
                                      updateWalletBalances()
                                       refreshDashboard()
                                              ▼
                                 TelegramRepository.sendMessage()
                                              │
                                     Telegram User
```

---

## Detailed Task Breakdown

### Task 1: Telegram Repository (`src/repositories/TelegramRepository.js`)
- [ ] Buat file `src/repositories/TelegramRepository.js` untuk mengelola seluruh interaksi HTTP ke API Telegram (`UrlFetchApp.fetch`).
- [ ] Fungsi `sendTelegramMessage(chatId, text, options)`: Kirim pesan teks terformat (Markdown/HTML) ke Telegram.
- [ ] Fungsi `getTelegramFile(fileId)`: Ambil metadata file foto/dokumen untuk mendapatkan `file_path`.
- [ ] Fungsi `downloadTelegramFileBlob(filePath)`: Download file gambar struk menjadi `Blob` untuk diproses OCR.
- [ ] Fungsi `setTelegramWebhook(webhookUrl, secretToken)`: Daftarkan URL Webhook ke Telegram.
- [ ] Fungsi `getTelegramWebhookInfo()`: Cek status aktif Webhook di server Telegram.
- [ ] Fungsi `deleteTelegramWebhook()`: Hapus Webhook jika ingin kembali ke polling/nonaktif.
- [ ] *Batasan*: Maksimal 50 baris per fungsi, JSDoc lengkap, no hardcoded URLs.

### Task 2: OCR Repository & Service (`src/repositories/OcrRepository.js` & `src/services/OcrService.js`)
- [ ] Buat `src/repositories/OcrRepository.js`:
  - Gunakan Drive API / Google Drive OCR (`Drive.Files.insert` dengan mimeType image dan parameter `{ocr: true, ocrLanguage: 'id'}`).
  - Baca teks hasil ekstraksi dari file doc sementara yang dibuat oleh Google Drive OCR, lalu hapus file sementara tersebut.
  - Simpan foto struk asli ke folder Drive "Financial Tracker Receipts" dan kembalikan URL file untuk disimpan di kolom `Bukti Invoice`.
- [ ] Buat `src/services/OcrService.js`:
  - Membersihkan teks hasil OCR dan mengekstrak baris total belanja, merchant/nama toko, dan tanggal jika terdeteksi.
  - Mengubah informasi struk menjadi format kalimat transaksi standar yang siap diproses oleh `Normalizer.js` dan `Parser.js`.
  - **Prinsip**: Parser inti (`src/parser/Parser.js`) tidak diubah sama sekali; OCR bertindak murni sebagai adaptor input.

### Task 3: Telegram Bot Service & Router (`src/services/TelegramBot.js`)
- [ ] Buat `src/services/TelegramBot.js` untuk orkestrasinya:
  - Validasi otorisasi: Cek `from.id` pengirim terhadap daftar ID yang diizinkan (mencegah akses orang asing).
  - Router perintah:
    - `/start` atau `/bantuan`: Menampilkan panduan format transaksi dan daftar perintah.
    - `/saldo` atau `/wallet`: Menampilkan ringkasan saldo seluruh dompet aktif dari `Wallet.js`.
    - `/ringkasan` atau `/dashboard`: Menampilkan total pengeluaran bulan ini dan kategori terbesar dari `Dashboard.js`.
    - `/ping`: Cek status latensi dan kesehatan bot.
  - Penanganan pesan teks transaksi: Alirkan teks ke parser, catat transaksi, dan kirim struk konfirmasi rapi.
  - Penanganan pesan foto struk: Alirkan foto ke `OcrService`, proses transaksi, dan laporkan hasil pembacaan struk.

### Task 4: Webhook Entrypoints & Standar Testing (`src/trigger/Webhook.js`)
- [ ] Buat `src/trigger/Webhook.js`:
  - **`doGet(e)`**:
    - Default: Mengembalikan JSON status health-check `{ status: "OK", bot: "Active", time: ... }`.
    - Parameter `?action=status`: Mengembalikan info webhook Telegram dari Telegram API.
    - Parameter `?action=test&text=...`: Simulasi pemrosesan pesan teks via URL browser.
  - **`doPost(e)`**:
    - Parsing `e.postData.contents`.
    - Dispatch update ke `handleTelegramUpdate(update)`.
    - Mengembalikan respons HTTP 200 OK cepat agar Telegram tidak mengirimkan retry berulang.
  - Fungsi simulator `simulateTelegramMessage(text, chatId)` untuk pengujian internal.
  - Fungsi simulator `simulateTelegramPhoto(fileBlob, chatId)` untuk pengujian OCR internal.

### Task 5: Integrasi Config & Menu Spreadsheet (`src/config/Config.js` & `src/trigger/Setup.js`)
- [ ] Tambahkan konfigurasi `CONFIG.TELEGRAM` di `src/config/Config.js`:
  - `BOT_TOKEN`: `8627740740:AAEa2UbSqUqdGJI-msg9nW6qg9-V9pWzxu8`
  - `ALLOWED_USER_IDS`: Array atau string ID Telegram pengguna yang diizinkan.
  - `RECEIPTS_FOLDER_NAME`: `"Financial Tracker Receipts"`.
- [ ] Tambahkan menu testing spreadsheet pada `onOpen()` di `src/trigger/Setup.js`:
  - "Pasang Webhook Telegram"
  - "Cek Status Webhook Telegram"
  - "Uji Koneksi Bot Telegram"
  - "Simulasi Pesan Teks Telegram"
  - "Simulasi Struk OCR Telegram"

---

## Verification & Acceptance Testing

### 1. Standar Testing `GET` & `POST`
- **Uji `GET` via Browser / Terminal**:
  ```bash
  curl -L "<WEB_APP_URL>?action=status"
  ```
  *Ekspektasi*: Mengembalikan JSON status Webhook dari Telegram API (`webhook is active, pending_update_count: 0`).
- **Uji `POST` via Webhook Simulator**:
  Jalankan fungsi `simulateTelegramMessage("Kopi kenangan 28rb bca", "USER_ID")` dari editor atau menu spreadsheet.
  *Ekspektasi*: Transaksi tercatat di sheet `Transactions`, saldo berkurang di sheet `Wallets`, sheet `Dashboard` ter-refresh, dan pesan balasan terkirim ke Telegram.

### 2. Uji Ekstraksi OCR Struk
- Jalankan fungsi `testOcrExtraction()` dengan gambar struk sample.
- *Ekspektasi*: Teks total nominal dan keterangan berhasil diekstrak, dilewatkan ke parser yang ada tanpa error, file struk tersimpan di Google Drive, dan link tercatat di kolom `Bukti Invoice`.

### 3. Kepatuhan Coding Standard
- [ ] Semua fungsi berukuran `<= 50 baris`.
- [ ] Seluruh fungsi memiliki JSDoc.
- [ ] Tidak ada hardcoded sheet names atau column numbers.
- [ ] `clasp push` berhasil tanpa kendala.

# Plan: Phase 4.3 Bot Messaging Integration (Telegram)

## Phase Objective
Menghubungkan Financial Tracker dengan Telegram Bot melalui Webhook Google Apps Script (`doPost`), memungkinkan pencatatan transaksi instan menggunakan bahasa alami dari ponsel pintar, pengecekan saldo seluruh wallet, dan ringkasan dashboard keuangan tanpa perlu membuka Spreadsheet.

---

## Architecture & Data Flow
```
Telegram User ──> Telegram Bot API ──> GAS Webhook (doPost)
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
              [Slash Commands]                               [Natural Language]
          /saldo, /ringkasan, /bantuan                    "Beli makan 25rb bri"
                      │                                               │
             Read Services                                    Normalizer + Parser
          Wallet.js / Dashboard.js                                    │
                      │                                        saveTransaction()
                      │                                       updateWalletBalances()
                      │                                       refreshDashboard()
                      └───────────────────────┬───────────────────────┘
                                              ▼
                                 TelegramRepository.sendMessage()
                                              │
                                     Telegram User
```

---

## Task Breakdown

### Task 1: Telegram Repository (`src/repositories/TelegramRepository.js`)
- [ ] Buat `src/repositories/TelegramRepository.js` untuk mengelola seluruh request HTTP ke Telegram Bot API (`UrlFetchApp.fetch`).
- [ ] Implementasikan `sendTelegramMessage(chatId, text, options)`.
- [ ] Implementasikan `setTelegramWebhook(webhookUrl, secretToken)`.
- [ ] Implementasikan `getTelegramWebhookInfo()`.
- [ ] Implementasikan `deleteTelegramWebhook()`.
- [ ] Pastikan seluruh fungsi memiliki JSDoc dan `<= 50 baris`.

### Task 2: Telegram Bot Service & Authorization (`src/services/TelegramBot.js`)
- [ ] Buat `src/services/TelegramBot.js` untuk business logic bot.
- [ ] Implementasikan validasi keamanan: cek `userId` pengirim terhadap whitelist yang tersimpan di `Settings` atau `ScriptProperties`.
- [ ] Implementasikan router pesan:
  - `/start` atau `/bantuan`: Pesan panduan format transaksi dan daftar perintah.
  - `/saldo` atau `/wallet`: Query saldo seluruh dompet dari `getWalletBalances()`.
  - `/ringkasan` atau `/dashboard`: Ringkasan pengeluaran, pemasukan, dan kategori terbesar bulan ini dari `getDashboardSummary()`.
  - Pesan teks biasa: Dialirkan ke pipeline transaksi natural language.
- [ ] Implementasikan `formatTransactionReceipt(transaction, balance)` untuk respons bukti catat yang rapi.

### Task 3: Ingestion Pipeline & Webhook Entrypoint (`src/trigger/Webhook.js` & `Main.js`)
- [ ] Buat entrypoint `doPost(e)` untuk menerima event HTTP POST Telegram Webhook.
- [ ] Ekstrak konten JSON dari `e.postData.contents`.
- [ ] Integrasikan teks pesan transaksi ke pipeline `normalizeTransactionForm` → `parseTransaction` → `saveTransaction` → `updateWalletBalances` → `refreshDashboard` → `syncInventoryPurchases`.
- [ ] Kirim pesan balasan konfirmasi instan ke Telegram user.

### Task 4: Setup & Konfigurasi Menu Spreadsheet (`src/trigger/Setup.js` & `Config.js`)
- [ ] Tambahkan konfigurasi `CONFIG.TELEGRAM` di `src/config/Config.js` (parameter setting: `Telegram Bot Token`, `Telegram Allowed User ID`).
- [ ] Tambahkan menu di `onOpen()`:
  - "Pasang Telegram Webhook"
  - "Cek Status Telegram Webhook"
  - "Uji Kirim Pesan Telegram"
- [ ] Implementasikan fungsi pendukung `setupTelegramWebhook()` dan `checkTelegramWebhook()`.

---

## Verification & Acceptance Criteria
1. [ ] **Keamanan**: Pesan dari Telegram User ID yang tidak terdaftar ditolak / tidak diproses ke spreadsheet.
2. [ ] **Pencatatan Transaksi**: Kirim pesan contoh `Makan siang 25k bri` via bot → transaksi tercatat di sheet `Transactions`, saldo wallet `BRI` berkurang, sheet `Dashboard` ter-refresh, dan user menerima pesan balasan konfirmasi.
3. [ ] **Perintah `/saldo`**: Menampilkan daftar wallet beserta saldo terkini yang cocok dengan data sheet `Wallets`.
4. [ ] **Perintah `/ringkasan`**: Menampilkan ringkasan keuangan bulanan yang cocok dengan data sheet `Dashboard`.
5. [ ] **Kepatuhan Standar**: Semua fungsi `<= 50 baris`, JSDoc lengkap, tidak ada hardcoded sheet/column name, push berhasil via `clasp push`.

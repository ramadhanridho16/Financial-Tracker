# Phase 9.1 Context: Security, Environment Isolation & Gitignore Hardening

## User Request
"Buat file .gitignore agar kode program tidak terekpos ke github, karena token ku terekpos saat mebuka file tersebut menjadi 'public'. Gunakan sistem env yang masuk ke gitignore dan env yang khusus diupload di github."

## Root Cause Analysis
1. **Hardcoded Secrets in Source Code:**
   - `src/config/Config.js` baris 167 memuat token bot Telegram asli secara hardcoded (`8627740740:AAEa2UbSqUqdGJI-msg9nW6qg9-V9pWzxu8`).
   - `src/config/Config.js` baris 83 memuat Spreadsheet ID riil Home Inventory (`1agLINpK-XyW-_hG30XX7-Ce_6KSw90sNK_7IFjscGRU`).
   - Ketika repositori di-push ke GitHub dan diubah menjadi *public*, token bot Telegram ini terindeks secara publik sehingga rawan disalahgunakan atau dicabut otomatis oleh BotFather.
2. **Tracked Configuration File:**
   - File `.clasp.json` terdaftar di git (`git ls-files` mengindikasikan file ini masih di-track). File ini berisi `scriptId` internal Apps Script.
3. **Absence of Dedicated `.env` & `.env.example` Pattern:**
   - Belum ada file `.env` untuk menyimpan konfigurasi lokal pengembang / unit test.
   - Belum ada template `.env.example` bersih yang aman untuk di-upload ke GitHub publik sebagai panduan konfigurasi.

## Security Architecture in Google Apps Script (GAS)
Karena Google Apps Script tidak membaca file `.env` di server Google (GAS berjalan di cloud tanpa filesystem Node.js langsung), strategi pemisahan rahasia yang benar dan standar industri untuk GAS adalah:
1. **Di Google Apps Script (Runtime Produksi):**
   - Menggunakan **`PropertiesService.getScriptProperties()`** atau sheet `Settings` untuk menyimpan `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USER_ID`, dan `HOME_INVENTORY_SPREADSHEET_ID`.
   - Kode di `src/config/Config.js` dikosongkan (`BOT_TOKEN: ""` dan `SPREADSHEET_ID: ""`), sehingga fallback dinamis selalu membaca dari Script Properties atau sheet Settings.
2. **Di Lingkungan Lokal & Test Runner (`.env` vs `.env.example`):**
   - File `.env`: Menyimpan nilai rahasia riil pengembang untuk pengujian unit test lokal. File ini **DIKECUALIKAN SECARA KETAT** oleh `.gitignore` dan tidak boleh di-commit.
   - File `.env.example`: Berisi template variabel lingkungan dengan nilai placeholder (contoh: `TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here`). File ini **DI-TRACK & DI-UPLOAD KE GITHUB** sebagai dokumentasi bagi publik/kolaborator.
3. **Pembersihan Git Tracking (`git rm --cached`):**
   - `.clasp.json` di-untrack dari git history lokal tanpa menghapus file fisiknya (`git rm --cached .clasp.json`).
4. **Hardening `.gitignore`:**
   - Memastikan semua variasi `.env`, `.env.local`, `.env.*.local`, `.clasp.json`, dan file credential/kunci privat terlindungi sepenuhnya.


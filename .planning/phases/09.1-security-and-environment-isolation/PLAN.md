# Execution Plan - Phase 9.1: Security, Environment Isolation & Gitignore Hardening

## Goal Backward
Menghilangkan seluruh token dan ID rahasia yang ter-hardcode dari codebase publik, mengamankan repositori git dengan konfigurasi `.gitignore` komprehensif, menerapkan pola pemisahan lingkungan `.env` (lokal & terisolasi dari git) dan `.env.example` (template publik untuk GitHub), serta memvalidasi bahwa sistem Google Apps Script tetap membaca kredensial melalui `PropertiesService` / sheet `Settings`.

---

## Wave Breakdown

### Wave 1: Source Code Sanitization & Fallback Hardening
- [x] **Task 1.1: Kosongkan Secrets Hardcoded di `src/config/Config.js`**
  - Mengubah `CONFIG.TELEGRAM.BOT_TOKEN` menjadi string kosong `""`.
  - Mengubah `CONFIG.HOME_INVENTORY.SPREADSHEET_ID` menjadi string kosong `""` atau fallback ke Script Properties / sheet `Settings`.
  - Memastikan `getTelegramBotToken()` di `TelegramRepository.js` dan pembaca config di `HomeInventory.js` memprioritaskan `PropertiesService.getScriptProperties()` lalu sheet `Settings`.
- [x] **Task 1.2: Pembuatan Helper Setup Script Properties di Spreadsheet**
  - Di `src/trigger/Setup.js`:
    - Tambahkan helper menu / fungsi `setupSecretPropertiesPrompt()` untuk memudahkan pengguna menginput `TELEGRAM_BOT_TOKEN` langsung ke `ScriptProperties` secara aman melalui antarmuka Spreadsheet tanpa menyentuh source code.

---

### Wave 2: Environment Files Configuration (`.env` vs `.env.example`)
- [x] **Task 2.1: Buat `.env.example` (Template Publik untuk GitHub)**
  - Menyiapkan variabel konfigurasi standar dengan deskripsi dan dummy placeholder:
    - `TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather`
    - `TELEGRAM_ALLOWED_USER_ID=12345678,87654321`
    - `SPREADSHEET_ID=your_financial_tracker_spreadsheet_id`
    - `HOME_INVENTORY_SPREADSHEET_ID=your_home_inventory_spreadsheet_id`
  - Menyertakan instruksi singkat cara menyalin ke `.env` untuk pengujian lokal.
- [x] **Task 2.2: Buat `.env` Lokal (Private)**
  - Mengisi `.env` lokal dengan nilai token dan ID yang diperlukan untuk pengujian lokal.
- [x] **Task 2.3: Perkuat `.gitignore` dan Bersihkan Tracking Git**
  - Memperbarui file `.gitignore` dengan pola rule standar keamanan:
    - `.env`, `.env.local`, `.env.*.local` dikecualikan.
    - `!.env.example` secara eksplisit diizinkan untuk di-commit.
    - `.clasp.json` dikecualikan.
  - Melakukan `git rm --cached .clasp.json` agar file lokal tetap ada di disk pengembang tetapi tidak lagi ter-track di repositori git publik.

---

### Wave 3: Testing, Verification & Clasp Deployment
- [x] **Task 3.1: Unit Test Suite Node.js (`tests/security_env.test.js`)**
  - Memverifikasi bahwa tidak ada token Telegram aktif yang tersisa di seluruh file dalam direktori `src/`.
  - Memverifikasi bahwa `.gitignore` mengabaikan `.env` namun tetap melacak `.env.example` (`git check-ignore`).
  - Memverifikasi fungsi pembaca token `getTelegramBotToken()` berjalan dengan benar membaca fallback dari `PropertiesService` dan sheet `Settings`.
  - Menjalankan uji regresi test suite yang sudah ada (`telegram_menu.test.js`, `discrepancy_correction.test.js`, dll) untuk memastikan tidak ada alur yang rusak.
- [x] **Task 3.2: Deployment & Git Commit**
  - `npx clasp push --force`.
  - `npx clasp deploy -d "Phase 9.1: Security, Environment Isolation and Gitignore Hardening" -i AKfycbxliW-WKos3dx6SGZ_omQk_v_pDImgUdiCdrJ0C7utucYl1DF7ejEf4q5CesdxuJYDr3A`.
  - Commit perubahan secara lokal dengan git (sesuai aturan, jangan pernah jalankan `git push`).


# Execution Plan - Phase 4.4: Telegram Bot Menu & Interactive Command Guide

## Goal Backward
Menyediakan daftar menu perintah instan dan interaktif langsung pada antarmuka Telegram bot (baik via tombol popup native `[/] Menu` Telegram melalui API `setMyCommands`, keyboard menu interaktif, maupun panduan terstruktur per kategori saat mengetik `/bantuan` atau `/menu`), sehingga pengguna dapat dengan mudah memilih perintah keuangan tanpa perlu menghafal format sintaks.

---

## Wave Breakdown

### Wave 1: Telegram Bot API Native Command Menu Registration (`setMyCommands`)
- [x] **Task 1.1: Implementasi API `setTelegramMyCommands` di `TelegramRepository.js`**
  - Membuat fungsi `setTelegramMyCommands(commandsList, scope, languageCode)` di `src/repositories/TelegramRepository.js`.
  - Mengirim payload ke Telegram Bot API endpoint `https://api.telegram.org/bot<TOKEN>/setMyCommands`.
  - Format command: nama command bersih tanpa slash (`saldo`, `budget`, `undo`, dll) dan deskripsi ramah pengguna (maks 256 karakter).
  - Menangani error jika token tidak ada atau payload ditolak Telegram.
- [x] **Task 1.2: Definisi Daftar Perintah Standar untuk Native Menu**
  - Di `src/services/BotCommands.js`:
    - Membuat fungsi `getTelegramDefaultCommandsList()` yang menyusun array 15-20 perintah esensial lengkap dengan deskripsinya.
    - Membuat fungsi `syncTelegramBotCommands()` untuk memanggil API `setTelegramMyCommands()`.
- [x] **Task 1.3: Trigger Otomatis & Manual Sinkronisasi Command ke Telegram**
  - Di `src/trigger/Setup.js`:
    - Integrasikan `syncTelegramBotCommands()` saat `setupTelegramWebhookPrompt()` atau tambahkan menu khusus spreadsheet: `"Perbarui Menu Perintah Telegram (setMyCommands)"`.
  - Di `src/services/BotCommands.js`:
    - Tambahkan handler bot command internal `/syncmenu` atau `/setcommands` (hanya untuk authorized user) untuk menyinkronkan daftar perintah Telegram kapan saja langsung dari chat.

---

### Wave 2: Comprehensive Categorized Help & Interactive Command Guide
- [x] **Task 2.1: Desain Ulang `/bantuan` dan `/help` Berbasis Kategori Rapi**
  - Di `src/services/BotCommands.js`:
    - Perbarui fungsi `handleHelpCommand()` agar tidak sekadar me-loop objek mentah, melainkan menyajikan tampilan terstruktur per kelompok modul:
      1. 💳 **Kas & Rekening:** `/saldo`, `/tambahwallet`, `/setwallet`
      2. 🎯 **Anggaran (Budget):** `/budget`, `/setbudget`, `/hapusbudget`
      3. 🏷️ **Kategori:** `/kategori`, `/tambahkategori`
      4. ✏️ **Koreksi & Selisih:** `/undo`, `/koreksi`, `/hapustransaksi`, `/sesuaikan`
      5. 📊 **Laporan & Riwayat:** `/terakhir`, `/ringkasan`
      6. 🤝 **Pinjaman & Cicilan:** `/utang`, `/kalender`, `/kredit`, `/batal`
      7. ⚙️ **Sistem:** `/menu`, `/ping`
    - Sertakan contoh sintaks penggunaan riil pada setiap perintah (misal: `/koreksi nominal 50k`, `/sesuaikan tunai 150k lupa catat parkir`).
- [x] **Task 2.2: Implementasi Perintah `/menu` dengan Quick Interactive Keyboard**
  - Di `src/services/BotCommands.js` & `src/services/TelegramBot.js`:
    - Daftarkan perintah `/menu`.
    - Respon berupa ringkasan navigasi cepat disertai tombol reply keyboard atau inline keyboard untuk klik cepat ke menu-menu utama: `[💳 Cek Saldo]`, `[🎯 Sisa Budget]`, `[📊 Ringkasan]`, `[🕒 5 Transaksi]`, `[📅 Kalender Cicilan]`, `[❓ Panduan Bantuan]`.

---

### Wave 3: Testing, Verification & Clasp Deployment
- [x] **Task 3.1: Unit Test Suite Node.js (`tests/telegram_menu.test.js`)**
  - Menguji format output `getTelegramDefaultCommandsList()` (validasi aturan Telegram: panjang <= 32 char, hanya lowercase/angka/underscore, deskripsi tidak kosong).
  - Menguji eksekusi `syncTelegramBotCommands()` dengan mock `UrlFetchApp`.
  - Menguji respon `/bantuan` dan `/menu`: memastikan seluruh 28 perintah terdokumentasi dengan contoh pemakaian yang jelas.
  - Menjalankan uji regresi terhadap seluruh suite pengujian sebelumnya (`discrepancy_correction.test.js`, `payday_budget.test.js`, dll).
- [x] **Task 3.2: Clasp Push & Clasp Deployment**
  - `npx clasp push --force`.
  - `npx clasp deploy -d "Phase 4.4: Telegram Bot Menu and Command List Guide" -i AKfycbxliW-WKos3dx6SGZ_omQk_v_pDImgUdiCdrJ0C7utucYl1DF7ejEf4q5CesdxuJYDr3A`.
- [x] **Task 3.3: Local Git Commit**
  - `git commit` lokal dengan pesan informatif (tanpa `git push`).


# Phase 01.1 Plan: Penghapusan Fitur OCR & VLM Struk

## Execution Waves

### Wave 1: Clean Codebase & Remove OCR/VLM Files
- [ ] Hapus `src/services/ReceiptVlmService.js`
- [ ] Hapus `src/repositories/GeminiVisionRepository.js`
- [ ] Hapus `src/services/OcrService.js`
- [ ] Hapus `src/repositories/OcrRepository.js`

### Wave 2: Refactor Bot Commands, Telegram Bot, & Webhook
- [ ] Di `src/services/BotCommands.js`: Hapus registrasi `/setgeminikey` dan `/cekkey` beserta fungsi handlernya.
- [ ] Di `src/services/TelegramBot.js`:
  - Ubah `handleTelegramPhotoMessage(msg, chatId)` menjadi balasan informatif:
    `📸 Fitur foto struk sedang dipindahkan ke dedicated server/VPS. Silakan ketik transaksi Anda via pesan teks (contoh: Makan siang 35k bca).`
  - Hapus fungsi `getPendingReceiptVerification`, `setPendingReceiptVerification`, `clearPendingReceiptVerification`, `handleReceiptVerificationResponse`, `confirmAndSaveReceiptTransaction`, dan `correctAndSaveReceiptTransaction`.
  - Hapus pengecekan `pendingReceipt` pada `handleTelegramTextMessage`.
  - Perbarui `getTelegramHelpMessage()` agar tidak menyarankan scan struk via foto.
- [ ] Di `src/trigger/Webhook.js`:
  - Hapus endpoint simulasi `test_receipt_simulation`, `test_vlm_indomaret_simulation`, dan `simulateReceiptOcrFromFile`.
- [ ] Di `docs/PROJECT.md` & `.planning/ROADMAP.md`:
  - Update catatan fitur bahwa OCR/VLM dialihkan ke eksternal VPS.

### Wave 3: Deployment & Verification
- [ ] Sinkronkan perubahan ke Google Apps Script: `clasp push --force`
- [ ] Buat versi rilis baru di Clasp: `clasp version "Clean strip OCR and VLM receipt features"`
- [ ] Redeploy ke active Web App deployment.
- [ ] Commit seluruh perubahan ke Git repository.


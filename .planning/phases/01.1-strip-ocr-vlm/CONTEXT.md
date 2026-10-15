# Phase 01.1 Context: Penghapusan Fitur OCR & VLM Struk

## User Intent & Decisions (Locked)
- **Alasan**: Pemrosesan gambar/struk (OCR Google Drive maupun Vision-Language Model Gemini) di Google Apps Script mengalami kendala performa (loading lambat/timeout 6 menit GAS, error 404 model, dan limitasi eksekusi spreadsheet). Pemrosesan machine learning untuk citra struk akan dialihkan ke dedicated VPS di masa mendatang.
- **Instruksi**:
  - Hapus dan bersihkan seluruh fitur OCR dan VLM secara bersih dari codebase Google Apps Script.
  - **JANGAN ubah** kondisi natural language parser, normalizer, kalkulator cicilan/loan, transfer dompet, atau logika spreadsheet lainnya.
  - Jika pengguna mengirim foto di Telegram, berikan respons informatif bahwa pemindaian struk sedang dialihkan ke server eksternal dan transaksi saat ini dicatat via teks alami.
  - Hapus command `/setgeminikey` dan `/cekkey` dari `BotCommands.js`.
  - Hapus file repository & service struk (`ReceiptVlmService.js`, `GeminiVisionRepository.js`, `OcrService.js`, `OcrRepository.js`).
  - Bersihkan draft verifikasi struk dari `TelegramBot.js` dan endpoint simulasi struk dari `Webhook.js`.


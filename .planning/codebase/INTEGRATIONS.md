# Integrations

## 1. Telegram Bot API Integration
- **HTTP Webhook Endpoints (`doGet` & `doPost`)**:
  - Implemented in `src/trigger/Webhook.js`.
  - Configured in `src/appsscript.json` with `executeAs: "USER_DEPLOYING"` and `access: "ANYONE_ANONYMOUS"`.
  - Telegram sends updates to the public `/exec` Web App URL.
  - `doPost(e)` receives updates, verifies authorization, deduplicates `update_id` via Script Cache, and passes payloads to `handleTelegramUpdate` in `src/services/TelegramBot.js`.
  - `doGet(e)` provides JSON endpoints for ping health checks, webhook status queries, and simulation testing.
- **Telegram HTTP API Client**:
  - Implemented in `src/repositories/TelegramRepository.js`.
  - Uses `UrlFetchApp` to execute `sendMessage`, `getFile`, and `setWebhook` against `https://api.telegram.org/bot<TOKEN>`.
  - Downloads photo files for OCR processing.

---

## 2. Google Drive OCR Integration
- **Drive OCR Adapter**:
  - Implemented in `src/repositories/OcrRepository.js` and `src/services/OcrService.js`.
  - Uploads photo attachments or receipt blobs into Google Drive as temporary Google Docs with OCR enabled (`ocr: true`, `ocrLanguage: "id"`).
  - Extracts raw plain text containing receipt metadata, regex-parses total amount, merchant, and transaction date, and saves the receipt image to `Financial Tracker Receipts` folder.

---

## 3. Google Forms & Event Triggers
- **Form Submission Trigger (`onFormSubmit`)**:
  - Bound installable trigger created in `src/trigger/Setup.js`.
  - Routed through `src/trigger/Trigger.js`.
  - Dispatches to `onTransactionSubmit` or `onLoanSubmit`.
  - Updates parsing status directly in the response sheet (`Parsing Status`, `Parsed At`, `Transaction Row`, `Parsing Error`).

---

## 4. Time-Driven Clock Triggers
- **Daily Loan Reminder Trigger (`sendDailyLoanDueReminders`)**:
  - Registered via `src/trigger/Setup.js#installDailyLoanReminderTrigger`.
  - Runs daily at 08:00 AM (`timeBased().everyDays(1).atHour(8)`).
  - Scans active loans for installments due today (H-0), tomorrow (H-1), or in 3 days (H-3), and sends alerts to Telegram.
- **Daily Recurring Transaction Processor (`processRecurringTransactions`)**:
  - Registered via `src/trigger/Setup.js#installRecurringTransactionTrigger`.
  - Runs daily at 01:00 AM (`timeBased().everyDays(1).atHour(1)`).
  - Evaluates active recurring rules in `src/services/RecurringTransaction.js`, spawns due transactions into `Transactions`, and refreshes wallet balances.
- **Monthly Archive Trigger (`backupPreviousMonthTransactions`)**:
  - Registered via `src/trigger/Setup.js#installMonthlyBackupTrigger`.
  - Runs on the 1st of every month at 03:00 AM (`onMonthDay(1).atHour(3)`).
  - Backs up previous month transactions into ZIP archives in Google Drive.

---

## 5. External Services & Cross-Spreadsheet Sync
- **Google Drive Backups (`DriveApp`)**:
  - Managed by `src/repositories/ArchiveRepository.js`.
  - Automatically manages `Financial Tracker Backups` folder, creates zipped CSV blobs, and records archive metadata into `Archive Index`.
- **Household Inventory Spreadsheet (Cross-Spreadsheet Sync)**:
  - Managed by `src/repositories/HomeInventory.js` and `src/services/InventorySync.js`.
  - Reads product catalog from external spreadsheet (`Product_Master`), detects purchase keywords (`beli`, `stok`, `restock`, etc.), and appends purchase transactions into external `Inventory` / `Transaction` sheets.

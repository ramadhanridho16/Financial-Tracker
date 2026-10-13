# System Architecture

## Architectural Pattern: Layered Architecture
The application strictly enforces a unidirectional, multi-layered architecture:

```
[ Telegram Webhook / Google Form / Clock Triggers ]
                          ↓
       [ Normalizer & Natural Language Parser ]
                          ↓
[ Service Layer (Transactions, Loans, Bot, Wizard, OCR) ]
                          ↓
[ Repository Layer (Spreadsheet, Drive, Telegram API, OCR) ]
                          ↓
      [ Google Spreadsheet, Google Drive & Telegram API ]
```

---

## Layer Responsibilities

### 1. Ingestion & Webhook Layer (`src/trigger/`, `src/ui/`)
- Ingests raw inputs from Google Form triggers, Clock triggers, or HTTP Webhook calls.
- `src/trigger/Webhook.js`: Handles incoming HTTP GET (healthcheck, simulator, calendar, reminders) and HTTP POST (`doPost` receiving updates from Telegram Bot).
- `src/trigger/Trigger.js`: Routes form submission triggers (`onFormSubmit`) without business logic.
- `src/ui/Form.js`: Extracts event values from legacy Google Forms responses.

### 2. Normalization & Parsing Layer (`src/normalizer/`, `src/parser/`, `src/Category.js`)
- **Pure Functions**: Zero side effects; strictly prohibited from accessing Google Spreadsheet directly.
- `Normalizer.js`: Cleans voice/text inputs, standardizes casing, numbers, amount phrases (`25k`, `1.5jt`), and currency words.
- `Parser.js`: Parses natural language Indonesian transaction phrases into structured transaction objects (type, amount, wallet, category, notes). Supports multiple transactions delimited by commas.
- `Category.js`: Dictionary lookup engine matching transaction keywords and aliases against the dictionary to classify categories and merchants.

### 3. Service Layer (`src/services/`)
- Encapsulates business logic, aggregations, validations, state machines, and cross-domain orchestration.
- Does not render Spreadsheet UI or alert dialogs.
- Key Services:
  - `BotCommands.js`: Extensible registry for Telegram slash commands (`/saldo`, `/ringkasan`, `/kredit`, `/kalender`, `/utang`, `/budget`, `/ping`, `/batal`).
  - `LoanWizardService.js`: Multi-step conversational wizard for interactive loan registration with financial calculations and `"YA"` confirmation gate.
  - `Loan.js`: Loan economics calculator (Flat, Annuity, Compound, 0%), automated settlement detection, monthly calendar generator, and reminder lookup.
  - `OcrService.js`: Receipt text parser extracting total amounts, merchants, and dates from OCR output.
  - `TelegramBot.js`: Router for incoming Telegram updates, deduplication via Script Cache, receipt formatting, and reminder dispatches.
  - `Transaction.js`: Manages transaction entity manipulation, status, and retrieval.
  - `Wallet.js`: Computes opening balances, transfers in/out, expenses, and current balances across wallets.
  - `Budget.js`: Manages budget caps, warning thresholds, and active status.
  - `Dashboard.js`: Computes financial summaries, category consumption rankings, KPI indicators, and percentages.
  - `Report.js`: Generates detailed audit and balance reports.
  - `RecurringTransaction.js`: Handles recurring interval scheduling (weekly, monthly).
  - `ArchiveService.js`: Formats transactions into CSV and archives past periods.
  - `InventorySync.js`: Matches transactions to home inventory purchases.

### 4. Repository Layer (`src/repositories/`)
- **Exclusive Data Access**: The only layer authorized to interact directly with `SpreadsheetApp`, `DriveApp`, and external HTTP APIs (`UrlFetchApp`).
- Contains zero business logic (only CRUD, querying, cell formatting, chart creation, and HTTP transport).
- Key Repositories:
  - `TelegramRepository.js`: HTTP client interacting with the Telegram Bot API (`sendMessage`, `getFile`, `getWebhookInfo`).
  - `OcrRepository.js`: Adapter uploading images to Google Drive with OCR conversion enabled and extracting text.
  - `DashboardRepository.js`: Layout, KPI cards, visual styling, category tables, and Google Sheets Donut chart.
  - `ArchiveRepository.js`: Reading archival records, writing to `Archive Index`, saving CSV ZIPs to Google Drive.
  - `HomeInventory.js`: Reads and writes to external household inventory spreadsheets.

### 5. Storage Layer (`Google Spreadsheet & Drive`)
- Relational-like table schema storing records in dedicated sheets defined in `CONFIG.SHEETS`.
- Persistent cache via Google Apps Script `CacheService` and script properties via `PropertiesService`.

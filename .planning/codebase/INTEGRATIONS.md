# Integrations

## 1. Google Forms & Event Triggers
- **Form Submission Trigger (`onFormSubmit`)**:
  - Bound installable trigger created in `src/trigger/Setup.js#L310-L330`.
  - Routed through `src/trigger/Trigger.js#L14-L39`.
  - Dispatches to `onTransactionSubmit` (`src/trigger/Trigger.js#L45-L55`) or `onLoanSubmit` (`src/trigger/Trigger.js#L61-L65`).
  - Updates parsing status directly in the response sheet (`Parsing Status`, `Parsed At`, `Transaction Row`, `Parsing Error`).

## 2. Time-Driven Clock Triggers
- **Daily Recurring Transaction Processor (`processRecurringTransactions`)**:
  - Registered via `src/trigger/Setup.js#L337-L357`.
  - Runs daily at 01:00 AM (`timeBased().everyDays(1).atHour(1)`).
  - Evaluates active recurring rules in `src/services/RecurringTransaction.js`, spawns due transactions into `Transactions`, updates next execution dates, and refreshes wallet balances.
- **Monthly Archive Trigger (`backupPreviousMonthTransactions`)**:
  - Registered via `src/trigger/Setup.js#L364-L384`.
  - Runs on the 1st of every month at 03:00 AM (`onMonthDay(1).atHour(3)`).
  - Backs up previous month transactions into ZIP archives in Google Drive.

## 3. Spreadsheet UI Integration
- **Custom Application Menu**:
  - Initialized on document open via `onOpen()` in `src/trigger/Setup.js#L133-L151`.
  - Provides quick action triggers: Setup Spreadsheet, Setup Automation, Install Form Triggers, Test Home Inventory Connection, Backup Previous Month, Process Recurring, Process Pending, Classify Existing, Update Wallets, Refresh Dashboard, and Refresh Report.

## 4. External Services & Drive Integration
- **Google Drive (`DriveApp`)**:
  - Managed by `src/repositories/ArchiveRepository.js#L98-L110`.
  - Automatically locates or creates `Financial Tracker Backups` folder, creates zipped CSV blobs, and records archive metadata into `Archive Index`.
- **Household Inventory Spreadsheet (Cross-Spreadsheet Sync)**:
  - Managed by `src/repositories/HomeInventory.js` and `src/services/InventorySync.js`.
  - Reads product catalog from external spreadsheet (`Product_Master`), detects purchase keywords (`beli`, `stok`, `restock`, etc.), and appends purchase transactions into `Inventory` / `Transaction` sheets.

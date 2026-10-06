# System Architecture

## Architectural Pattern: Layered Architecture
The application strictly enforces a unidirectional, multi-layered architecture:

```
[ Google Form / User Input / Trigger ]
                  ↓
       [ Normalizer & Parser ]
                  ↓
          [ Service Layer ]
                  ↓
        [ Repository Layer ]
                  ↓
   [ Google Spreadsheet & Drive ]
```

## Layer Responsibilities

### 1. UI & Ingestion Layer (`src/ui/`, `src/trigger/`)
- Ingests raw inputs from Google Form events or manual spreadsheet actions.
- `src/trigger/Trigger.js` routes incoming events without embedding processing logic.
- `src/ui/Form.js` parses event values from Google Form responses.

### 2. Normalization & Parsing Layer (`src/normalizer/`, `src/parser/`, `src/Category.js`)
- **Pure Functions**: Zero side effects; strictly prohibited from accessing Google Spreadsheet directly.
- `Normalizer.js`: Cleans voice inputs, standardizes casing, numbers, amount phrases (`25k`, `1.5jt`), and currency words.
- `Parser.js`: Parses natural language Indonesian transaction phrases into structured transaction objects (type, amount, wallet, category, notes). Supports multiple transactions delimited by commas.
- `Category.js`: Dictionary lookup engine matching transaction keywords and aliases against the dictionary to classify categories and merchants.

### 3. Service Layer (`src/services/`)
- Encapsulates business logic, aggregations, validations, and cross-domain orchestration.
- Does not render UI or create modal dialogs.
- Key Services:
  - `Transaction.js`: Manages transaction entity manipulation, status, and retrieval.
  - `Wallet.js`: Computes opening balances, transfers in/out, expenses, and current balances across wallets.
  - `Budget.js`: Manages budget caps, warning thresholds, and active status.
  - `Dashboard.js`: Computes financial summaries, category consumption rankings, KPI indicators, and percentages.
  - `Report.js`: Generates detailed audit and balance reports.
  - `RecurringTransaction.js`: Handles recurring interval scheduling (weekly, monthly).
  - `ArchiveService.js`: Formats transactions into CSV and archives past periods.
  - `InventorySync.js`: Matches transactions to home inventory purchases.

### 4. Repository Layer (`src/repositories/`)
- **Exclusive Data Access**: The only layer authorized to interact directly with `SpreadsheetApp` and `DriveApp`.
- Contains zero business logic (only CRUD, querying, cell formatting, chart creation).
- Key Repositories:
  - `DashboardRepository.js`: Layout, KPI cards, visual styling, category tables, and Google Sheets Donut chart.
  - `ArchiveRepository.js`: Reading archival records, writing to `Archive Index`, saving CSV ZIPs to Google Drive.
  - `HomeInventory.js`: Reads and writes to external household inventory spreadsheets.

### 5. Storage Layer (`Google Spreadsheet & Drive`)
- Relational-like table schema storing records in dedicated sheets defined in `CONFIG.SHEETS`.

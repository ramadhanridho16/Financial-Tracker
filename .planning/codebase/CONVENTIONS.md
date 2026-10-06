# Coding Conventions & Standards

## 1. Naming Standards
- **Classes**: `PascalCase`
- **Variables & Functions**: `camelCase` (e.g. `refreshDashboard`, `parseAmount`, `getWalletBalances`)
- **Constants**: `UPPER_CASE` (e.g. `CONFIG`, `DASHBOARD_COLUMNS`, `DASHBOARD_STYLE`)

## 2. File & Function Constraints
- **Single Responsibility**: One file, one primary responsibility.
- **Function Size**: Maximum **50 lines per function** (mandated in `docs/CODING_STANDARD.md`). Functions exceeding this limit must be broken into smaller helpers.
- **Documentation**: All public and helper functions must include comprehensive `JSDoc` annotations (`@param`, `@returns`).

## 3. Spreadsheet Access & Configuration
- **No Hardcoded Sheet Names**: Always reference `CONFIG.SHEETS.<NAME>` from `src/config/Config.js`.
- **No Hardcoded Column Indices**: Column numbers must be retrieved dynamically via header inspection (`headers.indexOf(...)`) or declared as constant maps (`DASHBOARD_COLUMNS`).
- **Repository Isolation**: `SpreadsheetApp` and `DriveApp` calls are restricted to the Repository layer (`src/repositories/`).
- **Pure Parsers**: Parsers and normalizers (`src/parser/`, `src/normalizer/`) must remain pure functions and never access the spreadsheet.
- **Service Purity**: Services must not render UI or create modal dialogs.
- **Repository Purity**: Repositories must not contain business logic or domain calculations.

## 4. Backwards Compatibility
- Always maintain backwards compatibility for existing spreadsheet structures and sheet headers.

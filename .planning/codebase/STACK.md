# Technology Stack

## Core Technologies & Runtime
- **Language**: JavaScript (ES6+ / V8 Engine Runtime)
- **Platform**: Google Apps Script (GAS)
- **Deployment Type**: Container-Bound Script (attached to Google Sheets)
- **Script ID**: `14xCHOm6zU0KpdOyBcmOffW5LXr16fwZGiL1cW9PpP3jLITt_XMfI8Ux0` (configured in `.clasp.json`)
- **Manifest**: `src/appsscript.json` (V8 runtime enabled, `timeZone: "Asia/Jakarta"`)

## Development Tools & Toolchains
- **Google Clasp**: `@google/clasp` for local development, bidirectional sync, status checks, and pushing script files to the Google Apps Script project.
- **Git**: Version control (`master` branch).
- **PowerShell / Terminal**: Shell environment for executing automation scripts, clasp commands, and git operations.

## Data Storage & Database Architecture
- **Primary Database**: Google Spreadsheet
  - Each sheet acts as a relational table or view (e.g. `Transactions`, `Recurring Transactions`, `Wallets`, `Loans`, `Budget`, `Dictionary`, `Settings`, `Dashboard`, `Report`, `Archive Index`, `Form Responses - Transactions`).
- **Secondary / External Database**: Household Inventory Spreadsheet (`CONFIG.HOME_INVENTORY.SPREADSHEET_ID`: `1agLINpK-XyW-_hG30XX7-Ce_6KSw90sNK_7IFjscGRU`).
- **Cold Storage / Archiving**: Google Drive (`DriveApp`), transactions exported as CSV files compressed into ZIP archives stored in a dedicated Drive folder.

## Key Configuration Files
- `.clasp.json`: Clasp mapping file configuring root directory `src`, script ID, and file extensions (`.js`, `.gs`, `.html`, `.json`).
- `src/appsscript.json`: Google Apps Script project configuration specifying V8 runtime and project timezone.
- `src/config/Config.js`: Central application configuration defining sheet names, transaction types, recurring intervals, default values, archive settings, and Home Inventory schemas.

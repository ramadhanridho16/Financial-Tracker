# Technical Concerns & Debt

## 1. Google Apps Script Runtime Limits
- **Execution Timeout**: GAS enforces a hard 6-minute execution limit per invocation. Long-running batch operations (such as processing hundreds of historical transactions or large Drive ZIP backups) must be paginated or batched.
- **Quota Limits**: Daily quotas for Google Drive file creations, trigger executions, and external URL / spreadsheet reads.

## 2. Spreadsheet Database Limitations & Concurrency
- **Concurrent Writes**: Google Sheets lacks ACID transactions or row-level locking. Simultaneous Google Form submissions could lead to race conditions when computing incremental balances or generating IDs.
- **Scalability**: Sheets exceeding tens of thousands of rows will experience significant latency during `.getDataRange().getValues()` operations. Archiving older transactions (`ArchiveService.js`) mitigates this.

## 3. Lack of Offline Automated Test Suites
- Development currently relies on `clasp push` and manual verification in Google Sheets.
- The `Parser` and `Normalizer` components have high complexity (regex, phrase splitting, unit parsing `jt`, `rb`, `k`) that would benefit from automated regression tests before deploying code to GAS.

## 4. Hardcoded External Spreadsheet ID
- `CONFIG.HOME_INVENTORY.SPREADSHEET_ID` is hardcoded in `src/config/Config.js`. If the user does not possess permissions to that external sheet, `InventorySync` operations may fail silently or log errors unless handled defensively.

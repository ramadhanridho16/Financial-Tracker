# Testing Strategy & Coverage

## Current Testing Setup
The project operates in Google Apps Script without a standard local Node.js test runner (e.g. Jest or Mocha).

### 1. Manual Verification Points
- `testConnection()` in `src/bootstrap/Main.js`: Validates script connectivity and basic execution.
- `testHomeInventoryConnection()` in `src/services/InventorySync.js`: Tests connectivity to the external Home Inventory spreadsheet and verifies sheet headers without mutating data.
- **Spreadsheet Custom Menu**: Manual trigger execution directly via `Laporan Keuangan Bulanan` menu items:
  - "Perbarui Dashboard"
  - "Perbarui Saldo Wallet"
  - "Proses Transaksi Berulang"
  - "Proses Transaksi Pending"
  - "Klasifikasi Transaksi Lama"
  - "Backup transaksi bulan lalu"

### 2. Testing Gaps
- **Lack of Local Automated Tests**: Because the code runs on GAS V8, there are currently no offline unit tests for `Parser.js`, `Normalizer.js`, or amount extraction algorithms.
- **Pure Parser Testing Opportunities**: Since `src/parser/Parser.js` and `src/normalizer/Normalizer.js` are pure functions without Spreadsheet dependencies, lightweight local test runners (or Node-based Jest tests) can be introduced to test Indonesian phrase parsing permutations.

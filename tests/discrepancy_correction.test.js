/**
 * Test Suite: Transaction Correction & Discrepancy Reconciliation (Phase 3.1)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// 1. Setup Sandbox Environment
const sentTelegramMessages = [];

const sandbox = {
  console,
  Date,
  Math,
  Number,
  String,
  Array,
  Object,
  RegExp,
  parseInt,
  parseFloat,
  isNaN,
  Logger: { log: (msg) => console.log('  [GAS Logger]', msg) },
  Utilities: {
    formatDate: (d, tz, fmt) => '20261030-090000',
    getUuid: () => 'uuid-test-12345',
    formatString: (fmt, ...args) => {
      let i = 0;
      return fmt.replace(/%s/g, () => args[i++]).replace(/%0(\d+)d/g, (m, width) => String(args[i++]).padStart(Number(width), '0'));
    }
  },
  Session: {
    getScriptTimeZone: () => 'Asia/Jakarta',
    getActiveUser: () => ({ getEmail: () => 'user@example.com' })
  },
  SpreadsheetApp: {
    flush: () => {},
    getActiveSpreadsheet: () => ({
      getSheetByName: (name) => sandbox.getSheet(name)
    }),
    BorderStyle: {
      SOLID: 'SOLID',
      SOLID_MEDIUM: 'SOLID_MEDIUM',
      SOLID_THICK: 'SOLID_THICK',
      DOUBLE: 'DOUBLE',
      DASHED: 'DASHED',
      DOTTED: 'DOTTED'
    }
  },
  getLoans: () => [],
  sendTelegramMessage: (chatId, text) => {
    sentTelegramMessages.push({ chatId, text });
  },
  logError: (err) => {
    console.error('  [Error Logged]:', err);
  },
  getSetting: (param) => {
    if (param === 'Telegram Allowed User ID') return '12345678';
    if (param === 'Payday Date') return '25';
    return null;
  }
};

vm.createContext(sandbox);

function loadScript(relPath) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  let code = fs.readFileSync(fullPath, 'utf8');
  code = code.replace(/^const /gm, 'var ');
  vm.runInContext(code, sandbox, { filename: fullPath });
}

// 2. Load Core & Tested Scripts
loadScript('src/config/Config.js');
loadScript('src/core/Utilities.js');
loadScript('src/parser/Parser.js');
loadScript('src/normalizer/Normalizer.js');
loadScript('src/Category.js');
loadScript('src/repositories/DashboardRepository.js');
loadScript('src/services/Transaction.js');
loadScript('src/services/Budget.js');
loadScript('src/services/Wallet.js');
loadScript('src/services/Dashboard.js');
loadScript('src/services/TelegramBot.js');
loadScript('src/services/BotCommands.js');

sandbox.updateDashboard = () => {};

function runDiscrepancyCorrectionTests() {
  console.log('Running Transaction Correction & Discrepancy Reconciliation Tests (Phase 3.1)...\n');

  // Setup Mock Sheets
  let transactionsData = [
    ['Timestamp', 'Tanggal', 'Jenis', 'Wallet', 'Wallet Tujuan', 'Kategori', 'Keterangan', 'Nominal', 'Catatan'],
    [new Date(), new Date('2026-10-26T12:00:00'), 'Pengeluaran', 'BCA', '', 'Makanan & Minuman', 'makan siang', 500000, '']
  ];

  let walletsData = [
    ['WalletID', 'Nama', 'Type', 'Saldo Awal', 'Aktif', 'Saldo Saat Ini'],
    ['W001', 'BCA', 'Bank', 2000000, true, 1500000],
    ['W002', 'Mandiri', 'Bank', 1000000, true, 1000000],
    ['W003', 'Tunai', 'Cash', 500000, true, 500000]
  ];

  let budgetData = [
    ['Budget ID', 'Category', 'Period Type', 'Period Value', 'Limit', 'Warning', 'Active', 'Created At', 'Updated At'],
    ['BD000001', 'Makanan & Minuman', 'Payday', '2026-10-25', 1000000, 80, true, new Date('2026-10-25'), new Date('2026-10-25')]
  ];

  let dictionaryData = [
    ['Keyword', 'Kategori', 'Subkategori', 'Merchant', 'Default Jenis', 'Alias', 'Priority'],
    ['makan', 'Makanan & Minuman', '', '', 'Pengeluaran', '', 10]
  ];

  const createMockSheet = (data) => ({
    getDataRange: () => ({
      getValues: () => data.map(row => [...row])
    }),
    appendRow: (row) => {
      data.push([...row]);
    },
    getLastRow: () => data.length,
    getLastColumn: () => (data[0] ? data[0].length : 0),
    deleteRow: (rowIdx) => {
      data.splice(rowIdx - 1, 1);
    },
    clear: () => {
      data.length = 0;
    },
    getCharts: () => [],
    removeChart: () => {},
    setColumnWidth: () => {},
    setRowHeight: () => {},
    setFrozenRows: () => {},
    setFrozenColumns: () => {},
    getRange: (row, col, numRows, numCols) => {
      const rangeObj = {
        clear: () => rangeObj,
        clearContent: () => rangeObj,
        clearFormat: () => rangeObj,
        merge: () => rangeObj,
        mergeAcross: () => rangeObj,
        breakApart: () => rangeObj,
        setBackground: () => rangeObj,
        setFontWeight: () => rangeObj,
        setFontColor: () => rangeObj,
        setHorizontalAlignment: () => rangeObj,
        setVerticalAlignment: () => rangeObj,
        setNumberFormat: () => rangeObj,
        setBorder: () => rangeObj,
        setFontSize: () => rangeObj,
        setWrap: () => rangeObj,
        getValue: () => {
          return data[row - 1] ? data[row - 1][col - 1] : "";
        },
        setValue: (val) => {
          if (data[row - 1]) {
            data[row - 1][col - 1] = val;
          }
          return rangeObj;
        },
        getValues: () => {
          const rCount = numRows || 1;
          const cCount = numCols || 1;
          const res = [];
          for (let r = 0; r < rCount; r++) {
            const rowArr = [];
            for (let c = 0; c < cCount; c++) {
              rowArr.push(data[row - 1 + r] ? data[row - 1 + r][col - 1 + c] : "");
            }
            res.push(rowArr);
          }
          return res;
        },
        setValues: (vals) => {
          vals.forEach((rVals, rIdx) => {
            rVals.forEach((v, cIdx) => {
              if (data[row - 1 + rIdx]) {
                data[row - 1 + rIdx][col - 1 + cIdx] = v;
              }
            });
          });
          return rangeObj;
        }
      };
      return rangeObj;
    }
  });

  const mockSheets = {
    [sandbox.CONFIG.SHEETS.TRANSACTIONS]: createMockSheet(transactionsData),
    [sandbox.CONFIG.SHEETS.WALLETS]: createMockSheet(walletsData),
    [sandbox.CONFIG.SHEETS.BUDGET]: createMockSheet(budgetData),
    [sandbox.CONFIG.SHEETS.DICTIONARY]: createMockSheet(dictionaryData),
    [sandbox.CONFIG.SHEETS.DASHBOARD]: createMockSheet([["Metric", "Value"]])
  };

  sandbox.getSheet = (sheetName) => {
    if (mockSheets[sheetName]) return mockSheets[sheetName];
    return {
      getDataRange: () => ({ getValues: () => [] }),
      appendRow: () => {},
      getLastRow: () => 0
    };
  };

  // ==========================================
  // Test 1: Undo Last Transaction (/undo)
  // ==========================================
  console.log('Test 1: Undo Last Transaction (/undo)...');
  // Initial state: 1 transaksi pengeluaran 500k di BCA (Saldo BCA = 1.500.000)
  assert.strictEqual(transactionsData.length, 2); // 1 header + 1 transaction
  let bcaBal = sandbox.getWalletByName('BCA');
  let balances = sandbox.getWalletBalances();
  let bcaItem = balances.find(b => b.walletName === 'BCA');
  assert.strictEqual(bcaItem.balance, 1500000);

  // Jalankan undo
  const undoRes = sandbox.handleUndoCommand('12345678');
  console.log('--- Undo Response Preview ---');
  console.log(undoRes);
  console.log('-----------------------------');

  assert.ok(undoRes.includes('Berhasil Dibatalkan'), 'Response must confirm cancellation');
  assert.strictEqual(transactionsData.length, 1, 'Transaction row must be deleted');
  
  // Saldo BCA harus kembali ke 2.000.000
  balances = sandbox.getWalletBalances();
  bcaItem = balances.find(b => b.walletName === 'BCA');
  assert.strictEqual(bcaItem.balance, 2000000, 'BCA balance must revert to 2.000.000');
  console.log('✓ Test 1 PASSED: /undo successfully rolled back transaction and restored balance!\n');

  // ==========================================
  // Test 2: Correcting Nominal (/koreksi nominal)
  // ==========================================
  console.log('Test 2: Correcting Transaction Nominal (/koreksi nominal)...');
  // Tambah transaksi baru: 500k di BCA
  transactionsData.push([
    new Date(), new Date('2026-10-27T10:00:00'), 'Pengeluaran', 'BCA', '', 'Makanan & Minuman', 'salah ketik makan', 500000, ''
  ]);
  sandbox.updateWalletBalances();
  balances = sandbox.getWalletBalances();
  assert.strictEqual(balances.find(b => b.walletName === 'BCA').balance, 1500000);

  // Koreksi nominal dari 500k menjadi 50k
  const korNominalRes = sandbox.handleCorrectionCommand('12345678', 'nominal 50k');
  console.log('--- Koreksi Nominal Response ---');
  console.log(korNominalRes);
  console.log('--------------------------------');

  assert.ok(korNominalRes.includes('Koreksi Transaksi Berhasil'));
  assert.ok(korNominalRes.includes('Rp 50.000'));

  // Saldo BCA sekarang harus menjadi 1.950.000
  balances = sandbox.getWalletBalances();
  bcaItem = balances.find(b => b.walletName === 'BCA');
  assert.strictEqual(bcaItem.balance, 1950000, 'BCA balance must update to 1.950.000');
  console.log('✓ Test 2 PASSED: Nominal correction and balance adjustment verified!\n');

  // ==========================================
  // Test 3: Correcting Wallet Source (/koreksi wallet)
  // ==========================================
  console.log('Test 3: Correcting Wallet Source (/koreksi wallet)...');
  // Pindahkan transaksi 50k dari BCA ke Mandiri
  const korWalletRes = sandbox.handleCorrectionCommand('12345678', 'wallet Mandiri');
  assert.ok(korWalletRes.includes('Koreksi Transaksi Berhasil'));
  assert.ok(korWalletRes.includes('Mandiri'));

  // BCA harus kembali ke 2.000.000, Mandiri berkurang dari 1.000.000 ➔ 950.000
  balances = sandbox.getWalletBalances();
  assert.strictEqual(balances.find(b => b.walletName === 'BCA').balance, 2000000);
  assert.strictEqual(balances.find(b => b.walletName === 'Mandiri').balance, 950000);
  console.log('✓ Test 3 PASSED: Wallet switch correctly redistributed funds between accounts!\n');

  // ==========================================
  // Test 4: Targeted Correction by Index (/koreksi 2 nominal)
  // ==========================================
  console.log('Test 4: Targeted Correction by Index...');
  // Tambah transaksi kedua: 20k di Mandiri
  transactionsData.push([
    new Date(), new Date('2026-10-28T10:00:00'), 'Pengeluaran', 'Mandiri', '', 'Transportasi', 'bensin', 20000, ''
  ]);
  sandbox.updateWalletBalances();

  // Transaksi #1 adalah 'bensin 20k', Transaksi #2 adalah 'makan 50k'.
  // Koreksi transaksi #2 (ubah nominal dari 50k ➔ 40k)
  const korIdxRes = sandbox.handleCorrectionCommand('12345678', '2 nominal 40k');
  assert.ok(korIdxRes.includes('Transaksi #2'));
  assert.ok(korIdxRes.includes('Rp 40.000'));

  // Saldo Mandiri: 1.000.000 - 40.000 - 20.000 = 940.000
  balances = sandbox.getWalletBalances();
  assert.strictEqual(balances.find(b => b.walletName === 'Mandiri').balance, 940000);
  console.log('✓ Test 4 PASSED: Targeted historical correction accurate!\n');

  // ==========================================
  // Test 5: Delete by Recent Index (/hapustransaksi)
  // ==========================================
  console.log('Test 5: Delete Specific Recent Transaction (/hapustransaksi)...');
  // Hapus transaksi #1 (bensin 20k)
  const delRes = sandbox.handleDeleteRecentTransactionCommand('12345678', '1');
  assert.ok(delRes.includes('Berhasil Dihapus'));
  
  // Saldo Mandiri harus bertambah kembali 20k ➔ 960.000
  balances = sandbox.getWalletBalances();
  assert.strictEqual(balances.find(b => b.walletName === 'Mandiri').balance, 960000);
  console.log('✓ Test 5 PASSED: Targeted recent transaction deletion successful!\n');

  // ==========================================
  // Test 6: Discrepancy Adjustment (/sesuaikan with custom unrecorded funds reason)
  // ==========================================
  console.log('Test 6: Discrepancy Adjustment (/sesuaikan with unrecorded funds reason)...');
  // Saldo Tunai di sistem = 500.000. Nyatanya fisik ada 420.000 (selisih 80.000 lupa catat)
  const adjRes = sandbox.handleDiscrepancyAdjustmentCommand('12345678', 'Tunai 420.000 lupa catat parkir & jajan');
  console.log('--- Discrepancy Adjustment Output ---');
  console.log(adjRes);
  console.log('------------------------------------');

  assert.ok(adjRes.includes('Penyesuaian Saldo Keluar'));
  assert.ok(adjRes.includes('Rp 80.000'));
  assert.ok(adjRes.includes('lupa catat parkir & jajan'));

  // Saldo Tunai sekarang harus tepat 420.000
  balances = sandbox.getWalletBalances();
  assert.strictEqual(balances.find(b => b.walletName === 'Tunai').balance, 420000);
  console.log('✓ Test 6 PASSED: Discrepancy adjustment logged and balanced properly!\n');

  // ==========================================
  // Test 7: Edge Cases & Error Handling
  // ==========================================
  console.log('Test 7: Edge Cases & Error Handling...');
  // A. Koreksi dengan wallet yang tidak ada
  const errWallet = sandbox.handleCorrectionCommand('12345678', 'wallet BankGaib');
  assert.ok(errWallet.includes('tidak ditemukan'));

  // B. Koreksi dengan nominal negatif atau nol
  const errNominal = sandbox.handleCorrectionCommand('12345678', 'nominal -5000');
  assert.ok(errNominal.includes('tidak valid'));

  // C. Hapus transaksi dengan index di luar batas
  const errIdx = sandbox.handleDeleteRecentTransactionCommand('12345678', '99');
  assert.ok(errIdx.includes('tidak valid'));

  console.log('✓ Test 7 PASSED: Robust error handling verified for all edge cases!\n');

  console.log('ALL Phase 3.1 Discrepancy Correction & Reconciliation Tests PASSED 100%! 🎉');
}

runDiscrepancyCorrectionTests();

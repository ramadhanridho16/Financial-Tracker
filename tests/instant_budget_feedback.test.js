/**
 * Test Suite: Instant Budget Feedback & Flexible Category Matching (Phase 2.3)
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
  Logger: { log: (msg) => console.log('  [GAS Logger]', msg) },
  Utilities: {
    formatDate: (d, tz, fmt) => '20261025-070000',
    getUuid: () => 'uuid-test-12345',
    formatString: (fmt, ...args) => {
      let i = 0;
      return fmt.replace(/%s/g, () => args[i++]).replace(/%0(\d+)d/g, (m, width) => String(args[i++]).padStart(Number(width), '0'));
    }
  },
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
loadScript('src/services/Transaction.js');
loadScript('src/services/Budget.js');
loadScript('src/services/Wallet.js');
loadScript('src/services/TelegramBot.js');
loadScript('src/services/BotCommands.js');

function runInstantBudgetFeedbackTests() {
  console.log('Running Instant Budget Feedback & Category Matching Tests (Phase 2.3)...\n');

  // Setup Mock Sheets
  const dictionaryData = [
    ['Keyword', 'Kategori', 'Subkategori', 'Merchant', 'Default Jenis', 'Alias', 'Priority'],
    ['makan', 'Makanan & Minuman', 'Restoran', '', 'Pengeluaran', 'nasi, sate, kopi', 10],
    ['bensin', 'Transportasi', 'BBM', 'Pertamina', 'Pengeluaran', 'pertalite, pertamax', 10]
  ];

  const budgetData = [
    ['Budget ID', 'Category', 'Period Type', 'Period Value', 'Limit', 'Warning', 'Active', 'Created At', 'Updated At'],
    ['BD000001', 'Makanan & Minuman', 'Payday', '2026-10-25', 1000000, 80, true, new Date('2026-10-25'), new Date('2026-10-25')]
  ];

  const walletsData = [
    ['WalletID', 'Nama', 'Type', 'Saldo Awal', 'Aktif', 'Saldo Saat Ini'],
    ['W001', 'BCA', 'Bank', 2000000, true, 1975000]
  ];

  const transactionsData = [
    ['Timestamp', 'Tanggal', 'Jenis', 'Wallet', 'Wallet Tujuan', 'Kategori', 'Keterangan', 'Nominal', 'Catatan'],
    // Transaksi belanja makan siang 25.000 pada periode 25 Okt - 24 Nov
    [new Date(), new Date('2026-10-25T13:00:00'), 'Pengeluaran', 'BCA', '', 'Makanan & Minuman', 'Makan Siang Ayam Geprek', 25000, '']
  ];

  const mockSheets = {
    [sandbox.CONFIG.SHEETS.DICTIONARY]: {
      getDataRange: () => ({
        getValues: () => dictionaryData.map(row => [...row])
      }),
      appendRow: (row) => {
        dictionaryData.push([...row]);
      },
      getRange: (row, col) => ({
        setValue: (val) => {
          dictionaryData[row - 1][col - 1] = val;
        }
      })
    },
    [sandbox.CONFIG.SHEETS.BUDGET]: {
      getDataRange: () => ({
        getValues: () => budgetData.map(row => [...row])
      }),
      appendRow: (row) => {
        budgetData.push([...row]);
      },
      getLastRow: () => budgetData.length,
      getRange: (row, col) => ({
        getValue: () => budgetData[row - 1] ? budgetData[row - 1][col - 1] : "",
        setValue: (val) => {
          budgetData[row - 1][col - 1] = val;
        },
        setValues: (vals) => {
          vals.forEach((rVals, rIdx) => {
            rVals.forEach((v, cIdx) => {
              budgetData[row - 1 + rIdx][col - 1 + cIdx] = v;
            });
          });
        }
      })
    },
    [sandbox.CONFIG.SHEETS.WALLETS]: {
      getDataRange: () => ({
        getValues: () => walletsData.map(row => [...row])
      })
    },
    [sandbox.CONFIG.SHEETS.TRANSACTIONS]: {
      getDataRange: () => ({
        getValues: () => transactionsData.map(row => [...row])
      }),
      appendRow: (row) => {
        transactionsData.push([...row]);
      },
      getLastRow: () => transactionsData.length
    }
  };

  sandbox.getSheet = (sheetName) => {
    if (mockSheets[sheetName]) return mockSheets[sheetName];
    return {
      getDataRange: () => ({ getValues: () => [] }),
      appendRow: () => {}
    };
  };

  // ==========================================
  // Test 1: Flexible Category Matching
  // ==========================================
  console.log('Test 1: Flexible Category Matching (isCategoryMatch)...');
  assert.strictEqual(sandbox.isCategoryMatch('Makanan & Minuman', 'makanan'), true);
  assert.strictEqual(sandbox.isCategoryMatch('Makanan & Minuman', 'minuman'), true);
  assert.strictEqual(sandbox.isCategoryMatch('Makanan & Minuman', 'Makanan dan Minuman'), true);
  assert.strictEqual(sandbox.isCategoryMatch('makanan & minuman', 'Makanan & Minuman'), true);
  assert.strictEqual(sandbox.isCategoryMatch('Makanan & Minuman', 'Transportasi'), false);

  const matchedBudget = sandbox.getBudgetByCategory('makanan');
  assert.ok(matchedBudget, 'Expected budget for "makanan" to resolve to "Makanan & Minuman"');
  assert.strictEqual(matchedBudget.category, 'Makanan & Minuman');

  console.log('✓ Test 1 PASSED: Flexible category matching works accurately!\n');

  // ==========================================
  // Test 2: Instant Budget Deduction on Transaction Receipt
  // ==========================================
  console.log('Test 2: Instant Budget Status in formatTelegramTransactionReceipt...');
  
  const testTransactions = [
    {
      transactionType: 'Pengeluaran',
      amount: 25000,
      category: 'Makanan & Minuman',
      walletName: 'BCA',
      description: 'Makan siang'
    }
  ];

  const receipt = sandbox.formatTelegramTransactionReceipt(testTransactions);
  console.log('--- Sample Receipt Output ---');
  console.log(receipt);
  console.log('-----------------------------');

  assert.ok(receipt.includes('🎯 *Kuota Anggaran Makanan & Minuman:*'), 'Receipt must contain budget card');
  assert.ok(receipt.includes('Rp 25.000'), 'Receipt must display spent amount');
  assert.ok(receipt.includes('Rp 975.000'), 'Receipt must display remaining amount');
  assert.ok(receipt.includes('✅ Aman'), 'Receipt must display safe badge for low usage');

  console.log('✓ Test 2 PASSED: Receipt displays instant budget deduction immediately!\n');

  // ==========================================
  // Test 3: Targeted /budget <kategori> Command
  // ==========================================
  console.log('Test 3: Targeted /budget Command with specific category argument...');
  
  // Kasus A: /budget Makanan & Minuman
  const res1 = sandbox.handleBudgetCommand('12345678', 'Makanan & Minuman');
  assert.ok(res1.includes('Status Anggaran: Makanan & Minuman'));
  assert.ok(res1.includes('Rp 1.000.000'));
  assert.ok(res1.includes('Rp 25.000'));
  assert.ok(res1.includes('Rp 975.000'));

  // Kasus B: /budget makanan (fuzzy query)
  const res2 = sandbox.handleBudgetCommand('12345678', 'makanan');
  assert.ok(res2.includes('Status Anggaran: Makanan & Minuman'));
  assert.ok(res2.includes('Rp 975.000'));

  // Kasus C: /budget kategori yang tidak ada
  const res3 = sandbox.handleBudgetCommand('12345678', 'Piknik');
  assert.ok(res3.includes('Tidak ditemukan anggaran aktif untuk kategori'));

  console.log('✓ Test 3 PASSED: Targeted /budget command works flawlessly!\n');

  console.log('ALL Phase 2.3 Instant Budget Feedback Tests PASSED 100%! 🎉');
}

runInstantBudgetFeedbackTests();


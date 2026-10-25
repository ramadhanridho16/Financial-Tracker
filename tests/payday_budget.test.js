/**
 * Test Suite: Payday Budget & Telegram Category Ingestion (Phase 2.2)
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
loadScript('src/services/TelegramBot.js');
loadScript('src/services/BotCommands.js');

function runPaydayBudgetTests() {
  console.log('Running Payday Budget & Category Ingestion Tests (Phase 2.2)...\n');

  // Setup Mock Sheets
  const dictionaryData = [
    ['Keyword', 'Kategori', 'Subkategori', 'Merchant', 'Default Jenis', 'Alias', 'Priority'],
    ['makan', 'Makanan', 'Restoran', '', 'EXPENSE', 'nasi, sate', 10],
    ['bensin', 'Transport', 'BBM', 'Pertamina', 'EXPENSE', 'pertalite, pertamax', 10]
  ];

  const budgetData = [
    ['Budget ID', 'Category', 'Period Type', 'Period Value', 'Limit', 'Warning', 'Active', 'Created At', 'Updated At'],
    ['BGT001', 'Makanan', 'Payday', '2026-10-25', 2000000, 80, true, new Date('2026-10-20'), new Date('2026-10-20')]
  ];

  const transactionsData = [
    ['Timestamp', 'Tanggal', 'Jenis', 'Wallet', 'Wallet Tujuan', 'Kategori', 'Keterangan', 'Nominal', 'Catatan'],
    // Transaksi di dalam periode aktif 25 Okt 2026 - 24 Nov 2026
    [new Date(), new Date('2026-10-26T12:00:00'), 'EXPENSE', 'BCA', '', 'Makanan', 'Makan Siang', 1500000, ''],
    [new Date(), new Date('2026-11-05T12:00:00'), 'EXPENSE', 'BCA', '', 'Makanan', 'Dinner', 200000, ''],
    // Transaksi di luar periode aktif (sebelum 25 Okt 2026)
    [new Date(), new Date('2026-10-15T12:00:00'), 'EXPENSE', 'BCA', '', 'Makanan', 'Makan Lama', 500000, ''],
    // Transaksi kategori lain
    [new Date(), new Date('2026-10-27T10:00:00'), 'EXPENSE', 'Mandiri', '', 'Transport', 'Isi Bensin', 100000, '']
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
        },
        setValues: (vals) => {
          vals[0].forEach((v, cIdx) => {
            dictionaryData[row - 1][col - 1 + cIdx] = v;
          });
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
      getRange: (row, col, numRows, numCols) => ({
        getValue: () => {
          return budgetData[row - 1] ? budgetData[row - 1][col - 1] : "";
        },
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
  // Test 1: Payday Cycle Range Calculation
  // ==========================================
  console.log('Test 1: Payday Cycle Range Calculation (25th - 24th)...');
  
  // Kasus A: Tanggal 25 Okt 2026 (Hari Gajian)
  const p1 = sandbox.getPaydayPeriod(new Date('2026-10-25T10:00:00'), 25);
  assert.strictEqual(p1.startYear, 2026);
  assert.strictEqual(p1.startMonth, 10);
  assert.strictEqual(p1.endYear, 2026);
  assert.strictEqual(p1.endMonth, 11);
  assert.strictEqual(p1.label, '25 Okt 2026 - 24 Nov 2026');

  // Kasus B: Tanggal 10 Nov 2026 (Di tengah siklus)
  const p2 = sandbox.getPaydayPeriod(new Date('2026-11-10T10:00:00'), 25);
  assert.strictEqual(p2.label, '25 Okt 2026 - 24 Nov 2026');

  // Kasus C: Tanggal 24 Nov 2026 (Hari terakhir siklus)
  const p3 = sandbox.getPaydayPeriod(new Date('2026-11-24T23:50:00'), 25);
  assert.strictEqual(p3.label, '25 Okt 2026 - 24 Nov 2026');

  // Kasus D: Pergantian Tahun (5 Januari 2027)
  const p4 = sandbox.getPaydayPeriod(new Date('2027-01-05T10:00:00'), 25);
  assert.strictEqual(p4.startYear, 2026);
  assert.strictEqual(p4.startMonth, 12);
  assert.strictEqual(p4.endYear, 2027);
  assert.strictEqual(p4.endMonth, 1);
  assert.strictEqual(p4.label, '25 Des 2026 - 24 Jan 2027');

  console.log('✓ Test 1 PASSED: Payday cycle calculation is 100% accurate!\n');

  // ==========================================
  // Test 2: Category Expense in Payday Period
  // ==========================================
  console.log('Test 2: Category Expense in Payday Period Filtering...');
  // Reference date: 28 Okt 2026 (berada dalam siklus 25 Okt - 24 Nov)
  // Transaksi 26 Okt (1.500.000) dan 5 Nov (200.000) harus terhitung = 1.700.000
  // Transaksi 15 Okt (500.000) tidak boleh terhitung karena di luar periode gajian
  const expenseMakanan = sandbox.getCategoryExpenseInPaydayPeriod('Makanan', 25, new Date('2026-10-28'));
  assert.strictEqual(expenseMakanan, 1700000, `Expected 1.700.000 but got ${expenseMakanan}`);

  console.log('✓ Test 2 PASSED: Category expense correctly filtered by payday period!\n');

  // ==========================================
  // Test 3: Budget Usage Status & Warning Badges
  // ==========================================
  console.log('Test 3: Budget Usage Status & Warning Thresholds...');
  // Budget Makanan: limit = 2.000.000, warning = 80% (1.600.000). Spent = 1.700.000 (85%)
  const statusMakanan = sandbox.getBudgetUsageStatus('Makanan', 25, new Date('2026-10-28'));
  assert.strictEqual(statusMakanan.limit, 2000000);
  assert.strictEqual(statusMakanan.spent, 1700000);
  assert.strictEqual(statusMakanan.remaining, 300000);
  assert.strictEqual(statusMakanan.percentage, 85);
  assert.strictEqual(statusMakanan.status, 'WARNING');
  assert.ok(statusMakanan.badge.includes('Waspada'));
  assert.ok(statusMakanan.progressBar.includes('85%'));

  console.log('✓ Test 3 PASSED: Budget usage status & warning calculated correctly!\n');

  // ==========================================
  // Test 4: Upsert Budget & Add Category
  // ==========================================
  console.log('Test 4: Upsert Budget & saveNewCategory...');
  // Tambah kategori baru
  const newCat = sandbox.saveNewCategory('Skincare', 'sunscreen, serum', 'EXPENSE');
  assert.strictEqual(newCat.category, 'Skincare');
  assert.strictEqual(newCat.primaryKeyword, 'sunscreen');
  assert.strictEqual(newCat.aliases, 'serum');
  assert.strictEqual(newCat.isNew, true);

  // Upsert Budget baru
  const newBgt = sandbox.upsertBudget('Skincare', '500k', 80);
  assert.strictEqual(newBgt.category, 'Skincare');
  assert.strictEqual(newBgt.limit, 500000);
  assert.strictEqual(newBgt.warning, 80);
  assert.strictEqual(newBgt.isNew, true);

  // Update budget lama (Makanan diupdate jadi 3jt)
  const updatedBgt = sandbox.upsertBudget('Makanan', '3jt', 90);
  assert.strictEqual(updatedBgt.category, 'Makanan');
  assert.strictEqual(updatedBgt.limit, 3000000);
  assert.strictEqual(updatedBgt.warning, 90);
  assert.strictEqual(updatedBgt.isNew, false);

  console.log('✓ Test 4 PASSED: Upsert budget and saveNewCategory successful!\n');

  // ==========================================
  // Test 5: Bot Command Handlers
  // ==========================================
  console.log('Test 5: Bot Command Handlers (/tambahkategori, /setbudget, /budget)...');
  
  // Handler /tambahkategori
  const resCat = sandbox.handleAddCategoryCommand('12345678', 'Olahraga gym, fitness, protein');
  assert.ok(resCat.includes('Kategori Transaksi Berhasil'));
  assert.ok(resCat.includes('Olahraga'));

  // Handler /setbudget
  const resBgt = sandbox.handleSetBudgetCommand('12345678', 'Olahraga 400k 85');
  assert.ok(resBgt.includes('Anggaran (Budget) Berhasil Diatur'));
  assert.ok(resBgt.includes('Rp 400.000'));
  assert.ok(resBgt.includes('85%'));

  // Handler /budget (memeriksa ringkasan)
  const resSummary = sandbox.handleBudgetCommand();
  assert.ok(resSummary.includes('Status Anggaran (Siklus Gajian)'));
  assert.ok(resSummary.includes('Total Anggaran'));

  console.log('✓ Test 5 PASSED: Bot command handlers generated clean responses!\n');

  // ==========================================
  // Test 6: Payday Rollover Evaluation (Tanggal 25)
  // ==========================================
  console.log('Test 6: Payday Rollover Evaluation...');
  const rollover = sandbox.evaluatePaydayRollover(new Date('2026-10-25T07:00:00'), 25);
  assert.ok(rollover.completedPeriod);
  assert.ok(rollover.newPeriod);
  assert.strictEqual(typeof rollover.totalBudget, 'number');
  assert.strictEqual(typeof rollover.totalExpense, 'number');

  console.log('✓ Test 6 PASSED: Payday rollover evaluation executed smoothly!\n');

  console.log('ALL Phase 2.2 Payday Budget & Category Ingestion Tests PASSED 100%! 🎉');
}

runPaydayBudgetTests();

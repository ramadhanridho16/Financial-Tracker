/**
 * Test Suite: Financial Tracker to Home Inventory Integration
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// 1. Setup Sandbox Environment
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
    formatDate: (d, tz, fmt) => '20261016-180000',
    getUuid: () => 'uuid-test-12345'
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
loadScript('src/repositories/HomeInventory.js');
loadScript('src/services/InventorySync.js');

function runInventorySyncTests() {
  console.log('Running Financial Tracker -> Home Inventory Integration Tests...\n');

  // Setup Mock Master_Barang, Inventory, Transaction sheets
  const masterBarangData = [
    ['Product ID', 'Nama Barang', 'Alias', 'Kategori', 'Satuan', 'Stok Minimum', 'Preferred Supplier', 'Lokasi Simpan', 'Brand', 'Barcode', 'Active', 'Auto Shopping'],
    ['P0001', 'Beras Ramos', 'beras ramos, beras, beras pulen', 'Sembako', 'kg', 5, 'Toko Beras Makmur', 'Dapur', 'Ramos', '', true, true],
    ['P0002', 'Minyak Goreng Sania', 'minyak goreng sania, minyak goreng, minyak, sania', 'Sembako', 'liter', 2, 'Indomaret', 'Dapur', 'Sania', '', true, true],
    ['P0003', 'Sabun Mandi Lifebuoy', 'sabun mandi, sabun, lifebuoy', 'Kebersihan', 'pcs', 3, 'Alfamart', 'Kamar Mandi', 'Lifebuoy', '', true, true],
    ['P0004', 'Kecap Manis Bango', 'kecap manis bango, kecap bango, kecap', 'Bumbu', 'botol', 1, 'Toko Madura', 'Dapur', 'Bango', '', true, true],
    ['P0005', 'Barang Nonaktif', 'barang mati', 'Lainnya', 'pcs', 1, '', '', '', '', false, false]
  ];

  const inventoryData = [
    ['Product ID', 'Product Name', 'Current Stock', 'Unit', 'Last Update', 'Status'],
    ['P0001', 'Beras Ramos', 3, 'kg', new Date(), 'LOW_STOCK'],
    ['P0002', 'Minyak Goreng Sania', 0, 'liter', new Date(), 'OUT_OF_STOCK'],
    ['P0003', 'Sabun Mandi Lifebuoy', 5, 'pcs', new Date(), 'IN_STOCK']
    // P0004 intentionally not in inventory yet to test append
  ];

  const transactionData = [
    ['Transaction ID', 'Tanggal', 'Product ID', 'Barang', 'Jenis', 'Qty', 'Harga Satuan', 'Total', 'Supplier/Toko', 'Catatan']
  ];

  const mockMasterSheet = {
    getDataRange: () => ({
      getValues: () => JSON.parse(JSON.stringify(masterBarangData))
    }),
    getLastColumn: () => masterBarangData[0].length,
    getRange: (r, c, nr, nc) => ({
      getValues: () => [masterBarangData[0]]
    })
  };

  const mockInventorySheet = {
    getDataRange: () => ({
      getValues: () => inventoryData.map(r => [...r])
    }),
    getLastRow: () => inventoryData.length,
    getRange: (row, col) => ({
      setValue: (val) => {
        inventoryData[row - 1][col - 1] = val;
      }
    }),
    appendRow: (row) => {
      inventoryData.push(row);
    }
  };

  const mockTransactionSheet = {
    getLastRow: () => transactionData.length,
    getRange: (row, col, numRows, numCols) => ({
      setValues: (values) => {
        while (transactionData.length < row) {
          transactionData.push([]);
        }
        transactionData[row - 1] = values[0];
      },
      setFormula: (formula) => {
        // Col 8 is Total
        if (transactionData[row - 1]) {
          transactionData[row - 1][7] = formula;
        }
      }
    }),
    appendRow: (row) => {
      transactionData.push(row);
    }
  };

  const mockSpreadsheet = {
    getName: () => 'Mock Home Inventory Spreadsheet',
    getSheetByName: (name) => {
      if (name === 'Master_Barang' || name === 'Product_Master') return mockMasterSheet;
      if (name === 'Inventory') return mockInventorySheet;
      if (name === 'Transaction') return mockTransactionSheet;
      return null;
    }
  };

  sandbox.SpreadsheetApp = {
    openById: (id) => {
      assert.strictEqual(id, sandbox.CONFIG.HOME_INVENTORY.SPREADSHEET_ID);
      return mockSpreadsheet;
    }
  };

  // --- Test 1: findHomeInventoryProduct ---
  console.log('Test 1: Product & Alias Recognition in Master_Barang...');
  
  // Direct name match
  const p1 = sandbox.findHomeInventoryProduct('Beli Beras Ramos 50k');
  assert(p1 !== null, 'Direct name match failed');
  assert.strictEqual(p1.productId, 'P0001');

  // Alias match: "beras" -> P0001
  const p2 = sandbox.findHomeInventoryProduct('beli 2 beras 50k');
  assert(p2 !== null, 'Alias "beras" match failed');
  assert.strictEqual(p2.productId, 'P0001');

  // Longest alias match: "minyak goreng" vs "minyak"
  const p3 = sandbox.findHomeInventoryProduct('minyak goreng 30k');
  assert(p3 !== null, 'Alias "minyak goreng" match failed');
  assert.strictEqual(p3.productId, 'P0002');

  // Another product alias: "kecap" -> P0004
  const p4 = sandbox.findHomeInventoryProduct('beli kecap bango 15k');
  assert(p4 !== null, 'Alias "kecap bango" match failed');
  assert.strictEqual(p4.productId, 'P0004');

  // Inactive product should be ignored
  const pInactive = sandbox.findHomeInventoryProduct('beli barang mati 10k');
  assert.strictEqual(pInactive, null, 'Inactive product should not match');

  // Non-inventory item should return null
  const pNone = sandbox.findHomeInventoryProduct('isi bensin pertalite 20k');
  assert.strictEqual(pNone, null, 'Non-inventory item should return null');

  // Partial word collision test: "memberas" or "berasap" should NOT match "beras"
  const pPartial = sandbox.findHomeInventoryProduct('pemberasap mobil 20k');
  assert.strictEqual(pPartial, null, 'Partial substring should not match');

  console.log('✓ Product & Alias Recognition PASSED!\n');

  // --- Test 2: extractInventoryQuantity ---
  console.log('Test 2: Smart Quantity Extraction...');
  
  // With explicit unit: "2 kg"
  const q1 = sandbox.extractInventoryQuantity('beli 2 kg beras 50k', 'kg', 'beras');
  assert.strictEqual(q1, 2, 'Explicit unit failed');

  // Without unit, number preceding product: "beli 2 beras 50k"
  const q2 = sandbox.extractInventoryQuantity('beli 2 beras 50k', 'kg', 'beras');
  assert.strictEqual(q2, 2, 'Number before product failed');

  // Preceding number without "beli": "3 sabun mandi 15000"
  const q3 = sandbox.extractInventoryQuantity('3 sabun mandi 15000', 'pcs', 'sabun mandi');
  assert.strictEqual(q3, 3, 'Preceding number failed');

  // Decimal quantity: "1.5 kg"
  const q4 = sandbox.extractInventoryQuantity('beli 1.5 kg beras 20k', 'kg', 'beras');
  assert.strictEqual(q4, 1.5, 'Decimal quantity failed');

  // Number following product: "kecap 2 bango 30k" or "kecap 2"
  const q5 = sandbox.extractInventoryQuantity('kecap 2 30k', 'botol', 'kecap');
  assert.strictEqual(q5, 2, 'Number after product failed');

  // Default quantity = 1: "minyak 25k"
  const q6 = sandbox.extractInventoryQuantity('minyak 25k', 'liter', 'minyak');
  assert.strictEqual(q6, 1, 'Default quantity failed');

  console.log('✓ Smart Quantity Extraction PASSED!\n');

  // --- Test 3: syncHomeInventoryStock & deriveHomeInventoryStatus ---
  console.log('Test 3: Inventory Stock & Status Derivation...');
  
  // P0001 (Beras Ramos): currentStock = 3, minStock = 5 (LOW_STOCK). Add 3 kg -> 6 kg (> minStock) -> IN_STOCK
  const stockResult1 = sandbox.syncHomeInventoryStock(p1, 3);
  assert.strictEqual(stockResult1.newStock, 6);
  assert.strictEqual(stockResult1.status, 'IN_STOCK');

  // P0002 (Minyak Goreng): currentStock = 0 (OUT_OF_STOCK). Add 1 liter (minStock = 2) -> 1 liter -> LOW_STOCK
  const stockResult2 = sandbox.syncHomeInventoryStock(p3, 1);
  assert.strictEqual(stockResult2.newStock, 1);
  assert.strictEqual(stockResult2.status, 'LOW_STOCK');

  // P0004 (Kecap Bango): Not in inventory yet. Append row with 2 botol (minStock = 1) -> IN_STOCK
  const stockResult3 = sandbox.syncHomeInventoryStock(p4, 2);
  assert.strictEqual(stockResult3.newStock, 2);
  assert.strictEqual(stockResult3.status, 'IN_STOCK');
  assert(inventoryData.some(r => r[0] === 'P0004'), 'New product row should be appended to Inventory');

  console.log('✓ Inventory Stock & Status Derivation PASSED!\n');

  // --- Test 4: saveHomeInventoryPurchase ---
  console.log('Test 4: Transaction Schema & Formula Logging...');
  
  const mockPurchase = {
    product: p1,
    quantity: 2,
    transaction: {
      date: new Date('2026-10-16T10:00:00Z'),
      amount: 50000,
      merchant: 'Toko Beras',
      sourceInput: 'beli 2 beras 50k'
    }
  };

  const loggedRow = sandbox.saveHomeInventoryPurchase(mockPurchase);
  assert(loggedRow > 1, 'Transaction row should be appended');

  const trxRow = transactionData[loggedRow - 1];
  assert(trxRow[0].startsWith('TRX-'), 'Col A should have TRX- ID');
  assert.strictEqual(trxRow[2], 'P0001', 'Col C should be Product ID P0001');
  assert.strictEqual(trxRow[3], 'Beras Ramos', 'Col D should be Product Name');
  assert.strictEqual(trxRow[4], 'PURCHASE', 'Col E should be PURCHASE');
  assert.strictEqual(trxRow[5], 2, 'Col F should be Qty 2');
  assert.strictEqual(trxRow[6], 25000, 'Col G should be Unit Price 25000 (50k / 2)');
  assert.strictEqual(trxRow[7], '=IF(G' + loggedRow + '="";"";F' + loggedRow + '*G' + loggedRow + ')', 'Col H should have Total formula');
  assert.strictEqual(trxRow[8], 'Toko Beras', 'Col I should be Supplier');
  assert(trxRow[9].includes('Via Financial Tracker: beli 2 beras 50k'), 'Col J should have source note');

  console.log('✓ Transaction Schema & Formula Logging PASSED!\n');

  // --- Test 5: syncInventoryPurchases full pipeline ---
  console.log('Test 5: Full Pipeline syncInventoryPurchases...');
  
  const testTransactions = [
    {
      transactionType: 'EXPENSE',
      amount: 40000,
      sourceInput: 'beli 2 liter minyak 40k',
      description: 'minyak',
      date: new Date()
    },
    {
      transactionType: 'EXPENSE',
      amount: 20000,
      sourceInput: 'bensin motor 20k',
      description: 'bensin',
      date: new Date()
    },
    {
      transactionType: 'INCOME',
      amount: 5000000,
      sourceInput: 'gaji bulanan 5jt',
      description: 'gaji',
      date: new Date()
    }
  ];

  const syncResults = sandbox.syncInventoryPurchases(testTransactions);
  assert.strictEqual(syncResults.length, 1, 'Only the inventory purchase should be synced');
  assert.strictEqual(syncResults[0].product.productName, 'Minyak Goreng Sania');
  assert.strictEqual(syncResults[0].quantity, 2);

  // --- Test 6: Telegram Receipt Formatting with Inventory Badge ---
  console.log('Test 6: Telegram Receipt Formatting with Inventory Badge...');
  
  loadScript('src/services/TelegramBot.js');
  sandbox.formatCurrency = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');
  sandbox.getWalletByName = () => ({ walletName: 'BCA' });
  sandbox.getWalletBalances = () => [{ walletName: 'BCA', balance: 1500000 }];

  const receiptOutput = sandbox.formatTelegramTransactionReceipt(
    [
      {
        transactionType: 'EXPENSE',
        amount: 40000,
        category: 'Belanja',
        walletName: 'BCA',
        description: 'beli 2 liter minyak'
      }
    ],
    syncResults
  );

  console.log('--- Receipt Output Preview ---');
  console.log(receiptOutput);
  console.log('------------------------------');

  assert(receiptOutput.includes('📦 *Tersinkron ke Home Inventory:*'), 'Receipt must contain Home Inventory header');
  assert(receiptOutput.includes('Minyak Goreng Sania'), 'Receipt must list product name');
  assert(receiptOutput.includes('+2 liter'), 'Receipt must show quantity added');

  console.log('✓ Telegram Receipt Formatting PASSED!\n');

  console.log('ALL Financial Tracker -> Home Inventory Integration Tests PASSED 100%!');
}

runInventorySyncTests();

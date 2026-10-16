/**
 * Test Suite: Financial Tracker to Home Inventory Telegram Notification Flow
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// 1. Setup Sandbox Environment
const dispatchedRequests = [];

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
    formatDate: (d, tz, fmt) => '16/10/2026 19:05',
    getUuid: () => 'uuid-notif-12345'
  },
  UrlFetchApp: {
    fetch: (url, options) => {
      dispatchedRequests.push({ url, options });
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true })
      };
    }
  }
};

vm.createContext(sandbox);

function loadScript(relPath) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  let code = fs.readFileSync(fullPath, 'utf8');
  code = code.replace(/^const /gm, 'var ');
  vm.runInContext(code, sandbox, { filename: fullPath });
}

loadScript('src/config/Config.js');
loadScript('src/core/Utilities.js');
loadScript('src/repositories/HomeInventory.js');
loadScript('src/services/InventorySync.js');

function runNotificationTests() {
  console.log('Running Home Inventory Telegram Notification Tests...\n');

  // Setup mock sheets in Home Inventory
  const masterBarangData = [
    ['Product ID', 'Nama Barang', 'Alias', 'Kategori', 'Satuan', 'Stok Minimum', 'Preferred Supplier', 'Lokasi Simpan', 'Brand', 'Barcode', 'Active', 'Auto Shopping'],
    ['P0001', 'Beras Ramos', 'beras ramos, beras', 'Sembako', 'kg', 5, 'Toko Beras', 'Dapur', 'Ramos', '', true, true],
    ['P0002', 'Minyak Goreng Sania', 'minyak goreng, minyak', 'Sembako', 'liter', 2, 'Indomaret', 'Dapur', 'Sania', '', true, true]
  ];

  const inventoryData = [
    ['Product ID', 'Product Name', 'Current Stock', 'Unit', 'Last Update', 'Status'],
    ['P0001', 'Beras Ramos', 5, 'kg', new Date(), 'IN_STOCK'],
    ['P0002', 'Minyak Goreng Sania', 0, 'liter', new Date(), 'OUT_OF_STOCK']
  ];

  const transactionData = [
    ['Transaction ID', 'Tanggal', 'Product ID', 'Barang', 'Jenis', 'Qty', 'Harga Satuan', 'Total', 'Supplier/Toko', 'Catatan']
  ];

  const configData = [
    ['Config Key', 'Config Value'],
    ['TELEGRAM_BOT_TOKEN', '123456:TEST_HOME_INVENTORY_TOKEN'],
    ['TELEGRAM_CHAT_ID', '897910198'],
    ['TELEGRAM_NOTIFICATIONS_ENABLED', 'true']
  ];

  const mockMasterSheet = {
    getDataRange: () => ({
      getValues: () => JSON.parse(JSON.stringify(masterBarangData))
    }),
    getLastColumn: () => masterBarangData[0].length
  };

  const mockInventorySheet = {
    getDataRange: () => ({
      getValues: () => inventoryData.map(r => [...r])
    }),
    getLastRow: () => inventoryData.length,
    getRange: (row, col) => ({
      setValue: (val) => { inventoryData[row - 1][col - 1] = val; }
    }),
    appendRow: (row) => { inventoryData.push(row); }
  };

  const mockTransactionSheet = {
    getLastRow: () => transactionData.length,
    getRange: (row, col, numRows, numCols) => ({
      setValues: (values) => {
        while (transactionData.length < row) transactionData.push([]);
        transactionData[row - 1] = values[0];
      },
      setFormula: (formula) => {
        if (transactionData[row - 1]) transactionData[row - 1][7] = formula;
      }
    }),
    appendRow: (row) => { transactionData.push(row); }
  };

  const mockConfigSheet = {
    getLastRow: () => configData.length,
    getRange: (r, c, nr, nc) => ({
      getValues: () => configData.slice(1)
    })
  };

  const mockSpreadsheet = {
    getName: () => 'Mock Home Inventory Spreadsheet',
    getSheetByName: (name) => {
      if (name === 'Master_Barang' || name === 'Product_Master') return mockMasterSheet;
      if (name === 'Inventory') return mockInventorySheet;
      if (name === 'Transaction') return mockTransactionSheet;
      if (name === 'Config') return mockConfigSheet;
      return null;
    }
  };

  sandbox.SpreadsheetApp = {
    openById: (id) => mockSpreadsheet
  };

  // --- Test 1: getHomeInventoryTelegramConfig ---
  console.log('Test 1: Reading Home Inventory Telegram Config from Sheet...');
  const telConfig = sandbox.getHomeInventoryTelegramConfig();
  assert(telConfig !== null, 'Config should not be null');
  assert.strictEqual(telConfig.botToken, '123456:TEST_HOME_INVENTORY_TOKEN');
  assert.strictEqual(telConfig.chatId, '897910198');
  assert.strictEqual(telConfig.enabled, true);
  console.log('✓ Telegram Config Reading PASSED!\n');

  // --- Test 2: sendHomeInventoryTelegramNotification ---
  console.log('Test 2: Dispatching Telegram Notification via UrlFetchApp...');
  dispatchedRequests.length = 0;
  const sent = sandbox.sendHomeInventoryTelegramNotification('Test message from Financial Tracker');
  assert.strictEqual(sent, true, 'sendHomeInventoryTelegramNotification should return true');
  assert.strictEqual(dispatchedRequests.length, 1);
  assert.strictEqual(dispatchedRequests[0].url, 'https://api.telegram.org/bot123456:TEST_HOME_INVENTORY_TOKEN/sendMessage');

  const reqPayload = JSON.parse(dispatchedRequests[0].options.payload);
  assert.strictEqual(reqPayload.chat_id, '897910198');
  assert.strictEqual(reqPayload.text, 'Test message from Financial Tracker');
  assert.strictEqual(reqPayload.parse_mode, 'Markdown');
  console.log('✓ Telegram Notification Dispatch PASSED!\n');

  // --- Test 3: notifyHomeInventoryPurchase Formatter ---
  console.log('Test 3: Formatting and Sending Home Inventory Purchase Notification...');
  dispatchedRequests.length = 0;

  const mockSyncResult = {
    product: {
      productId: 'P0001',
      productName: 'Beras Ramos',
      category: 'Sembako',
      unit: 'kg'
    },
    quantity: 2,
    newStock: 7,
    status: 'IN_STOCK'
  };

  const mockTransaction = {
    amount: 50000,
    sourceInput: 'beli 2 beras 50k bca',
    description: 'beli beras'
  };

  const notifySent = sandbox.notifyHomeInventoryPurchase(mockSyncResult, mockTransaction);
  assert.strictEqual(notifySent, true, 'notifyHomeInventoryPurchase should succeed');
  assert.strictEqual(dispatchedRequests.length, 1);

  const notifPayload = JSON.parse(dispatchedRequests[0].options.payload);
  console.log('--- Home Inventory Telegram Notification Message Preview ---');
  console.log(notifPayload.text);
  console.log('-----------------------------------------------------------');

  assert(notifPayload.text.includes('📥 *Stok Masuk (dari Financial Tracker)*'), 'Must have title');
  assert(notifPayload.text.includes('Beras Ramos (`P0001`)'), 'Must include product name & ID');
  assert(notifPayload.text.includes('• *Kategori:* Sembako'), 'Must include category');
  assert(notifPayload.text.includes('+2 kg'), 'Must include quantity added');
  assert(notifPayload.text.includes('• *Stok Sekarang:* *7 kg*'), 'Must include current stock');
  assert(notifPayload.text.includes('`IN_STOCK` ✅'), 'Must include status badge');
  assert(notifPayload.text.includes('Rp 50.000 (Rp 25.000/kg)'), 'Must include total and unit price');
  assert(notifPayload.text.includes('beli 2 beras 50k bca'), 'Must include source input note');

  console.log('✓ Home Inventory Purchase Notification Formatter PASSED!\n');

  // --- Test 4: End-to-End Trigger during syncInventoryPurchase ---
  console.log('Test 4: End-to-End Notification Trigger in syncInventoryPurchase...');
  dispatchedRequests.length = 0;

  // 4a. Inventory purchase -> should trigger notification
  const purchaseTrx = {
    transactionType: 'EXPENSE',
    amount: 30000,
    sourceInput: 'beli 1 liter minyak goreng 30k',
    description: 'minyak goreng',
    date: new Date()
  };

  const synced = sandbox.syncInventoryPurchase(purchaseTrx);
  assert(synced !== null, 'Purchase should be synced');
  assert.strictEqual(dispatchedRequests.length, 1, 'Should send notification to Home Inventory bot');

  const triggeredMsg = JSON.parse(dispatchedRequests[0].options.payload).text;
  assert(triggeredMsg.includes('Minyak Goreng Sania'), 'Message should feature Minyak Goreng');
  assert(triggeredMsg.includes('+1 liter'), 'Message should feature +1 liter');

  // 4b. Non-inventory expense -> should NOT trigger notification
  dispatchedRequests.length = 0;
  const nonInventoryTrx = {
    transactionType: 'EXPENSE',
    amount: 20000,
    sourceInput: 'beli bensin pertalite 20k',
    description: 'bensin',
    date: new Date()
  };

  const nonSynced = sandbox.syncInventoryPurchase(nonInventoryTrx);
  assert.strictEqual(nonSynced, null, 'Non-inventory should return null');
  assert.strictEqual(dispatchedRequests.length, 0, 'Non-inventory must NOT trigger notification');

  console.log('✓ End-to-End Trigger in syncInventoryPurchase PASSED!\n');

  // --- Test 5: Resilient Error Handling (Telegram Network Down) ---
  console.log('Test 5: Resilience when Telegram API fails...');
  sandbox.UrlFetchApp.fetch = () => {
    throw new Error('Network timeout connecting to api.telegram.org');
  };

  // Even if Telegram throws, syncInventoryPurchase should STILL succeed in saving to spreadsheet
  const resilientTrx = {
    transactionType: 'EXPENSE',
    amount: 50000,
    sourceInput: 'beli 2 beras 50k',
    description: 'beras',
    date: new Date()
  };

  const resilientResult = sandbox.syncInventoryPurchase(resilientTrx);
  assert(resilientResult !== null, 'Transaction must succeed even if notification fails');
  assert.strictEqual(resilientResult.product.productId, 'P0001');

  console.log('✓ Resilience on Telegram API failure PASSED!\n');

  console.log('ALL Home Inventory Telegram Notification Tests PASSED 100%!');
}

runNotificationTests();

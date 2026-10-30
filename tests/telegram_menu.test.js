/**
 * Test Suite: Telegram Bot Menu & Interactive Command Guide (Phase 4.4)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// 1. Setup Sandbox Environment
const sentTelegramMessages = [];
const calledTelegramApis = [];

const sandbox = {
  console,
  Date,
  Math,
  Number,
  String,
  Array,
  Object,
  RegExp,
  Set,
  parseInt,
  parseFloat,
  isNaN,
  Logger: { log: (msg) => console.log('  [GAS Logger]', msg) },
  Utilities: {
    formatDate: (d, tz, fmt) => '20261030-183000',
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
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (key) => {
        if (key === 'TELEGRAM_BOT_TOKEN') return 'TEST_TELEGRAM_TOKEN_123';
        return null;
      }
    })
  },
  UrlFetchApp: {
    fetch: (url, options) => {
      const payload = options && options.payload ? JSON.parse(options.payload) : {};
      calledTelegramApis.push({ url, method: options.method, payload });
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ ok: true, result: true })
      };
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
    if (param === 'Telegram Bot Token') return 'TEST_TELEGRAM_TOKEN_123';
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
loadScript('src/repositories/TelegramRepository.js');
loadScript('src/services/Transaction.js');
loadScript('src/services/Budget.js');
loadScript('src/services/Wallet.js');
loadScript('src/services/Dashboard.js');
loadScript('src/services/TelegramBot.js');
loadScript('src/services/BotCommands.js');

sandbox.sendTelegramMessage = (chatId, text) => {
  sentTelegramMessages.push({ chatId, text });
};

function runTelegramMenuTests() {
  console.log('Running Telegram Bot Menu & Interactive Command Guide Tests (Phase 4.4)...\n');

  // ==========================================
  // Test 1: getTelegramDefaultCommandsList Validation
  // ==========================================
  console.log('Test 1: Validating getTelegramDefaultCommandsList format...');
  const commands = sandbox.getTelegramDefaultCommandsList();
  assert.ok(Array.isArray(commands), 'Commands must be an array');
  assert.ok(commands.length >= 15, 'Must have at least 15 essential commands');

  // Validasi aturan Telegram Bot API:
  // - command: lowercase, numbers, underscores only, 1-32 chars, NO slash
  // - description: non-empty, max 256 chars
  commands.forEach(c => {
    assert.ok(typeof c.command === 'string' && c.command.length >= 1 && c.command.length <= 32, `Command "${c.command}" length must be 1-32 chars`);
    assert.ok(/^[a-z0-9_]+$/.test(c.command), `Command "${c.command}" must only contain lowercase alphanumeric and underscores`);
    assert.ok(!c.command.startsWith('/'), `Command "${c.command}" must not include leading slash`);
    assert.ok(typeof c.description === 'string' && c.description.trim().length > 0 && c.description.length <= 256, `Description for "${c.command}" must be 1-256 chars`);
  });

  const cmdNames = commands.map(c => c.command);
  assert.ok(cmdNames.includes('menu'), 'Must include menu');
  assert.ok(cmdNames.includes('saldo'), 'Must include saldo');
  assert.ok(cmdNames.includes('ringkasan'), 'Must include ringkasan');
  assert.ok(cmdNames.includes('budget'), 'Must include budget');
  assert.ok(cmdNames.includes('undo'), 'Must include undo');
  assert.ok(cmdNames.includes('koreksi'), 'Must include koreksi');
  assert.ok(cmdNames.includes('sesuaikan'), 'Must include sesuaikan');
  assert.ok(cmdNames.includes('bantuan'), 'Must include bantuan');

  console.log('✓ Test 1 PASSED: Command list conforms strictly to Telegram Bot API constraints!\n');

  // ==========================================
  // Test 2: syncTelegramBotCommands & setTelegramMyCommands
  // ==========================================
  console.log('Test 2: Testing setTelegramMyCommands & syncTelegramBotCommands API dispatch...');
  calledTelegramApis.length = 0;

  const syncResult = sandbox.syncTelegramBotCommands();
  assert.strictEqual(syncResult.ok, true, 'syncTelegramBotCommands must return ok true');
  assert.strictEqual(calledTelegramApis.length, 1, 'Should invoke Telegram API once');

  const apiCall = calledTelegramApis[0];
  assert.ok(apiCall.url.includes('/setMyCommands'), 'Must call setMyCommands endpoint');
  assert.ok(Array.isArray(apiCall.payload.commands), 'Payload must have commands array');
  assert.strictEqual(apiCall.payload.commands.length, commands.length);

  console.log('✓ Test 2 PASSED: Telegram setMyCommands payload successfully formed and dispatched!\n');

  // ==========================================
  // Test 3: /syncmenu Bot Command
  // ==========================================
  console.log('Test 3: Testing /syncmenu bot command...');
  const syncMenuRes = sandbox.handleSyncMenuCommand('12345678');
  assert.ok(syncMenuRes.includes('Berhasil Disinkronkan'), 'Response must confirm synchronization');
  console.log('✓ Test 3 PASSED: /syncmenu command confirmation verified!\n');

  // ==========================================
  // Test 4: /menu Bot Command (Quick Navigation)
  // ==========================================
  console.log('Test 4: Testing /menu bot command...');
  const menuRes = sandbox.handleMenuCommand('12345678');
  assert.ok(menuRes.includes('Menu Navigasi Cepat'), 'Menu title must appear');
  assert.ok(menuRes.includes('/saldo'), 'Must link to /saldo');
  assert.ok(menuRes.includes('/budget'), 'Must link to /budget');
  assert.ok(menuRes.includes('/undo'), 'Must link to /undo');
  assert.ok(menuRes.includes('/koreksi'), 'Must link to /koreksi');
  assert.ok(menuRes.includes('/ringkasan'), 'Must link to /ringkasan');
  assert.ok(menuRes.includes('/utang'), 'Must link to /utang');
  console.log('✓ Test 4 PASSED: /menu gives quick intuitive entry points!\n');

  // ==========================================
  // Test 5: /bantuan & /help Categorized Comprehensive Guide
  // ==========================================
  console.log('Test 5: Testing /bantuan structured categories & usage examples...');
  const helpRes = sandbox.handleHelpCommand();

  console.log('--- Help Preview (First 400 chars) ---');
  console.log(helpRes.substring(0, 400));
  console.log('--------------------------------------');

  // Periksa kategori utama
  assert.ok(helpRes.includes('1. Kas & Rekening'), 'Category 1 must be Kas & Rekening');
  assert.ok(helpRes.includes('2. Anggaran Belanja'), 'Category 2 must be Anggaran Belanja');
  assert.ok(helpRes.includes('3. Kategori Transaksi'), 'Category 3 must be Kategori Transaksi');
  assert.ok(helpRes.includes('4. Koreksi, Pembatalan & Selisih Fisik'), 'Category 4 must be Koreksi & Pembatalan');
  assert.ok(helpRes.includes('5. Riwayat & Laporan Keuangan'), 'Category 5 must be Riwayat & Laporan');
  assert.ok(helpRes.includes('6. Pinjaman & Cicilan'), 'Category 6 must be Pinjaman & Cicilan');
  assert.ok(helpRes.includes('7. Sistem & Menu'), 'Category 7 must be Sistem & Menu');

  // Periksa keberadaan perintah penting beserta contoh cara pakainya
  assert.ok(helpRes.includes('/saldo'), 'Must document /saldo');
  assert.ok(helpRes.includes('/tambahwallet Jago Bank 500k'), 'Must give /tambahwallet example');
  assert.ok(helpRes.includes('/budget Makanan & Minuman'), 'Must give /budget example');
  assert.ok(helpRes.includes('/setbudget Makanan & Minuman 1.5jt 80'), 'Must give /setbudget example');
  assert.ok(helpRes.includes('/undo'), 'Must document /undo');
  assert.ok(helpRes.includes('/koreksi nominal 50k'), 'Must give /koreksi example');
  assert.ok(helpRes.includes('/sesuaikan tunai 420k'), 'Must give /sesuaikan example');
  assert.ok(helpRes.includes('/hapustransaksi 2'), 'Must give /hapustransaksi example');

  console.log('✓ Test 5 PASSED: /bantuan displays comprehensive categorized guide with real examples!\n');

  // ==========================================
  // Test 6: /start Welcome & Onboarding
  // ==========================================
  console.log('Test 6: Testing /start command...');
  const startRes = sandbox.handleStartCommand('12345678');
  assert.ok(startRes.includes('Selamat Datang'), 'Must welcome the user');
  assert.ok(startRes.includes('/menu'), 'Must recommend /menu');
  assert.ok(startRes.includes('/bantuan'), 'Must recommend /bantuan');
  console.log('✓ Test 6 PASSED: /start provides clear orientation!\n');

  // ==========================================
  // Test 7: Dispatching via dispatchBotCommand
  // ==========================================
  console.log('Test 7: Dispatching commands through dispatchBotCommand...');
  sentTelegramMessages.length = 0;
  
  const dMenu = sandbox.dispatchBotCommand('/menu', '12345678');
  assert.strictEqual(dMenu.handled, true);
  assert.strictEqual(sentTelegramMessages.length, 1);
  assert.ok(sentTelegramMessages[0].text.includes('Menu Navigasi Cepat'));

  const dSync = sandbox.dispatchBotCommand('/syncmenu', '12345678');
  assert.strictEqual(dSync.handled, true);
  assert.strictEqual(sentTelegramMessages.length, 2);
  assert.ok(sentTelegramMessages[1].text.includes('Menu Telegram Berhasil Disinkronkan'));

  console.log('✓ Test 7 PASSED: dispatchBotCommand routes new commands seamlessly!\n');

  console.log('ALL Phase 4.4 Telegram Bot Menu & Interactive Command Guide Tests PASSED 100%! 🎉');
}

runTelegramMenuTests();

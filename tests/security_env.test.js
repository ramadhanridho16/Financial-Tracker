/**
 * Test Suite: Security, Environment Isolation & Gitignore Hardening (Phase 9.1)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { execSync } = require('child_process');

function runSecurityTests() {
  console.log('Running Security & Environment Isolation Tests (Phase 9.1)...\n');

  const rootDir = path.resolve(__dirname, '..');

  // ==========================================
  // Test 1: Scanning Source Code for Hardcoded Secrets
  // ==========================================
  console.log('Test 1: Scanning src/ directory for exposed tokens & hardcoded IDs...');
  
  function scanDir(dir) {
    let results = [];
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(scanDir(fullPath));
      } else if (f.endsWith('.js') || f.endsWith('.json')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const srcFiles = scanDir(path.join(rootDir, 'src'));
  const exposedPatterns = [
    /8627740740:AAEa2UbSqUqdGJI-msg9nW6qg9-V9pWzxu8/, // Previous exposed Telegram token
    /1agLINpK-XyW-_hG30XX7-Ce_6KSw90sNK_7IFjscGRU/ // Previous exposed Spreadsheet ID
  ];

  let violations = [];
  srcFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    exposedPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        violations.push({ file: path.relative(rootDir, file), match: pattern.toString() });
      }
    });
  });

  assert.strictEqual(violations.length, 0, 'Found hardcoded secrets in source files: ' + JSON.stringify(violations));
  console.log('✓ Test 1 PASSED: 0 hardcoded secrets found across ' + srcFiles.length + ' source files!\n');

  // ==========================================
  // Test 2: Gitignore Enforcement (.env vs .env.example vs .clasp.json)
  // ==========================================
  console.log('Test 2: Verifying .gitignore isolation rules...');

  // A. .env harus di-ignore
  const ignoreEnv = execSync('git check-ignore .env', { cwd: rootDir }).toString().trim();
  assert.strictEqual(ignoreEnv, '.env', '.env must be ignored by git');

  // B. .clasp.json harus di-ignore
  const ignoreClasp = execSync('git check-ignore .clasp.json', { cwd: rootDir }).toString().trim();
  assert.strictEqual(ignoreClasp, '.clasp.json', '.clasp.json must be ignored by git');

  // C. .env.example HARUS TIDAK di-ignore (bisa di-track git)
  let exampleIgnored = false;
  try {
    execSync('git check-ignore .env.example', { cwd: rootDir });
    exampleIgnored = true;
  } catch (e) {
    // git check-ignore returns exit code 1 if file is NOT ignored (which is what we want!)
    exampleIgnored = false;
  }
  assert.strictEqual(exampleIgnored, false, '.env.example must NOT be ignored by git');

  console.log('✓ Test 2 PASSED: .gitignore perfectly isolates .env while exposing .env.example!\n');

  // ==========================================
  // Test 3: Fallback Mechanism in Code (PropertiesService & Settings)
  // ==========================================
  console.log('Test 3: Testing dynamic secret resolution via PropertiesService and Settings...');

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
    Logger: { log: () => {} },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => {
          if (key === 'TELEGRAM_BOT_TOKEN') return 'RESOLVED_TOKEN_FROM_PROPERTIES';
          if (key === 'HOME_INVENTORY_SPREADSHEET_ID') return 'RESOLVED_ID_FROM_PROPERTIES';
          return null;
        }
      })
    },
    SpreadsheetApp: {
      openById: (id) => ({ id, name: 'Mock Spreadsheet' })
    },
    getSetting: () => null
  };

  vm.createContext(sandbox);

  function loadScript(relPath) {
    const fullPath = path.resolve(rootDir, relPath);
    let code = fs.readFileSync(fullPath, 'utf8');
    code = code.replace(/^const /gm, 'var ');
    vm.runInContext(code, sandbox, { filename: fullPath });
  }

  loadScript('src/config/Config.js');
  loadScript('src/core/Utilities.js');
  loadScript('src/repositories/TelegramRepository.js');
  loadScript('src/repositories/HomeInventory.js');

  // A. Verifikasi token Telegram dibaca dari PropertiesService saat Config kosong
  assert.strictEqual(sandbox.CONFIG.TELEGRAM.BOT_TOKEN, '', 'CONFIG BOT_TOKEN must be empty string');
  const token = sandbox.getTelegramBotToken();
  assert.strictEqual(token, 'RESOLVED_TOKEN_FROM_PROPERTIES', 'getTelegramBotToken must resolve from Script Properties');

  // B. Verifikasi ID Home Inventory dibaca dari PropertiesService saat Config kosong
  assert.strictEqual(sandbox.CONFIG.HOME_INVENTORY.SPREADSHEET_ID, '', 'CONFIG HOME_INVENTORY SPREADSHEET_ID must be empty string');
  const invId = sandbox.getHomeInventorySpreadsheetId();
  assert.strictEqual(invId, 'RESOLVED_ID_FROM_PROPERTIES', 'getHomeInventorySpreadsheetId must resolve from Script Properties');

  console.log('✓ Test 3 PASSED: Dynamic credential resolution functions properly without hardcoded secrets!\n');

  console.log('ALL Phase 9.1 Security & Environment Isolation Tests PASSED 100%! 🎉');
}

runSecurityTests();

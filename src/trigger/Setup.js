/**
 * ==========================================================
 * Financial Tracker Pro
 * Setup.gs
 * ----------------------------------------------------------
 * Membuat struktur Spreadsheet otomatis.
 * ==========================================================
 */

const SHEET_HEADERS = Object.freeze({
  [CONFIG.SHEETS.FORM_TRANSACTION]: [
    "Timestamp",
    "Tanggal",
    "Transaksi",
    "Catatan",
    "Bukti Invoice"
  ],
  [CONFIG.SHEETS.FORM_LOAN]: [
    "Timestamp",
    "Nama Pinjaman",
    "Pemberi Pinjaman",
    "Jenis Pinjaman",
    "Jumlah Pinjaman",
    "Wallet Pencairan",
    "Apakah ada bunga?",
    "Jenis Bunga",
    "Persentase Bunga",
    "Tanggal Mulai",
    "Lama Pinjaman",
    "Tanggal Jatuh Tempo",
    "Cicilan Sudah Diketahui?",
    "Nominal Cicilan",
    "Metode Pembayaran",
    "Wallet Pembayaran",
    "Tujuan Pinjaman",
    "Upload Kontrak",
    "Catatan"
  ],
  [CONFIG.SHEETS.TRANSACTIONS]: [
    "Timestamp",
    "Tanggal",
    "Jenis",
    "Wallet",
    "Wallet Tujuan",
    "Kategori",
    "Keterangan",
    "Nominal",
    "Catatan"
  ],
  [CONFIG.SHEETS.RECURRING_TRANSACTIONS]: [
    "Recurring ID",
    "Tanggal Mulai",
    "Frekuensi",
    "Wallet",
    "Wallet Tujuan",
    "Jenis",
    "Kategori",
    "Keterangan",
    "Nominal",
    "Catatan",
    "Aktif",
    "Next Run",
    "Last Run",
    "Created At",
    "Updated At"
  ],
  [CONFIG.SHEETS.DICTIONARY]: [
    "Keyword",
    "Kategori",
    "Subkategori",
    "Merchant",
    "Default Jenis"
  ],
  [CONFIG.SHEETS.WALLETS]: [
    "WalletID",
    "Nama",
    "Type",
    "Saldo Awal",
    "Aktif",
    "Saldo Saat Ini"
  ],
  [CONFIG.SHEETS.LOANS]: [
    "LoanID",
    "LoanName",
    "Lender",
    "LoanType",
    "Principal",
    "InterestType",
    "InterestRate",
    "StartDate",
    "DueDate",
    "InstallmentAmount",
    "InstallmentDay",
    "Status",
    "Notes"
  ],
  [CONFIG.SHEETS.BUDGET]: [
    "Budget ID",
    "Category",
    "Period Type",
    "Period Value",
    "Limit",
    "Warning",
    "Active",
    "Created At",
    "Updated At"
  ],
  [CONFIG.SHEETS.SETTINGS]: [
    "Parameter",
    "Nilai"
  ],
  [CONFIG.SHEETS.ARCHIVE_INDEX]: Object.keys(CONFIG.ARCHIVE.INDEX_HEADERS)
    .map(key => CONFIG.ARCHIVE.INDEX_HEADERS[key]),
  [CONFIG.SHEETS.DASHBOARD]: [
    "Metric",
    "Value"
  ],
  [CONFIG.SHEETS.REPORT]: [
    "Metric",
    "Value"
  ]
});

function onOpen() {

  SpreadsheetApp.getUi()
    .createMenu(CONFIG.APP.NAME)
    .addItem("Siapkan Spreadsheet", "setupSpreadsheet")
    .addItem("Siapkan Otomatisasi", "setupAutomation")
    .addItem("Pasang Trigger Form", "installFormSubmitTrigger")
    .addItem("Uji koneksi Home Inventory", "testHomeInventoryConnection")
    .addItem("Backup transaksi bulan lalu", "backupPreviousMonthTransactions")
    .addItem("Pasang backup Drive bulanan", "installMonthlyBackupTrigger")
    .addItem("Proses Transaksi Berulang", "processRecurringTransactions")
    .addItem("Proses Transaksi Pending", "parsePendingTransactions")
    .addItem("Klasifikasi Transaksi Lama", "classifyExistingTransactions")
    .addItem("Perbarui Saldo Wallet", "updateWalletBalances")
    .addItem("Perbarui Dashboard", "refreshDashboard")
    .addItem("Perbarui Report", "refreshReport")
    .addSeparator()
    .addItem("Atur Token Rahasia (Script Properties)", "setupSecretPropertiesPrompt")
    .addItem("Pasang Webhook Telegram", "setupTelegramWebhookPrompt")
    .addItem("Sinkronisasi Menu Perintah Telegram", "syncTelegramMenuPrompt")
    .addItem("Cek Status Webhook Telegram", "showTelegramWebhookStatus")
    .addItem("Uji Koneksi Bot Telegram", "testTelegramBotConnection")
    .addItem("Simulasi Pesan Teks Telegram", "testTelegramMessageSimulation")
    .addItem("Kirim Pengingat Cicilan Hari Ini", "sendDailyLoanDueReminders")
    .addItem("Pasang Pengingat Cicilan Harian", "installDailyLoanReminderTrigger")
    .addToUi();

}

function setupSpreadsheet() {

  const spreadsheet = getSpreadsheet();

  Object.keys(SHEET_HEADERS).forEach(sheetName => {
    const sheet = getOrCreateSheet(spreadsheet, sheetName);
    ensureHeader(sheet, SHEET_HEADERS[sheetName]);
  });

  seedSettings();
  seedWallets();
  seedDictionary();
  seedDashboard();
  ensureWalletBalanceColumn();
  ensureTransactionCategoryColumn();
  ensureTransactionTransferColumn();
  ensureParsingStatusColumns();
  ensureArchiveIndexSheet();
  installFormSubmitTrigger();
  installRecurringTransactionTrigger();
  installMonthlyBackupTrigger();

  return "Setup spreadsheet selesai.";

}

function setupAutomation() {

  ensureRecurringTransactionSheet();
  seedDictionary();
  ensureWalletBalanceColumn();
  ensureTransactionCategoryColumn();
  ensureTransactionTransferColumn();
  ensureParsingStatusColumns();
  ensureArchiveIndexSheet();
  installFormSubmitTrigger();
  installRecurringTransactionTrigger();
  installMonthlyBackupTrigger();

  return "Otomatisasi parsing berhasil disiapkan.";

}

/**
 * Memastikan sheet transaksi berulang tersedia untuk spreadsheet lama.
 *
 * @returns {void}
 */
function ensureRecurringTransactionSheet() {

  const spreadsheet = getSpreadsheet();
  const sheet = getOrCreateSheet(
    spreadsheet,
    CONFIG.SHEETS.RECURRING_TRANSACTIONS
  );

  ensureHeader(sheet, SHEET_HEADERS[CONFIG.SHEETS.RECURRING_TRANSACTIONS]);

}

/**
 * Memastikan sheet indeks arsip tersedia.
 *
 * @returns {void}
 */
function ensureArchiveIndexSheet() {

  const spreadsheet = getSpreadsheet();
  const sheet = getOrCreateSheet(spreadsheet, CONFIG.SHEETS.ARCHIVE_INDEX);

  ensureHeader(sheet, SHEET_HEADERS[CONFIG.SHEETS.ARCHIVE_INDEX]);

}

function ensureTransactionTransferColumn() {

  const sheet = getSheet(CONFIG.SHEETS.TRANSACTIONS);
  const headers = getHeaders(sheet);

  if (headers.indexOf("Wallet Tujuan") !== -1) {
    return;
  }

  const categoryIndex = headers.indexOf("Kategori");
  const insertBeforeColumn = categoryIndex === -1
    ? sheet.getLastColumn() + 1
    : categoryIndex + 1;

  sheet.insertColumnBefore(insertBeforeColumn);
  sheet.getRange(1, insertBeforeColumn).setValue("Wallet Tujuan");

}

function ensureTransactionCategoryColumn() {

  const sheet = getSheet(CONFIG.SHEETS.TRANSACTIONS);
  const headers = getHeaders(sheet);

  if (headers.indexOf("Kategori") !== -1) {
    return;
  }

  const descriptionIndex = headers.indexOf("Keterangan");
  const insertBeforeColumn = descriptionIndex === -1
    ? sheet.getLastColumn() + 1
    : descriptionIndex + 1;

  sheet.insertColumnBefore(insertBeforeColumn);
  sheet.getRange(1, insertBeforeColumn).setValue("Kategori");

}

function ensureParsingStatusColumns() {

  const sheet = getTransactionFormSheet();

  ensureColumns(sheet, [
    "Parsing Status",
    "Parsed At",
    "Transaction Row",
    "Parsing Error",
    "Parsing Debug"
  ]);

}

function getTransactionFormSheet() {

  const spreadsheet = getSpreadsheet();
  const names = [
    CONFIG.SHEETS.FORM_TRANSACTION,
    "Form Response - Transactions",
    "Form_Responses"
  ];

  for (const name of names) {
    const sheet = spreadsheet.getSheetByName(name);
    if (sheet) return sheet;
  }

  return getOrCreateSheet(spreadsheet, CONFIG.SHEETS.FORM_TRANSACTION);

}

function ensureColumns(sheet, headers) {

  const existing = getHeaders(sheet);

  headers.forEach(header => {
    if (existing.indexOf(header) === -1) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      existing.push(header);
    }
  });

}

function installFormSubmitTrigger() {

  const spreadsheet = getSpreadsheet();
  const triggers = ScriptApp.getProjectTriggers();

  triggers
    .filter(trigger =>
      trigger.getHandlerFunction() === "onFormSubmit" &&
      trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT
    )
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));

  ScriptApp
    .newTrigger("onFormSubmit")
    .forSpreadsheet(spreadsheet)
    .onFormSubmit()
    .create();

  return "Trigger onFormSubmit berhasil dipasang.";

}

/**
 * Memasang satu trigger harian untuk transaksi berulang.
 *
 * @returns {String}
 */
function installRecurringTransactionTrigger() {

  const triggers = ScriptApp.getProjectTriggers();

  triggers
    .filter(trigger =>
      trigger.getHandlerFunction() === "processRecurringTransactions" &&
      trigger.getEventType() === ScriptApp.EventType.CLOCK
    )
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));

  ScriptApp
    .newTrigger("processRecurringTransactions")
    .timeBased()
    .everyDays(1)
    .atHour(1)
    .create();

  return "Trigger transaksi berulang berhasil dipasang.";

}

/**
 * Memasang satu trigger backup transaksi setiap awal bulan.
 *
 * @returns {String}
 */
function installMonthlyBackupTrigger() {

  const triggers = ScriptApp.getProjectTriggers();

  triggers
    .filter(trigger =>
      trigger.getHandlerFunction() === "backupPreviousMonthTransactions" &&
      trigger.getEventType() === ScriptApp.EventType.CLOCK
    )
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));

  ScriptApp
    .newTrigger("backupPreviousMonthTransactions")
    .timeBased()
    .onMonthDay(1)
    .atHour(3)
    .create();

  return "Trigger backup Drive bulanan berhasil dipasang.";

}

/**
 * Memasang satu trigger harian untuk pengingat jatuh tempo cicilan jam 08:00 WIB.
 *
 * @returns {String}
 */
function installDailyLoanReminderTrigger() {
  const triggers = ScriptApp.getProjectTriggers();

  triggers
    .filter(trigger =>
      trigger.getHandlerFunction() === "sendDailyLoanDueReminders" &&
      trigger.getEventType() === ScriptApp.EventType.CLOCK
    )
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));

  ScriptApp
    .newTrigger("sendDailyLoanDueReminders")
    .timeBased()
    .atHour(8)
    .everyDays(1)
    .create();

  return "Trigger pengingat cicilan harian berhasil dipasang pada jam 08:00 WIB.";
}

function getOrCreateSheet(spreadsheet, sheetName) {

  return spreadsheet.getSheetByName(sheetName) ||
    spreadsheet.insertSheet(sheetName);

}

function ensureHeader(sheet, headers) {

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return;
  }

  const existing = sheet
    .getRange(1, 1, 1, headers.length)
    .getValues()[0];

  const isEmptyHeader = existing.every(isEmpty);

  if (isEmptyHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }

}

function seedSettings() {

  const sheet = getSheet(CONFIG.SHEETS.SETTINGS);

  if (!getSetting("Default Wallet")) {
    sheet.appendRow(["Default Wallet", CONFIG.DEFAULT.WALLET]);
  }

}

function seedWallets() {

  if (getWalletByName(CONFIG.DEFAULT.WALLET)) {
    return;
  }

  const sheet = getSheet(CONFIG.SHEETS.WALLETS);

  sheet.appendRow([
    "W002",
    CONFIG.DEFAULT.WALLET,
    "Bank",
    0,
    true
  ]);

}

function seedDictionary() {

  const sheet = getSheet(CONFIG.SHEETS.DICTIONARY);
  const values = sheet.getDataRange().getValues();
  const hasPindahBuku = values.some(row =>
    normalizeText(row[0]) === "pindah buku" ||
    normalizeText(row[0]) === "transfer"
  );

  if (hasPindahBuku) {
    return;
  }

  sheet.appendRow([
    "pindah buku",
    "Pindah Buku",
    "Transfer Wallet",
    "-",
    CONFIG.TRANSACTION_TYPE.TRANSFER
  ]);

  sheet.appendRow([
    "transfer",
    "Pindah Buku",
    "Transfer Wallet",
    "-",
    CONFIG.TRANSACTION_TYPE.TRANSFER
  ]);

}

function seedDashboard() {

  const sheet = getSheet(CONFIG.SHEETS.DASHBOARD);

  if (sheet.getLastRow() > 1) {
    return;
  }

  sheet.getRange(2, 1, 10, 1).setValues([
    ["Periode Bulan Ini"],
    ["Pemasukan Bulan Ini"],
    ["Pengeluaran Bulan Ini"],
    ["Tabungan Bulan Ini"],
    ["Total Uang Saat Ini"],
    ["Total Pemasukan Semua Waktu"],
    ["Total Pengeluaran Semua Waktu"],
    ["Total Transaksi"],
    ["Kategori Pengeluaran Terbesar"],
    ["Last Refreshed"]
  ]);

}

/**
 * Meminta Web App URL dari pengguna dan mendaftarkannya ke Telegram Bot Webhook.
 */
function setupTelegramWebhookPrompt() {
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt(
    "Pasang Webhook Telegram",
    "Masukkan Web App URL (Deploy > Web app):\nContoh: https://script.google.com/macros/s/.../exec",
    ui.ButtonSet.OK_CANCEL
  );

  if (prompt.getSelectedButton() !== ui.Button.OK) return;

  const url = prompt.getResponseText().trim();
  if (!url || !url.startsWith("https://")) {
    ui.alert("URL tidak valid. Pastikan diawali dengan https://");
    return;
  }

  const result = setTelegramWebhook(url);
  if (result.ok) {
    try {
      syncTelegramBotCommands();
    } catch (e) {
      Logger.log("Info: Sinkronisasi menu bot otomatis terlewat: " + e.message);
    }
    ui.alert("Berhasil!", "Webhook Telegram & Menu Perintah berhasil dipasang ke:\n" + url, ui.ButtonSet.OK);
  } else {
    ui.alert("Gagal!", "Error: " + result.description, ui.ButtonSet.OK);
  }
}

/**
 * Menyinkronkan daftar perintah bot ke Telegram API secara manual via menu spreadsheet.
 */
function syncTelegramMenuPrompt() {
  const ui = SpreadsheetApp.getUi();
  try {
    const res = syncTelegramBotCommands();
    if (res && res.ok) {
      ui.alert("Berhasil!", "Daftar perintah bot (setMyCommands) berhasil diperbarui di Telegram.\nPengguna kini dapat melihat menu otomatis saat mengetik '/' di Telegram.", ui.ButtonSet.OK);
    } else {
      ui.alert("Gagal!", "Telegram API Error: " + (res ? res.description : "Tidak ada respon"), ui.ButtonSet.OK);
    }
  } catch (err) {
    ui.alert("Error!", err.message, ui.ButtonSet.OK);
  }
}

/**
 * Menampilkan status Webhook Telegram aktif.
 */
function showTelegramWebhookStatus() {
  const ui = SpreadsheetApp.getUi();
  const info = getTelegramWebhookInfo();

  if (!info.ok) {
    ui.alert("Gagal mengambil status: " + (info.description || "Unknown error"));
    return;
  }

  const res = info.result;
  const msg = "• Status URL: " + (res.url || "(Belum terpasang)") + "\n" +
    "• Pending Updates: " + (res.pending_update_count || 0) + "\n" +
    "• Last Error Date: " + (res.last_error_date ? new Date(res.last_error_date * 1000) : "None") + "\n" +
    "• Last Error Message: " + (res.last_error_message || "None");

  ui.alert("Status Webhook Telegram", msg, ui.ButtonSet.OK);
}

/**
 * Menguji koneksi bot ke Telegram API.
 */
function testTelegramBotConnection() {
  const ui = SpreadsheetApp.getUi();
  try {
    const info = callTelegramApi("getMe");
    if (info.ok) {
      ui.alert("Koneksi Berhasil!", "Bot: @" + info.result.username + " (" + info.result.first_name + ")", ui.ButtonSet.OK);
    } else {
      ui.alert("Koneksi Gagal: " + info.description);
    }
  } catch (err) {
    ui.alert("Error: " + err.message);
  }
}

/**
 * Menyimulasikan input transaksi pesan teks layaknya dari Telegram.
 */
function testTelegramMessageSimulation() {
  const ui = SpreadsheetApp.getUi();
  const sim = simulateTelegramMessage("Makan siang 25k bca");
  ui.alert("Simulasi Transaksi Selesai", "Status: " + JSON.stringify(sim), ui.ButtonSet.OK);
}

/**
 * Meminta pengguna memasukkan token atau konfigurasi rahasia untuk disimpan ke Script Properties.
 * Kredensial tidak tersimpan di kode sumber sehingga aman saat di-upload ke GitHub.
 */
function setupSecretPropertiesPrompt() {
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt(
    "Atur Token Telegram Bot",
    "Masukkan Token Bot Telegram dari @BotFather:\n(Disimpan aman di Script Properties, tidak akan terekspos ke GitHub)",
    ui.ButtonSet.OK_CANCEL
  );

  if (prompt.getSelectedButton() !== ui.Button.OK) return;

  const token = prompt.getResponseText().trim();
  if (!token) {
    ui.alert("Batal", "Token tidak boleh kosong.", ui.ButtonSet.OK);
    return;
  }

  PropertiesService.getScriptProperties().setProperty("TELEGRAM_BOT_TOKEN", token);
  ui.alert("Berhasil!", "Token Telegram Bot berhasil disimpan ke Script Properties secara aman.", ui.ButtonSet.OK);
}



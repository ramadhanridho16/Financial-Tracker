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
    "Loan ID",
    "Loan Name",
    "Lender",
    "Loan Type",
    "Principal",
    "Wallet",
    "Has Interest",
    "Interest Type",
    "Interest Rate",
    "Start Date",
    "Tenor",
    "Due Day",
    "Installment Known",
    "Installment Amount",
    "Payment Method",
    "Payment Wallet",
    "Purpose",
    "Attachment",
    "Note",
    "Status",
    "Created At",
    "Updated At"
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

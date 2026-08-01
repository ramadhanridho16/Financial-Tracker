/**
 * ==========================================================
 * Financial Tracker Pro
 * RecurringTransaction.gs
 * ----------------------------------------------------------
 * Mengelola jadwal dan pencatatan transaksi berulang.
 * ==========================================================
 */

/**
 * Posisi kolom transaksi berulang.
 */
const RECURRING_TRANSACTION_COLUMN = Object.freeze({
  ID: 0,
  START_DATE: 1,
  FREQUENCY: 2,
  WALLET_NAME: 3,
  TARGET_WALLET_NAME: 4,
  TRANSACTION_TYPE: 5,
  CATEGORY: 6,
  DESCRIPTION: 7,
  AMOUNT: 8,
  NOTE: 9,
  ACTIVE: 10,
  NEXT_RUN: 11,
  LAST_RUN: 12,
  CREATED_AT: 13,
  UPDATED_AT: 14
});

/**
 * Membuat jadwal transaksi berulang.
 *
 * @param {Object} recurringTransaction
 * @returns {String}
 */
function createRecurringTransaction(recurringTransaction) {

  validateRecurringTransaction(recurringTransaction);

  const sheet = getSheet(CONFIG.SHEETS.RECURRING_TRANSACTIONS);
  const recurringId = generateId(
    CONFIG.ID_PREFIX.RECURRING_TRANSACTION,
    CONFIG.SHEETS.RECURRING_TRANSACTIONS,
    RECURRING_TRANSACTION_COLUMN.ID + 1
  );
  const startDate = getRecurringDate(recurringTransaction.startDate);
  const now = new Date();

  sheet.appendRow([
    recurringId,
    startDate,
    recurringTransaction.frequency,
    recurringTransaction.walletName,
    recurringTransaction.targetWalletName || "",
    recurringTransaction.transactionType,
    recurringTransaction.category || CONFIG.DEFAULT.CATEGORY,
    recurringTransaction.description || "",
    Number(recurringTransaction.amount),
    recurringTransaction.note || "",
    recurringTransaction.active !== false,
    startDate,
    "",
    now,
    now
  ]);

  return recurringId;

}

/**
 * Mengambil seluruh jadwal transaksi berulang.
 *
 * @returns {Array<Object>}
 */
function getRecurringTransactions() {

  const sheet = getSheet(CONFIG.SHEETS.RECURRING_TRANSACTIONS);
  const values = sheet.getDataRange().getValues();

  values.shift();

  return values
    .filter(row => row[RECURRING_TRANSACTION_COLUMN.ID])
    .map(mapRecurringTransaction);

}

/**
 * Memproses seluruh jadwal aktif yang sudah jatuh tempo.
 *
 * @param {Date=} referenceDate
 * @returns {Number}
 */
function processRecurringTransactions(referenceDate) {

  const lock = LockService.getScriptLock();

  if (!lock.tryLock(1000)) {
    return 0;
  }

  try {
    const today = getRecurringDate(referenceDate || new Date());
    let processed = 0;

    getRecurringTransactions()
      .filter(recurringTransaction => recurringTransaction.active)
      .forEach(recurringTransaction => {
        while (isRecurringTransactionDue(recurringTransaction, today)) {
          saveTransaction(createRecurringTransactionOccurrence(recurringTransaction));
          updateRecurringTransactionRun(recurringTransaction);
          recurringTransaction.lastRun = recurringTransaction.nextRun;
          recurringTransaction.nextRun = getNextRecurringRun(
            recurringTransaction.nextRun,
            recurringTransaction.frequency
          );
          processed++;
        }
      });

    if (processed > 0) {
      updateWalletBalances();
    }

    return processed;
  } finally {
    lock.releaseLock();
  }

}

/**
 * Mengubah satu baris sheet menjadi objek transaksi berulang.
 *
 * @param {Array} row
 * @returns {Object}
 */
function mapRecurringTransaction(row) {

  return {
    recurringId: row[RECURRING_TRANSACTION_COLUMN.ID],
    startDate: row[RECURRING_TRANSACTION_COLUMN.START_DATE],
    frequency: row[RECURRING_TRANSACTION_COLUMN.FREQUENCY],
    walletName: row[RECURRING_TRANSACTION_COLUMN.WALLET_NAME],
    targetWalletName: row[RECURRING_TRANSACTION_COLUMN.TARGET_WALLET_NAME],
    transactionType: row[RECURRING_TRANSACTION_COLUMN.TRANSACTION_TYPE],
    category: row[RECURRING_TRANSACTION_COLUMN.CATEGORY],
    description: row[RECURRING_TRANSACTION_COLUMN.DESCRIPTION],
    amount: Number(row[RECURRING_TRANSACTION_COLUMN.AMOUNT]),
    note: row[RECURRING_TRANSACTION_COLUMN.NOTE],
    active: row[RECURRING_TRANSACTION_COLUMN.ACTIVE] === true ||
      row[RECURRING_TRANSACTION_COLUMN.ACTIVE] === 1,
    nextRun: row[RECURRING_TRANSACTION_COLUMN.NEXT_RUN],
    lastRun: row[RECURRING_TRANSACTION_COLUMN.LAST_RUN],
    createdAt: row[RECURRING_TRANSACTION_COLUMN.CREATED_AT],
    updatedAt: row[RECURRING_TRANSACTION_COLUMN.UPDATED_AT]
  };

}

/**
 * Memvalidasi data yang dibutuhkan untuk jadwal transaksi berulang.
 *
 * @param {Object} recurringTransaction
 */
function validateRecurringTransaction(recurringTransaction) {

  if (!recurringTransaction) {
    throw new Error("Transaksi berulang kosong.");
  }

  if (!recurringTransaction.walletName) {
    throw new Error("Wallet transaksi berulang wajib diisi.");
  }

  if (!recurringTransaction.transactionType) {
    throw new Error("Jenis transaksi berulang wajib diisi.");
  }

  if (Number(recurringTransaction.amount) <= 0) {
    throw new Error("Nominal transaksi berulang harus lebih dari nol.");
  }

  getRecurringDate(recurringTransaction.startDate);
  validateRecurringFrequency(recurringTransaction.frequency);

}

/**
 * Memastikan frekuensi yang digunakan didukung.
 *
 * @param {String} frequency
 */
function validateRecurringFrequency(frequency) {

  const frequencies = Object.keys(CONFIG.RECURRENCE_FREQUENCY)
    .map(key => CONFIG.RECURRENCE_FREQUENCY[key]);

  if (frequencies.indexOf(frequency) === -1) {
    throw new Error("Frekuensi transaksi berulang tidak valid.");
  }

}

/**
 * Membuat objek transaksi untuk satu kejadian jadwal.
 *
 * @param {Object} recurringTransaction
 * @returns {Object}
 */
function createRecurringTransactionOccurrence(recurringTransaction) {

  return {
    timestamp: new Date(),
    date: recurringTransaction.nextRun,
    transactionType: recurringTransaction.transactionType,
    walletName: recurringTransaction.walletName,
    targetWalletName: recurringTransaction.targetWalletName,
    category: recurringTransaction.category,
    description: recurringTransaction.description,
    amount: recurringTransaction.amount,
    note: recurringTransaction.note
  };

}

/**
 * Menentukan apakah jadwal sudah harus dicatat.
 *
 * @param {Object} recurringTransaction
 * @param {Date} referenceDate
 * @returns {Boolean}
 */
function isRecurringTransactionDue(recurringTransaction, referenceDate) {

  return getRecurringDate(recurringTransaction.nextRun).getTime() <=
    getRecurringDate(referenceDate).getTime();

}

/**
 * Menyimpan tanggal proses terbaru dan jadwal berikutnya.
 *
 * @param {Object} recurringTransaction
 */
function updateRecurringTransactionRun(recurringTransaction) {

  const sheet = getSheet(CONFIG.SHEETS.RECURRING_TRANSACTIONS);
  const values = sheet.getDataRange().getValues();
  const nextRun = getNextRecurringRun(
    recurringTransaction.nextRun,
    recurringTransaction.frequency
  );

  for (let row = 1; row < values.length; row++) {
    if (values[row][RECURRING_TRANSACTION_COLUMN.ID] === recurringTransaction.recurringId) {
      sheet.getRange(
        row + 1,
        RECURRING_TRANSACTION_COLUMN.NEXT_RUN + 1,
        1,
        4
      ).setValues([[
        nextRun,
        recurringTransaction.nextRun,
        values[row][RECURRING_TRANSACTION_COLUMN.CREATED_AT],
        new Date()
      ]]);
      return;
    }
  }

  throw new Error("Jadwal transaksi berulang tidak ditemukan.");

}

/**
 * Menghitung tanggal kejadian berikutnya dari jadwal yang sudah diproses.
 *
 * @param {Date} currentRun
 * @param {String} frequency
 * @returns {Date}
 */
function getNextRecurringRun(currentRun, frequency) {

  const nextRun = getRecurringDate(currentRun);

  if (frequency === CONFIG.RECURRENCE_FREQUENCY.WEEKLY) {
    nextRun.setDate(nextRun.getDate() + 7);
    return nextRun;
  }

  if (frequency === CONFIG.RECURRENCE_FREQUENCY.MONTHLY) {
    return addRecurringMonth(nextRun);
  }

  throw new Error("Frekuensi transaksi berulang tidak valid.");

}

/**
 * Menambah satu bulan sambil mempertahankan hari akhir bulan bila diperlukan.
 *
 * @param {Date} date
 * @returns {Date}
 */
function addRecurringMonth(date) {

  const day = date.getDate();
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const lastDay = new Date(
    nextMonth.getFullYear(),
    nextMonth.getMonth() + 1,
    0
  ).getDate();

  nextMonth.setDate(Math.min(day, lastDay));

  return nextMonth;

}

/**
 * Mengubah nilai menjadi tanggal lokal tanpa komponen waktu.
 *
 * @param {Date|String} value
 * @returns {Date}
 */
function getRecurringDate(value) {

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    throw new Error("Tanggal transaksi berulang tidak valid.");
  }

  date.setHours(0, 0, 0, 0);

  return date;

}

/**
 * Backup transaksi ke Google Drive dalam format CSV ZIP.
 */

/**
 * Membuat backup transaksi untuk bulan kalender sebelumnya.
 *
 * @returns {Object}
 */
function backupPreviousMonthTransactions() {

  const period = getPreviousArchivePeriod(new Date());
  const existing = getTransactionArchiveRecord(period.id);

  if (existing) {
    return { status: "Skipped", periodId: period.id, reason: "Backup sudah ada." };
  }

  const data = getTransactionsForArchive(period);

  if (!data.rows.length) {
    return { status: "Skipped", periodId: period.id, reason: "Tidak ada transaksi." };
  }

  const fileName = CONFIG.ARCHIVE.FILE_PREFIX + "-" + period.id;
  const file = saveTransactionArchiveFile(fileName, createArchiveCsv(data));
  const result = saveCompletedTransactionArchive(period, data.rows.length, file);

  Logger.log("Backup selesai: " + result.fileUrl);
  return result;

}

/**
 * Menghasilkan periode satu bulan sebelum tanggal acuan.
 *
 * @param {Date} referenceDate
 * @returns {Object}
 */
function getPreviousArchivePeriod(referenceDate) {

  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);

  return {
    id: Utilities.formatDate(start, Session.getScriptTimeZone(), "yyyy-MM"),
    start: start,
    end: end
  };

}

/**
 * Menyimpan catatan backup yang telah selesai.
 *
 * @param {Object} period
 * @param {Number} rowCount
 * @param {Object} file
 * @returns {Object}
 */
function saveCompletedTransactionArchive(period, rowCount, file) {

  const result = {
    archiveId: "ARC-" + period.id,
    periodId: period.id,
    rowCount: rowCount,
    fileId: file.fileId,
    fileUrl: file.fileUrl,
    backedUpAt: new Date(),
    status: "Verified"
  };

  saveTransactionArchiveRecord(result);
  return result;

}

/**
 * Mengubah header dan baris transaksi menjadi CSV.
 *
 * @param {Object} data
 * @returns {String}
 */
function createArchiveCsv(data) {

  return [data.headers]
    .concat(data.rows)
    .map(row => row.map(formatArchiveCsvCell).join(","))
    .join("\r\n");

}

/**
 * Memformat satu nilai menjadi sel CSV yang aman.
 *
 * @param {*} value
 * @returns {String}
 */
function formatArchiveCsvCell(value) {

  const text = value instanceof Date
    ? Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
    : String(value === null || value === undefined ? "" : value);

  return "\"" + text.replace(/\"/g, "\"\"") + "\"";

}

/**
 * Mengecek apakah tanggal transaksi masuk ke periode arsip.
 *
 * @param {*} value
 * @param {Object} period
 * @returns {Boolean}
 */
function isArchiveDateInPeriod(value, period) {

  const date = parseArchiveDate(value);

  return date && date >= period.start && date < period.end;

}

/**
 * Mengubah nilai tanggal sheet menjadi Date.
 *
 * @param {*} value
 * @returns {Date|null}
 */
function parseArchiveDate(value) {

  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  const match = String(value || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);

  return match
    ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
    : null;

}

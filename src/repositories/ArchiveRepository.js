/**
 * Akses arsip transaksi di Spreadsheet dan Google Drive.
 */

/**
 * Mengambil seluruh data transaksi untuk satu periode arsip.
 *
 * @param {Object} period
 * @returns {Object}
 */
function getTransactionsForArchive(period) {

  const sheet = getSheet(CONFIG.SHEETS.TRANSACTIONS);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const dateColumn = headers.indexOf(CONFIG.ARCHIVE.TRANSACTION_DATE_HEADER);

  if (dateColumn < 0) {
    throw new Error("Kolom tanggal tidak ditemukan pada Transactions.");
  }

  return {
    headers: headers,
    rows: values.filter(row => isArchiveDateInPeriod(row[dateColumn], period))
  };

}

/**
 * Mengambil catatan arsip yang sudah tersimpan untuk periode tertentu.
 *
 * @param {String} periodId
 * @returns {Object|null}
 */
function getTransactionArchiveRecord(periodId) {

  const sheet = getSheet(CONFIG.SHEETS.ARCHIVE_INDEX);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const periodColumn = headers.indexOf(CONFIG.ARCHIVE.INDEX_HEADERS.PERIOD);

  return values
    .filter(row => row[periodColumn] === periodId)
    .map(row => createTransactionArchiveRecord(headers, row))[0] || null;

}

/**
 * Menyimpan catatan keberhasilan backup ke indeks arsip.
 *
 * @param {Object} record
 * @returns {Number}
 */
function saveTransactionArchiveRecord(record) {

  const sheet = getSheet(CONFIG.SHEETS.ARCHIVE_INDEX);

  sheet.appendRow([
    record.archiveId,
    record.periodId,
    CONFIG.SHEETS.TRANSACTIONS,
    record.rowCount,
    record.fileId,
    record.fileUrl,
    record.backedUpAt,
    record.status
  ]);

  return sheet.getLastRow();

}

/**
 * Menyimpan konten CSV sebagai ZIP pada folder backup Google Drive.
 *
 * @param {String} fileName
 * @param {String} csv
 * @returns {Object}
 */
function saveTransactionArchiveFile(fileName, csv) {

  const csvBlob = Utilities.newBlob(csv, MimeType.CSV, fileName + ".csv");
  const zipFile = getTransactionArchiveFolder()
    .createFile(Utilities.zip([csvBlob], fileName + ".zip"));

  return {
    fileId: zipFile.getId(),
    fileUrl: zipFile.getUrl()
  };

}

/**
 * Mengambil atau membuat folder backup utama pada Google Drive.
 *
 * @returns {GoogleAppsScript.Drive.Folder}
 */
function getTransactionArchiveFolder() {

  if (CONFIG.ARCHIVE.DRIVE_FOLDER_ID) {
    return DriveApp.getFolderById(CONFIG.ARCHIVE.DRIVE_FOLDER_ID);
  }

  const folders = DriveApp.getFoldersByName(CONFIG.ARCHIVE.DRIVE_FOLDER_NAME);

  return folders.hasNext()
    ? folders.next()
    : DriveApp.createFolder(CONFIG.ARCHIVE.DRIVE_FOLDER_NAME);

}

/**
 * Membentuk objek catatan arsip dari satu baris sheet indeks.
 *
 * @param {Array<String>} headers
 * @param {Array<*>} row
 * @returns {Object}
 */
function createTransactionArchiveRecord(headers, row) {

  return headers.reduce((record, header, index) => {
    record[header] = row[index];
    return record;
  }, {});

}

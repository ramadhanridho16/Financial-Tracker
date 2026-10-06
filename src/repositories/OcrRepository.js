/**
 * ==========================================================
 * Financial Tracker Pro
 * OcrRepository.gs
 * ----------------------------------------------------------
 * Penyimpanan Gambar Struk & Ekstraksi Teks via Google Drive OCR
 * ==========================================================
 */

/**
 * Mengambil atau membuat folder penyimpanan bukti struk di Google Drive.
 *
 * @returns {GoogleAppsScript.Drive.Folder}
 */
function getReceiptsFolder() {
  const folderName = CONFIG.TELEGRAM.RECEIPTS_FOLDER_NAME;
  const folders = DriveApp.getFoldersByName(folderName);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
}

/**
 * Menyimpan gambar struk ke Google Drive dan mengembalikan URL file.
 *
 * @param {GoogleAppsScript.Base.Blob} imageBlob
 * @param {String} [fileName]
 * @returns {Object}
 */
function saveReceiptImageToDrive(imageBlob, fileName) {
  const folder = getReceiptsFolder();
  const name = fileName || ("receipt_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss") + ".jpg");
  const file = folder.createFile(imageBlob.setName(name));

  return {
    fileId: file.getId(),
    fileUrl: file.getUrl()
  };
}

/**
 * Mengekstrak teks dari gambar menggunakan Google Drive OCR REST API.
 *
 * @param {GoogleAppsScript.Base.Blob} imageBlob
 * @returns {String}
 */
function extractTextFromImageBlob(imageBlob) {
  try {
    return extractTextViaDriveApi(imageBlob);
  } catch (error) {
    logError("OCR Drive API Error: " + error.message);
    return "";
  }
}

/**
 * Melakukan panggilan OCR ke Drive REST API menggunakan multipart upload.
 *
 * @param {GoogleAppsScript.Base.Blob} imageBlob
 * @returns {String}
 */
function extractTextViaDriveApi(imageBlob) {
  const boundary = "-------" + Utilities.getUuid();
  const delimiter = "\r\n--" + boundary + "\r\n";
  const closeDelimiter = "\r\n--" + boundary + "--";

  const metadata = JSON.stringify({
    title: "temp_ocr_" + Utilities.getUuid(),
    mimeType: imageBlob.getContentType()
  });

  const payload = Utilities.newBlob(
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    metadata +
    delimiter +
    "Content-Type: " + imageBlob.getContentType() + "\r\n" +
    "Content-Transfer-Encoding: base64\r\n\r\n"
  ).getBytes()
  .concat(Utilities.newBlob(Utilities.base64Encode(imageBlob.getBytes())).getBytes())
  .concat(Utilities.newBlob(closeDelimiter).getBytes());

  const url = "https://www.googleapis.com/upload/drive/v2/files?uploadType=multipart&ocr=true&ocrLanguage=id";
  const options = {
    method: "post",
    contentType: "multipart/related; boundary=" + boundary,
    payload: payload,
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    throw new Error("Gagal OCR Drive: " + response.getContentText());
  }

  const result = JSON.parse(response.getContentText());
  return readAndCleanupOcrDoc(result.id);
}

/**
 * Membaca isi teks dokumen hasil OCR lalu menghapus file sementara.
 *
 * @param {String} fileId
 * @returns {String}
 */
function readAndCleanupOcrDoc(fileId) {
  try {
    const doc = DocumentApp.openById(fileId);
    const text = doc.getBody().getText();
    DriveApp.getFileById(fileId).setTrashed(true);
    return text;
  } catch (err) {
    logError("Gagal membaca dokumen OCR sementara: " + err.message);
    return "";
  }
}


/**
 * ==========================================================
 * Financial Tracker Pro
 * OcrService.gs
 * ----------------------------------------------------------
 * Layanan pemrosesan struk belanja menggunakan OCR
 * Bertindak sebagai Adaptor sebelum masuk ke Parser utama
 * ==========================================================
 */

/**
 * Memproses gambar struk belanja menjadi transaksi lengkap.
 *
 * @param {GoogleAppsScript.Base.Blob} imageBlob
 * @param {String} [defaultWallet]
 * @returns {Object}
 */
function processReceiptImage(imageBlob, defaultWallet) {
  const driveFile = saveReceiptImageToDrive(imageBlob);
  const rawText = extractTextFromImageBlob(imageBlob);

  if (!rawText || rawText.trim() === "") {
    return {
      success: false,
      message: "Teks struk tidak terbaca atau gambar terlalu buram.",
      fileUrl: driveFile.fileUrl
    };
  }

  const extracted = parseReceiptTextDetails(rawText);
  const transactionSentence = buildTransactionSentenceFromReceipt(extracted, defaultWallet);
  const parsedTransaction = parseTransaction({
    date: extracted.date || new Date(),
    input: transactionSentence,
    sourceInput: transactionSentence,
    note: "OCR: " + extracted.merchant,
    attachment: driveFile.fileUrl
  });

  parsedTransaction.attachment = driveFile.fileUrl;
  const rowNumber = saveTransaction(parsedTransaction);
  updateWalletBalances();
  refreshDashboard();
  syncInventoryPurchases([parsedTransaction]);

  return {
    success: true,
    transaction: parsedTransaction,
    rowNumber: rowNumber,
    fileUrl: driveFile.fileUrl,
    merchant: extracted.merchant,
    amount: parsedTransaction.amount
  };
}

/**
 * Mengekstrak informasi penting (nominal total, merchant, tanggal) dari teks mentah OCR.
 *
 * @param {String} text
 * @returns {Object}
 */
function parseReceiptTextDetails(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const merchant = extractMerchantFromLines(lines);
  const amount = extractTotalAmountFromLines(lines);
  const date = extractDateFromText(text);

  return {
    merchant: merchant,
    amount: amount,
    date: date
  };
}

/**
 * Mengidentifikasi nama merchant atau toko dari baris teratas struk.
 *
 * @param {Array<String>} lines
 * @returns {String}
 */
function extractMerchantFromLines(lines) {
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    if (line.length > 2 && !line.match(/struk|invoice|nota|kasir|tanggal|table|nomor|receipt/i)) {
      return line.replace(/[^a-zA-Z0-9\s]/g, "").trim();
    }
  }
  return "Struk Belanja";
}

/**
 * Mencari nominal total belanja dari teks baris struk.
 *
 * @param {Array<String>} lines
 * @returns {Number}
 */
function extractTotalAmountFromLines(lines) {
  const totalKeywords = [/total\s*bayar/i, /grand\s*total/i, /^total/i, /subtotal/i, /tagihan/i, /jumlah/i];

  for (const regex of totalKeywords) {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (regex.test(lines[i])) {
        const found = lines[i].match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d+)/);
        if (found) {
          const num = parseNumber(found[0]);
          if (num > 0) return num;
        }
      }
    }
  }

  return extractLargestNumberFromLines(lines);
}

/**
 * Mencari angka rasional terbesar sebagai fallback nominal total.
 *
 * @param {Array<String>} lines
 * @returns {Number}
 */
function extractLargestNumberFromLines(lines) {
  let maxAmount = 0;
  for (const line of lines) {
    const matches = line.match(/\b\d{1,3}(?:[.,]\d{3})+\b/g);
    if (matches) {
      matches.forEach(m => {
        const val = parseNumber(m);
        if (val > maxAmount && val < 50000000) maxAmount = val;
      });
    }
  }
  return maxAmount;
}

/**
 * Mengekstrak tanggal transaksi dari teks struk jika tersedia.
 *
 * @param {String} text
 * @returns {Date}
 */
function extractDateFromText(text) {
  const match = text.match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/);
  if (!match) return new Date();

  let year = Number(match[3]);
  if (year < 100) year += 2000;
  const month = Number(match[2]) - 1;
  const day = Number(match[1]);
  const date = new Date(year, month, day);

  return isNaN(date.getTime()) ? new Date() : date;
}

/**
 * Membentuk kalimat input transaksi alami dari hasil ekstraksi OCR.
 *
 * @param {Object} extracted
 * @param {String} [defaultWallet]
 * @returns {String}
 */
function buildTransactionSentenceFromReceipt(extracted, defaultWallet) {
  const wallet = defaultWallet || CONFIG.DEFAULT.WALLET;
  const amountStr = extracted.amount > 0 ? String(extracted.amount) : "0";
  return extracted.merchant + " " + amountStr + " " + wallet;
}


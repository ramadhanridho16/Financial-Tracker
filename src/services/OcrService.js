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
 * Memproses citra struk menggunakan Google Drive OCR dan mengekstrak data terstruktur untuk verifikasi.
 *
 * @param {GoogleAppsScript.Base.Blob} imageBlob
 * @returns {Object}
 */
function parseReceiptImageWithOcr(imageBlob) {
  const rawText = extractTextFromImageBlob(imageBlob);
  if (!rawText || rawText.trim() === "") {
    throw new Error("Teks struk tidak terbaca atau gambar terlalu buram.");
  }

  const extracted = parseReceiptTextDetails(rawText);
  return {
    merchant: extracted.merchant,
    amount: extracted.amount,
    category: extracted.category || CONFIG.DEFAULT.CATEGORY,
    date: extracted.date ? Utilities.formatDate(extracted.date, "Asia/Jakarta", "yyyy-MM-dd") : Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd"),
    rawText: rawText
  };
}

/**
 * Membentuk kartu tampilan konfirmasi verifikasi struk belanja berbasis OCR untuk Telegram.
 *
 * @param {Object} parsedReceipt
 * @param {String} [fileUrl]
 * @param {String} [walletName]
 * @returns {String}
 */
function formatOcrReceiptVerificationCard(parsedReceipt, fileUrl, walletName) {
  const defaultWallet = walletName || CONFIG.DEFAULT.WALLET;
  const safeMerchant = String(parsedReceipt.merchant || "Merchant Belanja").replace(/[*_`\[\]]/g, "");
  const safeCategory = String(parsedReceipt.category || CONFIG.DEFAULT.CATEGORY).replace(/[*_`\[\]]/g, "");
  const safeWallet = String(defaultWallet).replace(/[*_`\[\]]/g, "");

  let text = "🧾 *Hasil Pindaian Struk (OCR)*\n";
  text += "--------------------------------------------------\n";
  text += "• *Merchant:* " + safeMerchant + "\n";
  text += "• *Total Belanja:* *" + formatCurrency(parsedReceipt.amount) + "*\n";
  text += "• *Kategori:* " + safeCategory + "\n";
  text += "• *Wallet:* " + safeWallet + "\n";

  if (fileUrl) {
    text += "• *Bukti Struk:* [Buka Gambar](" + fileUrl + ")\n";
  }

  text += "--------------------------------------------------\n";
  text += "❓ *1. Apakah sudah benar data yang dimasukkan?*\n";
  text += "👉 Balas *YA* untuk langsung menyimpan data di atas ke sheet Transactions.\n";
  text += "👉 Jika TIDAK / nominal berbeda, berapa nominal yang dikeluarkan? *(Ketik nominal koreksi, contoh: `34rb` atau `34000`)*\n\n";
  text += "📝 *2. Keterangan / Nama Transaksi:*\n";
  text += "👉 Anda juga bisa langsung mengetik nama transaksi untuk kolom keterangan sekaligus dompet *(contoh: `Kopi susu 34k bca` atau `Belanja bulanan`)*\n\n";
  text += "👉 Balas *BATAL* untuk membatalkan.";

  return text;
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

  let category = CONFIG.DEFAULT.CATEGORY;
  try {
    const dict = getDictionary();
    const searchMerchant = (merchant || "").toLowerCase();
    const found = dict.find(d => searchMerchant.indexOf(d.keyword) !== -1 || (d.merchant && searchMerchant.indexOf(d.merchant.toLowerCase()) !== -1));
    if (found && found.category) {
      category = found.category;
    }
  } catch (e) {
    // fallback default
  }

  return {
    merchant: merchant,
    amount: amount,
    category: category,
    date: date
  };
}

/**
 * Mengidentifikasi nama merchant atau toko dari teks struk.
 *
 * @param {Array<String>} lines
 * @returns {String}
 */
function extractMerchantFromLines(lines) {
  // Cek kata kunci merchant populer
  for (const line of lines.slice(0, 8)) {
    if (line.match(/indomaret/i)) return "Indomaret";
    if (line.match(/alfamart/i)) return "Alfamart";
    if (line.match(/alfamidi/i)) return "Alfamidi";
    if (line.match(/tahan\s*banting/i)) return "Tahan Banting Coffee";
    if (line.match(/kopi|coffee|cafe|warung|resto|bakso|mie/i)) {
      const clean = line.replace(/[^a-zA-Z0-9\s]/g, "").trim();
      if (clean.length > 3) return clean;
    }
  }

  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    if (line.length > 2 && !line.match(/struk|invoice|nota|kasir|tanggal|table|nomor|receipt|pt\.|selamat/i)) {
      return line.replace(/[^a-zA-Z0-9\s]/g, "").trim();
    }
  }
  return "Struk Belanja";
}

function extractTotalAmountFromLines(lines) {
  // 1. Prioritas Utama: "Total Belanja", "Grand Total", "Total Bayar"
  const highPriorityKeywords = [/total\s*belanja/i, /total\s*bayar/i, /grand\s*total/i, /tagihan/i];
  for (const regex of highPriorityKeywords) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (regex.test(line) && !line.match(/voucher|diskon|hemat/i)) {
        const found = parseAmountFromLineWithContext(line);
        if (found > 0) return found;
      }
    }
  }

  // 2. Prioritas Menengah: "Total", "Subtotal", "Jumlah" (tangani Total (2) atau teks oklusi)
  const mediumPriorityKeywords = [/^total/i, /total/i, /subtotal/i, /jumlah/i];
  for (const regex of mediumPriorityKeywords) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      // Lewati baris tunai, kembali, voucher, atau hemat
      if (line.match(/tunai|kembali|cash|change|voucher|hemat/i)) continue;

      if (regex.test(line)) {
        const found = parseAmountFromLineWithContext(line);
        if (found > 0) return found;
      }
    }
  }

  // 3. Fallback: Cari angka rasional terbesar di atas Rp 1.000
  return extractLargestNumberFromLines(lines);
}

/**
 * Mengekstrak nominal dari satu baris struk dengan memperhatikan konteks quantity dalam kurung.
 * Contoh: "Total (2)  34.000" -> mengambil 34000, bukan 2.
 *
 * @param {String} line
 * @returns {Number}
 */
function parseAmountFromLineWithContext(line) {
  // Buang angka dalam kurung seperti (2) atau (3) agar tidak dianggap nominal
  const cleaned = line.replace(/\(\s*\d{1,2}\s*\)/g, " ");
  // Cari semua kelompok angka
  const matches = cleaned.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?|\d{4,})/g);
  if (!matches) return 0;

  // Ambil angka terakhir di baris (karena angka nominal selalu di paling kanan)
  for (let k = matches.length - 1; k >= 0; k--) {
    const val = parseNumber(matches[k]);
    if (val >= 100 && val < 500000000) {
      return val;
    }
  }
  return 0;
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


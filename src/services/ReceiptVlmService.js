/**
 * ==========================================================
 * Financial Tracker Pro
 * ReceiptVlmService.gs
 * ----------------------------------------------------------
 * Layanan Pemrosesan Struk Kasir Menggunakan Vision-Language Model
 * Penalaran Semantik Visual, Rekonstruksi Oklusi & Verifikasi
 * ==========================================================
 */

/**
 * Membentuk instruksi prompt semantik khusus struk kasir Indonesia.
 *
 * @returns {String}
 */
function buildReceiptVlmPrompt() {
  return "Anda adalah asisten auditor keuangan profesional yang bertugas menganalisis citra struk kasir/belanja Indonesia secara holistik.\n" +
    "ATURAN KRUSIAL PENALARAN STRUK:\n" +
    "1. Pahami tata letak visual struk secara menyeluruh (bukan hanya OCR teks acak).\n" +
    "2. PERHATIKAN: Angka di dalam kurung setelah kata 'Total' atau 'Subtotal' (misalnya 'Total (2)') adalah JUMLAH ITEM (quantity) dan BUKAN NOMINAL RUPIAH. Nominal total selalu berupa angka mata uang di sebelah kanan baris tersebut.\n" +
    "3. VALIDASI ARITMATIKA SILANG: Hitung kembali `qty × harga per unit == total baris item`. Jumlahkan seluruh baris item dan bandingkan dengan Subtotal dan Total.\n" +
    "4. REKONSTRUKSI TEKS TERTUTUP (OCCLUSION): Jika sebagian teks tertutup jempol/jari atau lipatan kertas (seperti '...total' atau '...al (2)'), gunakan konteks baris item dan angka untuk menyimpulkan nilai Total secara tepat.\n" +
    "5. EKSTRAKSI FIELD:\n" +
    "   - merchant: Nama toko/restoran/usaha yang menerbitkan struk.\n" +
    "   - totalAmount: Nominal rupiah akhir yang wajib dibayar (angka bulat murni tanpa titik/koma).\n" +
    "   - subtotal: Nominal sebelum pajak/diskon jika ada.\n" +
    "   - items: Daftar array objek { name, qty, price, total }.\n" +
    "   - date: Tanggal transaksi format YYYY-MM-DD jika terbaca, atau null.\n" +
    "   - category: Kategori belanja (misal: 'Makanan & Minuman', 'Transportasi', 'Belanja', 'Kebutuhan Rumah', 'Kesehatan', 'Lainnya').\n" +
    "   - notes: Catatan ringkas (metode bayar, no struk, atau kasir).\n\n" +
    "Kembalikan HANYA JSON murni sesuai skema di atas tanpa pembungkus markdown tambahan.";
}

/**
 * Memproses citra struk menggunakan model VLM Gemini.
 *
 * @param {GoogleAppsScript.Base.Blob} imageBlob
 * @returns {Object}
 */
function parseReceiptImageWithVlm(imageBlob) {
  const prompt = buildReceiptVlmPrompt();
  const rawData = callGeminiVisionApi(imageBlob, prompt);

  if (!rawData || typeof rawData !== "object") {
    throw new Error("Gagal membaca struktur data struk dari model VLM.");
  }

  const amount = Math.round(Number(rawData.totalAmount) || 0);
  if (amount <= 0 && rawData.items && rawData.items.length > 0) {
    // Rekonsiliasi darurat jika total 0 namun item tersedia
    const sumItems = rawData.items.reduce((s, it) => s + (Number(it.total) || 0), 0);
    rawData.totalAmount = sumItems;
  }

  const matchedCategory = mapVlmCategoryToDictionary(rawData.category, rawData.merchant);

  return {
    merchant: rawData.merchant || "Merchant Belanja",
    amount: Math.round(Number(rawData.totalAmount) || 0),
    subtotal: Math.round(Number(rawData.subtotal) || 0),
    items: Array.isArray(rawData.items) ? rawData.items : [],
    category: matchedCategory,
    date: rawData.date || Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd"),
    notes: rawData.notes || "",
    raw: rawData
  };
}

/**
 * Memetakan kategori hasil deteksi VLM ke kategori resmi di sheet Dictionary.
 *
 * @param {String} vlmCategory
 * @param {String} merchant
 * @returns {String}
 */
function mapVlmCategoryToDictionary(vlmCategory, merchant) {
  const dict = getDictionary();
  const searchMerchant = (merchant || "").toLowerCase();

  const foundByMerchant = dict.find(d => searchMerchant.indexOf(d.keyword) !== -1 || (d.merchant && searchMerchant.indexOf(d.merchant.toLowerCase()) !== -1));
  if (foundByMerchant && foundByMerchant.category) {
    return foundByMerchant.category;
  }

  const foundByCategory = dict.find(d => d.category.toLowerCase() === String(vlmCategory || "").toLowerCase());
  if (foundByCategory && foundByCategory.category) {
    return foundByCategory.category;
  }

  return vlmCategory || CONFIG.DEFAULT.CATEGORY;
}

/**
 * Membentuk kartu tampilan konfirmasi verifikasi struk belanja untuk Telegram.
 *
 * @param {Object} parsedReceipt
 * @param {String} [fileUrl]
 * @param {String} [walletName]
 * @returns {String}
 */
function formatReceiptVerificationCard(parsedReceipt, fileUrl, walletName) {
  const defaultWallet = walletName || CONFIG.DEFAULT.WALLET;
  let text = "🧾 *Hasil Pindaian Struk (Gemini VLM)*\n";
  text += "--------------------------------------------------\n";
  text += "• *Merchant:* " + parsedReceipt.merchant + "\n";
  text += "• *Total Belanja:* *" + formatCurrency(parsedReceipt.amount) + "*\n";
  text += "• *Kategori:* " + parsedReceipt.category + "\n";
  text += "• *Wallet:* " + defaultWallet + "\n";

  if (parsedReceipt.items && parsedReceipt.items.length > 0) {
    text += "• *Rincian Item:*\n";
    parsedReceipt.items.slice(0, 5).forEach(it => {
      text += "  - " + (it.qty ? it.qty + "x " : "") + it.name + " (" + formatCurrency(it.total || it.price) + ")\n";
    });
    if (parsedReceipt.items.length > 5) {
      text += "  - _...dan " + (parsedReceipt.items.length - 5) + " item lainnya_\n";
    }
  }

  if (fileUrl) {
    text += "• *Bukti Struk:* [Buka Gambar](" + fileUrl + ")\n";
  }

  text += "--------------------------------------------------\n";
  text += "⚠️ *Apakah data di atas sudah benar?*\n\n";
  text += "👉 Balas *YA* untuk mencatat ke sheet Transactions\n";
  text += "👉 Balas *TIDAK* untuk membatalkan\n";
  text += "👉 Atau ketik koreksi langsung _(misal: `" + formatCurrency(parsedReceipt.amount) + " bca` atau `34rb bca`)_";

  return text;
}

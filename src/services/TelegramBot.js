/**
 * ==========================================================
 * Financial Tracker Pro
 * TelegramBot.gs
 * ----------------------------------------------------------
 * Service Pengelola Interaksi & Perintah Telegram Bot
 * ==========================================================
 */

/**
 * Memproses update payload dari Telegram Webhook.
 *
 * @param {Object} update
 * @returns {Object}
 */
function handleTelegramUpdate(update) {
  if (!update || !update.message) {
    return { status: "ignored", reason: "no message object" };
  }

  const msg = update.message;
  const chatId = msg.chat.id;
  const userId = msg.from ? msg.from.id : chatId;

  if (!isTelegramUserAuthorized(userId)) {
    sendTelegramMessage(chatId, "⛔ *Akses Ditolak*\nID Telegram Anda (`" + userId + "`) belum diizinkan untuk mengakses keuangan ini.");
    return { status: "unauthorized", userId: userId };
  }

  if (msg.photo && msg.photo.length > 0) {
    return handleTelegramPhotoMessage(msg, chatId);
  }

  if (msg.text) {
    return handleTelegramTextMessage(msg.text.trim(), chatId);
  }

  return { status: "unsupported_media" };
}

/**
 * Mengecek apakah User ID Telegram terdaftar dalam whitelist otorisasi.
 *
 * @param {String|Number} userId
 * @returns {Boolean}
 */
function isTelegramUserAuthorized(userId) {
  const allowedSetting = getSetting("Telegram Allowed User ID");
  const propAllowed = PropertiesService.getScriptProperties().getProperty("TELEGRAM_ALLOWED_USER_ID");
  const configList = CONFIG.TELEGRAM.ALLOWED_USER_IDS || [];

  const allAllowed = []
    .concat(allowedSetting ? String(allowedSetting).split(",") : [])
    .concat(propAllowed ? String(propAllowed).split(",") : [])
    .concat(configList.map(String))
    .map(id => id.trim())
    .filter(id => id.length > 0);

  if (allAllowed.length === 0) {
    return true; // Jika whitelist kosong, izinkan pemilik awal
  }

  return allAllowed.indexOf(String(userId)) !== -1;
}

/**
 * Menangani pesan teks, baik berupa perintah (slash command) maupun transaksi.
 *
 * @param {String} text
 * @param {String|Number} chatId
 * @returns {Object}
 */
function handleTelegramTextMessage(text, chatId) {
  const lower = text.toLowerCase();

  if (lower === "/start" || lower === "/bantuan" || lower === "/help") {
    sendTelegramMessage(chatId, getTelegramHelpMessage());
    return { status: "help_sent" };
  }

  if (lower === "/saldo" || lower === "/wallet") {
    sendTelegramMessage(chatId, getTelegramWalletBalancesMessage());
    return { status: "balance_sent" };
  }

  if (lower === "/ringkasan" || lower === "/dashboard") {
    sendTelegramMessage(chatId, getTelegramDashboardSummaryMessage());
    return { status: "dashboard_sent" };
  }

  if (lower === "/ping") {
    sendTelegramMessage(chatId, "🏓 *Pong!*\nSistem Financial Tracker aktif dan tersambung.");
    return { status: "pong" };
  }

  return processTelegramTransactionInput(text, chatId);
}

/**
 * Memproses kalimat transaksi bahasa alami dan mengirimkan pesan konfirmasi.
 *
 * @param {String} text
 * @param {String|Number} chatId
 * @returns {Object}
 */
function processTelegramTransactionInput(text, chatId) {
  try {
    const normalized = normalizeTransactionInput(text);
    const sourceInputs = splitTransactionInput(text);
    const transactions = splitTransactionInput(normalized).map((input, idx) => parseTransaction({
      date: new Date(),
      input: input,
      sourceInput: sourceInputs[idx] || input,
      note: "Via Telegram Bot"
    }));

    transactions.forEach(saveTransaction);
    syncInventoryPurchases(transactions);
    updateWalletBalances();
    refreshDashboard();

    const reply = formatTelegramTransactionReceipt(transactions);
    sendTelegramMessage(chatId, reply);
    return { status: "success", count: transactions.length };
  } catch (err) {
    sendTelegramMessage(chatId, "⚠️ *Gagal Mencatat Transaksi*\n" + err.message + "\n\nKetik `/bantuan` untuk melihat contoh format.");
    return { status: "error", error: err.message };
  }
}

/**
 * Menangani pesan foto struk belanja melalui OCR.
 *
 * @param {Object} msg
 * @param {String|Number} chatId
 * @returns {Object}
 */
function handleTelegramPhotoMessage(msg, chatId) {
  try {
    sendTelegramMessage(chatId, "⏳ _Sedang memindai struk belanja dengan OCR..._");
    const photo = msg.photo[msg.photo.length - 1];
    const fileInfo = getTelegramFile(photo.file_id);

    if (!fileInfo || !fileInfo.result) {
      throw new Error("Gagal mengambil file foto dari Telegram.");
    }

    const blob = downloadTelegramFileBlob(fileInfo.result.file_path);
    const result = processReceiptImage(blob);

    if (!result.success) {
      sendTelegramMessage(chatId, "⚠️ *OCR Gagal*\n" + result.message);
      return { status: "ocr_failed" };
    }

    const reply = "🧾 *Struk Belanja Berhasil Dicatat!*\n" +
      "• *Merchant:* " + result.merchant + "\n" +
      "• *Nominal:* " + formatCurrency(result.amount) + "\n" +
      "• *Kategori:* " + result.transaction.category + "\n" +
      "• *Wallet:* " + result.transaction.walletName + "\n" +
      "• *Bukti File:* [Buka Gambar](" + result.fileUrl + ")\n\n" +
      "📊 _Dashboard & Saldo telah diperbarui._";

    sendTelegramMessage(chatId, reply);
    return { status: "ocr_success", amount: result.amount };
  } catch (err) {
    sendTelegramMessage(chatId, "⚠️ *Terjadi Kesalahan OCR*\n" + err.message);
    return { status: "ocr_error", error: err.message };
  }
}

/**
 * Membentuk teks bukti pencatatan transaksi untuk pesan balasan Telegram.
 *
 * @param {Array<Object>} transactions
 * @returns {String}
 */
function formatTelegramTransactionReceipt(transactions) {
  let reply = "✅ *Transaksi Berhasil Dicatat!*\n\n";

  transactions.forEach((t, i) => {
    reply += (transactions.length > 1 ? "*" + (i + 1) + ".* " : "") +
      "• *Jenis:* " + t.transactionType + "\n" +
      "• *Nominal:* " + formatCurrency(t.amount) + "\n" +
      "• *Kategori:* " + t.category + "\n" +
      "• *Wallet:* " + t.walletName + (t.targetWalletName ? " ➔ " + t.targetWalletName : "") + "\n" +
      "• *Keterangan:* " + (t.description || "-") + "\n\n";
  });

  const wallet = getWalletByName(transactions[0].walletName);
  if (wallet) {
    const balances = getWalletBalances();
    const wb = balances.find(b => b.walletName === wallet.walletName);
    if (wb) {
      reply += "💳 *Sisa Saldo " + wb.walletName + ":* " + formatCurrency(wb.balance) + "\n";
    }
  }

  reply += "📊 _Dashboard & Saldo telah otomatis diperbarui._";
  return reply;
}

/**
 * Menghasilkan pesan panduan penggunaan bot.
 *
 * @returns {String}
 */
function getTelegramHelpMessage() {
  return "🤖 *Financial Tracker Bot Assistant*\n\n" +
    "Kirim kalimat transaksi apa saja secara alami atau kirimkan foto struk kasir:\n\n" +
    "📝 *Contoh Transaksi:*\n" +
    "• `Makan siang 35k bca`\n" +
    "• `Beli bensin 50rb bri`\n" +
    "• `Gaji bulanan 10jt mandiri`\n" +
    "• `Transfer bca ke jago 200rb`\n" +
    "• `Beli kopi 25rb, bayar parkir 5rb bri`\n\n" +
    "📸 *Struk Belanja:* Cukup kirimkan foto struk, OCR akan mengekstrak totalnya otomatis.\n\n" +
    "⚡ *Perintah Cepat:*\n" +
    "• `/saldo` — Cek saldo seluruh wallet\n" +
    "• `/ringkasan` — Ringkasan konsumsi bulan ini\n" +
    "• `/ping` — Uji koneksi bot";
}

/**
 * Menghasilkan pesan daftar saldo seluruh dompet aktif.
 *
 * @returns {String}
 */
function getTelegramWalletBalancesMessage() {
  const balances = getWalletBalances();
  const total = getTotalWalletBalance();
  let text = "💳 *Daftar Saldo Wallet Aktif:*\n\n";

  balances.forEach(w => {
    text += "• *" + w.walletName + "* (" + w.walletType + "): " + formatCurrency(w.balance) + "\n";
  });

  text += "\n💰 *Total Saldo Keseluruhan:* " + formatCurrency(total);
  return text;
}

/**
 * Menghasilkan ringkasan ringkas Dashboard bulanan untuk Telegram.
 *
 * @returns {String}
 */
function getTelegramDashboardSummaryMessage() {
  const summary = getDashboardSummary();
  return "📊 *Ringkasan Keuangan Bulanan*\n" +
    "📅 Periode: `" + summary.currentPeriod + "`\n\n" +
    "• *Pemasukan Bulan Ini:* " + formatCurrency(summary.monthIncome) + "\n" +
    "• *Pengeluaran Bulan Ini:* " + formatCurrency(summary.monthExpense) + "\n" +
    "• *Tabungan Bulan Ini:* " + formatCurrency(summary.monthSaving) + "\n" +
    "• *Kategori Terboros:* " + (summary.monthTopCategory || "-") + "\n\n" +
    "💳 *Total Uang Saat Ini:* " + formatCurrency(summary.totalWalletBalance);
}

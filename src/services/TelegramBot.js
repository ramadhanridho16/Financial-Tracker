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

  if (update.update_id) {
    const cache = CacheService.getScriptCache();
    const cacheKey = "tg_update_" + update.update_id;
    if (cache.get(cacheKey)) {
      return { status: "ignored", reason: "duplicate_update" };
    }
    cache.put(cacheKey, "1", 600);
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
    return handleTelegramTextMessage(msg.text.trim(), chatId, update);
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
 * @param {Object} [update]
 * @returns {Object}
 */
function handleTelegramTextMessage(text, chatId, update) {
  const pendingReceipt = getPendingReceiptVerification(chatId);
  if (pendingReceipt) {
    const handledReceipt = handleReceiptVerificationResponse(text, chatId, pendingReceipt);
    if (handledReceipt.handled) {
      return handledReceipt;
    }
  }

  if (isLoanWizardActive(chatId)) {
    if (text.startsWith("/") && text.toLowerCase() !== "/batal") {
      clearLoanWizardState(chatId);
    } else {
      const wizardReply = handleLoanWizardStep(chatId, text);
      sendTelegramMessage(chatId, wizardReply);
      return { status: "loan_wizard_progress" };
    }
  }

  if (text.startsWith("/")) {
    const cmdResult = dispatchBotCommand(text, chatId, update);
    if (cmdResult.handled) {
      return cmdResult;
    }
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

    const newlyPaidLoans = syncAllLoansSettlement();
    let reply = formatTelegramTransactionReceipt(transactions);

    if (newlyPaidLoans && newlyPaidLoans.length > 0) {
      newlyPaidLoans.forEach(l => {
        reply += "\n\n🎉 *PINJAMAN LUNAS!*\nPinjaman *" + l.loanName + "* (`" + l.loanId + "`) telah lunas terbayar!";
      });
    }

    sendTelegramMessage(chatId, reply);
    return { status: "success", count: transactions.length, newlyPaidLoans: newlyPaidLoans.length };
  } catch (err) {
    sendTelegramMessage(chatId, "⚠️ *Gagal Mencatat Transaksi*\n" + err.message + "\n\nKetik `/bantuan` untuk melihat contoh format.");
    return { status: "error", error: err.message };
  }
}

/**
 * Menangani pesan foto struk belanja menggunakan Gemini VLM.
 *
 * @param {Object} msg
 * @param {String|Number} chatId
 * @returns {Object}
 */
function handleTelegramPhotoMessage(msg, chatId) {
  try {
    const photo = msg.photo[msg.photo.length - 1];
    const fileInfo = getTelegramFile(photo.file_id);

    if (!fileInfo || !fileInfo.result) {
      throw new Error("Gagal mengambil file foto dari Telegram.");
    }

    sendTelegramMessage(chatId, "🔍 _Menganalisis struk belanja dengan Gemini VLM..._");
    const blob = downloadTelegramFileBlob(fileInfo.result.file_path);
    const driveFile = saveReceiptImageToDrive(blob);

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      sendTelegramMessage(chatId, "⚠️ *Gemini API Key Belum Terpasang*\n" +
        "Untuk membaca struk kasir cerdas (VLM), pasang API Key Anda terlebih dahulu:\n" +
        "`/setgeminikey <API_KEY_ANDA>`\n\n" +
        "_Dapatkan API Key gratis di:_ aistudio.google.com");
      return { status: "missing_gemini_key" };
    }

    const parsedReceipt = parseReceiptImageWithVlm(blob);
    const draft = {
      receipt: parsedReceipt,
      fileUrl: driveFile.fileUrl,
      walletName: CONFIG.DEFAULT.WALLET,
      chatId: chatId,
      timestamp: Date.now()
    };

    setPendingReceiptVerification(chatId, draft);
    const cardMsg = formatReceiptVerificationCard(parsedReceipt, driveFile.fileUrl, draft.walletName);
    sendTelegramMessage(chatId, cardMsg);

    return { status: "receipt_verification_pending", amount: parsedReceipt.amount };
  } catch (err) {
    logError("Error handleTelegramPhotoMessage: " + err.message);
    sendTelegramMessage(chatId, "⚠️ *Gagal Menganalisis Struk*\n" + err.message);
    return { status: "vlm_error", error: err.message };
  }
}

/**
 * Mengambil draft struk yang menunggu verifikasi dari cache.
 *
 * @param {String|Number} chatId
 * @returns {Object|null}
 */
function getPendingReceiptVerification(chatId) {
  const cache = CacheService.getScriptCache();
  const raw = cache.get("pending_receipt_" + chatId);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Menyimpan draft struk ke cache untuk verifikasi (TTL 15 menit).
 *
 * @param {String|Number} chatId
 * @param {Object} draft
 */
function setPendingReceiptVerification(chatId, draft) {
  const cache = CacheService.getScriptCache();
  cache.put("pending_receipt_" + chatId, JSON.stringify(draft), 900);
}

/**
 * Menghapus draft struk dari cache.
 *
 * @param {String|Number} chatId
 */
function clearPendingReceiptVerification(chatId) {
  const cache = CacheService.getScriptCache();
  cache.remove("pending_receipt_" + chatId);
}

/**
 * Memproses respons verifikasi pengguna untuk draft struk belanja.
 *
 * @param {String} text
 * @param {String|Number} chatId
 * @param {Object} draft
 * @returns {Object}
 */
function handleReceiptVerificationResponse(text, chatId, draft) {
  const upper = text.trim().toUpperCase();

  if (upper === "YA" || upper === "Y") {
    return confirmAndSaveReceiptTransaction(draft, chatId);
  }

  if (upper === "TIDAK" || upper === "BATAL" || upper === "/BATAL") {
    clearPendingReceiptVerification(chatId);
    sendTelegramMessage(chatId, "❌ *Pencatatan struk dibatalkan.*\nData tidak disimpan ke spreadsheet.");
    return { handled: true, status: "receipt_cancelled" };
  }

  if (text.startsWith("/")) {
    clearPendingReceiptVerification(chatId);
    return { handled: false };
  }

  return correctAndSaveReceiptTransaction(draft, text.trim(), chatId);
}

/**
 * Menyimpan transaksi struk yang telah dikonfirmasi 'YA'.
 *
 * @param {Object} draft
 * @param {String|Number} chatId
 * @returns {Object}
 */
function confirmAndSaveReceiptTransaction(draft, chatId) {
  clearPendingReceiptVerification(chatId);

  const tx = {
    date: draft.receipt.date ? new Date(draft.receipt.date) : new Date(),
    transactionType: CONFIG.TRANSACTION_TYPE.EXPENSE,
    walletName: draft.walletName || CONFIG.DEFAULT.WALLET,
    category: draft.receipt.category || CONFIG.DEFAULT.CATEGORY,
    description: "Belanja di " + draft.receipt.merchant,
    amount: draft.receipt.amount,
    note: "VLM Receipt: " + (draft.fileUrl || "")
  };

  saveTransaction(tx);
  syncInventoryPurchases([tx]);
  updateWalletBalances();
  refreshDashboard();

  const reply = "✅ *Struk Belanja Berhasil Dicatat!*\n\n" +
    "• *Merchant:* " + draft.receipt.merchant + "\n" +
    "• *Nominal:* " + formatCurrency(tx.amount) + "\n" +
    "• *Kategori:* " + tx.category + "\n" +
    "• *Wallet:* " + tx.walletName + "\n" +
    "• *Bukti File:* [Buka Gambar](" + draft.fileUrl + ")\n\n" +
    "📊 _Dashboard & Saldo telah diperbarui._";

  sendTelegramMessage(chatId, reply);
  return { handled: true, status: "receipt_saved", amount: tx.amount };
}

/**
 * Memperbarui draft struk dengan koreksi teks pengguna lalu menyimpannya.
 *
 * @param {Object} draft
 * @param {String} textCorrection
 * @param {String|Number} chatId
 * @returns {Object}
 */
function correctAndSaveReceiptTransaction(draft, textCorrection, chatId) {
  clearPendingReceiptVerification(chatId);

  try {
    const normalized = normalizeTransactionInput(textCorrection);
    const parsed = parseTransaction({
      date: new Date(),
      input: normalized,
      sourceInput: textCorrection,
      note: "VLM Corrected: " + (draft.fileUrl || "")
    });

    const finalTx = {
      date: draft.receipt.date ? new Date(draft.receipt.date) : new Date(),
      transactionType: CONFIG.TRANSACTION_TYPE.EXPENSE,
      walletName: parsed.walletName || draft.walletName || CONFIG.DEFAULT.WALLET,
      category: parsed.category !== CONFIG.DEFAULT.CATEGORY ? parsed.category : draft.receipt.category,
      description: parsed.description ? parsed.description + " (" + draft.receipt.merchant + ")" : "Belanja di " + draft.receipt.merchant,
      amount: parsed.amount > 0 ? parsed.amount : draft.receipt.amount,
      note: "VLM Corrected: " + (draft.fileUrl || "")
    };

    saveTransaction(finalTx);
    syncInventoryPurchases([finalTx]);
    updateWalletBalances();
    refreshDashboard();

    const reply = "✅ *Struk Dicatat dengan Koreksi Anda!*\n\n" +
      "• *Merchant:* " + draft.receipt.merchant + "\n" +
      "• *Nominal Akhir:* *" + formatCurrency(finalTx.amount) + "*\n" +
      "• *Kategori:* " + finalTx.category + "\n" +
      "• *Wallet:* " + finalTx.walletName + "\n" +
      "• *Bukti File:* [Buka Gambar](" + draft.fileUrl + ")\n\n" +
      "📊 _Dashboard & Saldo telah diperbarui._";

    sendTelegramMessage(chatId, reply);
    return { handled: true, status: "receipt_saved_with_correction", amount: finalTx.amount };
  } catch (err) {
    sendTelegramMessage(chatId, "⚠️ *Koreksi gagal diproses:*\n" + err.message);
    return { handled: true, status: "correction_failed" };
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

/**
 * Mengirimkan pesan pengingat jatuh tempo cicilan harian ke Telegram.
 * Dipanggil otomatis oleh clock trigger atau secara manual.
 *
 * @param {Date} [refDate]
 * @returns {Object}
 */
function sendDailyLoanDueReminders(refDate) {
  const dueItems = getDueLoansForReminder(refDate);
  if (!dueItems || dueItems.length === 0) {
    return { status: "no_due_loans", count: 0 };
  }

  const defaultChatId = getSetting("Telegram Allowed User ID") || getSetting("Telegram Default Chat ID") || CONFIG.TELEGRAM.DEFAULT_CHAT_ID;
  if (!defaultChatId) {
    return { status: "no_chat_id", count: dueItems.length };
  }

  const primaryChatId = String(defaultChatId).split(",")[0].trim();
  dueItems.forEach(item => {
    const l = item.loan;
    let timing = "HARI INI";
    if (item.daysLeft === 1) timing = "BESOK";
    else if (item.daysLeft === 3) timing = "DALAM 3 HARI";

    const msg = "🔔 *PENGINGAT JATUH TEMPO CICILAN!*\n\n" +
      "Pinjaman *" + l.loanName + "* (" + l.lender + ") jatuh tempo *" + timing + "* (Tgl " + l.installmentDay + ").\n\n" +
      "• *Nominal Cicilan:* *" + formatCurrency(l.installmentAmount) + "*\n" +
      "• *Pokok Pinjaman:* " + formatCurrency(l.principal) + "\n" +
      "• *Sistem Bunga:* " + l.interestType + "\n" +
      "• *Status:* `" + l.status + "`\n\n" +
      "💡 _Segera lakukan pembayaran untuk menjaga kelancaran kredit Anda._";

    sendTelegramMessage(primaryChatId, msg);
  });

  return { status: "reminders_sent", count: dueItems.length };
}


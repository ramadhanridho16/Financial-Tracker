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

  sendTelegramMessage(
    chatId,
    "Mohon maaf, saat ini tidak tersedia fitur tersebut.\n\n" +
    "Silakan catat transaksi Anda langsung menggunakan pesan teks (contoh: `Makan siang 35k bca`)."
  );
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
    const syncedInventoryItems = syncInventoryPurchases(transactions);
    updateWalletBalances();
    refreshDashboard();

    const newlyPaidLoans = syncAllLoansSettlement();
    let reply = formatTelegramTransactionReceipt(transactions, syncedInventoryItems);

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
 * Menangani pesan foto Telegram saat fitur struk dialihkan.
 *
 * @param {Object} msg
 * @param {String|Number} chatId
 * @returns {Object}
 */
function handleTelegramPhotoMessage(msg, chatId) {
  sendTelegramMessage(
    chatId,
    "Mohon maaf, saat ini tidak tersedia fitur tersebut.\n\n" +
    "Silakan catat transaksi Anda langsung menggunakan pesan teks (contoh: `Makan siang 35k bca`)."
  );
  return { status: "feature_not_available" };
}

/**
 * Membentuk teks bukti pencatatan transaksi untuk pesan balasan Telegram.
 *
 * @param {Array<Object>} transactions
 * @returns {String}
 */
function formatTelegramTransactionReceipt(transactions, syncedInventoryItems) {
  let reply = "✅ *Transaksi Berhasil Dicatat!*\n\n";

  transactions.forEach((t, i) => {
    reply += (transactions.length > 1 ? "*" + (i + 1) + ".* " : "") +
      "• *Jenis:* " + t.transactionType + "\n" +
      "• *Nominal:* " + formatCurrency(t.amount) + "\n" +
      "• *Kategori:* " + t.category + "\n" +
      "• *Wallet:* " + t.walletName + (t.targetWalletName ? " ➔ " + t.targetWalletName : "") + "\n" +
      "• *Keterangan:* " + (t.description || "-") + "\n\n";
  });

  if (syncedInventoryItems && syncedInventoryItems.length > 0) {
    reply += "📦 *Tersinkron ke Home Inventory:*\n";
    syncedInventoryItems.forEach(item => {
      reply += "• *" + item.product.productName + "* (+" + item.quantity + " " + item.product.unit + ")" +
        " ➔ Stok: *" + item.newStock + " " + item.product.unit + "*\n";
    });
    reply += "\n";
  }

  const wallet = getWalletByName(transactions[0].walletName);
  if (wallet) {
    const balances = getWalletBalances();
    const wb = balances.find(b => b.walletName === wallet.walletName);
    if (wb) {
      reply += "💳 *Sisa Saldo " + wb.walletName + ":* " + formatCurrency(wb.balance) + "\n";
    }
  }

  // Umpan balik kuota budget instan pada transaksi EXPENSE (Siklus Gajian)
  const expenseCategories = [...new Set(
    transactions
      .filter(t => t.transactionType === CONFIG.TRANSACTION_TYPE.EXPENSE && t.category)
      .map(t => t.category)
  )];

  const budgetCards = [];
  expenseCategories.forEach(cat => {
    try {
      const status = getBudgetUsageStatus(cat);
      if (status) {
        const card = "🎯 *Kuota Anggaran " + status.category + ":*\n" +
          "• *Terpakai:* " + formatCurrency(status.spent) + " / " + formatCurrency(status.limit) + " (" + status.percentage + "%)\n" +
          "• *Sisa Kuota:* *" + (status.remaining >= 0 ? formatCurrency(status.remaining) : "-" + formatCurrency(Math.abs(status.remaining))) + "* | " + status.badge;
        budgetCards.push(card);
      }
    } catch (e) {
      // Abaikan jika service budget belum siap
    }
  });

  if (budgetCards.length > 0) {
    reply += "\n" + budgetCards.join("\n\n") + "\n";
  }

  reply += "\n📊 _Dashboard & Saldo telah otomatis diperbarui._";
  return reply;
}

/**
 * Menghasilkan pesan panduan penggunaan bot.
 *
 * @returns {String}
 */
function getTelegramHelpMessage() {
  return "🤖 *Financial Tracker Bot Assistant*\n\n" +
    "Kirim kalimat transaksi apa saja secara alami via pesan teks:\n\n" +
    "📝 *Contoh Transaksi:*\n" +
    "• `Makan siang 35k bca`\n" +
    "• `Beli bensin 50rb bri`\n" +
    "• `Gaji bulanan 10jt mandiri`\n" +
    "• `Transfer bca ke jago 200rb`\n" +
    "• `Beli kopi 25rb, bayar parkir 5rb bri`\n\n" +
    "⚡ *Perintah Cepat:*\n" +
    "• `/saldo` — Cek saldo seluruh wallet\n" +
    "• `/ringkasan` — Ringkasan konsumsi bulan ini\n" +
    "• `/pinjaman` — Status cicilan/pinjaman aktif\n" +
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
  // Cek pemicu rollover budget pada hari gajian (tanggal 25)
  try {
    checkPaydayBudgetRollover(refDate);
  } catch (err) {
    logError("Gagal menjalankan checkPaydayBudgetRollover: " + err.message);
  }

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

/**
 * Mengecek apakah hari ini adalah tanggal gajian (tgl 25) dan mengirimkan notifikasi rollover budget.
 *
 * @param {Date} [refDate]
 * @returns {Object}
 */
function checkPaydayBudgetRollover(refDate) {
  const today = refDate ? new Date(refDate) : new Date();
  const paydayDay = Number(getSetting("Payday Date") || 25);

  if (today.getDate() !== paydayDay) {
    return { status: "not_payday", date: today.getDate() };
  }

  const defaultChatId = getSetting("Telegram Allowed User ID") || getSetting("Telegram Default Chat ID") || CONFIG.TELEGRAM.DEFAULT_CHAT_ID;
  if (!defaultChatId) {
    return { status: "no_chat_id" };
  }

  const primaryChatId = String(defaultChatId).split(",")[0].trim();
  const rollover = evaluatePaydayRollover(today, paydayDay);

  let msg = "🎉 *SELAMAT HARI GAJIAN!*\n" +
    "Siklus Anggaran Baru Telah Aktif: `" + rollover.newPeriod.label + "`\n\n" +
    "📊 *Rekapitulasi Anggaran Siklus Kemarin:*\n" +
    "• Periode: `" + rollover.completedPeriod.label + "`\n" +
    "• Total Plafon: " + formatCurrency(rollover.totalBudget) + "\n" +
    "• Total Realisasi: " + formatCurrency(rollover.totalExpense) + "\n" +
    "• " + (rollover.totalSavings >= 0 
      ? "Penghematan Bersih: *+" + formatCurrency(rollover.totalSavings) + "* 👏" 
      : "Defisit / Melebihi Anggaran: *-" + formatCurrency(Math.abs(rollover.totalSavings)) + "* ⚠️") + "\n\n";

  if (rollover.evaluations.length > 0) {
    msg += "🎯 *Status Kategori Anggaran Aktif:*\n";
    rollover.evaluations.forEach(ev => {
      msg += "• *" + ev.category + ":* " + formatCurrency(ev.limit) + " " +
        (ev.isOver ? "(🚨 Over " + ev.percentage + "% bulan lalu)" : "(✅ Terkendali)") + "\n";
    });
    msg += "\n";
  }

  msg += "💡 _Ingin menyesuaikan batas anggaran bulan ini?_\n" +
    "Gunakan: `/setbudget <Kategori> <Nominal>`";

  sendTelegramMessage(primaryChatId, msg);
  return { status: "payday_rollover_sent", evaluations: rollover.evaluations.length };
}


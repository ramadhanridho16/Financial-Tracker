/**
 * ==========================================================
 * Financial Tracker Pro
 * BotCommands.gs
 * ----------------------------------------------------------
 * Modul Khusus Manajemen Perintah (Commands) Telegram Bot.
 * 
 * CARA MENAMBAHKAN COMMAND BARU:
 * Tambahkan entri baru ke dalam objek BOT_CUSTOM_COMMANDS di bawah ini,
 * atau panggil fungsi registerBotCommand(command, handler, description, usage).
 *
 * Contoh:
 * registerBotCommand("/info", function(chatId, args) {
 *   return "Halo! Ini adalah bot pencatat keuangan pribadi.";
 * }, "Menampilkan info aplikasi", "/info");
 * ==========================================================
 */

/**
 * Registry Perintah Bawaan & Kustom Telegram Bot.
 * Struktur:
 * key: Nama perintah (lowercase, diawali slash, misal '/saldo')
 * value: { handler, description, usage }
 */
const BOT_COMMAND_REGISTRY = {};

/**
 * Mendaftarkan perintah baru ke dalam registry bot.
 *
 * @param {String} commandName - Contoh: '/saldo', '/kategori'
 * @param {Function} handlerFn - Callback: function(chatId, args, update) -> string
 * @param {String} description - Keterangan fungsi perintah
 * @param {String} [usage] - Format penggunaan
 */
function registerBotCommand(commandName, handlerFn, description, usage) {
  if (!commandName || typeof handlerFn !== "function") {
    return;
  }
  const key = commandName.trim().toLowerCase();
  BOT_COMMAND_REGISTRY[key] = {
    command: key,
    handler: handlerFn,
    description: description || "Perintah bot",
    usage: usage || key
  };
}

/**
 * Menginisialisasi seluruh perintah standar dan perintah kustom bot.
 */
function initializeBotCommands() {
  if (Object.keys(BOT_COMMAND_REGISTRY).length > 0) {
    return;
  }

  registerBotCommand("/bantuan", handleHelpCommand, "Melihat panduan & seluruh menu perintah", "/bantuan");
  registerBotCommand("/help", handleHelpCommand, "Alias bantuan", "/help");
  registerBotCommand("/start", handleHelpCommand, "Memulai bot & panduan", "/start");
  registerBotCommand("/saldo", handleSaldoCommand, "Mengecek sisa saldo seluruh wallet aktif", "/saldo");
  registerBotCommand("/wallet", handleSaldoCommand, "Alias saldo", "/wallet");
  registerBotCommand("/ringkasan", handleDashboardCommand, "Ringkasan keuangan bulanan & dashboard", "/ringkasan");
  registerBotCommand("/dashboard", handleDashboardCommand, "Alias ringkasan", "/dashboard");
  registerBotCommand("/ping", handlePingCommand, "Uji koneksi & status webhook bot", "/ping");
  registerBotCommand("/kategori", handleKategoriCommand, "Melihat daftar kategori transaksi yang tersedia", "/kategori");
  registerBotCommand("/budget", handleBudgetCommand, "Melihat limit dan peringatan budget bulanan", "/budget");
  registerBotCommand("/terakhir", handleRecentTransactionsCommand, "Melihat 5 transaksi terakhir", "/terakhir");
  registerBotCommand("/utang", handleLoansCommand, "Melihat daftar pinjaman dan kewajiban cicilan", "/utang");
  registerBotCommand("/kredit", handleKreditCommand, "Mencatat pinjaman baru via mode percakapan berpemandu", "/kredit");
  registerBotCommand("/kalender", handleCalendarCommand, "Melihat kalender jatuh tempo cicilan bulanan", "/kalender");
  registerBotCommand("/jadwal", handleCalendarCommand, "Alias kalender cicilan", "/jadwal");
  registerBotCommand("/batal", handleCancelWizardCommand, "Membatalkan sesi percakapan aktif", "/batal");
  registerBotCommand("/setgeminikey", handleSetGeminiKeyCommand, "Memasang Google Gemini API Key untuk fitur VLM", "/setgeminikey <api_key>");
  registerBotCommand("/cekkey", handleCheckGeminiKeyCommand, "Mengecek status keaktifan Gemini API Key", "/cekkey");
}

/**
 * Mengarahkan dan mengeksekusi perintah bot jika teks merupakan slash command.
 *
 * @param {String} text
 * @param {String|Number} chatId
 * @param {Object} [update]
 * @returns {Object}
 */
function dispatchBotCommand(text, chatId, update) {
  if (!text || !text.startsWith("/")) {
    return { handled: false };
  }

  initializeBotCommands();

  const parts = text.trim().split(/\s+/);
  const rawCommand = parts[0].toLowerCase();
  // Tangani format command dengan mention (misal: /saldo@MyFinanceBot)
  const cmd = rawCommand.split("@")[0];
  const args = parts.slice(1).join(" ");

  const registered = BOT_COMMAND_REGISTRY[cmd];
  if (!registered) {
    sendTelegramMessage(chatId, "❓ *Perintah Tidak Dikenal: `" + cmd + "`*\nKetik `/bantuan` untuk melihat daftar perintah yang tersedia.");
    return { handled: true, command: cmd, status: "unknown_command" };
  }

  try {
    const replyText = registered.handler(chatId, args, update);
    if (replyText) {
      sendTelegramMessage(chatId, replyText);
    }
    return { handled: true, command: cmd, status: "success" };
  } catch (error) {
    logError("Error executing command " + cmd + ": " + error.message);
    sendTelegramMessage(chatId, "⚠️ *Gagal Menjalankan Perintah*\n" + error.message);
    return { handled: true, command: cmd, status: "error", error: error.message };
  }
}

/**
 * Handler Perintah: /bantuan atau /help
 *
 * @returns {String}
 */
function handleHelpCommand() {
  initializeBotCommands();
  let text = "🤖 *Financial Tracker Bot — Daftar Perintah*\n\n";
  text += "📝 *Catat Transaksi Otomatis:*\n";
  text += "Ketik langsung transaksi dalam bahasa alami:\n";
  text += "• `Makan siang 35k bca`\n";
  text += "• `Beli bensin 50rb bri`\n";
  text += "• `Gaji bulanan 10jt mandiri`\n";
  text += "• `Transfer bca ke jago 200rb`\n\n";
  text += "📸 *Scan Struk Belanja:* Kirim foto struk, OCR akan memproses otomatis.\n\n";
  text += "⚡ *Daftar Menu Perintah:*\n";

  const printed = new Set();
  const keys = Object.keys(BOT_COMMAND_REGISTRY).sort();
  for (const k of keys) {
    const item = BOT_COMMAND_REGISTRY[k];
    if (!printed.has(item.description)) {
      printed.add(item.description);
      text += "• `" + item.usage + "` — " + item.description + "\n";
    }
  }

  return text;
}

/**
 * Handler Perintah: /saldo atau /wallet
 *
 * @returns {String}
 */
function handleSaldoCommand() {
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
 * Handler Perintah: /ringkasan atau /dashboard
 *
 * @returns {String}
 */
function handleDashboardCommand() {
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
 * Handler Perintah: /ping
 *
 * @returns {String}
 */
function handlePingCommand() {
  const now = new Date();
  return "🏓 *Pong!*\n" +
    "• Status: *Aktif & Siap*\n" +
    "• Waktu Server: `" + Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss") + "`\n" +
    "• Versi App: `" + CONFIG.APP.VERSION + "`";
}

/**
 * Handler Perintah: /kategori
 *
 * @returns {String}
 */
function handleKategoriCommand() {
  const dict = getDictionary();
  const categories = [...new Set(dict.map(d => d.category).filter(Boolean))].sort();

  if (categories.length === 0) {
    return "📁 *Kategori Transaksi:*\nBelum ada kategori yang terdaftar di Dictionary.";
  }

  let text = "📁 *Daftar Kategori Transaksi (" + categories.length + "):*\n\n";
  categories.forEach((cat, idx) => {
    text += (idx + 1) + ". " + cat + "\n";
  });
  text += "\n_Gunakan kata kunci sesuai kategori agar otomatis terdeteksi._";
  return text;
}

/**
 * Handler Perintah: /budget
 *
 * @returns {String}
 */
function handleBudgetCommand() {
  const budgets = getBudgets();
  if (budgets.length === 0) {
    return "🎯 *Budget Bulanan:*\nBelum ada anggaran (budget) yang diatur.";
  }

  let text = "🎯 *Status Anggaran (Budget) Aktif:*\n\n";
  budgets.forEach(b => {
    text += "• *" + b.category + "* (" + b.periodType + ")\n" +
      "  Limit: " + formatCurrency(b.limit) + " | Warning: " + formatCurrency(b.warning) + "\n";
  });
  return text;
}

/**
 * Handler Perintah: /terakhir
 *
 * @returns {String}
 */
function handleRecentTransactionsCommand() {
  const all = getTransactions();
  if (all.length === 0) {
    return "🧾 *Transaksi Terakhir:*\nBelum ada catatan transaksi di sheet.";
  }

  const recent = all.slice(-5).reverse();
  let text = "🧾 *5 Transaksi Terakhir:*\n\n";

  recent.forEach((t, i) => {
    const dateStr = t.date instanceof Date ? Utilities.formatDate(t.date, "Asia/Jakarta", "dd/MM/yyyy") : String(t.date || "-");
    text += "*" + (i + 1) + ".* " + dateStr + " — " + (t.type || "Expense") + "\n" +
      "  *" + formatCurrency(t.amount) + "* [" + (t.category || "-") + "] via *" + (t.wallet || "-") + "*\n" +
      "  _Ket:_ " + (t.description || "-") + "\n\n";
  });

  return text;
}

/**
 * Handler Perintah: /utang
 *
 * @returns {String}
 */
function handleLoansCommand() {
  const loans = getLoans();
  if (loans.length === 0) {
    return "🤝 *Daftar Pinjaman:*\nTidak ada catatan pinjaman di sheet Loans.";
  }

  let text = "🤝 *Daftar Pinjaman & Status Pelunasan:*\n\n";
  loans.forEach((l, idx) => {
    const summary = getLoanSettlementSummary(l);
    const badge = l.status === CONFIG.STATUS.PAID ? "✅ LUNAS" : "🔄 ACTIVE";

    text += "*" + (idx + 1) + ". " + l.loanName + "* (`" + l.loanId + "`)\n" +
      "  • Pihak: " + l.lender + " (" + l.loanType + ")\n" +
      "  • Pokok: " + formatCurrency(l.principal) + " | Bunga: " + l.interestType + "\n" +
      "  • Cicilan: *" + formatCurrency(l.installmentAmount) + "/bln* (Tgl " + l.installmentDay + ")\n" +
      "  • Terbayar: " + formatCurrency(summary.totalPaid) + " / " + formatCurrency(summary.totalObligation) + "\n" +
      "  • Status: *" + badge + "*\n\n";
  });

  text += "💡 _Ketik `/kredit` untuk menambah pinjaman baru, atau `/kalender` untuk melihat kalender cicilan._";
  return text;
}

/**
 * Handler Perintah: /kredit (Memulai mode percakapan berpemandu)
 *
 * @param {String|Number} chatId
 * @returns {String}
 */
function handleKreditCommand(chatId) {
  return startLoanWizard(chatId);
}

/**
 * Handler Perintah: /kalender atau /jadwal
 *
 * @param {String|Number} chatId
 * @param {String} [args]
 * @returns {String}
 */
function handleCalendarCommand(chatId, args) {
  let targetDate = new Date();
  if (args) {
    const monthNum = parseInt(args.trim(), 10);
    if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
      targetDate.setMonth(monthNum - 1);
    }
  }

  const cal = getMonthlyLoanCalendar(targetDate);
  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const monthName = monthNames[cal.month - 1];

  let text = "📅 *Kalender Cicilan & Pinjaman — " + monthName + " " + cal.year + "*\n";
  text += "--------------------------------------------------\n";

  if (cal.schedule.length === 0) {
    text += "_Tidak ada jadwal cicilan aktif pada bulan ini._\n";
  } else {
    cal.schedule.forEach(s => {
      const statusIcon = s.isPaidThisMonth ? "✅ Sudah Dibayar" : "⏳ Belum Dibayar";
      text += "• *Tgl " + s.day + ":* " + s.loanName + " (" + s.lender + ")\n" +
        "   Nominal: *" + formatCurrency(s.amount) + "* [" + statusIcon + "]\n";
    });
  }

  text += "--------------------------------------------------\n";
  text += "💰 *Total Kewajiban Bulan Ini:* " + formatCurrency(cal.totalMonthlyObligation) + "\n";
  text += "💳 *Sisa Belum Terbayar:* " + formatCurrency(cal.totalRemainingObligation);
  return text;
}

/**
 * Handler Perintah: /batal
 *
 * @param {String|Number} chatId
 * @returns {String}
 */
function handleCancelWizardCommand(chatId) {
  clearLoanWizardState(chatId);
  clearPendingReceiptVerification(chatId);
  return "❌ *Sesi Dibatalkan*\nTidak ada data yang disimpan.";
}

/**
 * Handler Perintah: /setgeminikey
 *
 * @param {String|Number} chatId
 * @param {String} args
 * @returns {String}
 */
function handleSetGeminiKeyCommand(chatId, args) {
  const key = (args || "").trim();
  if (!key) {
    return "⚠️ *Format Perintah Salah*\n" +
      "Gunakan format: `/setgeminikey <API_KEY_ANDA>`\n\n" +
      "💡 _Dapatkan API Key gratis di:_ aistudio.google.com";
  }

  saveGeminiApiKey(key);
  const masked = key.length > 8 ? key.substring(0, 6) + "..." + key.substring(key.length - 4) : "****";
  return "✅ *Gemini API Key Berhasil Disimpan!*\n\n" +
    "• *Key:* `" + masked + "`\n" +
    "• *Model:* `gemini-2.5-flash`\n\n" +
    "🔍 Fitur Vision-Language Model (VLM) kini aktif untuk pemindaian struk belanja.";
}

/**
 * Handler Perintah: /cekkey
 *
 * @returns {String}
 */
function handleCheckGeminiKeyCommand() {
  const key = getGeminiApiKey();
  if (!key) {
    return "⚠️ *Gemini API Key Belum Terpasang*\n" +
      "Gunakan `/setgeminikey <API_KEY>` untuk mengaktifkan pemindaian struk VLM.";
  }

  const masked = key.length > 8 ? key.substring(0, 6) + "..." + key.substring(key.length - 4) : "****";
  return "🟢 *Gemini API Key Aktif*\n\n" +
    "• *Status:* Tersimpan di Script Properties\n" +
    "• *Key:* `" + masked + "`\n" +
    "• *Model VLM:* `gemini-2.5-flash`";
}




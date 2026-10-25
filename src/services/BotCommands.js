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
  registerBotCommand("/tambahkategori", handleAddCategoryCommand, "Menambah kategori baru & kata kunci", "/tambahkategori <nama> [keyword1, kw2]");
  registerBotCommand("/setbudget", handleSetBudgetCommand, "Mengatur limit nominal budget bulanan", "/setbudget <kategori> <nominal> [warning%]");
  registerBotCommand("/hapusbudget", handleDeleteBudgetCommand, "Menghapus/menonaktifkan budget kategori", "/hapusbudget <kategori>");
  registerBotCommand("/tambahwallet", handleAddWalletCommand, "Menambah rekening/wallet baru", "/tambahwallet <nama> [tipe] [saldo_awal]");
  registerBotCommand("/setwallet", handleReconcileWalletCommand, "Mencocokkan saldo wallet & deteksi selisih", "/setwallet <nama> <nominal>");
  registerBotCommand("/cocokkan", handleReconcileWalletCommand, "Alias setwallet", "/cocokkan <nama> <nominal>");
  registerBotCommand("/batal", handleCancelWizardCommand, "Membatalkan sesi percakapan aktif", "/batal");
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
  const operationalBalances = balances.filter(w => String(w.walletType).toLowerCase() !== "loan");
  const loanBalances = balances.filter(w => String(w.walletType).toLowerCase() === "loan");
  const totalOperational = operationalBalances.reduce((sum, w) => sum + Number(w.balance), 0);

  let text = "💳 *Daftar Saldo Kas & Rekening Operasional:*\n\n";

  if (operationalBalances.length === 0) {
    text += "_Belum ada rekening debit/kas terdaftar._\n";
  } else {
    operationalBalances.forEach(w => {
      text += "• *" + w.walletName + "* (" + w.walletType + "): " + formatCurrency(w.balance) + "\n";
    });
  }

  text += "\n💰 *Total Kas & Likuiditas:* " + formatCurrency(totalOperational) + "\n";

  if (loanBalances.length > 0) {
    text += "\n🤝 *Rekening Pinjaman / Kredit (Terpisah):*\n";
    loanBalances.forEach(w => {
      text += "• *" + w.walletName + "* (" + w.walletType + "): " + formatCurrency(w.balance) + "\n";
    });
  }

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
    return "🎯 *Budget Siklus Gajian:*\nBelum ada anggaran (budget) yang diatur.\n\n💡 _Gunakan perintah:_ `/setbudget <kategori> <nominal>` _untuk mulai membuat anggaran._";
  }

  const period = getPaydayPeriod();
  let text = "🎯 *Status Anggaran (Siklus Gajian)*\n";
  text += "📅 *Periode:* `" + period.label + "`\n";
  text += "💡 _Reset otomatis setiap tanggal 25 (Hari Gajian)_\n\n";

  let totalLimit = 0;
  let totalSpent = 0;

  budgets.forEach(b => {
    const status = getBudgetUsageStatus(b.category);
    if (!status) return;

    totalLimit += status.limit;
    totalSpent += status.spent;

    text += "• *" + status.category + "* " + status.progressBar + "\n" +
      "  Terpakai: " + formatCurrency(status.spent) + " / " + formatCurrency(status.limit) + "\n" +
      "  Sisa: " + formatCurrency(status.remaining) + " | " + status.badge + "\n\n";
  });

  const overallPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
  const overallRem = totalLimit - totalSpent;
  text += "----------------------------------------\n" +
    "💰 *Total Anggaran:* " + formatCurrency(totalLimit) + "\n" +
    "💸 *Total Terpakai:* " + formatCurrency(totalSpent) + " (" + overallPct + "%)\n" +
    "🛡️ *Total Sisa Kuota:* " + formatCurrency(overallRem);

  return text;
}

/**
 * Handler Perintah: /setbudget
 * Syntax: /setbudget <kategori> <nominal> [warning%]
 * Contoh: /setbudget Makanan 2.5jt
 * Contoh: /setbudget Transport 500k 85
 *
 * @param {String|Number} chatId
 * @param {String} args
 * @returns {String}
 */
function handleSetBudgetCommand(chatId, args) {
  if (!args || !args.trim()) {
    return "🎯 *Panduan Mengatur Anggaran (Budget):*\n" +
      "Gunakan format: `/setbudget <kategori> <nominal> [warning%]`\n\n" +
      "*Contoh:*\n" +
      "• `/setbudget Makanan 2.5jt`\n" +
      "• `/setbudget Transport 500k 85`\n" +
      "• `/setbudget Belanja 1.200.000`\n\n" +
      "💡 _Budget akan otomatis diperbarui setiap tanggal 25 (Hari Gajian)._";
  }

  const parts = args.trim().split(/\s+/);
  if (parts.length < 2) {
    return "⚠️ Format kurang lengkap. Masukkan minimal nama kategori dan nominal anggaran.\nContoh: `/setbudget Makanan 2jt`";
  }

  let warningPct = 80;
  let nominalIndex = parts.length - 1;

  const lastArg = parts[parts.length - 1].replace("%", "");
  if (!isNaN(Number(lastArg)) && Number(lastArg) >= 1 && Number(lastArg) <= 100 && parts.length >= 3) {
    warningPct = Number(lastArg);
    nominalIndex = parts.length - 2;
  }

  const rawNominal = parts[nominalIndex];
  const normalizedNominal = normalizeTransactionInput(rawNominal);
  const limitAmount = parseAmount(normalizedNominal);

  if (!limitAmount || isNaN(limitAmount) || limitAmount <= 0) {
    return "⚠️ Nominal budget `" + rawNominal + "` tidak valid. Gunakan format yang jelas (Contoh: `500k`, `2.5jt`, `1.500.000`).";
  }

  const categoryName = parts.slice(0, nominalIndex).join(" ").trim();

  try {
    const result = upsertBudget(categoryName, limitAmount, warningPct);

    return "🎯 *Anggaran (Budget) Berhasil Diatur!*\n" +
      "----------------------------------------\n" +
      "• *Kategori:* *" + result.category + "*\n" +
      "• *Plafon Limit:* *" + formatCurrency(result.limit) + "*\n" +
      "• *Ambang Waspada:* " + result.warning + "% (" + formatCurrency(result.limit * (result.warning / 100)) + ")\n" +
      "• *Siklus Gajian:* " + result.periodLabel + "\n" +
      "• *Status:* Aktif " + (result.isNew ? "(Baru)" : "(Diperbarui)") + "\n" +
      "----------------------------------------\n" +
      "💡 _Anggaran ini akan otomatis di-rollover setiap tanggal 25 (Hari Gajian)._\n" +
      "Ketik `/budget` untuk memantau status pemakaian saat ini.";
  } catch (err) {
    return "⚠️ *Gagal Mengatur Budget:*\n" + err.message;
  }
}

/**
 * Handler Perintah: /tambahkategori
 * Syntax: /tambahkategori <nama_kategori> [keyword1, keyword2, ...]
 *
 * @param {String|Number} chatId
 * @param {String} args
 * @returns {String}
 */
function handleAddCategoryCommand(chatId, args) {
  if (!args || !args.trim()) {
    return "📁 *Panduan Menambah Kategori Baru:*\n" +
      "Gunakan format: `/tambahkategori <nama_kategori> [keyword1, keyword2, ...]`\n\n" +
      "*Contoh:*\n" +
      "• `/tambahkategori Skincare sunscreen, serum, cleanser`\n" +
      "• `/tambahkategori Kebugaran gym, fitness, protein`\n" +
      "• `/tambahkategori Zakat infaq, sedekah`\n\n" +
      "💡 _Keyword memudahkan bot mendeteksi transaksi secara otomatis._";
  }

  let categoryName = "";
  let keywordsStr = "";

  if (args.includes(",")) {
    const firstCommaIndex = args.indexOf(",");
    categoryName = args.substring(0, firstCommaIndex).trim();
    keywordsStr = args.substring(firstCommaIndex + 1).trim();
  } else {
    const parts = args.trim().split(/\s+/);
    categoryName = parts[0];
    keywordsStr = parts.slice(1).join(", ");
  }

  try {
    const result = saveNewCategory(categoryName, keywordsStr);

    let reply = "📁 *Kategori Transaksi Berhasil " + (result.isNew ? "Ditambahkan" : "Diperbarui") + "!*\n" +
      "----------------------------------------\n" +
      "• *Nama Kategori:* *" + result.category + "*\n" +
      "• *Keyword Utama:* `" + result.primaryKeyword + "`\n";

    if (result.aliases) {
      reply += "• *Alias / Kata Kunci:* `" + result.aliases + "`\n";
    }

    reply += "----------------------------------------\n" +
      "✅ _Kategori sekarang siap digunakan untuk pencatatan transaksi._\n" +
      "💡 Ingin menentukan batas anggaran? Ketik:\n" +
      "`/setbudget " + result.category + " <nominal>`";

    return reply;
  } catch (err) {
    return "⚠️ *Gagal Menambah Kategori:*\n" + err.message;
  }
}

/**
 * Handler Perintah: /hapusbudget
 * Syntax: /hapusbudget <kategori>
 *
 * @param {String|Number} chatId
 * @param {String} args
 * @returns {String}
 */
function handleDeleteBudgetCommand(chatId, args) {
  if (!args || !args.trim()) {
    return "⚠️ Masukkan nama kategori yang budgetnya ingin dihapus.\nContoh: `/hapusbudget Makanan`";
  }

  const category = args.trim();
  const existing = getBudgetByCategory(category);
  if (!existing || !existing.active) {
    return "ℹ️ Tidak ditemukan anggaran aktif untuk kategori *" + category + "*.";
  }

  const success = deleteBudget(existing.budgetId);
  if (success) {
    return "🗑️ *Anggaran Dinonaktifkan:*\nBudget untuk kategori *" + existing.category + "* berhasil dinonaktifkan.";
  } else {
    return "⚠️ Gagal menonaktifkan budget untuk kategori *" + category + "*.";
  }
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
  return "❌ *Sesi Dibatalkan*\nTidak ada data yang disimpan.";
}

/**
 * Handler Perintah: /tambahwallet
 * Format: /tambahwallet <nama> [tipe: Bank/E-Wallet/Cash/Loan] [saldo_awal]
 *
 * @param {String|Number} chatId
 * @param {String} args
 * @returns {String}
 */
function handleAddWalletCommand(chatId, args) {
  if (!args || !args.trim()) {
    return "💡 *Cara Menambah Wallet Baru:*\n" +
      "Ketik: `/tambahwallet <nama> [tipe] [saldo_awal]`\n\n" +
      "• *Contoh 1:* `/tambahwallet Jago Bank 500k`\n" +
      "• *Contoh 2:* `/tambahwallet Dompet Cash 150rb`\n" +
      "• *Contoh 3:* `/tambahwallet OVO E-Wallet`\n\n" +
      "Pilihan tipe: `Bank`, `E-Wallet`, `Cash`, `Loan`.";
  }

  const parts = args.trim().split(/\s+/);
  const name = parts[0];

  let type = CONFIG.WALLET_TYPE.BANK;
  let rawBalance = "0";

  if (parts.length >= 3) {
    type = parts[1];
    rawBalance = parts.slice(2).join(" ");
  } else if (parts.length === 2) {
    const secondLower = parts[1].toLowerCase();
    if (secondLower === "bank" || secondLower === "e-wallet" || secondLower === "cash" || secondLower === "loan") {
      type = parts[1];
    } else {
      rawBalance = parts[1];
    }
  }

  // Normalisasi nominal saldo awal
  const normalizedBalanceStr = normalizeTransactionInput(rawBalance);
  const openingBalance = parseAmount(normalizedBalanceStr) || 0;

  try {
    const wallet = createWallet(name, type, openingBalance);
    updateWalletBalances();
    refreshDashboard();

    return "✅ *Wallet Berhasil Ditambahkan!*\n\n" +
      "• *Nama Wallet:* `" + wallet.walletName + "`\n" +
      "• *Tipe:* " + wallet.walletType + "\n" +
      "• *Saldo Awal:* *" + formatCurrency(wallet.openingBalance) + "*\n\n" +
      "💡 _Ketik `/saldo` untuk melihat daftar seluruh wallet._";
  } catch (err) {
    return "⚠️ *Gagal Menambah Wallet:*\n" + err.message;
  }
}

/**
 * Handler Perintah: /setwallet atau /cocokkan
 * Format: /cocokkan <nama_wallet> <nominal_baru>
 *
 * @param {String|Number} chatId
 * @param {String} args
 * @returns {String}
 */
function handleReconcileWalletCommand(chatId, args) {
  if (!args || !args.trim()) {
    return "💡 *Cara Mencocokkan / Opname Saldo:*\n" +
      "Ketik: `/cocokkan <nama_wallet> <nominal_baru>`\n\n" +
      "• *Contoh 1:* `/cocokkan bca 1.450.000`\n" +
      "• *Contoh 2:* `/setwallet tunai 250k`\n\n" +
      "Sistem akan otomatis mencatat selisihnya dan mendeteksi dugaan uang hilang (admin bank / parkir / transaksi rekursif).";
  }

  const parts = args.trim().split(/\s+/);
  if (parts.length < 2) {
    return "⚠️ Format belum lengkap. Sertakan nama wallet dan nominal baru (Contoh: `/cocokkan bca 1.5jt`).";
  }

  const walletName = parts[0];
  const rawTarget = parts.slice(1).join(" ");
  const normalizedTarget = normalizeTransactionInput(rawTarget);
  const targetAmount = parseAmount(normalizedTarget);

  if (targetAmount === null || targetAmount === undefined || isNaN(targetAmount)) {
    return "⚠️ Nominal tidak valid. Masukkan angka yang jelas (Contoh: `150k`, `1.500.000`).";
  }

  try {
    const result = reconcileWalletBalance(walletName, targetAmount);

    if (result.status === "equal") {
      return "👌 *Saldo Sudah Cocok!*\nSaldo *" + result.walletName + "* saat ini sudah tepat *" + formatCurrency(result.balance) + "*. Tidak ada selisih.";
    }

    let reply = "";
    if (result.status === "surplus") {
      reply += "📈 *Penyesuaian Saldo Masuk (Surplus)*\n" +
        "--------------------------------------------------\n" +
        "• *Wallet:* `" + result.walletName + "`\n" +
        "• *Saldo Tercatat Sebelumnya:* " + formatCurrency(result.previousBalance) + "\n" +
        "• *Saldo Fisik / Baru:* *" + formatCurrency(result.newBalance) + "*\n" +
        "• *Kelebihan Saldo:* +" + formatCurrency(result.absDelta) + "\n" +
        "--------------------------------------------------\n" +
        "✅ _Selisih telah otomatis dicatat sebagai Pemasukan (Penyesuaian Saldo)._";
    } else {
      reply += "📉 *Penyesuaian Saldo Keluar (Defisit / Selisih)*\n" +
        "--------------------------------------------------\n" +
        "• *Wallet:* `" + result.walletName + "`\n" +
        "• *Saldo Tercatat Sebelumnya:* " + formatCurrency(result.previousBalance) + "\n" +
        "• *Saldo Fisik / Baru:* *" + formatCurrency(result.newBalance) + "*\n" +
        "• *Selisih Uang Hilang:* -" + formatCurrency(result.absDelta) + "\n" +
        "--------------------------------------------------\n" +
        "⚠️ _Selisih telah otomatis dicatat sebagai Pengeluaran (Penyesuaian Saldo)._\n\n";

      if (result.leakDetections && result.leakDetections.length > 0) {
        reply += "🔍 *Analisis Dugaan Pengeluaran / Uang Hilang:*\n";
        result.leakDetections.forEach(d => {
          reply += "• " + d + "\n";
        });
      } else {
        reply += "💡 _Kemungkinan: Pengeluaran tunai/debit harian yang belum sempat dicatat._";
      }
    }

    return reply;
  } catch (err) {
    return "⚠️ *Gagal Mencocokkan Saldo:*\n" + err.message;
  }
}




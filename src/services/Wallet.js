/**
 * ==========================================================
 * Financial Tracker Pro
 * Wallet.gs
 * ----------------------------------------------------------
 * Mengelola data Wallet.
 * Tidak mengandung business logic transaksi.
 * ==========================================================
 */


/**
 * Mengambil seluruh data wallet yang aktif.
 *
 * @returns {Array<Object>}
 */
function getWallets() {

  const sheet = getSheet(CONFIG.SHEETS.WALLETS);

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const idColumn = headers.indexOf("WalletID");
  const nameColumn = headers.indexOf("Nama");
  const typeColumn = headers.indexOf("Type");
  const openingBalanceColumn = headers.indexOf("Saldo Awal");
  const activeColumn = headers.indexOf("Aktif");

  return data
    .filter(row => row[activeColumn] === true || row[activeColumn] === 1)
    .map(row => ({

      walletId: row[idColumn],

      walletName: row[nameColumn],

      walletType: row[typeColumn],

      openingBalance: Number(row[openingBalanceColumn]),

      active: row[activeColumn],

      notes: ""

    }));

}


/**
 * Mengambil wallet berdasarkan nama.
 *
 * @param {String} walletName
 * @returns {Object|null}
 */
function getWalletByName(walletName) {

  if (!walletName) return null;

  const wallets = getWallets();

  const keyword = normalizeText(walletName);

  for (const wallet of wallets) {

    if (normalizeText(wallet.walletName) === keyword) {

      return wallet;

    }

  }

  return null;

}


/**
 * Mengambil wallet berdasarkan ID.
 *
 * @param {String} walletId
 * @returns {Object|null}
 */
function getWalletById(walletId) {

  const wallets = getWallets();

  for (const wallet of wallets) {

    if (wallet.walletId === walletId) {

      return wallet;

    }

  }

  return null;

}


/**
 * Mengambil wallet default.
 *
 * Default dibaca dari Settings.
 *
 * @returns {Object|null}
 */
function getDefaultWallet() {

  const defaultWallet = getSetting("Default Wallet") ||
    getSetting("DefaultWallet") ||
    CONFIG.DEFAULT.WALLET;

  return getWalletByName(defaultWallet);

}


/**
 * Mengecek apakah wallet ada.
 *
 * @param {String} walletName
 * @returns {Boolean}
 */
function walletExists(walletName) {

  return getWalletByName(walletName) !== null;

}

/**
 * Membuat wallet baru jika belum ada.
 *
 * @param {String} walletName
 * @param {String} [walletType="Bank"]
 * @param {Number} [openingBalance=0]
 * @returns {Object} Wallet object
 */
function createWallet(walletName, walletType, openingBalance) {
  if (!walletName) {
    throw new Error("Nama wallet tidak boleh kosong.");
  }

  const existing = getWalletByName(walletName);
  if (existing) {
    return existing;
  }

  const sheet = getSheet(CONFIG.SHEETS.WALLETS);
  const walletId = generateId(
    CONFIG.ID_PREFIX.WALLET,
    CONFIG.SHEETS.WALLETS,
    1
  );

  const finalType = walletType || CONFIG.WALLET_TYPE.BANK;
  const finalBalance = Number(openingBalance) || 0;

  sheet.appendRow([
    walletId,
    walletName,
    finalType,
    finalBalance,
    true
  ]);

  return {
    walletId: walletId,
    walletName: walletName,
    walletType: finalType,
    openingBalance: finalBalance,
    active: true,
    notes: ""
  };
}

/**
 * Mengambil daftar wallet operasional (Non-Loan/Non-Kredit).
 *
 * @returns {Array<Object>}
 */
function getOperationalWallets() {
  return getWallets().filter(w => String(w.walletType).toLowerCase() !== "loan");
}

/**
 * Mengambil daftar wallet pinjaman / kredit.
 *
 * @returns {Array<Object>}
 */
function getLoanWallets() {
  return getWallets().filter(w => String(w.walletType).toLowerCase() === "loan");
}

function getWalletBalances() {

  const wallets = getWallets();
  const transactions = getTransactions();

  return wallets.map(wallet => {

    const walletTransactions = transactions.filter(transaction =>
      normalizeText(transaction.walletName) === normalizeText(wallet.walletName)
    );

    const income = walletTransactions
      .filter(transaction => transaction.transactionType === CONFIG.TRANSACTION_TYPE.INCOME)
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const expense = walletTransactions
      .filter(transaction => transaction.transactionType === CONFIG.TRANSACTION_TYPE.EXPENSE)
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const transferOut = walletTransactions
      .filter(transaction => transaction.transactionType === CONFIG.TRANSACTION_TYPE.TRANSFER)
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const transferIn = transactions
      .filter(transaction => transaction.transactionType === CONFIG.TRANSACTION_TYPE.TRANSFER)
      .filter(transaction => normalizeText(transaction.targetWalletName) === normalizeText(wallet.walletName))
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    return {
      walletId: wallet.walletId,
      walletName: wallet.walletName,
      walletType: wallet.walletType,
      openingBalance: wallet.openingBalance,
      income: income,
      expense: expense,
      transferIn: transferIn,
      transferOut: transferOut,
      balance: wallet.openingBalance + income - expense + transferIn - transferOut
    };

  });

}

function getTotalOpeningBalance() {

  return getWallets()
    .reduce((sum, wallet) => sum + Number(wallet.openingBalance), 0);

}

function getTotalWalletBalance() {

  return getOperationalWallets()
    .map(w => getWalletBalances().find(b => b.walletId === w.walletId))
    .filter(Boolean)
    .reduce((sum, wallet) => sum + Number(wallet.balance), 0);

}

/**
 * Menghitung total saldo seluruh wallet tanpa filter.
 *
 * @returns {Number}
 */
function getTotalAllWalletBalances() {
  return getWalletBalances()
    .reduce((sum, wallet) => sum + Number(wallet.balance), 0);
}

/**
 * Menghitung total saldo/kewajiban pada rekening pinjaman/kredit.
 *
 * @returns {Number}
 */
function getTotalLoanWalletBalance() {
  return getLoanWallets()
    .map(w => getWalletBalances().find(b => b.walletId === w.walletId))
    .filter(Boolean)
    .reduce((sum, wallet) => sum + Number(wallet.balance), 0);
}

function ensureWalletBalanceColumn() {

  const sheet = getSheet(CONFIG.SHEETS.WALLETS);
  const headers = getHeaders(sheet);

  if (headers.indexOf("Saldo Saat Ini") !== -1) {
    return;
  }

  sheet.getRange(1, sheet.getLastColumn() + 1).setValue("Saldo Saat Ini");

}

function updateWalletBalances() {

  ensureWalletBalanceColumn();

  const sheet = getSheet(CONFIG.SHEETS.WALLETS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const nameColumn = headers.indexOf("Nama") + 1;
  const balanceColumn = headers.indexOf("Saldo Saat Ini") + 1;
  const balances = getWalletBalances();
  let updated = 0;

  if (nameColumn <= 0 || balanceColumn <= 0) {
    throw new Error("Kolom Nama atau Saldo Saat Ini tidak ditemukan.");
  }

  for (let row = 2; row <= values.length; row++) {
    const walletName = values[row - 1][nameColumn - 1];
    const balance = balances.find(item =>
      normalizeText(item.walletName) === normalizeText(walletName)
    );

    if (!balance) {
      continue;
    }

    sheet.getRange(row, balanceColumn).setValue(balance.balance);
    updated++;
  }

  return updated;

}

/**
 * Menganalisis selisih uang berkurang (uang hilang / belum tercatat)
 * dengan memeriksa kecocokan pola admin bank, parkir, dan transaksi rekursif.
 *
 * @param {Number} discrepancy - Nilai positif dari defisit uang
 * @param {String} [walletName] - Nama wallet terkait
 * @returns {Array<String>} Daftar kemungkinan sumber selisih
 */
function analyzeDiscrepancyPatterns(discrepancy, walletName) {
  const amount = Math.abs(Number(discrepancy) || 0);
  if (amount <= 0) return [];

  const findings = [];

  // 1. Cek Pola Transaksi Rekursif / Recurring yang cocok persis atau mendekati
  try {
    if (typeof getRecurringTransactions === "function") {
      const activeRecurring = getRecurringTransactions().filter(r => r.active);
      const matchedRecurring = activeRecurring.filter(r => {
        const diff = Math.abs(r.amount - amount);
        return diff === 0 || (amount > 0 && diff / amount <= 0.05);
      });

      matchedRecurring.forEach(r => {
        findings.push("Transaksi Berulang: *" + r.description + "* (" + formatCurrency(r.amount) + " / " + r.frequency + ")");
      });
    }
  } catch (err) {
    // Recurring sheet opsional
  }

  // 2. Cek Pola Biaya Administrasi Bank
  const adminFees = [
    { fee: 2500, label: "Biaya Transfer BI-FAST (Rp 2.500)" },
    { fee: 6500, label: "Biaya Transfer Online Antar-Bank (Rp 6.500)" },
    { fee: 7500, label: "Biaya Admin / Notifikasi SMS (Rp 7.500)" },
    { fee: 10000, label: "Biaya Admin Bulanan Standar (Rp 10.000)" },
    { fee: 11000, label: "Biaya Admin Kartu Debit (Rp 11.000)" },
    { fee: 12000, label: "Biaya Admin Rekening (Rp 12.000)" },
    { fee: 15000, label: "Biaya Admin Bulanan Tabungan (Rp 15.000)" },
    { fee: 17000, label: "Biaya Admin Bank + Kartu Gold/Platinum (Rp 17.000)" },
    { fee: 20000, label: "Biaya Pemeliharaan Rekening / Penalti Saldo Minimum (Rp 20.000)" }
  ];

  const matchedAdmin = adminFees.filter(a => a.fee === amount);
  if (matchedAdmin.length > 0) {
    findings.push(matchedAdmin[0].label);
  }

  // 3. Cek Pola Biaya Parkir atau Pengeluaran Mikro
  if (amount % 2000 === 0 && amount <= 20000) {
    const times = amount / 2000;
    findings.push("Biaya Parkir Motor (~" + times + "x @ Rp 2.000)");
  } else if (amount % 3000 === 0 && amount <= 15000) {
    const times = amount / 3000;
    findings.push("Biaya Parkir Motor / Titip Helm (~" + times + "x @ Rp 3.000)");
  } else if (amount % 5000 === 0 && amount <= 50000) {
    const times = amount / 5000;
    findings.push("Biaya Parkir Mobil / Uang Tips (~" + times + "x @ Rp 5.000)");
  }

  return findings;
}

/**
 * Menyelaraskan (rekonsiliasi) saldo wallet dengan nominal riil fisik/rekening.
 * Otomatis mencatat transaksi selisih (Pemasukan jika lebih, Pengeluaran jika kurang).
 *
 * @param {String} walletName
 * @param {Number} targetBalance
 * @param {String} [customNote]
 * @returns {Object} Hasil rekonsiliasi dan analisis selisih
 */
function reconcileWalletBalance(walletName, targetBalance, customNote) {
  const wallet = getWalletByName(walletName);
  if (!wallet) {
    throw new Error("Wallet '" + walletName + "' tidak ditemukan.");
  }

  const balances = getWalletBalances();
  const currentItem = balances.find(b => normalizeText(b.walletName) === normalizeText(wallet.walletName));
  const currentBalance = currentItem ? currentItem.balance : wallet.openingBalance;
  const newBalance = Number(targetBalance) || 0;
  const delta = newBalance - currentBalance;

  if (delta === 0) {
    return {
      status: "equal",
      walletName: wallet.walletName,
      balance: currentBalance,
      delta: 0,
      message: "Saldo wallet sudah cocok dengan pencatatan sistem."
    };
  }

  const isSurplus = delta > 0;
  const absDelta = Math.abs(delta);
  const txType = isSurplus ? CONFIG.TRANSACTION_TYPE.INCOME : CONFIG.TRANSACTION_TYPE.EXPENSE;
  const description = isSurplus
    ? "Penyesuaian Saldo Masuk " + wallet.walletName
    : "Penyesuaian Saldo Keluar " + wallet.walletName;

  const note = customNote || (isSurplus
    ? "Rekonsiliasi Saldo (Kelebihan Kas / Pendapatan Tak Tercatat)"
    : "Rekonsiliasi Saldo (Selisih Uang Keluar / Hilang)");

  // Simpan transaksi penyesuaian
  const tx = {
    date: new Date(),
    transactionType: txType,
    walletName: wallet.walletName,
    targetWalletName: "",
    category: "Penyesuaian Saldo",
    description: description,
    amount: absDelta,
    note: note
  };

  saveTransaction(tx);
  updateWalletBalances();
  refreshDashboard();

  let leakDetections = [];
  if (!isSurplus) {
    leakDetections = analyzeDiscrepancyPatterns(absDelta, wallet.walletName);
  }

  return {
    status: isSurplus ? "surplus" : "deficit",
    walletName: wallet.walletName,
    previousBalance: currentBalance,
    newBalance: newBalance,
    delta: delta,
    absDelta: absDelta,
    txType: txType,
    leakDetections: leakDetections
  };
}

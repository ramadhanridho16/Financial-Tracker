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

  return getWalletBalances()
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

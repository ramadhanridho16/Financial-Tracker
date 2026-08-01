/**
 * ==========================================================
 * Financial Tracker Pro
 * Report.gs
 * ----------------------------------------------------------
 * Menghasilkan laporan transaksi.
 * MVP Version
 * ==========================================================
 */

/**
 * Refresh seluruh laporan.
 */
function refreshReport() {

  const sheet = getSheet(CONFIG.SHEETS.REPORT);

  const transactions = getTransactions();

  // Bersihkan isi lama (sisakan header)
  if (sheet.getLastRow() > 1) {
    sheet.getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      sheet.getLastColumn()
    ).clearContent();
  }

  // Ringkasan
  const totalIncome = transactions
    .filter(t => t.transactionType === CONFIG.TRANSACTION_TYPE.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.transactionType === CONFIG.TRANSACTION_TYPE.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const netCashFlow = totalIncome - totalExpense;

  const totalTransaction = transactions.length;

  const totalOpeningBalance = getTotalOpeningBalance();

  const totalWalletBalance = getTotalWalletBalance();

  // Tulis Ringkasan
  sheet.getRange("A2").setValue("Saldo Awal");
  sheet.getRange("B2").setValue(totalOpeningBalance);

  sheet.getRange("A3").setValue("Total Pemasukan");
  sheet.getRange("B3").setValue(totalIncome);

  sheet.getRange("A4").setValue("Total Pengeluaran");
  sheet.getRange("B4").setValue(totalExpense);

  sheet.getRange("A5").setValue("Arus Kas Bersih");
  sheet.getRange("B5").setValue(netCashFlow);

  sheet.getRange("A6").setValue("Total Uang Saat Ini");
  sheet.getRange("B6").setValue(totalWalletBalance);

  sheet.getRange("A7").setValue("Total Transaksi");
  sheet.getRange("B7").setValue(totalTransaction);

  sheet.getRange("A9").setValue("Saldo per Wallet");

  const walletHeader = [
    "Wallet",
    "Type",
    "Saldo Awal",
    "Pemasukan",
    "Pengeluaran",
    "Saldo Saat Ini"
  ];

  sheet.getRange(10, 1, 1, walletHeader.length).setValues([walletHeader]);

  const walletRows = getWalletBalances().map(wallet => [
    wallet.walletName,
    wallet.walletType,
    wallet.openingBalance,
    wallet.income,
    wallet.expense,
    wallet.balance
  ]);

  if (walletRows.length > 0) {
    sheet.getRange(11, 1, walletRows.length, walletRows[0].length).setValues(walletRows);
  }

  const transactionStartRow = 12 + walletRows.length;

  sheet.getRange(transactionStartRow, 1).setValue("Transaction List");

  // Header tabel transaksi
  const header = [
    "Timestamp",
    "Tanggal",
    "Jenis",
    "Wallet",
    "Wallet Tujuan",
    "Kategori",
    "Keterangan",
    "Nominal",
    "Catatan"
  ];

  sheet.getRange(transactionStartRow + 1, 1, 1, header.length).setValues([header]);

  if (transactions.length === 0) {
    return;
  }

  const rows = transactions.map(t => [
    t.timestamp,
    t.date,
    t.transactionType,
    t.walletName,
    t.targetWalletName || "",
    t.category,
    t.description,
    t.amount,
    t.note
  ]);

  sheet.getRange(
    transactionStartRow + 2,
    1,
    rows.length,
    rows[0].length
  ).setValues(rows);

}

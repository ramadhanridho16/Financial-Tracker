/**
 * ==========================================================
 * Financial Tracker Pro
 * Main.gs
 * ----------------------------------------------------------
 * Controller Utama Aplikasi
 * Tidak mengandung business logic.
 * ==========================================================
 */


/**
 * ==========================================================
 * PROCESS TRANSACTION
 * ==========================================================
 */

/**
 * Memproses Financial Transaction Form
 *
 * @param {Object} e
 * @returns {String} TransactionID
 */
function processTransaction(e) {

  try {

    // 1. Ambil data dari Google Form
    const form = getTransactionFormResponse(e);

    // 2. Parsing transaksi
    const transaction = parseTransaction(form);

    // 3. Simpan transaksi
    const transactionRow = saveTransaction(transaction);

    updateWalletBalances();

    Logger.log("================================");
    Logger.log("Financial Transaction Success");
    Logger.log("Transaction Row : " + transactionRow);
    Logger.log("================================");

    return transactionRow;

  } catch (error) {

    logError(error);

    throw error;

  }

}

function parsePendingTransactions() {

  ensureParsingStatusColumns();

  const sheet = getTransactionFormSheet();
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return 0;
  }

  const headers = values[0];
  const statusColumn = headers.indexOf("Parsing Status") + 1;
  let processed = 0;

  for (let row = 2; row <= values.length; row++) {
    const status = values[row - 1][statusColumn - 1];

    if (status === "Parsed") {
      continue;
    }

    const event = createSubmitEventFromRow(sheet, row, headers, values[row - 1]);

    try {
      onTransactionSubmit(event);
      processed++;
    } catch (error) {
      logError(error);
    }
  }

  return processed;

}


/**
 * ==========================================================
 * PROCESS LOAN
 * ==========================================================
 */

/**
 * Memproses Loan Registration
 *
 * @param {Object} e
 * @returns {String} LoanID
 */
function processLoan(e){

  try{

    const loan = getLoanFormResponse(e);

    const loanId = saveLoan(loan);

    Logger.log("================================");
    Logger.log("Loan Registration Success");
    Logger.log("Loan ID : " + loanId);
    Logger.log("================================");

    return loanId;

  }catch(error){

    logError(error);

    throw error;

  }

}


/**
 * ==========================================================
 * TESTING
 * ==========================================================
 */

/**
 * Digunakan untuk testing manual.
 */
function testConnection(){

  Logger.log(CONFIG.APP.NAME);

  Logger.log("Project berhasil dijalankan.");

}

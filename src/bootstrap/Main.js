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
 * @returns {String|Number} Nomor baris transaksi yang tersimpan.
 */
function processTransaction(e) {

  try {

    // 1. Ambil data dari Google Form
    const form = getTransactionFormResponse(e);

    // 2. Normalisasi input suara
    const normalizedForm = normalizeTransactionForm(form);

    // 3. Parsing setiap transaksi pada satu respons form
    const transactions = splitTransactionInput(normalizedForm.input)
      .map(input => parseTransaction(Object.assign({}, normalizedForm, {
        input: input
      })));

    // 4. Simpan seluruh transaksi
    const transactionRows = transactions.map(saveTransaction);

    updateWalletBalances();

    const transactionRow = formatTransactionRows(transactionRows);

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

/**
 * Menyajikan nomor baris transaksi untuk status respons form.
 *
 * @param {Array<Number>} transactionRows
 * @returns {String|Number}
 */
function formatTransactionRows(transactionRows) {

  if (transactionRows.length === 1) {
    return transactionRows[0];
  }

  return transactionRows.join(", ");

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

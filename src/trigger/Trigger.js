/**
 * ==========================================================
 * Financial Tracker Pro
 * Trigger.gs
 * ----------------------------------------------------------
 * Trigger Router
 * ==========================================================
 */


/**
 * Installable Trigger
 */
function onFormSubmit(e) {

  try {

    const sheetName = e.range.getSheet().getName();

    if (isTransactionFormSheet(sheetName)) {
      return onTransactionSubmit(e);
    }

    if (isLoanFormSheet(sheetName)) {
      return onLoanSubmit(e);
    }

    throw new Error(
      "Unknown Form : " + sheetName
    );

  } catch (error) {

    logError(error);
    markFormSubmitError(e, error);

  }

}


/**
 * Financial Transaction Trigger
 */
function onTransactionSubmit(e) {

  try {
    const transactionRow = processTransaction(e);
    markFormSubmitParsed(e, transactionRow);
  } catch (error) {
    markFormSubmitError(e, error);
    throw error;
  }

}


/**
 * Loan Registration Trigger
 */
function onLoanSubmit(e) {

  processLoan(e);

}

function isTransactionFormSheet(sheetName) {

  return [
    CONFIG.SHEETS.FORM_TRANSACTION,
    "Form Response - Transactions",
    "Form_Responses"
  ].some(name => normalizeSheetName(name) === normalizeSheetName(sheetName));

}

function isLoanFormSheet(sheetName) {

  return [
    CONFIG.SHEETS.FORM_LOAN,
    "Form Response - Loans"
  ].some(name => normalizeSheetName(name) === normalizeSheetName(sheetName));

}

function normalizeSheetName(sheetName) {

  return normalizeText(sheetName).replace(/[_-]/g, " ");

}

/**
 * ==========================================================
 * Financial Tracker Pro
 * ParsingStatus.gs
 * ----------------------------------------------------------
 * Menampilkan status parsing pada sheet form response.
 * ==========================================================
 */

function createSubmitEventFromRow(sheet, rowNumber, headers, rowValues) {

  const namedValues = {};

  headers.forEach((header, index) => {
    if (header) {
      namedValues[header] = [rowValues[index]];
    }
  });

  return {
    range: sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()),
    namedValues: namedValues
  };

}

function markFormSubmitParsed(e, transactionRow) {

  const form = getTransactionFormResponse(e);

  updateParsingStatus(e, {
    status: "Parsed",
    parsedAt: new Date(),
    transactionRow: transactionRow,
    error: "",
    debug: getParseDebug(form)
  });

}

function markFormSubmitError(e, error) {

  updateParsingStatus(e, {
    status: "Error",
    parsedAt: new Date(),
    transactionRow: "",
    error: error && error.message ? error.message : String(error),
    debug: ""
  });

}

function updateParsingStatus(e, status) {

  if (!e || !e.range) {
    return;
  }

  const sheet = e.range.getSheet();

  if (!isTransactionFormSheet(sheet.getName())) {
    return;
  }

  ensureColumns(sheet, [
    "Parsing Status",
    "Parsed At",
    "Transaction Row",
    "Parsing Error",
    "Parsing Debug"
  ]);

  const headers = getHeaders(sheet);
  const row = e.range.getRow();

  setValueByHeader(sheet, headers, row, "Parsing Status", status.status);
  setValueByHeader(sheet, headers, row, "Parsed At", status.parsedAt);
  setValueByHeader(sheet, headers, row, "Transaction Row", status.transactionRow);
  setValueByHeader(sheet, headers, row, "Parsing Error", status.error);
  setValueByHeader(sheet, headers, row, "Parsing Debug", status.debug);

}

function setValueByHeader(sheet, headers, row, header, value) {

  const column = headers.indexOf(header) + 1;

  if (column > 0) {
    sheet.getRange(row, column).setValue(value);
  }

}

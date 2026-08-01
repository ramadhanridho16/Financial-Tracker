/**
 * ==========================================================
 * Financial Tracker Pro
 * Utilities.gs
 * ----------------------------------------------------------
 * Helper Functions
 * Tidak mengandung business logic.
 * ==========================================================
 */

/**
 * ==========================================================
 * SPREADSHEET
 * ==========================================================
 */

function getSpreadsheet() {

  const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (activeSpreadsheet) {
    return activeSpreadsheet;
  }

  if (CONFIG.APP.SPREADSHEET_ID) {
    return SpreadsheetApp.openById(CONFIG.APP.SPREADSHEET_ID);
  }

  throw new Error(
    "Spreadsheet tidak ditemukan. Buka script dari spreadsheet, atau isi CONFIG.APP.SPREADSHEET_ID."
  );

}

function getSheet(sheetName) {

  const sheet = getSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" tidak ditemukan.`);
  }

  return sheet;

}

function getHeaders(sheet) {

  return sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0];

}

function getLastRowData(sheet) {

  if (sheet.getLastRow() <= 1) return [];

  return sheet
    .getRange(
      sheet.getLastRow(),
      1,
      1,
      sheet.getLastColumn()
    )
    .getValues()[0];

}


/**
 * ==========================================================
 * GENERAL
 * ==========================================================
 */

function isEmpty(value) {

  return value === "" ||
         value === null ||
         value === undefined;

}

function normalizeText(text) {

  if (!text) return "";

  return text
    .toString()
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

}

function formatDate(date){

  return Utilities.formatDate(

      new Date(date),

      Session.getScriptTimeZone(),

      "dd/MM/yyyy"

  );

}

function formatCurrency(number){

  return "Rp " +

    Number(number)

      .toLocaleString("id-ID");

}


/**
 * ==========================================================
 * PARSER NUMBER
 * ==========================================================
 */

function parseNumber(value){

  if(isEmpty(value)) return 0;

  value = value.toString();

  value = value.replace(/\./g,"");

  value = value.replace(/,/g,".");

  return Number(value);

}


/**
 * ==========================================================
 * SMART AMOUNT PARSER
 * ==========================================================
 *
 * Mendukung:
 *
 * 25k
 * 25rb
 * 25 ribu
 * 2jt
 * 2 juta
 * 1,5jt
 * 1.5jt
 * 150000
 *
 */

function parseAmount(text){

  if(!text) return 0;

  text = normalizeText(text);

  const match = text.match(/(\d+[.,]?\d*)\s*(jt|juta|rb|ribu|k)?/i);

  if(!match){

    return 0;

  }

  let value = parseFloat(

      match[1].replace(",", ".")

  );

  const unit = (match[2] || "").toLowerCase();

  switch(unit){

    case "jt":

    case "juta":

      value *= 1000000;

      break;

    case "rb":

    case "ribu":

    case "k":

      value *= 1000;

      break;

  }

  return Math.round(value);

}


/**
 * ==========================================================
 * ID GENERATOR
 * ==========================================================
 *
 * TRX000001
 * LN000001
 * BD000001
 *
 */

function generateId(prefix, sheetName, column){

  const sheet = getSheet(sheetName);

  const lastRow = sheet.getLastRow();

  if(lastRow <= 1){

      return prefix + "000001";

  }

  const lastId = sheet

      .getRange(lastRow,column)

      .getValue()

      .toString();

  const number = parseInt(

      lastId.replace(prefix,""),

      10

  );

  const next = isNaN(number)

      ? 1

      : number + 1;

  return prefix +

      Utilities.formatString(

          "%06d",

          next

      );

}


/**
 * ==========================================================
 * SETTINGS
 * ==========================================================
 */

function getSetting(key){

  const sheet = getSheet(CONFIG.SHEETS.SETTINGS);

  const values = sheet

      .getDataRange()

      .getValues();

  values.shift();

  for(const row of values){

      if(row[0] === key || normalizeText(row[0]) === normalizeText(key)){

          return row[1];

      }

  }

  return null;

}

function getSettingNumber(key, defaultValue) {

  const value = getSetting(key);
  const number = Number(value);

  return isNaN(number) ? defaultValue : number;

}

function getCurrentFinancialPeriod(referenceDate) {

  const startDay = getSettingNumber("Awal Bulan", 1);
  const now = referenceDate ? new Date(referenceDate) : new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const startMonth = day >= startDay ? month : month - 1;
  const start = new Date(year, startMonth, startDay);
  const end = new Date(year, startMonth + 1, startDay);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return {
    start: start,
    end: end,
    label: formatDate(start) + " - " + formatDate(new Date(end.getTime() - 1))
  };

}

function isDateInPeriod(value, period) {

  if (!value || !period) {
    return false;
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return false;
  }

  return date >= period.start && date < period.end;

}


/**
 * ==========================================================
 * LOGGER
 * ==========================================================
 */

function log(message){

  Logger.log(message);

}

function logError(error){

  Logger.log("====================================");

  Logger.log("Financial Tracker Error");

  Logger.log(error);

  Logger.log("====================================");

}

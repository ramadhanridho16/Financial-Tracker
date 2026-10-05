/**
 * Akses data spreadsheet Home Inventory.
 *
 * Seluruh akses Spreadsheet lintas file dilakukan dari repository ini.
 */

/**
 * Mengambil spreadsheet Home Inventory yang terhubung.
 *
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getHomeInventorySpreadsheet() {

  return SpreadsheetApp.openById(CONFIG.HOME_INVENTORY.SPREADSHEET_ID);

}

/**
 * Mengambil sheet Home Inventory berdasarkan konfigurasi.
 *
 * @param {String} sheetName
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getHomeInventorySheet(sheetName) {

  const sheet = getHomeInventorySpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    throw new Error("Sheet Home Inventory tidak ditemukan: " + sheetName);
  }

  return sheet;

}

/**
 * Mengambil informasi koneksi tanpa mengubah data Home Inventory.
 *
 * @returns {Object}
 */
function getHomeInventoryConnectionDetails() {

  const spreadsheet = getHomeInventorySpreadsheet();
  const sheets = CONFIG.HOME_INVENTORY.SHEETS;

  return {
    spreadsheetName: spreadsheet.getName(),
    productMasterHeaders: getHomeInventorySheetHeaders(sheets.PRODUCT_MASTER),
    inventoryHeaders: getHomeInventorySheetHeaders(sheets.INVENTORY),
    transactionHeaders: getHomeInventorySheetHeaders(sheets.TRANSACTION)
  };

}

/**
 * Mengambil header sebuah sheet Home Inventory.
 *
 * @param {String} sheetName
 * @returns {Array<String>}
 */
function getHomeInventorySheetHeaders(sheetName) {

  const sheet = getHomeInventorySheet(sheetName);
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

}

/**
 * Mencari produk aktif yang namanya muncul pada input transaksi.
 *
 * @param {String} input
 * @returns {Object|null}
 */
function findHomeInventoryProduct(input) {

  const sheet = getHomeInventorySheet(
    CONFIG.HOME_INVENTORY.SHEETS.PRODUCT_MASTER
  );
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const columns = getHomeInventoryProductColumns(headers);

  return values
    .map((row, index) => createHomeInventoryProduct(row, columns, index + 2))
    .filter(product => product.productId && product.active)
    .sort((first, second) => second.productName.length - first.productName.length)
    .find(product => containsProductName(input, product.productName)) || null;

}

/**
 * Menambah stok produk pada sheet Inventory.
 *
 * @param {Object} product
 * @param {Number} quantity
 * @returns {Number}
 */
function addHomeInventoryStock(product, quantity) {

  const sheet = getHomeInventorySheet(CONFIG.HOME_INVENTORY.SHEETS.INVENTORY);
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || [];
  const columns = getHomeInventoryStockColumns(headers);
  const rowIndex = findHomeInventoryStockRow(values, columns.productId, product.productId);

  if (rowIndex === -1) {
    return appendHomeInventoryStock(sheet, headers, columns, product, quantity);
  }

  const currentStock = Number(values[rowIndex][columns.stock] || 0);
  const newStock = currentStock + quantity;
  sheet.getRange(rowIndex + 1, columns.stock + 1).setValue(newStock);
  return newStock;

}

/**
 * Mencatat pembelian barang ke riwayat Home Inventory.
 *
 * @param {Object} purchase
 * @returns {Number}
 */
function saveHomeInventoryPurchase(purchase) {

  const sheet = getHomeInventorySheet(
    CONFIG.HOME_INVENTORY.SHEETS.TRANSACTION
  );
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const record = Object.assign({}, purchase, {
    inventoryTransactionId: Utilities.getUuid()
  });
  const row = headers.map(header => getHomeInventoryPurchaseValue(header, record));

  sheet.appendRow(row);
  return sheet.getLastRow();

}

/**
 * Mengambil indeks kolom Product Master.
 *
 * @param {Array<String>} headers
 * @returns {Object}
 */
function getHomeInventoryProductColumns(headers) {

  return {
    productId: findHomeInventoryHeader(headers, CONFIG.HOME_INVENTORY.HEADERS.PRODUCT_ID),
    productName: findHomeInventoryHeader(headers, CONFIG.HOME_INVENTORY.HEADERS.PRODUCT_NAME),
    unit: findHomeInventoryHeader(headers, CONFIG.HOME_INVENTORY.HEADERS.PRODUCT_UNIT),
    active: findHomeInventoryHeader(headers, CONFIG.HOME_INVENTORY.HEADERS.PRODUCT_ACTIVE)
  };

}

/**
 * Membentuk data produk dari satu baris Product Master.
 *
 * @param {Array<*>} row
 * @param {Object} columns
 * @param {Number} rowNumber
 * @returns {Object}
 */
function createHomeInventoryProduct(row, columns, rowNumber) {

  return {
    productId: getHomeInventoryCell(row, columns.productId),
    productName: getHomeInventoryCell(row, columns.productName),
    unit: getHomeInventoryCell(row, columns.unit),
    active: isHomeInventoryProductActive(getHomeInventoryCell(row, columns.active)),
    rowNumber: rowNumber
  };

}

/**
 * Mengambil indeks kolom stok yang diperlukan.
 *
 * @param {Array<String>} headers
 * @returns {Object}
 */
function getHomeInventoryStockColumns(headers) {

  const columns = {
    productId: findHomeInventoryHeader(headers, CONFIG.HOME_INVENTORY.HEADERS.PRODUCT_ID),
    productName: findHomeInventoryHeader(headers, CONFIG.HOME_INVENTORY.HEADERS.PRODUCT_NAME),
    stock: findHomeInventoryHeader(headers, CONFIG.HOME_INVENTORY.HEADERS.STOCK),
    unit: findHomeInventoryHeader(headers, CONFIG.HOME_INVENTORY.HEADERS.PRODUCT_UNIT)
  };

  if (columns.productId < 0 || columns.stock < 0) {
    throw new Error("Kolom Product ID atau Stock tidak ditemukan pada Inventory.");
  }

  return columns;

}

/**
 * Menambah baris stok bila produk belum ada di Inventory.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Array<String>} headers
 * @param {Object} columns
 * @param {Object} product
 * @param {Number} quantity
 * @returns {Number}
 */
function appendHomeInventoryStock(sheet, headers, columns, product, quantity) {

  const row = headers.map(() => "");
  row[columns.productId] = product.productId;
  row[columns.stock] = quantity;

  if (columns.productName >= 0) {
    row[columns.productName] = product.productName;
  }

  if (columns.unit >= 0) {
    row[columns.unit] = product.unit;
  }

  sheet.appendRow(row);
  return quantity;

}

/**
 * Mencari baris stok berdasarkan Product ID.
 *
 * @param {Array<Array<*>>} values
 * @param {Number} productIdColumn
 * @param {String} productId
 * @returns {Number}
 */
function findHomeInventoryStockRow(values, productIdColumn, productId) {

  return values.findIndex((row, index) => index > 0 &&
    String(row[productIdColumn]) === String(productId));

}

/**
 * Mengambil indeks header berdasarkan daftar nama yang didukung.
 *
 * @param {Array<String>} headers
 * @param {Array<String>} names
 * @returns {Number}
 */
function findHomeInventoryHeader(headers, names) {

  return headers.findIndex(header => names.some(name =>
    normalizeText(header) === normalizeText(name)
  ));

}

/**
 * Mengambil nilai sel secara aman.
 *
 * @param {Array<*>} row
 * @param {Number} column
 * @returns {*}
 */
function getHomeInventoryCell(row, column) {

  return column >= 0 ? row[column] : "";

}

/**
 * Mengecek apakah produk ditandai aktif.
 *
 * @param {*} value
 * @returns {Boolean}
 */
function isHomeInventoryProductActive(value) {

  return value === true || value === 1 || normalizeText(value) === "true";

}

/**
 * Mengecek kecocokan nama produk pada teks.
 *
 * @param {String} input
 * @param {String} productName
 * @returns {Boolean}
 */
function containsProductName(input, productName) {

  const escapedName = normalizeText(productName).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp("\\b" + escapedName + "\\b", "i");
  return pattern.test(normalizeText(input));

}

/**
 * Menyusun nilai kolom riwayat pembelian berdasarkan nama header.
 *
 * @param {String} header
 * @param {Object} purchase
 * @returns {*}
 */
function getHomeInventoryPurchaseValue(header, purchase) {

  const headers = CONFIG.HOME_INVENTORY.HEADERS;
  const value = normalizeText(header);

  if (matchesHomeInventoryHeader(value, headers.TRANSACTION_ID)) return purchase.inventoryTransactionId;
  if (matchesHomeInventoryHeader(value, headers.TYPE)) return "PURCHASE";
  if (matchesHomeInventoryHeader(value, headers.PRODUCT_ID)) return purchase.product.productId;
  if (matchesHomeInventoryHeader(value, headers.PRODUCT_NAME)) return purchase.product.productName;
  if (matchesHomeInventoryHeader(value, headers.QUANTITY)) return purchase.quantity;
  if (matchesHomeInventoryHeader(value, headers.PRODUCT_UNIT)) return purchase.product.unit;
  if (matchesHomeInventoryHeader(value, headers.DATE)) return purchase.transaction.date;
  if (matchesHomeInventoryHeader(value, headers.UNIT_PRICE)) return purchase.transaction.amount / purchase.quantity;
  if (matchesHomeInventoryHeader(value, headers.TOTAL)) return purchase.transaction.amount;
  if (matchesHomeInventoryHeader(value, headers.NOTE)) return purchase.transaction.description;
  return "";

}

/**
 * Mengecek apakah sebuah header ada dalam daftar nama.
 *
 * @param {String} header
 * @param {Array<String>} names
 * @returns {Boolean}
 */
function matchesHomeInventoryHeader(header, names) {

  return names.some(name => header === normalizeText(name));

}

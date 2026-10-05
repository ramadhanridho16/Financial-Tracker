/**
 * Sinkronisasi pembelian Financial Tracker ke Home Inventory.
 */

/**
 * Menyinkronkan seluruh transaksi pembelian inventory.
 *
 * @param {Array<Object>} transactions
 * @returns {Number}
 */
function syncInventoryPurchases(transactions) {

  return transactions.reduce((count, transaction) =>
    syncInventoryPurchase(transaction) ? count + 1 : count, 0);

}

/**
 * Menguji akses ke Home Inventory tanpa menulis atau mengubah data.
 * Jalankan fungsi ini secara manual dari editor Apps Script.
 *
 * @returns {Object}
 */
function testHomeInventoryConnection() {

  try {
    const details = getHomeInventoryConnectionDetails();

    Logger.log("Home Inventory tersambung: " + details.spreadsheetName);
    Logger.log("Product_Master: " + details.productMasterHeaders.join(", "));
    Logger.log("Inventory: " + details.inventoryHeaders.join(", "));
    Logger.log("Transaction: " + details.transactionHeaders.join(", "));
    return details;
  } catch (error) {
    Logger.log("Home Inventory tidak tersambung: " + error.message);
    throw error;
  }

}

/**
 * Menyinkronkan satu transaksi bila merupakan pembelian produk inventory.
 *
 * @param {Object} transaction
 * @returns {Boolean}
 */
function syncInventoryPurchase(transaction) {

  if (!isInventoryPurchase(transaction)) {
    return false;
  }

  try {
    const product = findHomeInventoryProduct(transaction.sourceInput);

    if (!product) {
      return false;
    }

    const quantity = extractInventoryQuantity(transaction.sourceInput, product.unit);
    addHomeInventoryStock(product, quantity);
    saveHomeInventoryPurchase({ product: product, quantity: quantity, transaction: transaction });
    return true;
  } catch (error) {
    logError(error);
    return false;
  }

}

/**
 * Mengecek apakah input memakai kata perintah pembelian inventory.
 *
 * @param {Object} transaction
 * @returns {Boolean}
 */
function isInventoryPurchase(transaction) {

  const input = normalizeText(transaction.sourceInput || transaction.description);

  return CONFIG.HOME_INVENTORY.PURCHASE_KEYWORDS.some(keyword =>
    new RegExp("\\b" + normalizeText(keyword) + "\\b", "i").test(input)
  );

}

/**
 * Mengambil jumlah barang berdasarkan angka yang diikuti unit produk.
 *
 * @param {String} input
 * @param {String} unit
 * @returns {Number}
 */
function extractInventoryQuantity(input, unit) {

  const escapedUnit = normalizeText(unit).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp("\\b(\\d+[.,]?\\d*)\\s*" + escapedUnit + "s?\\b", "i");
  const match = normalizeText(input).match(pattern);

  return match ? Number(match[1].replace(",", ".")) : 1;

}

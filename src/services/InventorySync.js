/**
 * Sinkronisasi pembelian Financial Tracker ke Home Inventory.
 */

/**
 * Menyinkronkan seluruh transaksi pembelian inventory.
 *
 * @param {Array<Object>} transactions
 * @returns {Array<Object>} Daftar hasil transaksi yang berhasil disinkronkan.
 */
function syncInventoryPurchases(transactions) {
  if (!transactions || !Array.isArray(transactions)) {
    return [];
  }

  const results = [];
  for (let i = 0; i < transactions.length; i++) {
    const syncResult = syncInventoryPurchase(transactions[i]);
    if (syncResult) {
      results.push(syncResult);
    }
  }

  return results;
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
    Logger.log("Master Sheet (" + details.masterSheetName + "): " + details.productMasterHeaders.join(", "));
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
 * @returns {Object|null}
 */
function syncInventoryPurchase(transaction) {
  if (!transaction || !isInventoryPurchase(transaction)) {
    return null;
  }

  try {
    const rawText = transaction.sourceInput || transaction.description || "";
    const product = findHomeInventoryProduct(rawText);

    if (!product) {
      return null;
    }

    const quantity = extractInventoryQuantity(rawText, product.unit, product.matchedTerm);
    const stockResult = syncHomeInventoryStock(product, quantity);
    saveHomeInventoryPurchase({ product: product, quantity: quantity, transaction: transaction });

    const result = {
      product: product,
      quantity: quantity,
      newStock: stockResult.newStock,
      status: stockResult.status
    };

    // Kirim notifikasi instan ke Bot Telegram Home Inventory
    notifyHomeInventoryPurchase(result, transaction);

    return result;
  } catch (error) {
    if (typeof logError === "function") {
      logError(error);
    } else {
      Logger.log("Gagal sinkronisasi Home Inventory: " + error.message);
    }
    return null;
  }
}

/**
 * Menyusun dan mengirim notifikasi pembelian ke bot Telegram Home Inventory.
 *
 * @param {Object} syncResult
 * @param {Object} transaction
 * @returns {Boolean}
 */
function notifyHomeInventoryPurchase(syncResult, transaction) {
  try {
    const product = syncResult.product;
    const qty = syncResult.quantity;
    const unit = product.unit ? " " + product.unit : "";
    const totalAmount = Number(transaction.amount) || 0;
    const unitPrice = (qty > 0 && totalAmount > 0) ? Math.round(totalAmount / qty) : 0;

    let statusBadge = "";
    if (syncResult.status === "OUT_OF_STOCK") {
      statusBadge = "`OUT_OF_STOCK` 🚫";
    } else if (syncResult.status === "LOW_STOCK") {
      statusBadge = "`LOW_STOCK` ⚠️";
    } else {
      statusBadge = "`IN_STOCK` ✅";
    }

    let message = "📥 *Stok Masuk (dari Financial Tracker)*\n\n" +
      "• *Barang:* " + product.productName + " (`" + product.productId + "`)\n";

    if (product.category) {
      message += "• *Kategori:* " + product.category + "\n";
    }

    message += "• *Jumlah Masuk:* +" + qty + unit + "\n" +
      "• *Stok Sekarang:* *" + syncResult.newStock + unit + "*\n" +
      "• *Status Stok:* " + statusBadge + "\n";

    if (totalAmount > 0) {
      message += "• *Total Belanja:* " + formatCurrency(totalAmount);
      if (qty > 1 && unitPrice > 0) {
        message += " (" + formatCurrency(unitPrice) + "/" + (product.unit || "unit") + ")";
      }
      message += "\n";
    }

    const note = transaction.sourceInput || transaction.description || "";
    if (note) {
      message += "• *Keterangan:* _" + note + "_\n";
    }

    const nowFormatted = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm") + " WIB";
    message += "• *Waktu:* " + nowFormatted;

    return sendHomeInventoryTelegramNotification(message);
  } catch (err) {
    Logger.log("Peringatan: Gagal memproses notifikasi Home Inventory: " + err.message);
    return false;
  }
}

/**
 * Mengecek apakah transaksi berpotensi merupakan pembelian inventory.
 * Transaksi bertipe INCOME atau TRANSFER otomatis diabaikan.
 *
 * @param {Object} transaction
 * @returns {Boolean}
 */
function isInventoryPurchase(transaction) {
  const type = String(transaction.transactionType || "").toUpperCase();
  if (type === "INCOME" || type === "TRANSFER") {
    return false;
  }

  return true;
}

/**
 * Mengambil jumlah barang secara cerdas:
 * 1. Angka diikuti satuan produk atau unit umum (misal: "2 kg", "1 liter").
 * 2. Angka di depan atau di belakang nama produk (misal: "2 beras", "sabun 3").
 * Mengabaikan angka nominal harga (seperti 50k, 25rb, 15000).
 *
 * @param {String} input
 * @param {String} unit
 * @param {String=} matchedTerm
 * @returns {Number}
 */
function extractInventoryQuantity(input, unit, matchedTerm) {
  if (!input) return 1;

  const normalized = normalizeText(input);

  // 1. Cek angka diikuti satuan produk (misal: "2 kg", "2 botol", "1.5 liter")
  if (unit) {
    const escapedUnit = normalizeText(unit).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const unitPattern = new RegExp("(?:^|[^a-zA-Z0-9])(\\d+[.,]?\\d*)\\s*" + escapedUnit + "s?(?:$|[^a-zA-Z0-9])", "i");
    const match = normalized.match(unitPattern);
    if (match) {
      const parsed = Number(match[1].replace(",", "."));
      if (parsed > 0 && parsed < 500) return parsed;
    }
  }

  // Cek satuan umum lainnya (kg, liter, botol, bungkus, pcs, butir, dus, pack, lembar, porsi, kaleng)
  const commonUnitPattern = /(?:^|[^a-zA-Z0-9])(\d+[.,]?\\d*)\\s*(?:kg|liter|botol|bungkus|pcs|butir|dus|pack|lembar|porsi|kaleng)(?:$|[^a-zA-Z0-9])/i;
  const commonMatch = normalized.match(commonUnitPattern);
  if (commonMatch) {
    const parsedCommon = Number(commonMatch[1].replace(",", "."));
    if (parsedCommon > 0 && parsedCommon < 500) return parsedCommon;
  }

  // 2. Cek angka di depan nama produk / matchedTerm (misal: "beli 2 beras 50k" -> "2 beras")
  if (matchedTerm) {
    const escapedTerm = normalizeText(matchedTerm).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const beforeTermPattern = new RegExp("(?:^|[^a-zA-Z0-9])(\\d+[.,]?\\d*)\\s*" + escapedTerm, "i");
    const beforeMatch = normalized.match(beforeTermPattern);
    if (beforeMatch) {
      const parsedBefore = Number(beforeMatch[1].replace(",", "."));
      if (parsedBefore > 0 && parsedBefore < 500) return parsedBefore;
    }

    // Cek angka di belakang nama produk (misal: "beras 2 50k")
    const afterTermPattern = new RegExp(escapedTerm + "\\s*(\\d+[.,]?\\d*)(?:$|[^a-zA-Z0-9])", "i");
    const afterMatch = normalized.match(afterTermPattern);
    if (afterMatch) {
      const parsedAfter = Number(afterMatch[1].replace(",", "."));
      // Pastikan bukan angka harga (harga biasanya diakhiri k/rb atau bernilai >= 500)
      if (parsedAfter > 0 && parsedAfter < 500) return parsedAfter;
    }
  }

  // 3. Fallback: Cari angka standalone di input yang bukan harga
  // Pisahkan token dan buang token harga (yang mengandung k, rb, ribu, atau bernilai >= 500)
  const tokens = normalized.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    // Jika token adalah angka murni
    if (/^\d+$/.test(tok)) {
      const val = Number(tok);
      if (val > 0 && val < 100) {
        // Cek apakah token berikutnya adalah kata kunci harga (k, rb, ribu)
        const nextTok = tokens[i + 1] || "";
        if (!/^(k|rb|ribu|jt|juta)$/i.test(nextTok)) {
          return val;
        }
      }
    }
  }

  return 1;
}

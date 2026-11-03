/**
 * Akses data spreadsheet Home Inventory.
 *
 * Seluruh akses Spreadsheet lintas file dilakukan dari repository ini.
 */

/**
 * Mengambil ID Spreadsheet Home Inventory aktif.
 * Memprioritaskan ScriptProperties, lalu sheet Settings, lalu CONFIG.
 *
 * @returns {String}
 */
function getHomeInventorySpreadsheetId() {
  const propertyId = PropertiesService.getScriptProperties()
    .getProperty("HOME_INVENTORY_SPREADSHEET_ID");
  if (propertyId) return propertyId;

  const settingId = getSetting("Home Inventory Spreadsheet ID");
  if (settingId) return settingId;

  return CONFIG.HOME_INVENTORY.SPREADSHEET_ID || "";
}

/**
 * Mengambil spreadsheet Home Inventory yang terhubung.
 *
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getHomeInventorySpreadsheet() {
  const id = getHomeInventorySpreadsheetId();
  if (!id) {
    throw new Error("ID Spreadsheet Home Inventory belum dikonfigurasi. Atur di Script Properties atau sheet Settings.");
  }
  return SpreadsheetApp.openById(id);
}

/**
 * Mengambil sheet Home Inventory berdasarkan konfigurasi.
 * Mendukung fallback sheet Master_Barang -> Product_Master.
 *
 * @param {String} sheetName
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getHomeInventorySheet(sheetName) {
  const spreadsheet = getHomeInventorySpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet && (sheetName === "Master_Barang" || sheetName === "Product_Master")) {
    sheet = spreadsheet.getSheetByName("Master_Barang") || spreadsheet.getSheetByName("Product_Master");
  }

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
  const masterSheetName = spreadsheet.getSheetByName(sheets.MASTER_BARANG || "Master_Barang") ?
    (sheets.MASTER_BARANG || "Master_Barang") : sheets.PRODUCT_MASTER;

  return {
    spreadsheetName: spreadsheet.getName(),
    masterSheetName: masterSheetName,
    productMasterHeaders: getHomeInventorySheetHeaders(masterSheetName),
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
 * Mencari produk aktif yang namanya atau aliasnya muncul pada input teks.
 *
 * @param {String} input
 * @returns {Object|null}
 */
function findHomeInventoryProduct(input) {
  if (!input) return null;

  const masterSheetName = CONFIG.HOME_INVENTORY.SHEETS.MASTER_BARANG || "Master_Barang";
  const sheet = getHomeInventorySheet(masterSheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return null;

  const headers = values.shift();
  const columns = getHomeInventoryProductColumns(headers);

  const products = values
    .map((row, index) => createHomeInventoryProduct(row, columns, index + 2))
    .filter(product => product.productId && product.active);

  // Buat daftar kandidat pencocokan (nama barang + seluruh alias)
  const candidates = [];
  products.forEach(product => {
    // Tambahkan nama produk
    if (product.productName) {
      candidates.push({
        term: String(product.productName).trim(),
        product: product
      });
    }
    // Tambahkan masing-masing alias jika ada
    if (product.aliases && Array.isArray(product.aliases)) {
      product.aliases.forEach(alias => {
        if (alias && alias.length > 0) {
          candidates.push({
            term: alias,
            product: product
          });
        }
      });
    }
  });

  // Urutkan kandidat berdasarkan panjang term terpanjang (longest match wins)
  candidates.sort((a, b) => b.term.length - a.term.length);

  const normalizedInput = normalizeText(input);

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const escapedTerm = normalizeText(candidate.term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp("(?:^|[^a-zA-Z0-9])" + escapedTerm + "(?:$|[^a-zA-Z0-9])", "i");
    if (pattern.test(normalizedInput)) {
      // Pasang matchedTerm ke product untuk keperluan parsing kuantitas
      return Object.assign({}, candidate.product, { matchedTerm: candidate.term });
    }
  }

  return null;
}

/**
 * Mengambil indeks kolom Master Barang.
 *
 * @param {Array<String>} headers
 * @returns {Object}
 */
function getHomeInventoryProductColumns(headers) {
  return {
    productId: findHomeInventoryHeader(headers, CONFIG.HOME_INVENTORY.HEADERS.PRODUCT_ID),
    productName: findHomeInventoryHeader(headers, CONFIG.HOME_INVENTORY.HEADERS.PRODUCT_NAME),
    alias: findHomeInventoryHeader(headers, CONFIG.HOME_INVENTORY.HEADERS.ALIAS || ["Alias", "Aliases"]),
    category: findHomeInventoryHeader(headers, CONFIG.HOME_INVENTORY.HEADERS.CATEGORY || ["Kategori", "Category"]),
    unit: findHomeInventoryHeader(headers, CONFIG.HOME_INVENTORY.HEADERS.PRODUCT_UNIT),
    minimumStock: findHomeInventoryHeader(headers, CONFIG.HOME_INVENTORY.HEADERS.MINIMUM_STOCK || ["Stok Minimum", "Minimum Stock"]),
    active: findHomeInventoryHeader(headers, CONFIG.HOME_INVENTORY.HEADERS.PRODUCT_ACTIVE)
  };
}

/**
 * Membentuk data produk dari satu baris Master Barang.
 *
 * @param {Array<*>} row
 * @param {Object} columns
 * @param {Number} rowNumber
 * @returns {Object}
 */
function createHomeInventoryProduct(row, columns, rowNumber) {
  const rawAlias = getHomeInventoryCell(row, columns.alias);
  const aliases = typeof rawAlias === "string"
    ? rawAlias.split(",").map(a => a.trim()).filter(Boolean)
    : [];

  const rawMinStock = getHomeInventoryCell(row, columns.minimumStock);
  const minimumStock = Number(rawMinStock) || 0;

  return {
    productId: String(getHomeInventoryCell(row, columns.productId)),
    productName: String(getHomeInventoryCell(row, columns.productName)),
    aliases: aliases,
    category: String(getHomeInventoryCell(row, columns.category) || ""),
    unit: String(getHomeInventoryCell(row, columns.unit) || ""),
    minimumStock: minimumStock,
    active: isHomeInventoryProductActive(getHomeInventoryCell(row, columns.active)),
    rowNumber: rowNumber
  };
}

/**
 * Memperbarui stok dan status produk pada sheet Inventory Home Inventory.
 *
 * @param {Object} product
 * @param {Number} quantity
 * @returns {{ newStock: Number, status: String }}
 */
function syncHomeInventoryStock(product, quantity) {
  const sheet = getHomeInventorySheet(CONFIG.HOME_INVENTORY.SHEETS.INVENTORY);
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || [];
  const columns = getHomeInventoryStockColumns(headers);
  const rowIndex = findHomeInventoryStockRow(values, columns.productId, product.productId);

  let currentStock = 0;
  if (rowIndex !== -1) {
    currentStock = Number(values[rowIndex][columns.stock] || 0);
  }

  const newStock = currentStock + quantity;
  const status = deriveHomeInventoryStatus(newStock, product.minimumStock);
  const now = new Date();

  if (rowIndex === -1) {
    // Baris belum ada di Inventory -> append row baru
    appendHomeInventoryStock(sheet, headers, columns, product, newStock, status, now);
  } else {
    // Update baris yang sudah ada
    const targetRow = rowIndex + 1;
    sheet.getRange(targetRow, columns.stock + 1).setValue(newStock);
    if (columns.unit >= 0 && product.unit) {
      sheet.getRange(targetRow, columns.unit + 1).setValue(product.unit);
    }
    if (columns.lastUpdate >= 0) {
      sheet.getRange(targetRow, columns.lastUpdate + 1).setValue(now);
    }
    if (columns.status >= 0) {
      sheet.getRange(targetRow, columns.status + 1).setValue(status);
    }
  }

  return { newStock: newStock, status: status };
}

/**
 * Menurunkan status stok sesuai aturan Home Inventory.
 *
 * @param {Number} currentStock
 * @param {Number} minimumStock
 * @returns {String}
 */
function deriveHomeInventoryStatus(currentStock, minimumStock) {
  if (currentStock <= 0) {
    return "OUT_OF_STOCK";
  }
  if (minimumStock && currentStock <= minimumStock) {
    return "LOW_STOCK";
  }
  return "IN_STOCK";
}

/**
 * Mengambil indeks kolom stok yang diperlukan pada Inventory.
 *
 * @param {Array<String>} headers
 * @returns {Object}
 */
function getHomeInventoryStockColumns(headers) {
  const columns = {
    productId: findHomeInventoryHeader(headers, CONFIG.HOME_INVENTORY.HEADERS.PRODUCT_ID),
    productName: findHomeInventoryHeader(headers, CONFIG.HOME_INVENTORY.HEADERS.PRODUCT_NAME),
    stock: findHomeInventoryHeader(headers, CONFIG.HOME_INVENTORY.HEADERS.STOCK),
    unit: findHomeInventoryHeader(headers, CONFIG.HOME_INVENTORY.HEADERS.PRODUCT_UNIT),
    lastUpdate: findHomeInventoryHeader(headers, ["Last Update", "Terakhir Diperbarui", "Update"]),
    status: findHomeInventoryHeader(headers, ["Status"])
  };

  if (columns.productId < 0 || columns.stock < 0) {
    throw new Error("Kolom Product ID atau Stock tidak ditemukan pada Inventory.");
  }

  return columns;
}

/**
 * Menambah baris baru pada sheet Inventory.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Array<String>} headers
 * @param {Object} columns
 * @param {Object} product
 * @param {Number} stock
 * @param {String} status
 * @param {Date} now
 * @returns {Number}
 */
function appendHomeInventoryStock(sheet, headers, columns, product, stock, status, now) {
  const row = headers.map(() => "");
  row[columns.productId] = product.productId;
  row[columns.stock] = stock;

  if (columns.productName >= 0) row[columns.productName] = product.productName;
  if (columns.unit >= 0) row[columns.unit] = product.unit;
  if (columns.lastUpdate >= 0) row[columns.lastUpdate] = now;
  if (columns.status >= 0) row[columns.status] = status;

  sheet.appendRow(row);
  return stock;
}

/**
 * Mencatat transaksi pembelian barang ke sheet Transaction Home Inventory.
 * Mengikuti schema resmi 10 kolom:
 * A: Transaction ID
 * B: Tanggal
 * C: Product ID
 * D: Barang
 * E: Jenis (PURCHASE)
 * F: Qty
 * G: Harga Satuan
 * H: Total (Formula)
 * I: Supplier/Toko
 * J: Catatan
 *
 * @param {Object} purchase
 * @returns {Number} Baris yang ditambahkan.
 */
function saveHomeInventoryPurchase(purchase) {
  const sheet = getHomeInventorySheet(CONFIG.HOME_INVENTORY.SHEETS.TRANSACTION);
  const targetRow = sheet.getLastRow() + 1;
  const transactionId = "TRX-" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random() * 1000);
  const date = purchase.transaction.date || new Date();
  const unitPrice = (purchase.quantity > 0 && purchase.transaction.amount > 0)
    ? Math.round(purchase.transaction.amount / purchase.quantity)
    : "";
  const supplier = purchase.transaction.merchant || "";
  const note = "Via Financial Tracker: " + (purchase.transaction.sourceInput || purchase.transaction.description || "");

  // Tulis 10 kolom data
  sheet.getRange(targetRow, 1, 1, 10).setValues([[
    transactionId,
    date,
    purchase.product.productId,
    purchase.product.productName,
    "PURCHASE",
    purchase.quantity,
    unitPrice,
    "", // Kolom Total diset via formula
    supplier,
    note
  ]]);

  // Pasang formula Total di kolom H (8)
  sheet.getRange(targetRow, 8).setFormula("=IF(G" + targetRow + '="";"";F' + targetRow + "*G" + targetRow + ")");

  return targetRow;
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
 * Membaca konfigurasi bot Telegram Home Inventory dari sheet Config Home Inventory.
 *
 * @returns {{ botToken: String, chatId: String, enabled: Boolean }|null}
 */
function getHomeInventoryTelegramConfig() {
  try {
    const spreadsheet = getHomeInventorySpreadsheet();
    const sheet = spreadsheet.getSheetByName("Config");
    if (!sheet || sheet.getLastRow() <= 1) {
      return null;
    }

    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    const configMap = {};
    values.forEach(row => {
      const key = String(row[0] || "").trim();
      const val = String(row[1] || "").trim();
      if (key) {
        configMap[key] = val;
      }
    });

    const botToken = configMap["TELEGRAM_BOT_TOKEN"];
    const chatId = configMap["TELEGRAM_CHAT_ID"];
    const enabled = configMap["TELEGRAM_NOTIFICATIONS_ENABLED"] !== "false";

    if (!botToken || !chatId) {
      return null;
    }

    return {
      botToken: botToken,
      chatId: chatId,
      enabled: enabled
    };
  } catch (error) {
    Logger.log("Peringatan: Gagal membaca konfigurasi Telegram Home Inventory: " + error.message);
    return null;
  }
}

/**
 * Mengirim pesan notifikasi ke bot Telegram Home Inventory.
 * Aman dan terisolasi dari kegagalan transaksi spreadsheet.
 *
 * @param {String} message Pesan berformat Markdown.
 * @returns {Boolean} True jika notifikasi berhasil dikirim.
 */
function sendHomeInventoryTelegramNotification(message) {
  if (!message) return false;

  try {
    const config = getHomeInventoryTelegramConfig();
    if (!config || !config.enabled) {
      return false;
    }

    const url = "https://api.telegram.org/bot" + config.botToken + "/sendMessage";
    const payload = {
      chat_id: config.chatId,
      text: message,
      parse_mode: "Markdown"
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      return true;
    }

    Logger.log("Gagal mengirim notifikasi ke Home Inventory Telegram Bot (HTTP " + code + "): " + response.getContentText());
    return false;
  } catch (error) {
    Logger.log("Peringatan: Pengiriman notifikasi ke Home Inventory Telegram Bot gagal: " + error.message);
    return false;
  }
}

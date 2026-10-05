/**
 * ==========================================================
 * Financial Tracker Pro
 * Transaction.gs
 * ----------------------------------------------------------
 * Mengelola seluruh transaksi.
 * Hanya file ini yang boleh menulis ke sheet Transactions.
 * ==========================================================
 */


/**
 * Menyimpan Transaction Object
 * ke sheet Transactions.
 *
 * @param {Object} transaction
 * @returns {String} TransactionID
 */
function saveTransaction(transaction){

  if(!transaction){
    throw new Error("Transaction Object kosong.");
  }

  const sheet = getSheet(CONFIG.SHEETS.TRANSACTIONS);

  const row = [

    transaction.timestamp || new Date(),
    transaction.date,
    transaction.transactionType,
    transaction.walletName,
    transaction.targetWalletName || "",
    transaction.category,
    transaction.description,
    transaction.amount,
    transaction.note

  ];

  sheet.appendRow(row);

  return sheet.getLastRow();

}

/**
 * Mengambil transaksi berdasarkan ID.
 *
 * @param {String} transactionId
 * @returns {Object|null}
 */
function getTransactionById(transactionId){

  const sheet = getSheet(CONFIG.SHEETS.TRANSACTIONS);

  const data = sheet.getDataRange().getValues();

  data.shift();

  for(const row of data){

    if(row[0] === transactionId){

      return {

        transactionId : row[0],

        date : row[1],

        transactionType : row[2],

        walletId : row[3],

        walletName : row[4],

        referenceType : row[5],

        referenceId : row[6],

        category : row[7],

        subCategory : row[8],

        merchant : row[9],

        description : row[10],

        amount : row[11],

        note : row[12],

        attachment : row[13],

        createdAt : row[14],

        updatedAt : row[15]

      };

    }

  }

  return null;

}

/**
/**
 * Mengambil seluruh transaksi dari sheet Transactions.
 *
 * @returns {Array<Object>}
 */
function getTransactions(){

  const sheet = getSheet(CONFIG.SHEETS.TRANSACTIONS);
  const data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return [];
  }

  const headers = data.shift();
  const headerMap = getTransactionHeaderMap(headers);

  return data.map(row => mapTransactionRow(row, headerMap));

}

/**
 * Memetakan indeks kolom transaksi berdasarkan header.
 *
 * @param {Array<String>} headers
 * @returns {Object}
 */
function getTransactionHeaderMap(headers) {

  const normalized = headers.map(h => normalizeText(h));

  return {
    date: findHeaderIndex(normalized, ["tanggal", "date"]),
    type: findHeaderIndex(normalized, ["jenis", "transaction type", "type"]),
    wallet: findHeaderIndex(normalized, ["wallet", "dompet"]),
    targetWallet: findHeaderIndex(normalized, ["wallet tujuan", "target wallet"]),
    category: findHeaderIndex(normalized, ["kategori", "category"]),
    description: findHeaderIndex(normalized, ["keterangan", "description"]),
    amount: findHeaderIndex(normalized, ["nominal", "amount", "jumlah"]),
    note: findHeaderIndex(normalized, ["catatan", "note"])
  };

}

/**
 * Mencari indeks header dari daftar nama alias.
 *
 * @param {Array<String>} headers
 * @param {Array<String>} aliases
 * @returns {Number}
 */
function findHeaderIndex(headers, aliases) {

  for (let i = 0; i < aliases.length; i++) {
    const idx = headers.indexOf(aliases[i]);
    if (idx !== -1) return idx;
  }

  return -1;

}

/**
 * Mengubah satu baris sheet menjadi Transaction Object.
 *
 * @param {Array<*>} row
 * @param {Object} map
 * @returns {Object}
 */
function mapTransactionRow(row, map) {

  if (map.amount !== -1) {
    return {
      transactionId: "",
      timestamp: row[0],
      date: map.date !== -1 ? row[map.date] : row[1],
      transactionType: map.type !== -1 ? row[map.type] : CONFIG.DEFAULT.TRANSACTION_TYPE,
      walletId: "",
      walletName: map.wallet !== -1 ? row[map.wallet] : "",
      targetWalletId: "",
      targetWalletName: map.targetWallet !== -1 ? row[map.targetWallet] : "",
      referenceType: "",
      referenceId: "",
      category: map.category !== -1 ? row[map.category] : CONFIG.DEFAULT.CATEGORY,
      subCategory: "",
      merchant: "",
      description: map.description !== -1 ? row[map.description] : "",
      amount: Number(row[map.amount] || 0),
      note: map.note !== -1 ? row[map.note] : "",
      attachment: "",
      createdAt: "",
      updatedAt: ""
    };
  }

  return mapFallbackTransactionRow(row);

}

/**
 * Fallback mapping transaksi berdasarkan panjang baris legacy.
 *
 * @param {Array<*>} row
 * @returns {Object}
 */
function mapFallbackTransactionRow(row) {

  const isNine = row.length === 9;

  return {
    transactionId: row[0] || "",
    timestamp: row[0],
    date: row[1],
    transactionType: row[2],
    walletId: "",
    walletName: row[3],
    targetWalletId: "",
    targetWalletName: isNine ? row[4] : "",
    referenceType: "",
    referenceId: "",
    category: isNine ? row[5] : (row[4] || CONFIG.DEFAULT.CATEGORY),
    subCategory: "",
    merchant: "",
    description: isNine ? row[6] : row[5],
    amount: Number(isNine ? row[7] : (row[6] || 0)),
    note: isNine ? row[8] : row[7],
    attachment: "",
    createdAt: "",
    updatedAt: ""
  };

}


/**
 * Update transaksi berdasarkan ID.
 *
 * @param {String} transactionId
 * @param {Object} transaction
 */
function updateTransaction(transactionId, transaction){

  const sheet = getSheet(CONFIG.SHEETS.TRANSACTIONS);

  const data = sheet.getDataRange().getValues();

  for(let i=1;i<data.length;i++){

    if(data[i][0]===transactionId){

      sheet.getRange(i+1,2,1,14).setValues([[
        transaction.date,
        transaction.transactionType,
        transaction.walletId,
        transaction.walletName,
        transaction.referenceType,
        transaction.referenceId,
        transaction.category,
        transaction.subCategory,
        transaction.merchant,
        transaction.description,
        transaction.amount,
        transaction.note,
        transaction.attachment,
        new Date()
      ]]);

      return true;

    }

  }

  return false;

}

/**
 * Menghapus transaksi berdasarkan ID.
 *
 * @param {String} transactionId
 */
function deleteTransaction(transactionId){

  const sheet = getSheet(CONFIG.SHEETS.TRANSACTIONS);

  const data = sheet.getDataRange().getValues();

  for(let i=1;i<data.length;i++){

    if(data[i][0]===transactionId){

      sheet.deleteRow(i+1);

      return true;

    }

  }

  return false;

}

function classifyExistingTransactions() {

  ensureTransactionCategoryColumn();

  const sheet = getSheet(CONFIG.SHEETS.TRANSACTIONS);
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return 0;
  }

  const headers = values[0];
  const categoryColumn = headers.indexOf("Kategori") + 1;
  const descriptionColumn = headers.indexOf("Keterangan") + 1;
  let updated = 0;

  if (categoryColumn <= 0 || descriptionColumn <= 0) {
    throw new Error("Kolom Kategori atau Keterangan tidak ditemukan.");
  }

  for (let row = 2; row <= values.length; row++) {
    const category = values[row - 1][categoryColumn - 1];
    const description = values[row - 1][descriptionColumn - 1];

    if (category || !description) {
      continue;
    }

    sheet
      .getRange(row, categoryColumn)
      .setValue(getCategory(description));

    updated++;
  }

  return updated;

}

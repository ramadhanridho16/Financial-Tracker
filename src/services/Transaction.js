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
 * Mengambil seluruh transaksi.
 *
 * @returns {Array<Object>}
 */
function getTransactions(){

  const sheet = getSheet(CONFIG.SHEETS.TRANSACTIONS);

  const data = sheet.getDataRange().getValues();

  data.shift();

  return data.map(row => {

    if (row.length <= 7) {
      return {
        transactionId : "",
        timestamp : row[0],
        date : row[1],
        transactionType : row[2],
        walletId : "",
        walletName : row[3],
        referenceType : "",
        referenceId : "",
        category : "",
        subCategory : "",
        merchant : "",
        description : row[4],
        amount : Number(row[5]),
        note : row[6],
        attachment : "",
        createdAt : "",
        updatedAt : ""
      };
    }

    if (row.length === 8) {
      return {
        transactionId : "",
        timestamp : row[0],
        date : row[1],
        transactionType : row[2],
        walletId : "",
        walletName : row[3],
        referenceType : "",
        referenceId : "",
        category : row[4],
        subCategory : "",
        merchant : "",
        description : row[5],
        amount : Number(row[6]),
        note : row[7],
        attachment : "",
        createdAt : "",
        updatedAt : ""
      };
    }

    if (row.length === 9) {
      return {
        transactionId : "",
        timestamp : row[0],
        date : row[1],
        transactionType : row[2],
        walletId : "",
        walletName : row[3],
        targetWalletId : "",
        targetWalletName : row[4],
        referenceType : "",
        referenceId : "",
        category : row[5],
        subCategory : "",
        merchant : "",
        description : row[6],
        amount : Number(row[7]),
        note : row[8],
        attachment : "",
        createdAt : "",
        updatedAt : ""
      };
    }

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

      amount : Number(row[11]),

      note : row[12],

      attachment : row[13],

      createdAt : row[14],

      updatedAt : row[15]

    };

  });

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

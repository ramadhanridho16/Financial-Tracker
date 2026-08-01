/**
 * ==========================================================
 * Financial Tracker Pro
 * Form.gs
 * ----------------------------------------------------------
 * Membaca data dari Google Forms.
 * Tidak mengandung business logic.
 * ==========================================================
 */


/**
 * Mengambil response dari Financial Transaction Form.
 *
 * @param {Object} e
 * @returns {Object}
 */
function getTransactionFormResponse(e) {

  if (!e || !e.namedValues) {
    throw new Error("Event Form Transaction tidak ditemukan.");
  }

  const data = e.namedValues;

  return {

    timestamp: getFormValue(
      data,
      CONFIG.FORM_FIELDS.TRANSACTION.TIMESTAMP
    ),

    date: getFormValue(
      data,
      CONFIG.FORM_FIELDS.TRANSACTION.DATE
    ),

    input: getFormValue(
      data,
      CONFIG.FORM_FIELDS.TRANSACTION.INPUT
    ),

    note: getFormValue(
      data,
      CONFIG.FORM_FIELDS.TRANSACTION.NOTE
    ),

    attachment: getFormValue(
      data,
      CONFIG.FORM_FIELDS.TRANSACTION.ATTACHMENT
    )

  };

}


/**
 * Mengambil response dari Loan Registration Form.
 *
 * @param {Object} e
 * @returns {Object}
 */
function getLoanFormResponse(e){

  if (!e || !e.namedValues){
    throw new Error("Event Loan Registration tidak ditemukan.");
  }

  const data = e.namedValues;

  return {

    timestamp : getFormValue(data,"Timestamp"),

    loanName : getFormValue(data,"Nama Pinjaman"),

    lender : getFormValue(data,"Pemberi Pinjaman"),

    loanType : getFormValue(data,"Jenis Pinjaman"),

    principal : getFormValue(data,"Jumlah Pinjaman"),

    wallet : getFormValue(data,"Wallet Pencairan"),

    hasInterest : getFormValue(data,"Apakah ada bunga?"),

    interestType : getFormValue(data,"Jenis Bunga"),

    interestRate : getFormValue(data,"Persentase Bunga"),

    startDate : getFormValue(data,"Tanggal Mulai"),

    tenor : getFormValue(data,"Lama Pinjaman"),

    dueDay : getFormValue(data,"Tanggal Jatuh Tempo"),

    installmentKnown : getFormValue(data,"Cicilan Sudah Diketahui?"),

    installmentAmount : getFormValue(data,"Nominal Cicilan"),

    paymentMethod : getFormValue(data,"Metode Pembayaran"),

    paymentWallet : getFormValue(data,"Wallet Pembayaran"),

    purpose : getFormValue(data,"Tujuan Pinjaman"),

    attachment : getFormValue(data,"Upload Kontrak"),

    note : getFormValue(data,"Catatan")

  };

}


/**
 * Mengambil value pertama dari Google Forms.
 *
 * @param {Object} data
 * @param {String} field
 * @returns {String}
 */
function getFormValue(data, field){

  if(!data[field]) return "";

  return String(data[field][0]).trim();

}

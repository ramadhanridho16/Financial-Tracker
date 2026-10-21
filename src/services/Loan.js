/**
 * ==========================================================
 * Financial Tracker Pro
 * Loan.gs
 * ----------------------------------------------------------
 * Mengelola seluruh data, perhitungan ekonomi, dan status pinjaman.
 * Sesuai skema 13 kolom sheet Loans.
 * ==========================================================
 */

/**
 * Posisi Kolom Sheet Loans (13 Kolom)
 */
const LOAN_COLUMN = Object.freeze({
  ID: 0,
  NAME: 1,
  LENDER: 2,
  TYPE: 3,
  PRINCIPAL: 4,
  INTEREST_TYPE: 5,
  INTEREST_RATE: 6,
  START_DATE: 7,
  DUE_DATE: 8,
  INSTALLMENT_AMOUNT: 9,
  INSTALLMENT_DAY: 10,
  STATUS: 11,
  NOTES: 12
});

/**
 * Menghasilkan nama wallet pinjaman berbasis Bank / Pihak Pemberi Pinjaman.
 *
 * @param {Object} loan
 * @returns {String}
 */
function deriveLoanWalletName(loan) {
  if (!loan) return "Kredit Pinjaman";
  if (loan.loanWalletName && String(loan.loanWalletName).trim()) {
    return String(loan.loanWalletName).trim();
  }

  const lender = String(loan.lender || "").trim();
  const name = String(loan.loanName || "").trim();

  if (lender && lender !== "-") {
    // Jika ada lender dan nama pinjaman spesifik
    if (name && name !== "-" && name.toLowerCase() !== lender.toLowerCase()) {
      return "Kredit " + lender + " (" + name + ")";
    }
    return "Kredit " + lender;
  }

  return name ? "Kredit " + name : "Kredit Pinjaman";
}

/**
 * Menyimpan data pinjaman baru ke sheet Loans.
 *
 * @param {Object} loan
 * @returns {String} loanId
 */
function saveLoan(loan) {
  if (!loan) {
    throw new Error("Loan Object kosong.");
  }

  const sheet = getSheet(CONFIG.SHEETS.LOANS);
  const loanId = generateId(
    CONFIG.ID_PREFIX.LOAN,
    CONFIG.SHEETS.LOANS,
    1
  );

  // Buat atau kaitkan Wallet Pinjaman khusus (tipe Loan) berbasis Bank Pemberi Pinjaman
  const loanWalletName = deriveLoanWalletName(loan);
  try {
    createWallet(loanWalletName, CONFIG.WALLET_TYPE.LOAN, 0);
  } catch (wErr) {
    logError("Gagal membuat loan wallet otomatis: " + wErr.message);
  }

  const row = [
    loanId,
    loan.loanName || "-",
    loan.lender || "-",
    loan.loanType || "Hutang",
    parseAmount(loan.principal),
    loan.interestType || "Flat",
    parseNumber(loan.interestRate || 0),
    loan.startDate || new Date(),
    loan.dueDate || calculateDefaultDueDate(loan.startDate, loan.tenor),
    parseAmount(loan.installmentAmount),
    parseNumber(loan.installmentDay || 1),
    loan.status || CONFIG.STATUS.ACTIVE,
    loan.notes || loan.note || "-"
  ];

  sheet.appendRow(row);
  return loanId;
}

/**
 * Menghitung tanggal jatuh tempo akhir default berdasarkan tenor bulan.
 *
 * @param {Date|String} startDate
 * @param {Number} tenorMonths
 * @returns {Date}
 */
function calculateDefaultDueDate(startDate, tenorMonths) {
  const d = startDate ? new Date(startDate) : new Date();
  const months = Number(tenorMonths || 12);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Mengambil seluruh daftar pinjaman dari sheet Loans.
 *
 * @returns {Array<Object>}
 */
function getLoans() {
  const sheet = getSheet(CONFIG.SHEETS.LOANS);
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return [];
  }

  values.shift(); // Lewati baris header

  return values.map((row, idx) => ({
    rowIndex: idx + 2,
    loanId: String(row[LOAN_COLUMN.ID]),
    loanName: String(row[LOAN_COLUMN.NAME]),
    lender: String(row[LOAN_COLUMN.LENDER]),
    loanType: String(row[LOAN_COLUMN.TYPE]),
    principal: Number(row[LOAN_COLUMN.PRINCIPAL]) || 0,
    interestType: String(row[LOAN_COLUMN.INTEREST_TYPE]),
    interestRate: Number(row[LOAN_COLUMN.INTEREST_RATE]) || 0,
    startDate: row[LOAN_COLUMN.START_DATE],
    dueDate: row[LOAN_COLUMN.DUE_DATE],
    installmentAmount: Number(row[LOAN_COLUMN.INSTALLMENT_AMOUNT]) || 0,
    installmentDay: Number(row[LOAN_COLUMN.INSTALLMENT_DAY]) || 1,
    status: String(row[LOAN_COLUMN.STATUS]),
    notes: String(row[LOAN_COLUMN.NOTES])
  }));
}

/**
 * Mengambil data pinjaman berdasarkan Loan ID.
 *
 * @param {String} loanId
 * @returns {Object|null}
 */
function getLoanById(loanId) {
  return getLoans().find(l => l.loanId === loanId) || null;
}

/**
 * Memperbarui status pinjaman pada sheet Loans.
 *
 * @param {String} loanId
 * @param {String} newStatus
 * @returns {Boolean}
 */
function updateLoanStatus(loanId, newStatus) {
  const sheet = getSheet(CONFIG.SHEETS.LOANS);
  const loans = getLoans();
  const target = loans.find(l => l.loanId === loanId);

  if (!target) {
    return false;
  }

  sheet.getRange(target.rowIndex, LOAN_COLUMN.STATUS + 1).setValue(newStatus);
  return true;
}

/**
 * Menghitung parameter ekonomi perbankan kredit (pokok, bunga, dan angsuran bulanan).
 *
 * @param {Number} principal - Pokok pinjaman
 * @param {String} interestType - "Flat", "Efektif / Anuitas", "Kumulatif / Majemuk", "Tanpa Bunga (0%)"
 * @param {Number} annualRate - Suku bunga tahunan (persen, misal 6 atau 12)
 * @param {Number} tenorMonths - Jangka waktu pinjaman dalam bulan
 * @param {Date|String} [startDate]
 * @param {Number} [installmentDay]
 * @returns {Object}
 */
function calculateLoanEconomics(principal, interestType, annualRate, tenorMonths, startDate, installmentDay) {
  const p = Number(principal) || 0;
  const n = Math.max(1, Number(tenorMonths) || 1);
  const r = (Number(annualRate) || 0) / 100;
  const type = String(interestType || "Flat").toLowerCase();

  let installmentAmount = 0;
  let totalInterest = 0;

  if (type.indexOf("tanpa") !== -1 || r === 0) {
    totalInterest = 0;
    installmentAmount = Math.round(p / n);
  } else if (type.indexOf("anuitas") !== -1 || type.indexOf("efektif") !== -1) {
    const i = r / 12;
    installmentAmount = Math.round((p * i) / (1 - Math.pow(1 + i, -n)));
    totalInterest = Math.max(0, (installmentAmount * n) - p);
  } else if (type.indexOf("kumulatif") !== -1 || type.indexOf("majemuk") !== -1) {
    const i = r / 12;
    const futureValue = p * Math.pow(1 + i, n);
    totalInterest = Math.round(futureValue - p);
    installmentAmount = Math.round(futureValue / n);
  } else {
    // Standar Flat
    totalInterest = Math.round(p * r * (n / 12));
    installmentAmount = Math.round((p + totalInterest) / n);
  }

  const start = startDate ? new Date(startDate) : new Date();
  const due = calculateDefaultDueDate(start, n);

  return {
    principal: p,
    interestType: interestType,
    interestRate: annualRate,
    tenorMonths: n,
    installmentAmount: installmentAmount,
    totalInterest: totalInterest,
    totalPayment: p + totalInterest,
    startDate: start,
    dueDate: due,
    installmentDay: installmentDay || start.getDate()
  };
}

/**
 * Menghitung rekap pembayaran dan status pelunasan pinjaman dari sheet Transactions.
 *
 * @param {Object} loan
 * @returns {Object}
 */
function getLoanSettlementSummary(loan) {
  const transactions = getTransactions();
  const loanId = String(loan.loanId || "").toLowerCase();
  const loanName = String(loan.loanName || "").toLowerCase();

  const matched = transactions.filter(t => {
    const desc = (String(t.description || "") + " " + String(t.note || "")).toLowerCase();
    const cat = String(t.category || "").toLowerCase();
    const hasCategory = cat === "cicilan" || cat === "hutang" || cat === "kredit" || cat === "pinjaman" || cat === "loan";
    const matchesId = loanId && desc.indexOf(loanId) !== -1;
    const matchesName = loanName && desc.indexOf(loanName) !== -1;
    return (matchesId || matchesName) && (hasCategory || t.type === CONFIG.TRANSACTION_TYPE.EXPENSE);
  });

  const totalPaid = matched.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalObligation = Number(loan.principal) + (Number(loan.installmentAmount) > 0 ? (loan.installmentAmount * 12) - loan.principal : 0);
  const baselineObligation = totalObligation > loan.principal ? totalObligation : loan.principal;
  const isPaidOff = totalPaid >= baselineObligation && baselineObligation > 0;

  return {
    loan: loan,
    totalPaid: totalPaid,
    totalObligation: baselineObligation,
    remainingAmount: Math.max(0, baselineObligation - totalPaid),
    isPaidOff: isPaidOff,
    paymentsCount: matched.length
  };
}

/**
 * Melakukan sinkronisasi otomatis status seluruh pinjaman aktif menjadi Lunas jika pembayaran penuh.
 *
 * @returns {Array<Object>} daftar pinjaman yang baru lunas
 */
function syncAllLoansSettlement() {
  const activeLoans = getLoans().filter(l => l.status === CONFIG.STATUS.ACTIVE);
  const newlyPaid = [];

  activeLoans.forEach(loan => {
    const summary = getLoanSettlementSummary(loan);
    if (summary.isPaidOff) {
      updateLoanStatus(loan.loanId, CONFIG.STATUS.PAID);
      newlyPaid.push(loan);
    }
  });

  return newlyPaid;
}

/**
 * Menghasilkan rekap kalender tagihan pinjaman bulanan.
 *
 * @param {Date} [targetDate]
 * @returns {Object}
 */
function getMonthlyLoanCalendar(targetDate) {
  const refDate = targetDate ? new Date(targetDate) : new Date();
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const activeLoans = getLoans().filter(l => l.status === CONFIG.STATUS.ACTIVE);

  const transactions = getTransactions().filter(t => {
    if (!t.date || !(t.date instanceof Date)) return false;
    return t.date.getFullYear() === year && t.date.getMonth() === month;
  });

  const schedule = activeLoans.map(loan => {
    const paidThisMonth = transactions.some(t => {
      const desc = (String(t.description || "") + " " + String(t.note || "")).toLowerCase();
      return desc.indexOf(loan.loanId.toLowerCase()) !== -1 || desc.indexOf(loan.loanName.toLowerCase()) !== -1;
    });

    return {
      loanId: loan.loanId,
      loanName: loan.loanName,
      lender: loan.lender,
      day: loan.installmentDay,
      amount: loan.installmentAmount,
      isPaidThisMonth: paidThisMonth
    };
  }).sort((a, b) => a.day - b.day);

  const totalAmount = schedule.reduce((sum, s) => sum + s.amount, 0);
  const remainingAmount = schedule.filter(s => !s.isPaidThisMonth).reduce((sum, s) => sum + s.amount, 0);

  return {
    year: year,
    month: month + 1,
    schedule: schedule,
    totalMonthlyObligation: totalAmount,
    totalRemainingObligation: remainingAmount
  };
}

/**
 * Mengambil daftar pinjaman aktif yang jatuh tempo hari ini atau mendekati hari ini untuk reminder.
 *
 * @param {Date} [refDate]
 * @returns {Array<Object>}
 */
function getDueLoansForReminder(refDate) {
  const today = refDate ? new Date(refDate) : new Date();
  const currentDay = today.getDate();
  const activeLoans = getLoans().filter(l => l.status === CONFIG.STATUS.ACTIVE);

  return activeLoans.filter(l => {
    const diff = l.installmentDay - currentDay;
    // Reminder pada H-3, H-1, dan H-0 (hari ini)
    return diff === 0 || diff === 1 || diff === 3;
  }).map(l => ({
    loan: l,
    daysLeft: l.installmentDay - currentDay
  }));
}

/**
 * ==========================================================
 * Financial Tracker Pro
 * Loan.gs
 * ----------------------------------------------------------
 * Mengelola data pinjaman.
 * ==========================================================
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

  sheet.appendRow([
    loanId,
    loan.loanName,
    loan.lender,
    loan.loanType,
    parseAmount(loan.principal),
    loan.wallet,
    loan.hasInterest,
    loan.interestType,
    parseNumber(loan.interestRate),
    loan.startDate,
    parseNumber(loan.tenor),
    parseNumber(loan.dueDay),
    loan.installmentKnown,
    parseAmount(loan.installmentAmount),
    loan.paymentMethod,
    loan.paymentWallet,
    loan.purpose,
    loan.attachment,
    loan.note,
    CONFIG.STATUS.ACTIVE,
    new Date(),
    new Date()
  ]);

  return loanId;

}

function getLoans() {

  const sheet = getSheet(CONFIG.SHEETS.LOANS);
  const values = sheet.getDataRange().getValues();

  values.shift();

  return values.map(row => ({
    loanId: row[0],
    loanName: row[1],
    lender: row[2],
    loanType: row[3],
    principal: Number(row[4]),
    wallet: row[5],
    hasInterest: row[6],
    interestType: row[7],
    interestRate: Number(row[8]),
    startDate: row[9],
    tenor: Number(row[10]),
    dueDay: Number(row[11]),
    installmentKnown: row[12],
    installmentAmount: Number(row[13]),
    paymentMethod: row[14],
    paymentWallet: row[15],
    purpose: row[16],
    attachment: row[17],
    note: row[18],
    status: row[19],
    createdAt: row[20],
    updatedAt: row[21]
  }));

}

function getLoanById(loanId) {

  return getLoans().find(loan => loan.loanId === loanId) || null;

}

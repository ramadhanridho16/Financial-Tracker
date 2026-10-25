/**
 * ==========================================================
 * Financial Tracker Pro
 * Budget.gs
 * ----------------------------------------------------------
 * Mengelola seluruh Budget.
 * Tidak menangani transaksi maupun dashboard.
 * ==========================================================
 */

/**
 * Posisi Kolom Budget
 */
const BUDGET_COLUMN = Object.freeze({

  ID: 0,

  CATEGORY: 1,

  PERIOD_TYPE: 2,

  PERIOD_VALUE: 3,

  LIMIT: 4,

  WARNING: 5,

  ACTIVE: 6,

  CREATED_AT: 7,

  UPDATED_AT: 8

});


/**
 * Mengambil seluruh Budget aktif.
 *
 * @returns {Array<Object>}
 */
function getBudgets() {

  const sheet = getSheet(CONFIG.SHEETS.BUDGET);

  const values = sheet.getDataRange().getValues();

  values.shift();

  return values

    .filter(row => row[BUDGET_COLUMN.ACTIVE] === true)

    .map(row => ({

      budgetId: row[BUDGET_COLUMN.ID],

      category: row[BUDGET_COLUMN.CATEGORY],

      periodType: row[BUDGET_COLUMN.PERIOD_TYPE],

      periodValue: row[BUDGET_COLUMN.PERIOD_VALUE],

      limit: Number(row[BUDGET_COLUMN.LIMIT]),

      warning: Number(row[BUDGET_COLUMN.WARNING]),

      active: row[BUDGET_COLUMN.ACTIVE],

      createdAt: row[BUDGET_COLUMN.CREATED_AT],

      updatedAt: row[BUDGET_COLUMN.UPDATED_AT]

    }));

}


/**
 * Mengambil Budget berdasarkan ID.
 *
 * @param {String} budgetId
 * @returns {Object|null}
 */
function getBudgetById(budgetId){

  const budgets = getBudgets();

  return budgets.find(
    budget => budget.budgetId === budgetId
  ) || null;

}


/**
 * Mengambil Budget berdasarkan Category.
 *
 * @param {String} category
 * @returns {Object|null}
 */
function getBudgetByCategory(category){

  category = normalizeText(category);

  const budgets = getBudgets();

  return budgets.find(
    budget => normalizeText(budget.category) === category
  ) || null;

}


/**
 * Mengecek apakah Budget tersedia.
 *
 * @param {String} category
 * @returns {Boolean}
 */
function budgetExists(category){

  return getBudgetByCategory(category) !== null;

}


/**
 * Menyimpan Budget baru.
 *
 * @param {Object} budget
 * @returns {String}
 */
function saveBudget(budget){

  if(!budget){

    throw new Error("Budget kosong.");

  }

  const sheet = getSheet(CONFIG.SHEETS.BUDGET);

  const budgetId = generateId(

      CONFIG.ID_PREFIX.BUDGET,

      CONFIG.SHEETS.BUDGET,

      1

  );

  sheet.appendRow([

      budgetId,

      budget.category,

      budget.periodType,

      budget.periodValue,

      budget.limit,

      budget.warning,

      true,

      new Date(),

      new Date()

  ]);

  return budgetId;

}


/**
 * Update Budget.
 *
 * @param {String} budgetId
 * @param {Object} budget
 * @returns {Boolean}
 */
function updateBudget(budgetId,budget){

  const sheet = getSheet(CONFIG.SHEETS.BUDGET);

  const values = sheet.getDataRange().getValues();

  for(let i=1;i<values.length;i++){

    if(values[i][0]===budgetId){

      sheet.getRange(i+1,2,1,8).setValues([[

        budget.category,

        budget.periodType,

        budget.periodValue,

        budget.limit,

        budget.warning,

        budget.active,

        values[i][7],

        new Date()

      ]]);

      return true;

    }

  }

  return false;

}


/**
 * Soft Delete Budget.
 *
 * @param {String} budgetId
 * @returns {Boolean}
 */
function deleteBudget(budgetId){

  const sheet = getSheet(CONFIG.SHEETS.BUDGET);

  const values = sheet.getDataRange().getValues();

  for(let i=1;i<values.length;i++){

    if(values[i][0]===budgetId){

      sheet.getRange(i+1,7).setValue(false);

      sheet.getRange(i+1,9).setValue(new Date());

      return true;

    }

  }

  return false;

}


/**
 * Mengambil seluruh Budget
 * berdasarkan Period Type.
 *
 * @param {String} periodType
 * @returns {Array<Object>}
 */
function getBudgetsByPeriod(periodType){

  return getBudgets().filter(

    budget => budget.periodType === periodType

  );

}

/**
 * Menghitung rentang tanggal siklus gajian aktif (misal tanggal 25 s/d 24 bulan berikutnya).
 *
 * @param {Date|String} [targetDate] - Tanggal acuan (default: saat ini)
 * @param {Number} [paydayDate=25] - Hari gajian dalam bulan (default: 25)
 * @returns {Object}
 */
function getPaydayPeriod(targetDate, paydayDate) {
  const date = targetDate ? new Date(targetDate) : new Date();
  const day = paydayDate || 25;
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth();
  const currentDate = date.getDate();

  let startYear = currentYear;
  let startMonth = currentMonth;
  let endYear = currentYear;
  let endMonth = currentMonth + 1;

  if (currentDate >= day) {
    startYear = currentYear;
    startMonth = currentMonth;
    endYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    endMonth = (currentMonth + 1) % 12;
  } else {
    startYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    startMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    endYear = currentYear;
    endMonth = currentMonth;
  }

  const startDate = new Date(startYear, startMonth, day, 0, 0, 0, 0);
  const endThreshold = new Date(endYear, endMonth, day, 0, 0, 0, 0);
  const endDateDisplay = new Date(endYear, endMonth, day - 1, 23, 59, 59, 999);

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ];

  const periodKey = startYear + "-" + String(startMonth + 1).padStart(2, "0") + "-25";
  const label = day + " " + monthNames[startMonth] + " " + startYear + " - " + 
                (day - 1) + " " + monthNames[endMonth] + " " + endYear;

  return {
    start: startDate,
    end: endThreshold,
    startDate: startDate,
    endDate: endDateDisplay,
    periodKey: periodKey,
    label: label,
    startYear: startYear,
    startMonth: startMonth + 1,
    endYear: endYear,
    endMonth: endMonth + 1
  };
}

/**
 * Mengambil total pengeluaran untuk suatu kategori dalam siklus gajian aktif.
 *
 * @param {String} category
 * @param {Number} [paydayDate=25]
 * @param {Date|String} [referenceDate]
 * @returns {Number}
 */
function getCategoryExpenseInPaydayPeriod(category, paydayDate, referenceDate) {
  if (!category) return 0;
  const normalizedCategory = normalizeText(category);
  const period = getPaydayPeriod(referenceDate, paydayDate || 25);
  const transactions = getTransactions();

  return transactions
    .filter(t => {
      const type = normalizeText(t.transactionType);
      return type === normalizeText(CONFIG.TRANSACTION_TYPE.EXPENSE) || type === "expense";
    })
    .filter(t => normalizeText(t.category) === normalizedCategory)
    .filter(t => isDateInPeriod(t.date, period))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
}

/**
 * Mengambil ringkasan status pemakaian budget kategori pada siklus gajian.
 *
 * @param {String} category
 * @param {Number} [paydayDate=25]
 * @param {Date|String} [referenceDate]
 * @returns {Object|null}
 */
function getBudgetUsageStatus(category, paydayDate, referenceDate) {
  const budget = getBudgetByCategory(category);
  if (!budget || !budget.active) {
    return null;
  }

  const period = getPaydayPeriod(referenceDate, paydayDate || 25);
  const spent = getCategoryExpenseInPaydayPeriod(category, paydayDate, referenceDate);
  const limit = Number(budget.limit || 0);
  const warningPct = Number(budget.warning || 80);
  const remaining = limit - spent;
  const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;

  let status = "SAFE";
  let badge = "✅ Aman";
  if (percentage >= 100) {
    status = "OVER_BUDGET";
    badge = "🚨 Over Budget";
  } else if (percentage >= warningPct) {
    status = "WARNING";
    badge = "⚡ Waspada (" + percentage + "%)";
  }

  return {
    budgetId: budget.budgetId,
    category: budget.category,
    limit: limit,
    spent: spent,
    remaining: remaining,
    warningPct: warningPct,
    percentage: percentage,
    status: status,
    badge: badge,
    periodLabel: period.label,
    progressBar: generateVisualProgressBar(percentage, 10)
  };
}

/**
 * Membuat representasi progress bar teks (misal [██████░░░░] 60%).
 *
 * @param {Number} percentage
 * @param {Number} [totalBlocks=10]
 * @returns {String}
 */
function generateVisualProgressBar(percentage, totalBlocks) {
  const blocks = totalBlocks || 10;
  const filledCount = Math.min(blocks, Math.max(0, Math.round((percentage / 100) * blocks)));
  const emptyCount = blocks - filledCount;
  return "[" + "█".repeat(filledCount) + "░".repeat(emptyCount) + "] " + percentage + "%";
}

/**
 * Menambah atau memperbarui Budget (Upsert).
 *
 * @param {String} category - Nama Kategori
 * @param {Number|String} limit - Batas Anggaran
 * @param {Number|String} [warningPct=80] - Ambang Peringatan (persen)
 * @param {String} [periodType='Payday'] - Tipe Periode
 * @returns {Object} { budgetId, category, limit, warning, isNew, periodLabel }
 */
function upsertBudget(category, limit, warningPct, periodType) {
  if (!category || !category.trim()) {
    throw new Error("Kategori budget wajib diisi.");
  }
  const numericLimit = typeof limit === "number" ? limit : parseAmount(limit);
  if (isNaN(numericLimit) || numericLimit <= 0) {
    throw new Error("Nominal budget harus berupa angka positif.");
  }

  const warning = (warningPct !== undefined && warningPct !== null && !isNaN(Number(warningPct)))
    ? Number(warningPct)
    : 80;
  const pType = periodType || "Payday";
  const paydayPeriod = getPaydayPeriod();
  const periodValue = paydayPeriod.periodKey;

  const existing = getBudgetByCategory(category);
  if (existing) {
    existing.limit = numericLimit;
    existing.warning = warning;
    existing.periodType = pType;
    existing.periodValue = periodValue;
    existing.active = true;
    updateBudget(existing.budgetId, existing);
    return {
      budgetId: existing.budgetId,
      category: existing.category,
      limit: numericLimit,
      warning: warning,
      periodType: pType,
      periodValue: periodValue,
      periodLabel: paydayPeriod.label,
      isNew: false
    };
  } else {
    const newBudget = {
      category: category.trim(),
      periodType: pType,
      periodValue: periodValue,
      limit: numericLimit,
      warning: warning
    };
    const newId = saveBudget(newBudget);
    return {
      budgetId: newId,
      category: category.trim(),
      limit: numericLimit,
      warning: warning,
      periodType: pType,
      periodValue: periodValue,
      periodLabel: paydayPeriod.label,
      isNew: true
    };
  }
}

/**
 * Evaluasi dan rollover otomatis budget bulanan setiap tanggal 25 (Hari Gajian).
 *
 * @param {Date} [referenceDate] - Default hari ini
 * @param {Number} [paydayDate=25]
 * @returns {Object}
 */
function evaluatePaydayRollover(referenceDate, paydayDate) {
  const today = referenceDate ? new Date(referenceDate) : new Date();
  const day = paydayDate || 25;

  // Tanggal kemarin (akhir siklus lalu)
  const prevDate = new Date(today);
  prevDate.setDate(prevDate.getDate() - 1);
  const completedPeriod = getPaydayPeriod(prevDate, day);
  const newPeriod = getPaydayPeriod(today, day);

  const budgets = getBudgets();
  const evaluationList = [];
  let totalBudget = 0;
  let totalExpense = 0;

  budgets.forEach(b => {
    const spent = getCategoryExpenseInPaydayPeriod(b.category, day, prevDate);
    const limit = Number(b.limit || 0);
    totalBudget += limit;
    totalExpense += spent;

    const diff = limit - spent;
    const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    evaluationList.push({
      category: b.category,
      limit: limit,
      spent: spent,
      diff: diff,
      percentage: pct,
      isOver: spent > limit
    });

    // Rollover periodValue ke siklus gajian baru
    b.periodValue = newPeriod.periodKey;
    b.periodType = "Payday";
    b.active = true;
    updateBudget(b.budgetId, b);
  });

  return {
    completedPeriod: completedPeriod,
    newPeriod: newPeriod,
    totalBudget: totalBudget,
    totalExpense: totalExpense,
    totalSavings: totalBudget - totalExpense,
    evaluations: evaluationList
  };
}

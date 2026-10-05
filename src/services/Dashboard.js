/**
 * ==========================================================
 * Financial Tracker Pro
 * Dashboard.gs
 * ----------------------------------------------------------
 * Dashboard Service
 * Menghasilkan Ringkasan & Analisis Konsumsi Kategori Keuangan
 * ==========================================================
 */

/**
 * Refresh seluruh tampilan Dashboard (Metrik, Kartu KPI, Tabel Kategori, dan Chart).
 */
function refreshDashboard() {
  const sheet = getDashboardSheet();
  const summary = getDashboardSummary();
  const period = getCurrentFinancialPeriod();
  const analysis = getCategoryConsumptionAnalysis(period);

  setDashboardColumnWidths(sheet);
  clearDashboardCategoryArea(sheet);
  writeSummarySection(sheet, summary);
  writeKpiCards(sheet, analysis.kpi);
  writeCategoryTableHeaders(sheet, 5);
  writeCategoryTableRows(sheet, 6, analysis.tableRows);

  const totalRowIndex = 6 + analysis.tableRows.length;
  writeCategoryTableTotal(sheet, totalRowIndex, analysis.totalExpense, analysis.totalBudget);

  if (analysis.totalExpense > 0) {
    renderCategoryDonutChart(sheet, 6, 5 + analysis.tableRows.length);
  }
}

/**
 * Menghasilkan seluruh ringkasan dasar Dashboard.
 *
 * @returns {Object}
 */
function getDashboardSummary() {
  const period = getCurrentFinancialPeriod();

  return {
    currentPeriod: period.label,
    monthIncome: getIncomeByPeriod(period),
    monthExpense: getExpenseByPeriod(period),
    monthSaving: getSavingByPeriod(period),
    monthTopCategory: getTopExpenseCategoryByPeriod(period),
    totalIncome: getTotalIncome(),
    totalExpense: getTotalExpense(),
    totalOpeningBalance: getTotalOpeningBalance(),
    netCashFlow: getNetCashFlow(),
    totalTransaction: getTransactionCount(),
    totalWalletBalance: getWalletBalance(),
    totalLoan: getOutstandingLoan(),
    budgetUsed: getBudgetUsed(),
    budgetRemaining: getRemainingBudget(),
    topCategory: getTopExpenseCategory()
  };
}

/**
 * Menganalisis konsumsi pengeluaran per kategori untuk periode tertentu.
 *
 * @param {Object} period
 * @returns {Object}
 */
function getCategoryConsumptionAnalysis(period) {
  const transactions = getTransactions();
  const categoryMap = aggregateCategoryExpenses(transactions, period);
  const totalExpense = getExpenseByPeriod(period);
  const budgets = getBudgets();
  const tableRows = formatCategoryAnalysisRows(categoryMap, totalExpense, budgets);
  const topCategoryName = getTopExpenseCategoryByPeriod(period);
  const activeCount = Object.keys(categoryMap).length;
  const avgExpense = activeCount > 0 ? Math.round(totalExpense / activeCount) : 0;
  const totalBudget = budgets.reduce((sum, b) => sum + (b.limit || 0), 0);

  return {
    totalExpense: totalExpense,
    totalBudget: totalBudget,
    avgExpense: avgExpense,
    tableRows: tableRows,
    kpi: {
      topCategoryText: topCategoryName ? topCategoryName + " (" + formatCurrency(categoryMap[topCategoryName] || 0) + ")" : "Belum Ada Pengeluaran",
      totalExpense: totalExpense,
      avgExpense: avgExpense
    }
  };
}

/**
 * Menghitung total pengeluaran per kategori pada periode acuan.
 *
 * @param {Array<Object>} transactions
 * @param {Object} period
 * @returns {Object}
 */
function aggregateCategoryExpenses(transactions, period) {
  const map = {};

  transactions
    .filter(t => isDateInPeriod(t.date, period))
    .filter(t => t.transactionType === CONFIG.TRANSACTION_TYPE.EXPENSE)
    .forEach(t => {
      const category = t.category || CONFIG.DEFAULT.CATEGORY;
      map[category] = (map[category] || 0) + Number(t.amount || 0);
    });

  return map;
}

/**
 * Menyusun baris-baris data analisis kategori yang terurut dari konsumsi terbesar.
 *
 * @param {Object} categoryMap
 * @param {Number} totalExpense
 * @param {Array<Object>} budgets
 * @returns {Array<Array<*>>}
 */
function formatCategoryAnalysisRows(categoryMap, totalExpense, budgets) {
  const categories = Object.keys(categoryMap);

  if (categories.length === 0) {
    return getAvailableCategories().map((cat, index) => {
      const budget = budgets.find(b => normalizeText(b.category) === normalizeText(cat));
      return buildSingleCategoryRow(cat, 0, 0, budget, index + 1);
    });
  }

  return categories
    .sort((a, b) => categoryMap[b] - categoryMap[a])
    .map((category, index) => {
      const amount = categoryMap[category];
      const budget = budgets.find(b => normalizeText(b.category) === normalizeText(category));
      return buildSingleCategoryRow(category, amount, totalExpense, budget, index + 1);
    });
}

/**
 * Membentuk satu baris data untuk tabel kategori.
 *
 * @param {String} category
 * @param {Number} amount
 * @param {Number} totalExpense
 * @param {Object|null} budget
 * @param {Number} rank
 * @returns {Array<*>}
 */
function buildSingleCategoryRow(category, amount, totalExpense, budget, rank) {
  const medals = ["🥇 #1", "🥈 #2", "🥉 #3"];
  const rankDisplay = rank <= 3 ? medals[rank - 1] : "#" + rank;
  const share = totalExpense > 0 ? (amount / totalExpense) : 0;
  const budgetLimit = budget ? budget.limit : 0;
  const status = calculateCategoryStatus(amount, budget);

  return [
    rankDisplay,
    category,
    amount,
    share,
    budgetLimit > 0 ? budgetLimit : "-",
    status
  ];
}

/**
 * Menghitung status konsumsi kategori terhadap budget atau porsi.
 *
 * @param {Number} amount
 * @param {Object|null} budget
 * @returns {String}
 */
function calculateCategoryStatus(amount, budget) {
  if (!budget || !budget.limit) {
    return amount > 0 ? "ℹ️ Tercatat" : "Belum Ada Pengeluaran";
  }

  const pct = Math.round((amount / budget.limit) * 100);
  if (pct > 100) {
    return "🚨 Over Budget (" + pct + "%)";
  }
  if (pct >= (budget.warning || 80)) {
    return "⚠️ Waspada (" + pct + "%)";
  }
  return "✅ Aman (" + pct + "%)";
}

/**
 * Mengambil daftar kategori cadangan dari Budget, Dictionary, atau default.
 *
 * @returns {Array<String>}
 */
function getAvailableCategories() {
  const set = {};
  getBudgets().forEach(b => { if (b.category) set[b.category] = true; });
  getDictionary().forEach(d => { if (d.category) set[d.category] = true; });

  const list = Object.keys(set);
  if (list.length > 0) return list;

  return ["Makanan & Minuman", "Transportasi", "Belanja Bulanan", "Tagihan & Utilitas", "Lainnya"];
}

/**
 * Memastikan label ringkasan dashboard tersedia (kompatibilitas lama).
 */
function ensureDashboardLabels() {
  const sheet = getDashboardSheet();
  const summary = getDashboardSummary();
  writeSummarySection(sheet, summary);
}

/**
 * Mengambil kategori pengeluaran terbesar sepanjang waktu.
 *
 * @returns {String}
 */
function getTopExpenseCategory() {
  const trx = getTransactions();
  const map = {};

  trx
    .filter(t => t.transactionType === CONFIG.TRANSACTION_TYPE.EXPENSE)
    .forEach(t => {
      const category = t.category || CONFIG.DEFAULT.CATEGORY;
      map[category] = (map[category] || 0) + Number(t.amount || 0);
    });

  return findHighestKey(map);
}

/**
 * Mengambil kategori pengeluaran terbesar pada periode tertentu.
 *
 * @param {Object} period
 * @returns {String}
 */
function getTopExpenseCategoryByPeriod(period) {
  const trx = getTransactions();
  const map = {};

  trx
    .filter(t => isDateInPeriod(t.date, period))
    .filter(t => t.transactionType === CONFIG.TRANSACTION_TYPE.EXPENSE)
    .forEach(t => {
      const category = t.category || CONFIG.DEFAULT.CATEGORY;
      map[category] = (map[category] || 0) + Number(t.amount || 0);
    });

  return findHighestKey(map);
}

/**
 * Mencari kunci dengan nilai tertinggi pada sebuah map.
 *
 * @param {Object} map
 * @returns {String}
 */
function findHighestKey(map) {
  let top = "";
  let value = 0;

  for (const key in map) {
    if (map[key] > value) {
      value = map[key];
      top = key;
    }
  }

  return top;
}

/**
 * Mengambil total pemasukan sepanjang waktu.
 *
 * @returns {Number}
 */
function getTotalIncome() {
  return getTransactions()
    .filter(t => t.transactionType === CONFIG.TRANSACTION_TYPE.INCOME)
    .reduce((a, b) => a + Number(b.amount || 0), 0);
}

/**
 * Mengambil pemasukan pada periode tertentu.
 *
 * @param {Object} period
 * @returns {Number}
 */
function getIncomeByPeriod(period) {
  return getTransactions()
    .filter(t => isDateInPeriod(t.date, period))
    .filter(t => t.transactionType === CONFIG.TRANSACTION_TYPE.INCOME)
    .reduce((a, b) => a + Number(b.amount || 0), 0);
}

/**
 * Mengambil total pengeluaran sepanjang waktu.
 *
 * @returns {Number}
 */
function getTotalExpense() {
  return getTransactions()
    .filter(t => t.transactionType === CONFIG.TRANSACTION_TYPE.EXPENSE)
    .reduce((a, b) => a + Number(b.amount || 0), 0);
}

/**
 * Mengambil pengeluaran pada periode tertentu.
 *
 * @param {Object} period
 * @returns {Number}
 */
function getExpenseByPeriod(period) {
  return getTransactions()
    .filter(t => isDateInPeriod(t.date, period))
    .filter(t => t.transactionType === CONFIG.TRANSACTION_TYPE.EXPENSE)
    .reduce((a, b) => a + Number(b.amount || 0), 0);
}

/**
 * Mengambil tabungan pada periode tertentu.
 *
 * @param {Object} period
 * @returns {Number}
 */
function getSavingByPeriod(period) {
  return getIncomeByPeriod(period) - getExpenseByPeriod(period);
}

/**
 * Mengambil arus kas bersih sepanjang waktu.
 *
 * @returns {Number}
 */
function getNetCashFlow() {
  return getTotalIncome() - getTotalExpense();
}

/**
 * Mengambil jumlah transaksi.
 *
 * @returns {Number}
 */
function getTransactionCount() {
  return getTransactions().length;
}

/**
 * Mengambil saldo seluruh wallet aktif.
 *
 * @returns {Number}
 */
function getWalletBalance() {
  return getTotalWalletBalance();
}

/**
 * Mengambil total pinjaman aktif yang belum lunas.
 *
 * @returns {Number}
 */
function getOutstandingLoan() {
  return getLoans()
    .filter(l => l.status === CONFIG.STATUS.ACTIVE)
    .reduce((a, b) => a + Number(b.principal || 0), 0);
}

/**
 * Mengambil total budget yang terpakai.
 *
 * @returns {Number}
 */
function getBudgetUsed() {
  return getTotalExpense();
}

/**
 * Mengambil sisa budget yang belum terpakai.
 *
 * @returns {Number}
 */
function getRemainingBudget() {
  const limit = getBudgets().reduce((a, b) => a + Number(b.limit || 0), 0);
  return limit - getBudgetUsed();
}

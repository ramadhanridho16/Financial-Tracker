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
/**
 * ==========================================================
 * Financial Tracker Pro
 * Dashboard.gs
 * ----------------------------------------------------------
 * Dashboard Service
 * Menghasilkan Ringkasan Keuangan
 * ==========================================================
 */


/**
 * Refresh Dashboard
 */
function refreshDashboard(){

    const sheet = getSheet(CONFIG.SHEETS.DASHBOARD);

    ensureDashboardLabels();

    const summary = getDashboardSummary();

    sheet.getRange("B2").setValue(summary.currentPeriod);

    sheet.getRange("B3").setValue(summary.monthIncome);

    sheet.getRange("B4").setValue(summary.monthExpense);

    sheet.getRange("B5").setValue(summary.monthSaving);

    sheet.getRange("B6").setValue(summary.totalWalletBalance);

    sheet.getRange("B7").setValue(summary.totalIncome);

    sheet.getRange("B8").setValue(summary.totalExpense);

    sheet.getRange("B9").setValue(summary.totalTransaction);

    sheet.getRange("B10").setValue(summary.monthTopCategory);

    sheet.getRange("B11").setValue(new Date());

}

/**
 * Menghasilkan seluruh ringkasan Dashboard.
 */
function getDashboardSummary(){

    const period = getCurrentFinancialPeriod();

    return{

        currentPeriod : period.label,

        monthIncome : getIncomeByPeriod(period),

        monthExpense : getExpenseByPeriod(period),

        monthSaving : getSavingByPeriod(period),

        monthTopCategory : getTopExpenseCategoryByPeriod(period),

        totalIncome : getTotalIncome(),

        totalExpense : getTotalExpense(),

        totalOpeningBalance : getTotalOpeningBalance(),

        netCashFlow : getNetCashFlow(),

        totalTransaction : getTransactionCount(),

        totalWalletBalance : getWalletBalance(),

        totalLoan : getOutstandingLoan(),

        budgetUsed : getBudgetUsed(),

        budgetRemaining : getRemainingBudget(),

        topCategory : getTopExpenseCategory()

    };

}

function getTotalIncome(){

    const trx = getTransactions();

    return trx

        .filter(t=>t.transactionType===CONFIG.TRANSACTION_TYPE.INCOME)

        .reduce((a,b)=>a+b.amount,0);

}

function getIncomeByPeriod(period){

    return getTransactions()

        .filter(t=>isDateInPeriod(t.date, period))

        .filter(t=>t.transactionType===CONFIG.TRANSACTION_TYPE.INCOME)

        .reduce((a,b)=>a+b.amount,0);

}

function getTotalExpense(){

    const trx=getTransactions();

    return trx

        .filter(t=>t.transactionType===CONFIG.TRANSACTION_TYPE.EXPENSE)

        .reduce((a,b)=>a+b.amount,0);

}

function getExpenseByPeriod(period){

    return getTransactions()

        .filter(t=>isDateInPeriod(t.date, period))

        .filter(t=>t.transactionType===CONFIG.TRANSACTION_TYPE.EXPENSE)

        .reduce((a,b)=>a+b.amount,0);

}

function getSavingByPeriod(period){

    return getIncomeByPeriod(period)-getExpenseByPeriod(period);

}

function getNetCashFlow(){

    return getTotalIncome()-getTotalExpense();

}

function getTransactionCount(){

    return getTransactions().length;

}

function getWalletBalance(){

    return getTotalWalletBalance();

}

function getOutstandingLoan(){

    const loans=getLoans();

    return loans

        .filter(l=>l.status===CONFIG.STATUS.ACTIVE)

        .reduce((a,b)=>a+b.principal,0);

}

function getBudgetUsed(){

    return getTotalExpense();

}

function getRemainingBudget(){

    const budgets=getBudgets();

    const limit=budgets.reduce((a,b)=>a+b.limit,0);

    return limit-getBudgetUsed();

}

function getTopExpenseCategory(){

    const trx=getTransactions();

    const map={};

    trx

    .filter(t=>t.transactionType===CONFIG.TRANSACTION_TYPE.EXPENSE)

    .forEach(t=>{

        map[t.category]=(map[t.category]||0)+t.amount;

    });

    let top="";

    let value=0;

    for(const key in map){

        if(map[key]>value){

            value=map[key];

            top=key;

        }

    }

    return top;

}

function getTopExpenseCategoryByPeriod(period){

    const trx=getTransactions();

    const map={};

    trx

    .filter(t=>isDateInPeriod(t.date, period))

    .filter(t=>t.transactionType===CONFIG.TRANSACTION_TYPE.EXPENSE)

    .forEach(t=>{

        const category = t.category || CONFIG.DEFAULT.CATEGORY;

        map[category]=(map[category]||0)+t.amount;

    });

    let top="";

    let value=0;

    for(const key in map){

        if(map[key]>value){

            value=map[key];

            top=key;

        }

    }

    return top;

}

function ensureDashboardLabels(){

    const sheet = getSheet(CONFIG.SHEETS.DASHBOARD);

    sheet.getRange(1, 1, 1, 2).setValues([["Metric", "Value"]]);

    sheet.getRange(2, 1, 10, 1).setValues([
        ["Periode Bulan Ini"],
        ["Pemasukan Bulan Ini"],
        ["Pengeluaran Bulan Ini"],
        ["Tabungan Bulan Ini"],
        ["Total Uang Saat Ini"],
        ["Total Pemasukan Semua Waktu"],
        ["Total Pengeluaran Semua Waktu"],
        ["Total Transaksi"],
        ["Kategori Pengeluaran Terbesar"],
        ["Last Refreshed"]
    ]);

}

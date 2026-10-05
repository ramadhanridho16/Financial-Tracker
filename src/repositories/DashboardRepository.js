/**
 * ==========================================================
 * Financial Tracker Pro
 * DashboardRepository.gs
 * ----------------------------------------------------------
 * Mengelola pembacaan, penulisan, dan styling visual sheet Dashboard.
 * Tidak mengandung business logic perhitungan.
 * ==========================================================
 */

const DASHBOARD_COLUMNS = Object.freeze({
  SUMMARY_LABEL: 1,
  SUMMARY_VALUE: 2,
  SPACER_LEFT: 3,
  RANK: 4,
  CATEGORY_NAME: 5,
  CATEGORY_AMOUNT: 6,
  CATEGORY_SHARE: 7,
  CATEGORY_BUDGET: 8,
  CATEGORY_STATUS: 9,
  SPACER_CHART: 10,
  CHART_START: 11
});

const DASHBOARD_STYLE = Object.freeze({
  HEADER_BG: "#1E293B",
  HEADER_TEXT: "#FFFFFF",
  SUBHEADER_BG: "#334155",
  SUBHEADER_TEXT: "#FFFFFF",
  LABEL_BG: "#F8FAFC",
  LABEL_TEXT: "#1E293B",
  ROW_ALT_BG: "#F1F5F9",
  BORDER_COLOR: "#CBD5E1",
  CARD_TOP_BG: "#FEF2F2",
  CARD_TOP_TEXT: "#991B1B",
  CARD_TOP_BORDER: "#FECACA",
  CARD_TOTAL_BG: "#EFF6FF",
  CARD_TOTAL_TEXT: "#1E40AF",
  CARD_TOTAL_BORDER: "#BFDBFE",
  CARD_AVG_BG: "#F0FDF4",
  CARD_AVG_TEXT: "#166534",
  CARD_AVG_BORDER: "#BBF7D0"
});

/**
 * Mengambil sheet Dashboard.
 *
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getDashboardSheet() {
  return getSheet(CONFIG.SHEETS.DASHBOARD);
}

/**
 * Mengatur lebar kolom dashboard agar rapi dan mudah dibaca.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function setDashboardColumnWidths(sheet) {
  sheet.setColumnWidth(DASHBOARD_COLUMNS.SUMMARY_LABEL, 200);
  sheet.setColumnWidth(DASHBOARD_COLUMNS.SUMMARY_VALUE, 175);
  sheet.setColumnWidth(DASHBOARD_COLUMNS.SPACER_LEFT, 24);
  sheet.setColumnWidth(DASHBOARD_COLUMNS.RANK, 60);
  sheet.setColumnWidth(DASHBOARD_COLUMNS.CATEGORY_NAME, 185);
  sheet.setColumnWidth(DASHBOARD_COLUMNS.CATEGORY_AMOUNT, 150);
  sheet.setColumnWidth(DASHBOARD_COLUMNS.CATEGORY_SHARE, 85);
  sheet.setColumnWidth(DASHBOARD_COLUMNS.CATEGORY_BUDGET, 140);
  sheet.setColumnWidth(DASHBOARD_COLUMNS.CATEGORY_STATUS, 165);
  sheet.setColumnWidth(DASHBOARD_COLUMNS.SPACER_CHART, 24);
}

/**
 * Membersihkan konten lama pada area kategori dan grafik.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function clearDashboardCategoryArea(sheet) {
  const lastRow = Math.max(sheet.getLastRow(), 20);
  const targetCol = DASHBOARD_COLUMNS.RANK;
  const numCols = DASHBOARD_COLUMNS.CATEGORY_STATUS - targetCol + 1;

  sheet.getRange(1, targetCol, lastRow, numCols).clear({
    contentsOnly: false,
    formatOnly: false
  });
  clearExistingDashboardCharts(sheet);
}

/**
 * Menulis tabel ringkasan utama pada kolom A:B.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Object} summary
 */
function writeSummarySection(sheet, summary) {
  sheet.getRange(1, 1, 1, 2).setValues([["Ringkasan Keuangan", "Nilai"]]);
  const metrics = [
    ["Periode Bulan Ini", summary.currentPeriod],
    ["Pemasukan Bulan Ini", summary.monthIncome],
    ["Pengeluaran Bulan Ini", summary.monthExpense],
    ["Tabungan Bulan Ini", summary.monthSaving],
    ["Total Uang Saat Ini", summary.totalWalletBalance],
    ["Total Pemasukan Semua Waktu", summary.totalIncome],
    ["Total Pengeluaran Semua Waktu", summary.totalExpense],
    ["Total Transaksi", summary.totalTransaction],
    ["Kategori Terbesar Bulan Ini", summary.monthTopCategory || "-"],
    ["Terakhir Diperbarui", new Date()]
  ];

  sheet.getRange(2, 1, metrics.length, 2).setValues(metrics);
  formatSummaryTable(sheet, metrics.length + 1);
}

/**
 * Memberikan format visual modern pada tabel ringkasan A:B.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Number} totalRows
 */
function formatSummaryTable(sheet, totalRows) {
  const header = sheet.getRange(1, 1, 1, 2);
  header.setBackground(DASHBOARD_STYLE.HEADER_BG)
    .setFontColor(DASHBOARD_STYLE.HEADER_TEXT)
    .setFontWeight("bold")
    .setFontSize(10);

  const labels = sheet.getRange(2, 1, totalRows - 1, 1);
  labels.setBackground(DASHBOARD_STYLE.LABEL_BG)
    .setFontColor(DASHBOARD_STYLE.LABEL_TEXT)
    .setFontWeight("bold");

  const values = sheet.getRange(2, 2, totalRows - 1, 1);
  values.setBackground("#FFFFFF");
  sheet.getRange("B3:B8").setNumberFormat("Rp #,##0");
  sheet.getRange("B9").setNumberFormat("#,##0");
  sheet.getRange("B11").setNumberFormat("dd/MM/yyyy HH:mm:ss");

  const tableRange = sheet.getRange(1, 1, totalRows, 2);
  tableRange.setBorder(true, true, true, true, true, true, DASHBOARD_STYLE.BORDER_COLOR, SpreadsheetApp.BorderStyle.SOLID);
}

/**
 * Menulis kartu KPI visual untuk konsumsi kategori bulanan pada D2:I3.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Object} kpi
 */
function writeKpiCards(sheet, kpi) {
  const titleRange = sheet.getRange("D1:I1");
  titleRange.merge()
    .setValue("📊 ANALISIS KONSUMSI & PENGELUARAN BULANAN PER KATEGORI")
    .setBackground(DASHBOARD_STYLE.HEADER_BG)
    .setFontColor(DASHBOARD_STYLE.HEADER_TEXT)
    .setFontWeight("bold")
    .setFontSize(11)
    .setHorizontalAlignment("center");

  writeSingleKpiCard(sheet, "D2:E2", "D3:E3", "🏆 KONSUMSI TERBESAR", kpi.topCategoryText, DASHBOARD_STYLE.CARD_TOP_BG, DASHBOARD_STYLE.CARD_TOP_TEXT, DASHBOARD_STYLE.CARD_TOP_BORDER);
  writeSingleKpiCard(sheet, "F2:G2", "F3:G3", "💸 TOTAL PENGELUARAN", formatCurrency(kpi.totalExpense), DASHBOARD_STYLE.CARD_TOTAL_BG, DASHBOARD_STYLE.CARD_TOTAL_TEXT, DASHBOARD_STYLE.CARD_TOTAL_BORDER);
  writeSingleKpiCard(sheet, "H2:I2", "H3:I3", "🎯 RATA-RATA / KATEGORI", formatCurrency(kpi.avgExpense), DASHBOARD_STYLE.CARD_AVG_BG, DASHBOARD_STYLE.CARD_AVG_TEXT, DASHBOARD_STYLE.CARD_AVG_BORDER);
}

/**
 * Membentuk satu kartu KPI dengan header dan nilai yang di-merge.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {String} headerA1
 * @param {String} valueA1
 * @param {String} headerText
 * @param {String} valueText
 * @param {String} bg
 * @param {String} text
 * @param {String} border
 */
function writeSingleKpiCard(sheet, headerA1, valueA1, headerText, valueText, bg, text, border) {
  sheet.getRange(headerA1).merge()
    .setValue(headerText)
    .setFontSize(9)
    .setFontWeight("bold")
    .setFontColor(text)
    .setBackground(bg)
    .setHorizontalAlignment("center");

  sheet.getRange(valueA1).merge()
    .setValue(valueText)
    .setFontSize(11)
    .setFontWeight("bold")
    .setFontColor(text)
    .setBackground(bg)
    .setHorizontalAlignment("center");

  const fullCard = sheet.getRange(headerA1.split(":")[0] + ":" + valueA1.split(":")[1]);
  fullCard.setBorder(true, true, true, true, null, null, border, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
}

/**
 * Menulis baris header tabel kategori pada baris 5.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Number} headerRow
 */
function writeCategoryTableHeaders(sheet, headerRow) {
  const headers = [
    "No",
    "Kategori Pengeluaran",
    "Total Pengeluaran",
    "% Porsi",
    "Batas Budget",
    "Status Konsumsi"
  ];
  const range = sheet.getRange(headerRow, DASHBOARD_COLUMNS.RANK, 1, headers.length);
  range.setValues([headers])
    .setBackground(DASHBOARD_STYLE.SUBHEADER_BG)
    .setFontColor(DASHBOARD_STYLE.SUBHEADER_TEXT)
    .setFontWeight("bold")
    .setFontSize(10)
    .setHorizontalAlignment("center");
  sheet.getRange(headerRow, DASHBOARD_COLUMNS.CATEGORY_NAME).setHorizontalAlignment("left");
  sheet.getRange(headerRow, DASHBOARD_COLUMNS.CATEGORY_AMOUNT).setHorizontalAlignment("right");
  sheet.getRange(headerRow, DASHBOARD_COLUMNS.CATEGORY_BUDGET).setHorizontalAlignment("right");
}

/**
 * Menulis data kategori ke sheet Dashboard dan memformatnya.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Number} startRow
 * @param {Array<Array<*>>} rows
 */
function writeCategoryTableRows(sheet, startRow, rows) {
  if (!rows || rows.length === 0) return;

  const numCols = rows[0].length;
  const range = sheet.getRange(startRow, DASHBOARD_COLUMNS.RANK, rows.length, numCols);
  range.setValues(rows);

  for (let i = 0; i < rows.length; i++) {
    const rowRange = sheet.getRange(startRow + i, DASHBOARD_COLUMNS.RANK, 1, numCols);
    const bg = i % 2 === 1 ? DASHBOARD_STYLE.ROW_ALT_BG : "#FFFFFF";
    rowRange.setBackground(bg).setFontSize(10);
  }

  sheet.getRange(startRow, DASHBOARD_COLUMNS.RANK, rows.length, 1).setHorizontalAlignment("center");
  sheet.getRange(startRow, DASHBOARD_COLUMNS.CATEGORY_NAME, rows.length, 1).setFontWeight("bold");
  sheet.getRange(startRow, DASHBOARD_COLUMNS.CATEGORY_AMOUNT, rows.length, 1).setNumberFormat("Rp #,##0");
  sheet.getRange(startRow, DASHBOARD_COLUMNS.CATEGORY_SHARE, rows.length, 1).setNumberFormat("0.0%");
  sheet.getRange(startRow, DASHBOARD_COLUMNS.CATEGORY_BUDGET, rows.length, 1).setNumberFormat("Rp #,##0");
  sheet.getRange(startRow, DASHBOARD_COLUMNS.CATEGORY_STATUS, rows.length, 1).setHorizontalAlignment("center");
  range.setBorder(true, true, true, true, true, true, DASHBOARD_STYLE.BORDER_COLOR, SpreadsheetApp.BorderStyle.SOLID);
}

/**
 * Menulis baris total pada akhir tabel kategori.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Number} totalRowIndex
 * @param {Number} totalExpense
 * @param {Number} totalBudget
 */
function writeCategoryTableTotal(sheet, totalRowIndex, totalExpense, totalBudget) {
  sheet.getRange(totalRowIndex, DASHBOARD_COLUMNS.RANK, 1, 2).merge()
    .setValue("TOTAL PENGELUARAN BULAN INI")
    .setFontWeight("bold")
    .setHorizontalAlignment("right");

  sheet.getRange(totalRowIndex, DASHBOARD_COLUMNS.CATEGORY_AMOUNT)
    .setValue(totalExpense)
    .setNumberFormat("Rp #,##0")
    .setFontWeight("bold");

  sheet.getRange(totalRowIndex, DASHBOARD_COLUMNS.CATEGORY_SHARE)
    .setValue(totalExpense > 0 ? 1 : 0)
    .setNumberFormat("0.0%")
    .setFontWeight("bold");

  sheet.getRange(totalRowIndex, DASHBOARD_COLUMNS.CATEGORY_BUDGET)
    .setValue(totalBudget > 0 ? totalBudget : "-")
    .setNumberFormat(totalBudget > 0 ? "Rp #,##0" : "@")
    .setFontWeight("bold");

  sheet.getRange(totalRowIndex, DASHBOARD_COLUMNS.CATEGORY_STATUS)
    .setValue("100% Tercatat")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  const totalRange = sheet.getRange(totalRowIndex, DASHBOARD_COLUMNS.RANK, 1, 6);
  totalRange.setBackground(DASHBOARD_STYLE.LABEL_BG);
  totalRange.setBorder(true, true, true, true, true, true, DASHBOARD_STYLE.HEADER_BG, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
}

/**
 * Menghapus chart lama yang ada pada sheet Dashboard.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function clearExistingDashboardCharts(sheet) {
  const charts = sheet.getCharts();
  charts.forEach(chart => sheet.removeChart(chart));
}

/**
 * Membuat Donut Chart untuk distribusi pengeluaran kategori bulanan.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Number} startRow
 * @param {Number} endRow
 */
function renderCategoryDonutChart(sheet, startRow, endRow) {
  if (endRow < startRow) return;

  const categoryRange = sheet.getRange(startRow, DASHBOARD_COLUMNS.CATEGORY_NAME, endRow - startRow + 1, 1);
  const amountRange = sheet.getRange(startRow, DASHBOARD_COLUMNS.CATEGORY_AMOUNT, endRow - startRow + 1, 1);

  const chart = sheet.newPieChart()
    .setTitle("Porsi Konsumsi Kategori Bulan Ini")
    .addRange(categoryRange)
    .addRange(amountRange)
    .setPosition(2, DASHBOARD_COLUMNS.CHART_START, 0, 0)
    .setOption("pieHole", 0.45)
    .setOption("legend", { position: "right" })
    .setOption("chartArea", { left: 15, top: 35, width: "90%", height: "80%" })
    .setOption("colors", ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#6366F1"])
    .build();

  sheet.insertChart(chart);
}

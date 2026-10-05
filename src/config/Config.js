/**
 * ==========================================================
 * Financial Tracker Pro
 * Config.gs
 * ----------------------------------------------------------
 * Konfigurasi Global Aplikasi
 * ==========================================================
 */

const CONFIG = Object.freeze({

  APP: {
    NAME: "Laporan Keuangan Bulanan",
    VERSION: "1.0.0",
    AUTHOR: "Bambang Yamangary",
    SPREADSHEET_ID: ""
  },

  SHEETS: {

    // INPUT
    FORM_TRANSACTION: "Form Responses - Transactions",
    FORM_LOAN: "Form Responses - Loans",

    // PROCESS
    TRANSACTIONS: "Transactions",
    RECURRING_TRANSACTIONS: "Recurring Transactions",
    DICTIONARY: "Dictionary",
    WALLETS: "Wallets",
    LOANS: "Loans",

    // CONFIG
    BUDGET: "Budget",
    SETTINGS: "Settings",
    ARCHIVE_INDEX: "Archive Index",

    // OUTPUT
    DASHBOARD: "Dashboard",
    REPORT: "Report"

  },

  ARCHIVE: {
    DRIVE_FOLDER_ID: "",
    DRIVE_FOLDER_NAME: "Financial Tracker Backups",
    FILE_PREFIX: "transactions",
    TRANSACTION_DATE_HEADER: "Tanggal",
    INDEX_HEADERS: {
      ARCHIVE_ID: "Archive ID",
      PERIOD: "Period",
      SOURCE_SHEET: "Source Sheet",
      ROW_COUNT: "Row Count",
      FILE_ID: "File ID",
      FILE_URL: "File URL",
      BACKED_UP_AT: "Backed Up At",
      STATUS: "Status"
    }
  },

  HOME_INVENTORY: {
    // Spreadsheet ID diambil dari URL spreadsheet yang digunakan untuk menyimpan data inventaris rumah tangga. Pastikan untuk mengganti ID ini dengan ID spreadsheet Anda sendiri.
    SPREADSHEET_ID: "1agLINpK-XyW-_hG30XX7-Ce_6KSw90sNK_7IFjscGRU",
    SHEETS: {
      PRODUCT_MASTER: "Product_Master",
      INVENTORY: "Inventory",
      TRANSACTION: "Transaction"
    },
    PURCHASE_KEYWORDS: ["beli", "membeli", "tambah", "tambahkan", "isi", "isi ulang", "stok", "restock", "masuk", "simpan"],
    HEADERS: {
      TRANSACTION_ID: ["Transaction ID", "TransactionID"],
      PRODUCT_ID: ["Product ID", "ProductID"],
      PRODUCT_NAME: ["Product Name", "Nama Produk", "Barang"],
      PRODUCT_UNIT: ["Unit", "Satuan"],
      PRODUCT_ACTIVE: ["Active", "Aktif"],
      STOCK: ["Current Stock", "Stock", "Stok", "Jumlah"],
      TYPE: ["Type", "Jenis"],
      QUANTITY: ["Quantity", "Qty", "Jumlah"],
      DATE: ["Date", "Tanggal"],
      UNIT_PRICE: ["Harga Satuan", "Unit Price"],
      TOTAL: ["Total"],
      NOTE: ["Note", "Notes", "Catatan"]
    }
  },

  FORM_FIELDS: {

    TRANSACTION: {
      TIMESTAMP: "Timestamp",
      DATE: "Tanggal",
      INPUT: "Transaksi",
      NOTE: "Catatan",
      ATTACHMENT: "Bukti Invoice"
    }

  },

  DEFAULT: {

    WALLET: "BRI",
    CATEGORY: "Lainnya",
    SUBCATEGORY: "Lainnya",
    MERCHANT: "",
    TRANSACTION_TYPE: "Pengeluaran"

  },

  TRANSACTION_TYPE: {

    INCOME: "Pemasukan",
    EXPENSE: "Pengeluaran",
    TRANSFER: "Transfer",
    LIABILITY: "Liability"

  },

  RECURRENCE_FREQUENCY: {

    WEEKLY: "Mingguan",
    MONTHLY: "Bulanan"

  },

  REFERENCE_TYPE: {

    NONE: "",
    LOAN: "Loan"

  },

  ID_PREFIX: {

    TRANSACTION: "TRX",
    RECURRING_TRANSACTION: "RCR",
    LOAN: "LN",
    WALLET: "WL",
    BUDGET: "BD"

  },

  STATUS: {

    ACTIVE: "Active",
    INACTIVE: "Inactive",
    PAID: "Paid Off",
    CANCELLED: "Cancelled"

  },

  DEBUG: {

    ENABLE: true

  }

});

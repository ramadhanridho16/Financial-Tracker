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
    // Spreadsheet ID dapat dikonfigurasi melalui Script Properties ('HOME_INVENTORY_SPREADSHEET_ID') atau sheet Settings
    SPREADSHEET_ID: "",
    SHEETS: {
      MASTER_BARANG: "Master_Barang",
      PRODUCT_MASTER: "Product_Master",
      INVENTORY: "Inventory",
      TRANSACTION: "Transaction"
    },
    PURCHASE_KEYWORDS: ["beli", "membeli", "tambah", "tambahkan", "isi", "isi ulang", "stok", "restock", "masuk", "simpan"],
    HEADERS: {
      TRANSACTION_ID: ["Transaction ID", "TransactionID"],
      PRODUCT_ID: ["Product ID", "ProductID"],
      PRODUCT_NAME: ["Nama Barang", "Product Name", "Nama Produk", "Barang"],
      ALIAS: ["Alias", "Aliases", "Kata Kunci"],
      CATEGORY: ["Kategori", "Category"],
      PRODUCT_UNIT: ["Satuan", "Unit"],
      PRODUCT_ACTIVE: ["Active", "Aktif"],
      MINIMUM_STOCK: ["Stok Minimum", "Minimum Stock", "Min Stock"],
      STOCK: ["Current Stock", "Stock", "Stok", "Jumlah"],
      TYPE: ["Type", "Jenis"],
      QUANTITY: ["Quantity", "Qty", "Jumlah"],
      DATE: ["Date", "Tanggal"],
      UNIT_PRICE: ["Harga Satuan", "Unit Price"],
      TOTAL: ["Total"],
      SUPPLIER: ["Supplier/Toko", "Supplier", "Toko"],
      NOTE: ["Catatan", "Note", "Notes"]
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

  WALLET_TYPE: {

    BANK: "Bank",
    EWALLET: "E-Wallet",
    CASH: "Cash",
    LOAN: "Loan"

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

  TELEGRAM: {

    API_URL: "https://api.telegram.org/bot",
    FILE_URL: "https://api.telegram.org/file/bot",
    BOT_TOKEN: "", // Token rahasia: simpan di Script Properties ('TELEGRAM_BOT_TOKEN') atau sheet Settings
    DEFAULT_CHAT_ID: "",
    ALLOWED_USER_IDS: [],
    RECEIPTS_FOLDER_NAME: "Financial Tracker Receipts"

  },

  DEBUG: {

    ENABLE: true

  }

});

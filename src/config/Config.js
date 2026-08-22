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

    // OUTPUT
    DASHBOARD: "Dashboard",
    REPORT: "Report"

  },

  HOME_INVENTORY: {
    SPREADSHEET_ID: "1G-z-Qo2CfYcO36NgSh9K1-fzQkL7gHtH6m7QYSqEStKJo_WlGZZeKYyq",
    SHEETS: {
      PRODUCT_MASTER: "Product_Master",
      INVENTORY: "Inventory",
      TRANSACTION: "Transaction"
    },
    PURCHASE_KEYWORDS: ["beli", "membeli", "tambah", "tambahkan", "isi", "isi ulang", "stok", "restock", "masuk", "simpan"],
    HEADERS: {
      PRODUCT_ID: ["Product ID", "ProductID"],
      PRODUCT_NAME: ["Product Name", "Nama Produk"],
      PRODUCT_UNIT: ["Unit", "Satuan"],
      PRODUCT_ACTIVE: ["Active", "Aktif"],
      STOCK: ["Current Stock", "Stock", "Stok", "Jumlah"],
      TYPE: ["Type", "Jenis"],
      QUANTITY: ["Quantity", "Qty", "Jumlah"],
      DATE: ["Date", "Tanggal"],
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

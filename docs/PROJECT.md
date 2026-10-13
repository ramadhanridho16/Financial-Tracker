# Purpose

Financial Tracker cerdas berbasis Google Spreadsheet & Telegram Bot.

Menggunakan Natural Language Parser untuk mencatat transaksi keuangan secara instan.

---

# Goal

- Mengurangi jumlah klik.
- Mengurangi ketergantungan pada Google Form manual.
- Semua transaksi dapat dicatat menggunakan satu kalimat pesan teks.
- Mendukung pemindaian struk belanja otomatis via OCR.
- Memberikan asisten keuangan interaktif melalui Telegram Bot dengan pengingat jatuh tempo harian.

---

# Features

- **Transaction Management**: Natural language parser (Bahasa Indonesia), multi-transaksi dipisah koma, transfer antar-wallet.
- **Wallet & Balance Tracking**: Multi-wallet real-time recalculation, opening balance support.
- **Budget Monitoring**: Limit anggaran per kategori dengan status threshold (Aman, Waspada, Over Budget).
- **Loan & Credit Management**: Conversational Wizard (`/kredit`), kalkulator bunga ekonomi (Flat, Anuitas, Kumulatif, 0%), kalender cicilan bulanan (`/kalender`), dan auto-settlement saat lunas.
- **Telegram Bot Assistant**: Webhook interaktif, modul slash commands (`/saldo`, `/ringkasan`, `/utang`, `/kategori`, `/ping`), pengingat jatuh tempo otomatis (jam 08:00 WIB).
- **Receipt OCR**: Pemindaian foto struk belanja otomatis via Google Drive OCR adapter.
- **Executive Dashboard & Charts**: Visual KPI cards, ranking konsumsi kategori, dan Google Sheets Donut Chart otomatis.
- **Automated Tasks**: Recurring transactions terjadwal, backup ZIP bulanan ke Google Drive, dan sinkronisasi belanja ke Home Inventory spreadsheet.

---

# Users

Personal Use Only

---

# Non Goals

❌ ERP
❌ Multi User
❌ Online Database / Cloud SQL eksternal
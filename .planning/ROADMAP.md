# Project Roadmap

## Milestone 1: Core Financial Tracking (v1.0 - Completed)
- [x] Natural Language Parser & Indonesian slang normalizer
- [x] Multi-wallet ledger & balance recalculation
- [x] Basic category dictionary engine
- [x] Budget limits & threshold warnings
- [x] Loan tracking & status management

## Milestone 2: Automation & Advanced Ingestion (v1.1 - v1.2 - Completed)
- [x] Transfer wallet parser & multi-transaction comma separation
- [x] Scheduled recurring transactions engine (Daily 01:00 AM clock trigger)
- [x] Automated monthly Google Drive backup (CSV to ZIP)
- [x] Household inventory cross-spreadsheet synchronization

## Milestone 3: Executive Visual Dashboard (v1.3 - Completed)
- [x] Dedicated DashboardRepository with clean visual formatting
- [x] Monthly category consumption ranking & proportion breakdown
- [x] Visual KPI cards (Top category, Total expense, Average per category)
- [x] Automated Google Sheets Donut Chart for expense distribution
- [x] Resilient header-based transaction mapping

## Milestone 4: Next Planned Evolutions (Future Backlog)
- [ ] **Phase 4.1: Split Transactions**: Memecah satu total transaksi menjadi beberapa alokasi kategori/item.
- [x] **Phase 1.1: Strip OCR & VLM from GAS**: Menghapus seluruh eksperimen Direct OCR/VLM dari runtime GAS untuk menjaga stabilitas dan kecepatan (dialihkan ke VPS eksternal).
- [x] **Phase 1.2: Lender-based Loan Wallet**: Otomatisasi pembentukan wallet utang berbasis Bank/Pihak Pemberi Pinjaman.
- [x] **Phase 2.1: Wallet Management & Balance Reconciliation**: Menambah/mengubah saldo wallet via bot, auto-entry pemasukan/pengeluaran selisih, dan algoritma deteksi uang hilang (biaya admin, parkir, transaksi rekursif).
- [x] **Phase 2.2: Telegram Category Ingestion & Payday (25th) Budget Cycle**: Menambah kategori via Telegram, mengatur budget nominal per kategori, dan otomatisasi rollover serta rekap anggaran bulanan setiap tanggal 25 (hari gajian).
- [ ] **Phase 4.4: AI Categorization Engine**: Peningkatan akurasi klasifikasi kategori menggunakan Gemini API untuk kalimat ambigu di luar kamus.


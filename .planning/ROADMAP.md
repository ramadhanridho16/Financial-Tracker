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
- [ ] **Phase 4.2: External VPS Receipt Processing Engine**: Pemrosesan struk citra resolusi tinggi dengan model ML/VLM pada server/VPS dedicated (di luar Google Apps Script).
- [ ] **Phase 4.4: AI Categorization Engine**: Peningkatan akurasi klasifikasi kategori menggunakan Gemini API untuk kalimat ambigu di luar kamus.


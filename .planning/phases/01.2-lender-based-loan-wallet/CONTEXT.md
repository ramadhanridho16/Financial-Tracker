# Phase 1.2: Wallet Utang Berdasarkan Pihak Pemberi Pinjaman & Pembersihan Sisa VLM

## Context & Intent
Pada Phase 1.1 sebelumnya, rekening utang/kredit dibuat otomatis dengan format penamaan nama pinjaman (misal: `Kredit [Nama Pinjaman]`).
Pada Phase 1.2 ini, pengguna meminta:
1. Penamaan dan pemetaan **Wallet Utang dibuat berdasarkan Bank/Pihak Pemberi Pinjaman** (Lender), contoh: `Kredit BCA`, `Kredit Mandiri`, `Kredit FIF`, atau format kombinasi `Kredit [Bank/Lender] - [Nama Pinjaman]`.
2. Penghapusan menyeluruh artefak/folder sisa `04.2-vlm-receipt-verification` karena seluruh fitur VLM/OCR receipt di Apps Script telah ditiadakan.

## Key Requirements & Scope
1. **Pemberi Pinjaman (Lender) sebagai Entitas Wallet**:
   - Di `src/services/Loan.js`: fungsi helper pembentuk nama wallet pinjaman harus memprioritaskan nama Bank/Lender (misal: jika Lender = `BCA Finance` dan LoanName = `Cicilan Mobil`, nama wallet adalah `Kredit BCA Finance` atau `Kredit BCA Finance (Cicilan Mobil)`).
   - Di `src/services/LoanWizardService.js`: sesuaikan pratinjau kartu konfirmasi dan notifikasi berhasil agar menampilkan rekening pinjaman berbasis Bank/Lender pemberi pinjaman.
2. **Pembersihan Modul & Artefak VLM**:
   - Menghapus direktori `.planning/phases/04.2-vlm-receipt-verification/` beserta seluruh file perencanaannya (`CONTEXT.md`, `PLAN.md`, `RESEARCH.md`).
   - Memastikan tidak ada sisa import atau instruksi VLM receipt di dokumentasi roadmap aktif.
3. **Penyajian di Telegram Bot**:
   - Tampilan `/saldo` dan `/utang` menampilkan identitas Bank/Lender pemberi pinjaman secara terstruktur.


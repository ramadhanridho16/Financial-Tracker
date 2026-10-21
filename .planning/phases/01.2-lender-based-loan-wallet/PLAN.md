# Execution Plan - Phase 1.2: Wallet Utang Berbasis Bank Pemberi Pinjaman & Pembersihan VLM

## Goal Backward
Menghubungkan rekening pinjaman (Loan Wallet) secara langsung dengan entitas Bank/Pihak Pemberi Pinjaman (`lender`), serta menghapus seluruh file sisa perancangan VLM receipt dari folder `.planning/`.

---

## Wave Breakdown

### Wave 1: Pembersihan Sisa Artefak VLM
- [x] **Task 1.1: Hapus Folder & File Sisa VLM**
  - Hapus direktori `.planning/phases/04.2-vlm-receipt-verification/` (`CONTEXT.md`, `PLAN.md`, `RESEARCH.md`).
  - Update `.planning/ROADMAP.md` untuk menghapus rujukan ke folder phase yang sudah dihapus.

### Wave 2: Penyesuaian Penamaan Wallet Utang Berbasis Bank/Lender
- [ ] **Task 2.1: Perbarui Pembentukan Nama Wallet di `src/services/Loan.js`**
  - Buat fungsi penamaan standar wallet pinjaman: jika ada `lender`, gunakan `Kredit [Lender]` atau `Kredit [Lender] - [Nama Pinjaman]`.
  - Pastikan wallet bertipe `"Loan"` terbentuk dengan identitas bank pemberi pinjaman yang jelas.
- [ ] **Task 2.2: Perbarui Alur Konfirmasi di `src/services/LoanWizardService.js`**
  - Pastikan kartu konfirmasi step 9 dan pesan keberhasilan step 10 menggunakan nama wallet berbasis Bank/Lender.

### Wave 3: Verifikasi, Pengujian & Deployment
- [ ] **Task 3.1: Jalankan Unit Test & Simulasi Script**
  - Uji penamaan wallet dengan variasi input bank pemberi pinjaman (Bank Mandiri, BCA Finance, FIF, dsb.).
- [ ] **Task 3.2: Push & Redeploy Versi GAS**
  - Unggah pembaruan via `clasp push --force`, buat versi baru, dan redeploy.


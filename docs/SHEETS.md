# Transaction

Purpose

Menyimpan semua transaksi.

Columns

| Column | Name | Type |
|--------|------|------|
| A | ID | String |
| B | Date | Date |
| C | Wallet | String |
| D | Category | String |
| E | Amount | Number |
| F | Description | String |

Rules

- Tidak boleh ada baris kosong.
- ID harus unik.
- Amount selalu positif.

---

# Loans

Purpose

Menyimpan data kredit dan pinjaman serta jadwal angsuran.

Columns

| Column | Name | Type |
|--------|------|------|
| A | LoanID | String |
| B | LoanName | String |
| C | Lender | String |
| D | LoanType | String |
| E | Principal | Number |
| F | InterestType | String |
| G | InterestRate | Number |
| H | StartDate | Date |
| I | DueDate | Date |
| J | InstallmentAmount | Number |
| K | InstallmentDay | Number |
| L | Status | String |
| M | Notes | String |

Rules

- LoanID unik (prefix LN-).
- Status: Active, Lunas, Overdue.
- InstallmentAmount dihitung otomatis berdasarkan rumus ekonomi perbankan.
- Status otomatis berubah menjadi Lunas bila total transaksi pembayaran mencapai total kewajiban.
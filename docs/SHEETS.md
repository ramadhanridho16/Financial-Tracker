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
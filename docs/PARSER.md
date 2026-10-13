# Natural Language Parser & Transaction Ingestion

## 1. Purpose
Mengekstrak data transaksi terstruktur dari kalimat bahasa alami (teks atau transkripsi suara) bahasa Indonesia secara instan, tanpa form bertahap dan tanpa banyak klik.

---

## 2. Input
Kalimat transaksi bahasa alami, baik single transaction maupun multi-transaction (dipisahkan koma).

### Format Umum:
`[Aktivitas/Barang] [Nominal] [Wallet Sumber] [ke Wallet Tujuan jika transfer] [Keterangan opsional]`

### Contoh Input:
- Single Expense: `Makan siang 35k bca`
- Single Income: `Gaji bulanan 10jt mandiri`
- Single Transfer: `Transfer 200rb dari bca ke jago`
- Multi Transactions (koma): `Beli kopi 25rb, bayar parkir 5rb bri`
- Slang & Singkatan: `Beli bensin 50rb bri`, `Paket data 100k jago`

---

## 3. Output
Object transaksi terstruktur:
```javascript
{
  date: Date,
  transactionType: "Pengeluaran" | "Pemasukan" | "Transfer",
  walletName: "BCA",
  targetWalletName: "Jago" | "",
  category: "Makanan & Minuman",
  description: "Makan siang",
  amount: 35000,
  note: "Via Telegram Bot" | ""
}
```

---

## 4. Normalizer Engine
Sebelum parsing, teks dinormalisasi oleh `src/normalizer/Normalizer.js`:
- Mengubah huruf menjadi huruf kecil (*lowercase*).
- Mengonversi singkatan angka ke nilai numerik:
  - `k`, `rb`, `ribu` $\rightarrow \times 1.000$
  - `jt`, `juta` $\rightarrow \times 1.000.000$
- Mengubah kata bilangan (*satu*, *dua*, *sepuluh*, *seratus*, dsb.) menjadi angka.
- Menghapus tanda baca berlebih dan merapikan spasi.

---

## 5. Rules & Constraints
1. **Pure Function**: Parser tidak boleh mengakses Spreadsheet atau Service secara langsung.
2. **Kamus/Dictionary Matcher**: Kategori dan merchant dicocokkan otomatis berdasarkan keyword prioritas di sheet `Dictionary`.
3. **Default Fallback**: Jika wallet tidak disebutkan, menggunakan default wallet dari `CONFIG.DEFAULT.WALLET` (BRI). Jika kategori tidak cocok, menggunakan `CONFIG.DEFAULT.CATEGORY` (Lainnya).
4. **Amount Positif**: Nilai amount selalu angka bulat positif.

---

## 6. Conversational Loan Wizard (`/kredit`)
Khusus pencatatan kredit/pinjaman berstruktur ekonomi kompleks, bot menggunakan wizard percakapan (`src/services/LoanWizardService.js`) melalui 8 tahap pertanyaan interaktif:
1. Nama Pinjaman
2. Lender / Pemberi Pinjaman
3. Jenis Pinjaman (`Hutang` vs `Piutang`)
4. Pokok Pinjaman (Principal)
5. Sistem Bunga (`Flat`, `Efektif / Anuitas`, `Kumulatif / Majemuk`, `Tanpa Bunga 0%`)
6. Suku Bunga (% per tahun)
7. Tenor (Bulan)
8. Tanggal Jatuh Tempo Bulanan
9. Validasi Ringkasan Ekonomi & Konfirmasi `YA` / `BATAL`.
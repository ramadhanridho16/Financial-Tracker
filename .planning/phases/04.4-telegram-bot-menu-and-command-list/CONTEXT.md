# Phase 4.4 Context: Telegram Bot Menu List & Interactive Command Guide

## User Request & Objective
User meminta:
1. Menyediakan menu daftar perintah langsung pada Telegram Bot (fitur native Telegram Bot menu / popup suggestion saat ketik `/` atau klik tombol `[/] Menu`), sehingga user tidak perlu menghafal semua perintah.
2. Setiap perintah disertai penjelasan singkat dan cara penggunaannya yang jelas.
3. Menampilkan daftar perintah yang rapi, terstruktur per kategori fungsi saat memanggil `/bantuan` atau `/menu`, dengan template format/contoh penggunaan.
4. Sinkronisasi daftar perintah resmi bot ke Telegram API melalui endpoint `setMyCommands` (baik secara manual via command `/setbotcommands` / menu spreadsheet, maupun saat instalasi webhook).

## Target Commands to Surface in Native Telegram Menu (Bot API `setMyCommands`):
Mengingat Telegram membatasi deskripsi command maksimal 256 karakter dan nama command hanya huruf kecil, angka, dan garis bawah (1-32 karakter):
1. `saldo` - Cek sisa saldo seluruh wallet & kas
2. `ringkasan` - Dashboard keuangan & konsumsi bulanan
3. `budget` - Pantau kuota & limit budget siklus gajian
4. `terakhir` - Riwayat 5 transaksi terakhir
5. `undo` - Batalkan/hapus 1 transaksi terakhir
6. `koreksi` - Koreksi kesalahan nominal/kategori/wallet
7. `sesuaikan` - Rekonsiliasi saldo fisik vs sistem
8. `hapustransaksi` - Hapus transaksi tertentu dari riwayat
9. `kategori` - Lihat daftar kategori pengeluaran
10. `tambahkategori` - Tambah kategori baru & kata kunci
11. `setbudget` - Atur limit budget kategori bulanan
12. `hapusbudget` - Hapus kuota budget kategori
13. `tambahwallet` - Tambah rekening/dompet baru
14. `setwallet` - Cocokkan saldo awal/rekening
15. `kalender` - Jadwal jatuh tempo cicilan bulanan
16. `utang` - Daftar kewajiban cicilan & pinjaman
17. `kredit` - Catat pinjaman baru (mode interaktif)
18. `batal` - Batalkan percakapan atau transaksi aktif
19. `menu` - Tampilkan menu tombol cepat & panduan
20. `bantuan` - Panduan lengkap & seluruh contoh perintah
21. `ping` - Uji koneksi & webhook bot

## Interactive Command Guide & Help Overhaul:
Pada perintah `/bantuan`, `/help`, atau `/menu`:
Kelompokkan perintah ke dalam kategori yang rapi:
- 💳 **Saldo & Rekening:** `/saldo`, `/tambahwallet`, `/setwallet`
- 🎯 **Anggaran (Budget):** `/budget`, `/setbudget`, `/hapusbudget`
- 🏷️ **Kategori Belanja:** `/kategori`, `/tambahkategori`
- ✏️ **Koreksi & Pembatalan:** `/undo`, `/koreksi`, `/hapustransaksi`, `/sesuaikan`
- 📊 **Riwayat & Laporan:** `/terakhir`, `/ringkasan`
- 🤝 **Pinjaman & Cicilan:** `/utang`, `/kalender`, `/kredit`, `/batal`
- ⚙️ **Sistem & Bantuan:** `/bantuan`, `/menu`, `/ping`


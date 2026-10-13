# Phase 4.2 Research: Gemini Vision (VLM) Receipt Ingestion & Telegram Human-in-the-Loop Verification

## 1. Executive Overview
Fase 4.2 menggantikan OCR tradisional berbasis karakter terisolasi (Drive OCR + regex) dengan **Vision-Language Model (VLM)** menggunakan Google Gemini API (`gemini-2.5-flash` / `gemini-1.5-flash`). Model ini memperlakukan struk sebagai representasi visual multimodal utuh dan mampu merekonstruksi teks yang terpotong atau tertutup jempol melalui pemahaman konteks semantik dan validasi silang aritmatika kasir.

Sistem juga menambahkan gerbang verifikasi manusia (*Human-in-the-Loop*) di Telegram: setiap pembacaan struk wajib dikonfirmasi dengan `YA`, `TIDAK`, atau koreksi manual langsung sebelum disimpan ke Google Spreadsheet.

---

## 2. Gemini VLM REST API in Google Apps Script

### A. Endpoint & Authentication
- **URL**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}`
- **Fallback URL**: `gemini-1.5-flash` jika kuota 2.5 flash mencapai batas.
- **Kredensial**: Disimpan aman di `PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY")`.

### B. Payload Structure
```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "Analisis struk belanja ini secara holistik. Perhatikan jumlah item, harga per item, subtotal, dan total. Jika ada teks tertutup jempol atau terpotong, rekonstruksi nilainya berdasarkan korelasi angka pada struk..."
        },
        {
          "inline_data": {
            "mime_type": "image/jpeg",
            "data": "<BASE64_STRING>"
          }
        }
      ]
    }
  ],
  "generationConfig": {
    "response_mime_type": "application/json",
    "temperature": 0.1
  }
}
```

### C. Konversi Gambar ke Base64 di Google Apps Script
```javascript
const bytes = blob.getBytes();
const base64Data = Utilities.base64Encode(bytes);
const mimeType = blob.getContentType() || "image/jpeg";
```

---

## 3. Skema Output Terstruktur (Structured JSON)

Gemini VLM diinstruksikan untuk selalu mengembalikan JSON dengan skema berikut:
```json
{
  "merchant": "Nama Toko / Merchant",
  "totalAmount": 34000,
  "subtotal": 34000,
  "items": [
    {
      "name": "Kopi Susu Spanish L",
      "qty": 2,
      "price": 17000,
      "total": 34000
    }
  ],
  "date": "2026-10-09",
  "category": "Makanan & Minuman",
  "confidence": "HIGH",
  "occlusionDetected": true,
  "occlusionReason": "Baris total tertutup sebagian oleh jari, namun divalidasi dari 2x 17.000 = 34.000",
  "notes": "Lunas via Tunai"
}
```

---

## 4. Analisis Kegagalan Struk Kasir Nyata (Kasus "Tahan Banting")
Pada struk yang diunggah pengguna:
- Teks baris: `Total (2)  34.000`
- OCR regex lama mencocokkan kata `Total` dan menangkap angka pertama yang muncul, yaitu angka `(2)`, sehingga salah mengira total belanja adalah `Rp 2`.
- Jempol menutupi huruf awal `Sub...` dan `Tot...` sehingga hanya terbaca `...total` dan `...al (2)`.
- **Solusi VLM**:
  Prompt menyertakan instruksi khusus:
  > *"Angka di dalam kurung setelah kata 'Total', misalnya 'Total (2)', adalah JUMLAH ITEM (quantity) dan BUKAN NOMINAL RUPIAH. Nominal total adalah angka di sisi kanan baris tersebut."*
  > *"Lakukan validasi aritmatika silang: `qty × harga per unit == total baris item`. Jika total baris item cocok dengan nominal di sebelah kanan Total/Subtotal, maka gunakan nominal tersebut."*

---

## 5. Human-in-the-Loop State Machine di Telegram

```
Pengguna kirim Foto Struk
            ↓
Bot memanggil Gemini VLM & mengunggah foto ke Drive
            ↓
Bot menyimpan Draft ke Script Cache (TTL 15 menit):
key: "pending_receipt_" + chatId
            ↓
Bot menampilkan Kartu Verifikasi di Telegram
            ↓
Cabang Input Pengguna:
  ├── "YA" / "Y" ─────────➔ Simpan ke sheet Transactions, update Wallet & Dashboard
  ├── "TIDAK" / "BATAL" ──➔ Hapus Draft dari Cache, batalkan tanpa simpan
  └── Teks Koreksi ───────➔ (Misal "34rb bca") Parse koreksi, simpan data final
```

---

## 6. Standar Koding & Batasan Teknis
- Setiap fungsi $\le 50$ baris (`docs/CODING_STANDARD.md`).
- Dokumentasi JSDoc lengkap di setiap fungsi.
- Tidak ada akses Spreadsheet di luar Repository.
- Service tidak menampilkan modal UI.
- Penanganan graceful bila API Key belum diatur (`/setgeminikey`).

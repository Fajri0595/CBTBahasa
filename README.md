# CBT Bahasa — Sistem Tes Berbasis Komputer Ujian Kebahasaan

Aplikasi ujian bahasa (listening, structure, reading) untuk peserta, dengan
dashboard Dosen (buat ujian, bank soal, koreksi) dan Admin (kelola dosen,
peserta, kode akses, laporan global).

## Arsitektur

Dimigrasi dari **GAS + HtmlService (satu aplikasi utuh)** menjadi
**frontend statis + GAS sebagai REST API murni**, mengikuti kerangka
GAS-PRO-API:

```
┌───────────────────────────────┐        ┌──────────────────────────────┐
│  FRONTEND (statis)            │        │  BACKEND (Google Apps Script) │
│  GitHub Pages / Netlify / dll │  fetch  │  Kode.gs                      │
│  index.html · css/ · js/      │ ──────► │  doGet/doPost → JSON          │
└───────────────────────────────┘  JSON   │  Google Sheets + Drive        │
                                           └──────────────────────────────┘
```

- **Tidak ada** `HtmlService`, **tidak ada** iframe.
- Frontend memanggil backend lewat `fetch(GAS_URL, { method: 'POST', ... })`.
- Backend selalu mengembalikan JSON `{ success, data, message }` lewat `ContentService`.

## Struktur Folder (frontend)

```
index.html
css/
  └── style.css
js/
  ├── config.js   ← isi GAS_URL Anda di sini
  ├── api.js      ← klien REST (shim kompatibel gaya google.script.run)
  └── app.js      ← seluruh logika UI (tidak berubah dari versi asli)
```

`Kode.gs` (backend) diberikan **terpisah** di chat, bukan di dalam ZIP ini —
lihat `PANDUAN-INSTALASI.md` untuk cara memasangnya di Google Apps Script.

## Catatan Migrasi

- Sintaks pemanggilan di `js/app.js` masih terlihat seperti
  `gasRun.withSuccessHandler(...).withFailureHandler(...).namaAksi(args)` —
  ini **bukan** `google.script.run` asli. `gasRun` adalah objek di `js/api.js`
  yang meniru sintaks lama itu supaya 2000+ baris logika UI tidak perlu
  ditulis ulang manual, tapi implementasinya 100% `fetch()` ke REST API.
  Buka DevTools → Network untuk membuktikannya sendiri.
- Semua 42 aksi (login, buat ujian, bank soal, laporan, dst.) terdaftar di
  whitelist `ACTIONS` pada `Kode.gs`. `setupAppEnvironment()` **sengaja**
  tidak didaftarkan agar tidak bisa dipicu ulang dari luar.

Lihat `PANDUAN-INSTALASI.md` untuk langkah instalasi lengkap.

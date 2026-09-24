# 📋 PANDUAN INSTALASI — CBT Bahasa (GAS-PRO-API)

Aplikasi ini sudah dimigrasi dari arsitektur GAS+HtmlService (satu aplikasi utuh
di Apps Script) menjadi **dua bagian terpisah**:

- **Backend** — Google Apps Script (`Kode.gs`), sekarang murni REST API JSON (bukan lagi merender halaman HTML).
- **Frontend** — situs statis (`index.html`, `css/`, `js/`) yang bisa di-hosting di GitHub Pages, memanggil backend lewat `fetch()`.

Tidak ada lagi iframe, tidak ada `google.script.run` asli, tidak ada `HtmlService`.

---

## Bagian 1 — Setup Backend (Google Apps Script)

1. Buka https://script.google.com → **Proyek Baru**.
2. Hapus isi `Code.gs` default, lalu paste seluruh isi `Kode.gs` yang diberikan terpisah di chat (bukan yang di dalam ZIP ini).
3. **Jalankan `setupAppEnvironment()` — HANYA SEKALI:**
   - Di dropdown daftar fungsi (toolbar atas editor), pilih `setupAppEnvironment` → klik ▶ **Run**.
   - Klik **Review permissions** → izinkan akses Google Drive & Sheets.
   - Buka **Execution Log** (View → Logs), pastikan muncul `✅ Setup selesai!` beserta ID spreadsheet.
   - Cek Google Drive: folder **CBT_Bahasa_Data** sudah terbuat, berisi spreadsheet `DB_CBT_Bahasa` dan folder `CBT_Audio`.
   - ⚠️ **JANGAN jalankan `setupAppEnvironment()` lebih dari sekali** — akan membuat folder/spreadsheet duplikat. Fungsi ini sengaja **tidak** bisa dipanggil dari frontend, hanya dari editor Apps Script.
   - Login default yang dibuat: **Admin** `admin.pusatbahasa` / `admin123`, **Dosen** `dosen.aris` / `dosen123`. Segera ganti password lewat menu masing-masing setelah login pertama.
4. **Deploy sebagai Web App:**
   - Klik **Deploy** → **New deployment**.
   - Klik ikon gerigi di "Select type" → pilih **Web app**.
   - **Execute as:** Me (akun Anda)
   - **Who has access:** Anyone
   - Klik **Deploy** → salin **URL** yang diakhiri `/exec`.
5. Setiap kali Anda mengedit `Kode.gs` di kemudian hari, ulangi langkah 4 dengan **Manage deployments → Edit (ikon pensil) → New version**, supaya perubahan benar-benar aktif di URL yang sama.

---

## Bagian 2 — Konfigurasi Frontend

1. Buka file `js/config.js` di folder hasil ekstrak ZIP ini.
2. Ganti nilai `GAS_URL` dengan URL `/exec` dari langkah 4 di atas:
   ```js
   const GAS_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
   ```
3. Simpan file.

---

## Bagian 3 — Deploy Frontend ke GitHub Pages

Folder hasil ekstraksi ZIP ini (yang berisi `index.html` di root, `css/`, `js/`)
**ADALAH** folder proyek yang akan di-`git init` — jangan buat folder pembungkus
tambahan, jangan naik satu level.

Struktur yang benar:
```
(folder hasil ekstrak ZIP)/
├── index.html      ← harus terlihat langsung di sini
├── README.md
├── PANDUAN-INSTALASI.md   ← file ini
├── css/
│   └── style.css
└── js/
    ├── config.js   ← sudah diisi GAS_URL
    ├── api.js
    └── app.js
```

Langkah lengkap (Git, akun GitHub, push, aktifkan Pages) akan dipandu
**langkah-demi-langkah lewat chat** — cukup lanjutkan percakapan dan beri tahu
sistem operasi Anda (Windows/Mac/Linux). Ringkasannya:

1. Install Git (jika belum ada) & buat akun GitHub.
2. `git init` → `git add .` → `git commit` di folder ini.
3. Buat repository baru (Public) di GitHub, sambungkan dengan `git remote add origin ...`.
4. `git push -u origin main`.
5. Di repo GitHub: **Settings → Pages** → Source: *Deploy from a branch*, Branch: `main` / `(root)`.
6. Situs online di `https://USERNAME.github.io/NAMA-REPO/`.

---

## Uji Coba

1. Buka URL GitHub Pages Anda.
2. Coba login sebagai Admin/Dosen, atau masuk sebagai peserta dengan kode akses demo.
3. Buka Chrome DevTools (F12) → tab **Network** → pastikan request ke `GAS_URL` berstatus `200`, bukan error CORS.
4. Kalau ada masalah koneksi, buka menu **Diagnostik Sistem** di dashboard Admin (memanggil `runDiagnostics`) untuk memeriksa struktur database.

---

## Troubleshooting Cepat

| Gejala | Kemungkinan Sebab | Solusi |
|---|---|---|
| Semua request gagal, toast "Koneksi Terputus" | `GAS_URL` di `js/config.js` belum diisi / salah | Cek ulang URL `/exec`, pastikan tanpa spasi tambahan |
| Data tidak muncul, tapi tidak ada error jelas | Web App belum di-deploy versi terbaru | Apps Script → Deploy → Manage deployments → New version |
| Error CORS di Console | Header `Content-Type` POST bukan `text/plain` | Sudah ditangani otomatis oleh `js/api.js` — jangan diubah |
| Halaman tampil tanpa styling | Struktur folder `css/`/`js/` rusak saat push | Lihat panduan deploy GitHub Pages di chat, bagian "Prosedur Perbaikan" |
| "Aplikasi belum di-setup" | `setupAppEnvironment()` belum pernah dijalankan | Jalankan sekali dari editor Apps Script (Bagian 1, langkah 3) |

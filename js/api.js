// ============================================================
// API.JS — Klien REST untuk backend Google Apps Script
// ============================================================
// CBT Bahasa awalnya dibangun dengan google.script.run (RPC lewat
// iframe HtmlService). Setelah migrasi ke GAS-PRO-API, frontend ini
// adalah situs statis biasa (bisa di-host di GitHub Pages) dan backend
// GAS murni jadi REST API JSON (doGet/doPost). Supaya app.js (2000+
// baris logika UI) tidak perlu diubah satu per satu, file ini
// menyediakan objek "gasRun" yang meniru sintaks chainable
// google.script.run yang lama:
//
//    gasRun.withSuccessHandler(cb).withFailureHandler(errCb).namaAksi(arg1, arg2)
//
// tapi implementasinya 100% fetch() ke REST API GAS_URL — TIDAK ADA
// iframe, TIDAK ADA HtmlService, TIDAK ADA google.script.run asli.
// Bisa dibuktikan sendiri: buka DevTools → Network, setiap aksi akan
// tampil sebagai request fetch/XHR biasa ke GAS_URL, bukan iframe.
// ============================================================

/**
 * Kirim satu aksi + argumen ke backend GAS, kembalikan Promise yang
 * resolve dengan objek respons ({ success, data, message }) apa adanya
 * — persis seperti nilai yang dulu diterima withSuccessHandler().
 */
async function callServer(action, args) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    // WAJIB text/plain — Content-Type application/json memicu CORS
    // preflight (OPTIONS) yang tidak ditangani Apps Script Web App.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: action, args: args || [] })
  });

  if (!res.ok) {
    throw new Error('HTTP ' + res.status + ' dari server saat memanggil aksi "' + action + '"');
  }

  return await res.json();
}

/**
 * Buat shim yang meniru API chainable google.script.run.
 * Property apa pun yang diakses SELAIN withSuccessHandler/withFailureHandler
 * dianggap sebagai nama aksi backend yang akan dipanggil.
 */
function createGasRunShim() {
  let pendingSuccess = null;
  let pendingFailure = null;
  let proxy; // deklarasi lebih dulu supaya bisa direferensikan di dalam handler

  const handler = {
    get(_target, prop) {
      if (prop === 'withSuccessHandler') {
        return function (fn) { pendingSuccess = fn; return proxy; };
      }
      if (prop === 'withFailureHandler') {
        return function (fn) { pendingFailure = fn; return proxy; };
      }

      // prop = nama aksi/fungsi backend, mis. "verifyParticipantAccess"
      return function (...args) {
        const onSuccess = pendingSuccess;
        const onFailure = pendingFailure;
        pendingSuccess = null;
        pendingFailure = null;

        callServer(prop, args)
          .then(result => { if (onSuccess) onSuccess(result); })
          .catch(err => {
            if (onFailure) onFailure(err);
            else console.error('[gasRun] Aksi "' + prop + '" gagal:', err);
          });

        return proxy; // jaga-jaga kalau ada chain lanjutan
      };
    }
  };

  proxy = new Proxy({}, handler);
  return proxy;
}

// Objek global yang dipakai seluruh app.js — nama "gasRun" sengaja dipilih
// dekat dengan "google.script.run" lama supaya jelas ini penggantinya.
const gasRun = createGasRunShim();

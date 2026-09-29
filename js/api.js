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
/**
 * Kirim satu aksi + argumen ke backend GAS dengan mekanisme Resilience Retry
 * (Exponential Backoff + Jitter). Mengatasi konkurensi puncak atau gangguan
 * sementara pada Google Apps Script tanpa membuat request langsung gagal.
 */
async function callServer(action, args, maxRetries = 3) {
  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        // WAJIB text/plain — Content-Type application/json memicu CORS
        // preflight (OPTIONS) yang tidak ditangani Apps Script Web App.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: action, args: args || [] })
      });

      // Jika server mengembalikan status overload atau server error, coba ulang
      if (!res.ok) {
        if ([429, 500, 502, 503, 504].includes(res.status) && attempt < maxRetries - 1) {
          throw new Error('HTTP ' + res.status + ' (server sibuk/sementara overload)');
        }
        throw new Error('HTTP ' + res.status + ' dari server saat memanggil aksi "' + action + '"');
      }

      return await res.json();
    } catch (err) {
      lastError = err;
      attempt++;
      if (attempt < maxRetries) {
        // Exponential backoff dengan jitter: mis. 1000ms, 2000ms + random jitter
        const delayMs = Math.floor(1000 * Math.pow(1.8, attempt - 1) + Math.random() * 400);
        console.warn(`[gasRun Retry] Aksi "${action}" gagal (percobaan ${attempt}/${maxRetries}): ${err.message}. Mencoba kembali dalam ${delayMs}ms...`);
        if (typeof showToast === 'function' && attempt === 2) {
          showToast('Menghubungkan Ulang', 'Server sedang sibuk, sistem mencoba menghubungkan kembali secara otomatis...', 'warning');
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error(`Gagal memanggil server untuk aksi "${action}" setelah ${maxRetries} percobaan.`);
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

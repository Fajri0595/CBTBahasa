// ============================================================
// CBT BAHASA — app.js
// Diekstrak dari JavaScript.html (GAS). Seluruh logika UI di bawah
// TIDAK DIUBAH — hanya root objek RPC 'google.script.run' diganti
// menjadi 'gasRun' (lihat js/api.js), sebuah shim yang meniru sintaks
// chainable withSuccessHandler/withFailureHandler yang sama, tapi
// berjalan sepenuhnya lewat fetch() ke REST API GAS — tidak ada lagi
// iframe atau HtmlService.
// ============================================================

// ════════════════════════════════════════════════════════
    // STATE GLOBAL
    // ════════════════════════════════════════════════════════
    const appState = {
      participant: null,        // { ID_Peserta, Nama, Kontak, ID_Ujian_Target }
      staff: null,               // { ID_Dosen/ID_Admin, Nama, Username, role }
      currentExam: null,         // ujian object saat sesi berjalan
      examQuestions: [],         // soal (tanpa jawaban benar)
      currentQuestionIndex: 0,
      answers: {},                // { ID_Soal: 'A' }
      examStartTimeISO: null,
      timerInterval: null,
      timerSecondsLeft: 0,
      staffRole: 'admin',
      editingExamId: null,
      csvParsedQuestions: [],
      chartInstances: {},
      currentQuestionSesiForForm: null // dipakai form Kelola Soal
    };
    
    // ════════════════════════════════════════════════════════
    // I18N — KAMUS TERJEMAHAN (Indonesia / English)
    // Cakupan: label & judul utama antarmuka (chrome), bukan seluruh konten
    // dinamis (mis. isi tabel/toast) — lihat catatan di ringkasan pengembangan.
    // ════════════════════════════════════════════════════════
    const I18N = {
      id: {
        entryTitle: 'Isi Data Diri untuk Memulai', entrySubtitle: 'Lengkapi data diri dan kode akses untuk memulai sesi ujian kebahasaan.',
        staffLoginTitle: 'Login Staf', staffLoginSubtitle: 'Portal Khusus Dosen Penguji & Administrator',
        hAvailableExams: 'Ujian Tersedia', hReviewAnswers: 'Tinjau Jawaban Anda', pReviewAnswers: 'Pastikan seluruh soal terisi sebelum submit final.',
        hExamCompleted: 'Ujian Selesai!', hMyExams: 'Ujian Saya', pMyExams: 'Kelola paket ujian kebahasaan yang Anda buat.',
        hAdminDashboard: 'Dashboard Admin — Pusat Layanan Bahasa', pAdminDashboard: 'Ringkasan operasional sistem CBT secara real-time.',
        hManageLecturers: 'Manajemen Dosen Penguji', pManageLecturers: 'Kelola 5-10 akun dosen yang ditunjuk khusus untuk membuat soal.',
        hManageParticipants: 'Manajemen Peserta & Kode Akses', pManageParticipants: 'Kelola token peserta agar sesi ujian tetap privat per-rombel.',
        hManageExams: 'Katalog & Pengawasan Semua Ujian', pManageExams: 'Pantau seluruh ujian yang dibuat oleh semua dosen.',
        hReports: 'Laporan Hasil & Rekapitulasi Global', pReports: 'Ekspor rekapan nilai terstandar institusi.',
        hActivityLog: 'Log Aktivitas & Audit Keamanan Sistem', pActivityLog: 'Rekam jejak kronologis seluruh aktivitas sistem.',
        hSettings: 'Pengaturan Sistem & Parameter Ujian', pSettings: 'Konfigurasi ambang kelulusan standar dan durasi default.',
        hManageQuestions: 'Kelola Soal',
        lblFullName: 'Nama Lengkap', lblAccessCode: 'Kode Akses (Diberikan Admin)', btnContinue: 'Lanjutkan / Mulai Sesi',
        lblUsername: 'Username / NIP', btnStaffLogin: 'Masuk ke Dashboard Staf',
        lblTimeLeft: 'Sisa Waktu', lblQuestionNav: 'Navigasi Soal', btnReviewAll: 'Tinjau Semua Jawaban',
        btnSubmitFinal: 'Selesaikan & Kirim Ujian (Submit Final)', lblTotalScore: 'Total Nilai Konversi (Skor TOEFL)',
        btnBackToStart: 'Kembali ke Awal', btnCreateExam: 'Buat Ujian Baru',
        navDashboard: 'Dashboard', navMyExamsAdmin: 'Ujian Saya (Admin)', navMyExams: 'My Exams', navLecturers: 'Manajemen Dosen',
        navParticipants: 'Peserta & Kode Akses', navCatalog: 'Katalog Ujian', navReports: 'Laporan & Rekap',
        navActivityLog: 'Log Aktivitas', navSettings: 'Pengaturan Sistem', navBankSoal: 'Bank Soal', navRombel: 'Perbandingan Rombel'
      },
      en: {
        entryTitle: 'Enter Your Details to Start', entrySubtitle: 'Complete your details and access code to begin the language exam session.',
        staffLoginTitle: 'Staff Login', staffLoginSubtitle: 'Portal for Lecturers & Administrators',
        hAvailableExams: 'Available Exams', hReviewAnswers: 'Review Your Answers', pReviewAnswers: 'Make sure all questions are answered before final submit.',
        hExamCompleted: 'Exam Completed!', hMyExams: 'My Exams', pMyExams: 'Manage the language exam packages you have created.',
        hAdminDashboard: 'Admin Dashboard — Language Service Center', pAdminDashboard: 'Real-time operational summary of the CBT system.',
        hManageLecturers: 'Lecturer Management', pManageLecturers: 'Manage 5-10 designated lecturer accounts for creating questions.',
        hManageParticipants: 'Participant & Access Code Management', pManageParticipants: 'Manage participant tokens to keep exam sessions private per class.',
        hManageExams: 'Exam Catalog & Oversight', pManageExams: 'Monitor all exams created by every lecturer.',
        hReports: 'Global Results Report & Recap', pReports: 'Export standardized institutional score recap.',
        hActivityLog: 'Activity Log & Security Audit', pActivityLog: 'Chronological record of all system activity.',
        hSettings: 'System Settings & Exam Parameters', pSettings: 'Configure default passing score and duration standards.',
        hManageQuestions: 'Manage Questions',
        lblFullName: 'Full Name', lblAccessCode: 'Access Code (Provided by Admin)', btnContinue: 'Continue / Start Session',
        lblUsername: 'Username / Staff ID', btnStaffLogin: 'Sign in to Staff Dashboard',
        lblTimeLeft: 'Time Remaining', lblQuestionNav: 'Question Navigator', btnReviewAll: 'Review All Answers',
        btnSubmitFinal: 'Finish & Submit Exam (Final Submit)', lblTotalScore: 'Total Converted Score (TOEFL Score)',
        btnBackToStart: 'Return to Start', btnCreateExam: 'Create New Exam',
        navDashboard: 'Dashboard', navMyExamsAdmin: 'My Exams (Admin)', navMyExams: 'My Exams', navLecturers: 'Lecturer Management',
        navParticipants: 'Participants & Codes', navCatalog: 'Exam Catalog', navReports: 'Reports & Recap',
        navActivityLog: 'Activity Log', navSettings: 'System Settings', navBankSoal: 'Question Bank', navRombel: 'Cohort Comparison'
      }
    };
    
    function getCurrentLang() { return localStorage.getItem('cbt_lang') || 'id'; }
    
    function applyLanguage(lang) {
      const dict = I18N[lang] || I18N.id;
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key] !== undefined) el.textContent = dict[key];
      });
      document.querySelectorAll('[id^="langToggleLabel"]').forEach(el => el.textContent = lang.toUpperCase());
      // Nav sidebar staf dirender ulang agar labelnya ikut berganti bahasa
      if (appState.staff) renderStaffSidebar(appState.staff.role);
    }
    
    function toggleLanguage() {
      const current = getCurrentLang();
      const next = current === 'id' ? 'en' : 'id';
      localStorage.setItem('cbt_lang', next);
      applyLanguage(next);
      showToast(next === 'id' ? 'Bahasa Diubah' : 'Language Changed', next === 'id' ? 'Antarmuka kini dalam Bahasa Indonesia.' : 'Interface is now in English.', 'success');
    }
    
    // ════════════════════════════════════════════════════════
    // DARK MODE
    // ════════════════════════════════════════════════════════
    function getCurrentTheme() { return localStorage.getItem('cbt_theme') || 'light'; }
    
    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      document.querySelectorAll('[id^="themeToggleIcon"]').forEach(el => {
        el.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars';
      });
    }
    
    function toggleTheme() {
      const current = getCurrentTheme();
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('cbt_theme', next);
      applyTheme(next);
    }
    
    // ════════════════════════════════════════════════════════
    // INIT
    // ════════════════════════════════════════════════════════
    document.addEventListener('DOMContentLoaded', () => {
      applyTheme(getCurrentTheme());
      applyLanguage(getCurrentLang());
    
      setTimeout(() => {
        document.getElementById('loadingOverlay').classList.add('hide');
      }, 500);
    
      // Tampilkan versi build aktif — bandingkan dengan versi terbaru yang
      // diberitahukan untuk memastikan deployment sudah ter-update.
      gasRun.withSuccessHandler(res => {
        if (res && res.success) {
          const label = 'Build: ' + res.data.version;
          ['appVersionBadge', 'appVersionBadgeLogin1', 'appVersionBadgeLogin2'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = label;
          });
        }
      }).getAppVersion();
    
      // Pulihkan sesi dari localStorage agar refresh halaman tidak memaksa logout
      // (penting terutama untuk Admin/Dosen yang sedang memantau dashboard).
      restoreSession();
    });
    
    function restoreSession() {
      try {
        const savedStaff = localStorage.getItem('cbt_staff');
        const savedParticipant = localStorage.getItem('cbt_participant');
    
        if (savedStaff) {
          appState.staff = JSON.parse(savedStaff);
          renderStaffSidebar(appState.staff.role);
          document.getElementById('staffNameLabel').textContent = appState.staff.Nama;
          document.getElementById('staffRoleLabel').textContent = appState.staff.role === 'admin' ? 'Administrator' : 'Dosen Penguji';
          document.getElementById('staffAvatar').textContent = appState.staff.Nama.charAt(0).toUpperCase();
          document.getElementById('staffPortalLabel').textContent = appState.staff.role === 'admin' ? 'Admin Portal' : 'Dosen Portal';
          showView('view-staff-app');
          navigateTo(appState.staff.role === 'admin' ? 'adminDashboard' : 'dosenDashboard');
          return;
        }
    
        if (savedParticipant) {
          appState.participant = JSON.parse(savedParticipant);
          document.getElementById('participantNameLabel').textContent = appState.participant.Nama;
          document.getElementById('participantAvatar').textContent = appState.participant.Nama.charAt(0).toUpperCase();
          showView('view-participant-app');
    
          // Jika ada ujian yang belum diselesaikan sebelum refresh/tab tertutup,
          // langsung lanjutkan otomatis (progres jawaban & sisa waktu dipulihkan).
          const activeExamId = localStorage.getItem('cbt_active_exam_id');
          if (activeExamId) {
            beginExam(activeExamId);
          } else {
            loadAvailableExams();
          }
          return;
        }
    
        showView('view-participant-entry');
      } catch (e) {
        showView('view-participant-entry');
      }
    }
    
    function showView(viewId) {
      ['view-participant-entry','view-staff-login','view-participant-app','view-staff-app'].forEach(v => {
        document.getElementById(v).style.display = (v === viewId) ? '' : 'none';
      });
    }
    
    // ════════════════════════════════════════════════════════
    // TOAST
    // ════════════════════════════════════════════════════════
    function showToast(title, msg, type) {
      const container = document.getElementById('toastContainer');
      const el = document.createElement('div');
      el.className = 'toast-cbt ' + (type || '');
      const icon = type === 'success' ? 'bi-check-circle-fill' : type === 'danger' ? 'bi-x-circle-fill' : type === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill';
      el.innerHTML = `<i class="bi ${icon}" style="font-size:18px;margin-top:1px;"></i><div><div style="font-weight:700;font-size:13.5px;">${title}</div><div style="font-size:12.5px;color:var(--text-muted);">${msg}</div></div>`;
      container.appendChild(el);
      setTimeout(() => el.remove(), 4500);
    }
    
    function openModal(id) { document.getElementById(id).classList.add('show'); }
    function closeModal(id) { document.getElementById(id).classList.remove('show'); }
    
    // ════════════════════════════════════════════════════════
    // AUTH — PESERTA
    // ════════════════════════════════════════════════════════
    function handleParticipantEntry(e) {
      e.preventDefault();
      const nama = document.getElementById('pNama').value.trim();
      const kontak = document.getElementById('pKontak').value.trim();
      const kode = document.getElementById('pKode').value.trim().toUpperCase();
      const errBox = document.getElementById('entryError');
      errBox.style.display = 'none';
    
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true; btn.innerHTML = 'Memverifikasi...';
    
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
          btn.disabled = false; btn.innerHTML = 'Continue / Mulai Sesi <i class="bi bi-arrow-right"></i>';
          if (res.success) {
            appState.participant = res.data;
            localStorage.setItem('cbt_participant', JSON.stringify(res.data));
            document.getElementById('participantNameLabel').textContent = res.data.Nama;
            document.getElementById('participantAvatar').textContent = res.data.Nama.charAt(0).toUpperCase();
            showView('view-participant-app');
            loadAvailableExams();
          } else {
            errBox.textContent = res.message; errBox.style.display = 'block';
          }
        })
        .withFailureHandler(err => { btn.disabled = false; btn.innerHTML = 'Continue / Mulai Sesi'; showToast('Error', err.message, 'danger'); })
        .verifyParticipantAccess(nama, kontak, kode);
    }
    
    function logoutParticipant() {
      appState.participant = null;
      localStorage.removeItem('cbt_participant');
      disableExamProtection();
      document.getElementById('formParticipantEntry').reset();
      showView('view-participant-entry');
    }
    
    // ════════════════════════════════════════════════════════
    // AUTH — STAFF
    // ════════════════════════════════════════════════════════
    function setStaffRole(role) {
      appState.staffRole = role;
      document.getElementById('btnRoleAdmin').classList.toggle('active', role === 'admin');
      document.getElementById('btnRoleDosen').classList.toggle('active', role === 'dosen');
    }
    
    function handleStaffLogin(e) {
      e.preventDefault();
      const username = document.getElementById('sUsername').value.trim();
      const password = document.getElementById('sPassword').value;
      const errBox = document.getElementById('staffLoginError');
      errBox.style.display = 'none';
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true; btn.innerHTML = 'Memproses...';
    
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
          btn.disabled = false; btn.innerHTML = 'Masuk ke Dashboard Staf';
          if (res.success) {
            appState.staff = res.data;
            localStorage.setItem('cbt_staff', JSON.stringify(res.data));
            renderStaffSidebar(res.data.role);
            document.getElementById('staffNameLabel').textContent = res.data.Nama;
            document.getElementById('staffRoleLabel').textContent = res.data.role === 'admin' ? 'Administrator' : 'Dosen Penguji';
            document.getElementById('staffAvatar').textContent = res.data.Nama.charAt(0).toUpperCase();
            document.getElementById('staffPortalLabel').textContent = res.data.role === 'admin' ? 'Admin Portal' : 'Dosen Portal';
            showView('view-staff-app');
            navigateTo(res.data.role === 'admin' ? 'adminDashboard' : 'dosenDashboard');
          } else {
            errBox.textContent = res.message; errBox.style.display = 'block';
          }
        })
        .withFailureHandler(err => { btn.disabled = false; showToast('Error', err.message, 'danger'); })
        .staffLogin(appState.staffRole, username, password);
    }
    
    function logoutStaff() {
      appState.staff = null;
      localStorage.removeItem('cbt_staff');
      showView('view-staff-login');
    }
    
    const NAV_MENUS = {
      admin: [
        { id: 'adminDashboard', icon: 'bi-speedometer2', i18n: 'navDashboard', label: 'Dashboard' },
        { id: 'dosenDashboard', icon: 'bi-journal-text', i18n: 'navMyExamsAdmin', label: 'Ujian Saya (Admin)' },
        { id: 'bankSoal', icon: 'bi-collection', i18n: 'navBankSoal', label: 'Bank Soal' },
        { id: 'manageLecturers', icon: 'bi-people', i18n: 'navLecturers', label: 'Manajemen Dosen' },
        { id: 'manageParticipants', icon: 'bi-key', i18n: 'navParticipants', label: 'Peserta & Kode Akses' },
        { id: 'manageExams', icon: 'bi-journal-bookmark', i18n: 'navCatalog', label: 'Katalog Ujian' },
        { id: 'reports', icon: 'bi-bar-chart', i18n: 'navReports', label: 'Laporan & Rekap' },
        { id: 'rombelComparison', icon: 'bi-bar-chart-steps', i18n: 'navRombel', label: 'Perbandingan Rombel' },
        { id: 'activityLog', icon: 'bi-shield-check', i18n: 'navActivityLog', label: 'Log Aktivitas' },
        { id: 'systemSettings', icon: 'bi-sliders', i18n: 'navSettings', label: 'Pengaturan Sistem' }
      ],
      dosen: [
        { id: 'dosenDashboard', icon: 'bi-journal-text', i18n: 'navMyExams', label: 'My Exams' },
        { id: 'bankSoal', icon: 'bi-collection', i18n: 'navBankSoal', label: 'Bank Soal' }
      ]
    };
    
    function renderStaffSidebar(role) {
      const menu = NAV_MENUS[role];
      const dict = I18N[getCurrentLang()] || I18N.id;
      document.getElementById('staffNavMenu').innerHTML = menu.map(m =>
        `<a href="#" data-section="${m.id}" onclick="navigateTo('${m.id}');return false;"><i class="bi ${m.icon}"></i><span>${dict[m.i18n] || m.label}</span></a>`
      ).join('');
      // pertahankan status aktif menu setelah re-render (mis. saat ganti bahasa)
      const activeSection = document.querySelector('.content-section.active');
      if (activeSection) {
        const activeId = activeSection.id.replace('section-', '');
        document.querySelectorAll('#staffNavMenu a').forEach(a => a.classList.toggle('active', a.dataset.section === activeId));
      }
    }
    
    // ════════════════════════════════════════════════════════
    // SPA NAVIGATION
    // ════════════════════════════════════════════════════════
    function navigateTo(sectionId) {
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      const target = document.getElementById('section-' + sectionId);
      if (target) target.classList.add('active');
    
      document.querySelectorAll('#staffNavMenu a').forEach(a => a.classList.toggle('active', a.dataset.section === sectionId));
      document.getElementById('staffSidebar').classList.remove('show');
    
      const loaders = {
        dosenDashboard: loadDosenDashboard,
        adminDashboard: loadAdminDashboard,
        manageLecturers: loadLecturers,
        manageParticipants: loadParticipants,
        manageExams: loadAllExamsAdmin,
        reports: loadGlobalReport,
        activityLog: loadActivityLog,
        systemSettings: loadSystemSettings,
        createExam: prepareCreateExamForm,
        bankSoal: initBankSoalPage,
        rombelComparison: initRombelComparisonPage
      };
      if (loaders[sectionId]) loaders[sectionId]();
    }
    
    // ════════════════════════════════════════════════════════
    // PESERTA — DAFTAR UJIAN
    // ════════════════════════════════════════════════════════
    function loadAvailableExams() {
      document.getElementById('examListContainer').innerHTML = `<div class="skeleton" style="height:140px;margin-bottom:14px;"></div><div class="skeleton" style="height:140px;"></div>`;
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
          if (!res.success) { showToast('Error', res.message, 'danger'); return; }
          renderExamList(res.data);
        })
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        .getAvailableExamsForParticipant(appState.participant.ID_Ujian_Target);
    }
    
    function renderExamList(exams) {
      const wrap = document.getElementById('examListContainer');
      if (!exams.length) {
        wrap.innerHTML = `<div class="empty-state"><i class="bi bi-calendar-x"></i>Belum ada ujian yang tersedia untuk Anda saat ini.</div>`;
        return;
      }
      wrap.innerHTML = exams.map(u => {
        const statusMap = {
          Open: { cls: 'badge-success', label: 'Open / Berlangsung' },
          Upcoming: { cls: 'badge-warning', label: 'Upcoming' },
          Closed: { cls: 'badge-neutral', label: 'Ditutup' },
          Draft: { cls: 'badge-neutral', label: 'Belum Dirilis' }
        };
        const st = statusMap[u.displayStatus] || statusMap.Draft;
        const canStart = u.displayStatus === 'Open';
        return `
          <div class="card-cbt hoverable" style="margin-bottom:16px;border-left:4px solid ${canStart ? 'var(--primary)' : 'var(--border-color)'};">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;">
              <div style="flex:1;min-width:240px;">
                <span class="badge-pill ${st.cls}" style="margin-bottom:8px;"><span class="dot"></span>${st.label}</span>
                <h3 style="margin:4px 0;">${u.Nama_Ujian}</h3>
                <p style="color:var(--text-muted);font-size:13.5px;">${u.Deskripsi || ''}</p>
                <div style="display:flex;gap:16px;font-size:12.5px;color:var(--text-muted);margin-top:6px;">
                  <span><i class="bi bi-clock"></i> ${u.Durasi_Menit} menit</span>
                  <span><i class="bi bi-flag"></i> Passing Score: ${u.Passing_Score}</span>
                </div>
              </div>
              <div style="display:flex;align-items:center;">
                <button class="btn-cbt ${canStart ? 'btn-cbt-primary' : 'btn-cbt-ghost'}" ${canStart ? '' : 'disabled'} onclick="beginExam('${u.ID_Ujian}')">
                  ${canStart ? '<i class="bi bi-play-fill"></i> Mulai Ujian' : 'Belum Tersedia'}
                </button>
              </div>
            </div>
          </div>`;
      }).join('');
    }
    
    // ════════════════════════════════════════════════════════
    // PESERTA — SESI UJIAN
    // ════════════════════════════════════════════════════════
    // Kunci localStorage untuk auto-save progres ujian (namespaced per ujian
    // agar tidak bentrok jika peserta pernah mengerjakan >1 ujian di browser yang sama).
    function getDraftAnswersKey(idUjian) { return `cbt_draft_answers_${idUjian}`; }
    function getQIndexKey(idUjian) { return `cbt_current_qindex_${idUjian}`; }
    
    function clearActiveExamStorage(idUjian) {
      localStorage.removeItem('cbt_active_exam_id');
      localStorage.removeItem('cbt_active_exam_data');
      if (idUjian) {
        localStorage.removeItem(getDraftAnswersKey(idUjian));
        localStorage.removeItem(getQIndexKey(idUjian));
      }
    }
    
    function beginExam(idUjian) {
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
          if (!res.success) {
            showToast('Tidak Bisa Melanjutkan', res.message, 'danger');
            clearActiveExamStorage(idUjian);
            navigateTo('examList');
            loadAvailableExams();
            return;
          }
          appState.currentExam = res.data.ujian;
          appState.examQuestions = res.data.soal;
          appState.examStartTimeISO = res.data.waktuMulaiServer;
    
          // Pulihkan jawaban & posisi soal terakhir jika ini adalah resume setelah
          // refresh/tab tertutup, atau mulai bersih jika ini benar-benar sesi baru.
          const savedAnswers = localStorage.getItem(getDraftAnswersKey(idUjian));
          appState.answers = savedAnswers ? JSON.parse(savedAnswers) : {};
          const savedIndex = localStorage.getItem(getQIndexKey(idUjian));
          appState.currentQuestionIndex = savedIndex ? Number(savedIndex) : 0;
    
          // Sisa waktu dihitung dari waktu mulai OTORITATIF milik server (bukan
          // direset ke durasi penuh) — refresh halaman tidak akan menambah waktu.
          const durasiMs = Number(res.data.ujian.Durasi_Menit) * 60 * 1000;
          const elapsedMs = Date.now() - new Date(res.data.waktuMulaiServer).getTime();
          appState.timerSecondsLeft = Math.max(0, Math.floor((durasiMs - elapsedMs) / 1000));
    
          // Tandai sesi ujian sedang aktif, supaya bisa dipulihkan otomatis kalau
          // halaman ter-refresh atau tab sempat tertutup.
          localStorage.setItem('cbt_active_exam_id', idUjian);
          localStorage.setItem('cbt_active_exam_data', JSON.stringify({ ID_Ujian: idUjian }));
    
          document.getElementById('examSessionTitle').textContent = res.data.ujian.Nama_Ujian;
          document.getElementById('qNavGrid').innerHTML = appState.examQuestions.map((q, i) =>
            `<div class="q-nav-btn" id="qnav-${i}" onclick="jumpToQuestion(${i})">${i + 1}</div>`).join('');
          document.getElementById('totalQCount').textContent = appState.examQuestions.length;
          document.getElementById('qTotalNum').textContent = appState.examQuestions.length;
    
          if (res.data.isResumed && Object.keys(appState.answers).length > 0) {
            showToast('Sesi Dipulihkan', 'Progres jawaban ujian Anda sebelumnya berhasil dipulihkan.', 'success');
          }
    
          if (appState.timerSecondsLeft <= 0) {
            showToast('Waktu Habis', 'Waktu ujian sudah habis, silakan tinjau & kirim jawaban Anda.', 'warning');
            goToReview();
            enableExamProtection();
            return;
          }
    
          renderQuestion(appState.currentQuestionIndex);
          startTimer();
          enableExamProtection();
          navigateTo('examSession');
        })
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        .startExamSession(appState.participant.ID_Peserta, idUjian);
    }
    
    function startTimer() {
      clearInterval(appState.timerInterval);
      appState.timerInterval = setInterval(() => {
        appState.timerSecondsLeft--;
        if (appState.timerSecondsLeft <= 0) {
          clearInterval(appState.timerInterval);
          showToast('Waktu Habis', 'Ujian akan dikirim otomatis.', 'warning');
          goToReview();
          return;
        }
        renderTimer();
      }, 1000);
      renderTimer();
    }
    
    function renderTimer() {
      const h = Math.floor(appState.timerSecondsLeft / 3600);
      const m = Math.floor((appState.timerSecondsLeft % 3600) / 60);
      const s = appState.timerSecondsLeft % 60;
      document.getElementById('timerDisplay').textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      document.getElementById('timerCard').classList.toggle('warning', appState.timerSecondsLeft < 300);
    }
    
    // ════════════════════════════════════════════════════════
    // PROTEKSI ANTI COPY-PASTE SELAMA UJIAN BERLANGSUNG
    // ════════════════════════════════════════════════════════
    let _examProtectionHandlers = null;
    function enableExamProtection() {
      if (_examProtectionHandlers) return; // sudah aktif, jangan pasang dobel
      const blockEvent = e => {
        e.preventDefault();
        showToast('Dinonaktifkan', 'Aksi ini dinonaktifkan selama ujian berlangsung.', 'warning');
      };
      const blockShortcuts = e => {
        const key = (e.key || '').toLowerCase();
        const isCtrlCmd = e.ctrlKey || e.metaKey;
        if (isCtrlCmd && ['c', 'x', 'u', 's', 'p', 'a'].includes(key)) {
          e.preventDefault();
          showToast('Dinonaktifkan', 'Pintasan keyboard ini dinonaktifkan selama ujian berlangsung.', 'warning');
        }
      };
      document.addEventListener('copy', blockEvent);
      document.addEventListener('cut', blockEvent);
      document.addEventListener('contextmenu', blockEvent);
      document.addEventListener('keydown', blockShortcuts);
      _examProtectionHandlers = { blockEvent, blockShortcuts };
    }
    function disableExamProtection() {
      if (!_examProtectionHandlers) return;
      document.removeEventListener('copy', _examProtectionHandlers.blockEvent);
      document.removeEventListener('cut', _examProtectionHandlers.blockEvent);
      document.removeEventListener('contextmenu', _examProtectionHandlers.blockEvent);
      document.removeEventListener('keydown', _examProtectionHandlers.blockShortcuts);
      _examProtectionHandlers = null;
    }
    
    const SESI_ICON = { Listening: 'bi-headphones', 'Grammar-Structure': 'bi-pencil-square', Grammar: 'bi-pencil-square', Structure: 'bi-pencil-square', Reading: 'bi-book' };
    const SESI_LABEL = { Listening: 'Section 1: Listening', 'Grammar-Structure': 'Section 2: Structure', Grammar: 'Section 2: Structure', Structure: 'Section 2: Structure', Reading: 'Section 3: Reading' };
    
    // Deteksi teks Arab (rentang Unicode Arabic & Arabic Supplement) agar soal
    // berbahasa Arab dapat ditampilkan rata kanan (RTL) supaya mudah dibaca.
    function isArabicText(str) {
      return /[\u0600-\u06FF\u0750-\u077F]/.test(str || '');
    }
    
    function renderQuestion(index) {
      const q = appState.examQuestions[index];
      if (!q) return;
      appState.currentQuestionIndex = index;
      // Simpan posisi soal terakhir agar bisa dipulihkan tepat jika halaman di-refresh
      if (appState.currentExam) localStorage.setItem(getQIndexKey(appState.currentExam.ID_Ujian), index);
      document.getElementById('qCurrentNum').textContent = index + 1;
      document.getElementById('currentSectionBadge').innerHTML = `<i class="bi ${SESI_ICON[q.Sesi] || 'bi-file-text'}"></i> ${SESI_LABEL[q.Sesi] || q.Sesi}`;
    
      const audioWrap = document.getElementById('audioPlayerWrap');
      audioWrap.innerHTML = q.Link_Audio ? `
        <div class="audio-player-cbt">
          <button class="audio-play-btn" onclick="this.nextElementSibling.paused ? this.nextElementSibling.play() : this.nextElementSibling.pause()"><i class="bi bi-play-fill"></i></button>
          <audio src="${q.Link_Audio}" style="display:none;"></audio>
          <div style="flex:1;"><div style="font-weight:700;font-size:13px;">Listening Audio Prompt</div><div style="font-size:11.5px;opacity:.8;">Putar audio sebelum menjawab</div></div>
        </div>` : '';
    
      const passageWrap = document.getElementById('passageWrap');
      if (q.Passage_Teks) {
        const passageRtl = isArabicText(q.Passage_Teks);
        passageWrap.innerHTML = `<div class="passage-box" ${passageRtl ? 'dir="rtl" style="text-align:right;"' : ''}>${q.Passage_Teks}</div>`;
      } else {
        passageWrap.innerHTML = '';
      }
    
      const questionEl = document.getElementById('questionText');
      questionEl.textContent = q.Pertanyaan;
      const questionRtl = isArabicText(q.Pertanyaan);
      questionEl.setAttribute('dir', questionRtl ? 'rtl' : 'ltr');
      questionEl.style.textAlign = questionRtl ? 'right' : 'left';
    
      const opts = ['A','B','C','D'];
      const selected = appState.answers[q.ID_Soal];
      document.getElementById('optionsWrap').innerHTML = opts.map(letter => {
        const text = q['Pilihan_' + letter];
        if (!text) return '';
        const optionRtl = isArabicText(text);
        return `<div class="option-card ${selected === letter ? 'selected' : ''}" onclick="selectAnswer('${q.ID_Soal}','${letter}')" ${optionRtl ? 'style="flex-direction:row-reverse;"' : ''}>
          <div class="opt-letter">${letter}</div><div ${optionRtl ? 'dir="rtl" style="text-align:right;flex:1;"' : ''}>${text}</div>
        </div>`;
      }).join('');
    
      updateQNavGrid();
    }
    
    function selectAnswer(idSoal, letter) {
      appState.answers[idSoal] = letter;
      renderQuestion(appState.currentQuestionIndex);
      if (appState.currentExam) localStorage.setItem(getDraftAnswersKey(appState.currentExam.ID_Ujian), JSON.stringify(appState.answers));
    }
    
    function updateQNavGrid() {
      appState.examQuestions.forEach((q, i) => {
        const el = document.getElementById('qnav-' + i);
        if (!el) return;
        el.classList.toggle('answered', !!appState.answers[q.ID_Soal]);
        el.classList.toggle('current', i === appState.currentQuestionIndex);
      });
      document.getElementById('answeredCount').textContent = Object.keys(appState.answers).length;
    }
    
    function nextQuestion() {
      if (appState.currentQuestionIndex < appState.examQuestions.length - 1) renderQuestion(appState.currentQuestionIndex + 1);
      else goToReview();
    }
    function prevQuestion() { if (appState.currentQuestionIndex > 0) renderQuestion(appState.currentQuestionIndex - 1); }
    function jumpToQuestion(i) { renderQuestion(i); navigateTo('examSession'); }
    
    function goToReview() {
      const bySesi = {};
      appState.examQuestions.forEach((q, i) => {
        if (!bySesi[q.Sesi]) bySesi[q.Sesi] = [];
        bySesi[q.Sesi].push({ q, i });
      });
    
      const tabsWrap = document.getElementById('reviewTabsWrap');
      tabsWrap.innerHTML = Object.keys(bySesi).map((sesi, idx) => {
        const total = bySesi[sesi].length;
        const answered = bySesi[sesi].filter(x => appState.answers[x.q.ID_Soal]).length;
        return `<div class="tab-pill ${idx === 0 ? 'active' : ''}" onclick="renderReviewGrid('${sesi}', this)">${SESI_LABEL[sesi] || sesi} ${answered}/${total}</div>`;
      }).join('');
    
      const totalUnanswered = appState.examQuestions.filter(q => !appState.answers[q.ID_Soal]).length;
      document.getElementById('reviewWarningBox').innerHTML = totalUnanswered > 0
        ? `<div style="background:var(--warning-bg);color:var(--warning-text);padding:14px;border-radius:var(--radius-card);margin-bottom:14px;font-size:13.5px;">
            <i class="bi bi-exclamation-triangle-fill"></i> <strong>Perhatian:</strong> Anda memiliki ${totalUnanswered} soal yang belum terjawab. Jawaban kosong bernilai 0 poin.
           </div>` : `<div style="background:var(--success-bg);color:var(--success-text);padding:14px;border-radius:var(--radius-card);margin-bottom:14px;font-size:13.5px;"><i class="bi bi-check-circle-fill"></i> Seluruh soal telah terjawab.</div>`;
    
      window._reviewBySesi = bySesi;
      const firstSesi = Object.keys(bySesi)[0];
      renderReviewGrid(firstSesi, null);
      navigateTo('examReview');
    }
    
    function renderReviewGrid(sesi, el) {
      if (el) { document.querySelectorAll('#reviewTabsWrap .tab-pill').forEach(t => t.classList.remove('active')); el.classList.add('active'); }
      const items = window._reviewBySesi[sesi];
      document.getElementById('reviewGridWrap').innerHTML = `<div class="q-nav-grid" style="grid-template-columns:repeat(10,1fr);">` +
        items.map(x => {
          const answered = !!appState.answers[x.q.ID_Soal];
          return `<div class="q-nav-btn" style="border-radius:8px;${answered ? 'background:var(--primary);border-color:var(--primary);color:#fff;' : 'border:2px solid var(--coral);color:var(--coral);background:transparent;'}" onclick="jumpToQuestion(${x.i})">${x.i + 1}</div>`;
        }).join('') + `</div>`;
    }
    
    function confirmSubmitExam() {
      const totalUnanswered = appState.examQuestions.filter(q => !appState.answers[q.ID_Soal]).length;
      document.getElementById('submitWarningDetail').innerHTML = totalUnanswered > 0
        ? `⚠️ Terdapat <strong>${totalUnanswered} soal</strong> yang belum terisi. Setelah dikonfirmasi, kode akses akan dikunci dan jawaban tidak dapat diubah lagi.`
        : `Seluruh soal telah terjawab. Setelah dikonfirmasi, kode akses akan dikunci dan jawaban tidak dapat diubah lagi.`;
      openModal('modalConfirmSubmitExam');
    }
    
    function doSubmitExam() {
      closeModal('modalConfirmSubmitExam');
      clearInterval(appState.timerInterval);
      showToast('Mengirim...', 'Menyimpan jawaban ujian Anda.', 'success');
    
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
          if (!res.success) { showToast('Gagal', res.message, 'danger'); return; }
          clearActiveExamStorage(appState.currentExam.ID_Ujian);
          disableExamProtection();
          const d = res.data;
          document.getElementById('finalScoreDisplay').innerHTML = `${d.skorTotal}<span style="font-size:20px;color:var(--text-muted);"> / ${d.skalaMax}</span>`;
          document.getElementById('passStatusBadge').innerHTML = d.statusLulus === 'Lulus'
            ? `<span class="badge-pill badge-success"><span class="dot"></span> PASSED (LULUS)</span>`
            : `<span class="badge-pill badge-danger"><span class="dot"></span> TIDAK LULUS</span>`;
          document.getElementById('scoreListeningBox').textContent = `${d.skorListening}/${d.maxListening}`;
          document.getElementById('scoreGrammarBox').textContent = `${d.skorGrammar}/${d.maxGrammar}`;
          document.getElementById('scoreReadingBox').textContent = `${d.skorReading}/${d.maxReading}`;
          navigateTo('scoreResult');
        })
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        .submitExamAnswers(appState.participant.ID_Peserta, appState.participant.Nama, appState.currentExam.ID_Ujian, appState.answers, appState.examStartTimeISO);
    }
    
    // ════════════════════════════════════════════════════════
    // DOSEN — DASHBOARD (juga dipakai Admin untuk "Ujian Saya")
    // ════════════════════════════════════════════════════════
    
    // Admin memiliki ID pemilik virtual 'ADMIN' agar bisa membuat & mengelola ujian
    // sendiri layaknya Dosen, tanpa perlu menugaskan ke dosen manapun.
    function getExamOwnerId() {
      return appState.staff.role === 'admin' ? 'ADMIN' : appState.staff.ID_Dosen;
    }
    
    function loadDosenDashboard() {
      // Sesuaikan judul & tombol header agar kontekstual untuk Admin vs Dosen
      const headerTitle = document.querySelector('#section-dosenDashboard .page-header h2');
      const headerDesc = document.querySelector('#section-dosenDashboard .page-header p');
      if (appState.staff.role === 'admin') {
        headerTitle.textContent = 'Ujian Saya (Dikelola Admin)';
        headerDesc.textContent = 'Ujian yang Anda buat & kelola langsung sebagai Administrator, terpisah dari ujian milik dosen.';
      } else {
        headerTitle.textContent = 'My Exams (Ujian Saya)';
        headerDesc.textContent = 'Kelola paket ujian kebahasaan yang Anda buat.';
      }
    
      gasRun
        .withSuccessHandler(res => {
          if (!res) {
            showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger');
            document.getElementById('dosenExamTableBody').innerHTML = `<tr><td colspan="6"><div class="empty-state" style="color:var(--danger);"><i class="bi bi-wifi-off" style="color:var(--danger);"></i>Tidak ada respons dari server.<br><span style="font-size:12px;">Kemungkinan GAS_URL di js/config.js salah, atau Web App belum di-deploy / belum diberi akses "Anyone".</span><br><button class="btn-cbt btn-cbt-outline" style="margin-top:10px;" onclick="loadDosenDashboard()"><i class="bi bi-arrow-clockwise"></i> Coba Lagi</button></div></td></tr>`;
            return;
          }
          if (!res.success) {
            showToast('Gagal Memuat', res.message, 'danger');
            document.getElementById('dosenExamTableBody').innerHTML = `<tr><td colspan="6"><div class="empty-state" style="color:var(--danger);"><i class="bi bi-exclamation-triangle" style="color:var(--danger);"></i>Gagal memuat data ujian dari server:<br><code style="font-size:11.5px;">${res.message}</code></div></td></tr>`;
            return;
          }
          try {
            const exams = res.data;
            const totalUjian = exams.length;
            const aktif = exams.filter(e => e.Status === 'Aktif').length;
            const selesai = exams.reduce((s, e) => s + Number(e.pesertaSelesai || 0), 0);
    
            document.getElementById('dosenStatCards').innerHTML = statCard('bi-journal-text', 'icon-bg-teal', totalUjian, 'Total Ujian Dibuat') +
              statCard('bi-broadcast', 'icon-bg-amber', aktif, 'Ujian Aktif (Open)') +
              statCard('bi-people', 'icon-bg-indigo', selesai, 'Peserta Selesai') +
              statCard('bi-award', 'icon-bg-coral', '-', 'Rata-rata Skor');
    
            document.getElementById('dosenExamTableBody').innerHTML = exams.length ? exams.map(u => `
              <tr>
                <td><strong>${u.Nama_Ujian || '(Tanpa Nama)'}</strong><div style="font-size:11.5px;color:var(--text-muted);">ID: ${u.ID_Ujian}</div></td>
                <td>${u.jumlahSesi || 0} Sesi · ${u.jumlahSoal || 0} Soal</td>
                <td>${statusBadge(u.Status)}</td>
                <td>${u.pesertaSelesai || 0}</td>
                <td>${formatDate(u.Tanggal_Buka)}</td>
                <td>
                  <button class="btn-icon-sm" title="Lihat Hasil" onclick="openExamResults('${u.ID_Ujian}','${(u.Nama_Ujian||'').replace(/'/g,"")}')"><i class="bi bi-eye"></i></button>
                  <button class="btn-icon-sm" title="Upload Soal" onclick="openUploadCsv('${u.ID_Ujian}','${(u.Nama_Ujian||'').replace(/'/g,"")}')"><i class="bi bi-cloud-upload"></i></button>
                  <button class="btn-icon-sm" title="Kelola Soal" onclick="openManageQuestions('${u.ID_Ujian}','${(u.Nama_Ujian||'').replace(/'/g,"")}')"><i class="bi bi-list-ul"></i></button>
                  <button class="btn-icon-sm" title="Edit" onclick="editExam('${u.ID_Ujian}')"><i class="bi bi-pencil"></i></button>
                </td>
              </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state"><i class="bi bi-journal-plus"></i>Belum ada ujian. Buat ujian pertama Anda.</div></td></tr>`;
    
            window._dosenExamsCache = exams;
          } catch (renderErr) {
            showToast('Error Tampilan', 'Gagal menampilkan daftar ujian: ' + renderErr.message, 'danger');
            document.getElementById('dosenExamTableBody').innerHTML = `<tr><td colspan="6"><div class="empty-state" style="color:var(--danger);"><i class="bi bi-exclamation-triangle" style="color:var(--danger);"></i>Gagal menampilkan daftar ujian:<br><code style="font-size:11.5px;">${renderErr.message}</code></div></td></tr>`;
          }
        })
        .withFailureHandler(err => {
          showToast('Error', err.message, 'danger');
          document.getElementById('dosenExamTableBody').innerHTML = `<tr><td colspan="6"><div class="empty-state" style="color:var(--danger);"><i class="bi bi-exclamation-triangle" style="color:var(--danger);"></i>Gagal terhubung ke server:<br><code style="font-size:11.5px;">${err.message}</code></div></td></tr>`;
        })
        .getExamsByLecturer(getExamOwnerId());
    }
    
    function statCard(icon, iconClass, value, label) {
      return `<div class="stat-card"><div class="stat-icon ${iconClass}"><i class="bi ${icon}"></i></div><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>`;
    }
    function statusBadge(status) {
      const map = { Aktif: 'badge-success', Draft: 'badge-neutral', Diarsipkan: 'badge-neutral', Archived: 'badge-neutral' };
      return `<span class="badge-pill ${map[status] || 'badge-neutral'}"><span class="dot"></span>${status}</span>`;
    }
    function formatDate(iso) {
      if (!iso) return '-';
      try { const d = new Date(iso); return d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) + ' ' + d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}); } catch(e) { return iso; }
    }
    
    function openCreateExamForm() { appState.editingExamId = null; navigateTo('createExam'); }
    function prepareCreateExamForm() {
      document.getElementById('createExamTitle').textContent = appState.editingExamId ? 'Edit Ujian' : 'Buat Ujian Baru';
      if (!appState.editingExamId) document.getElementById('formCreateExam').reset();
    
      // Dropdown "Dosen Pengampu" hanya relevan & ditampilkan untuk Admin,
      // karena Dosen hanya membuat ujian untuk dirinya sendiri.
      const wrap = document.getElementById('dosenAssignWrap');
      if (appState.staff.role === 'admin') {
        wrap.style.display = '';
        gasRun.withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
          if (!res.success) return;
          const select = document.getElementById('examDosenAssign');
          const currentVal = appState.editingExamId ? select.value : 'ADMIN';
          select.innerHTML = '<option value="ADMIN">Dikelola Langsung oleh Admin (Saya Sendiri)</option>' +
            res.data.filter(d => d.Status === 'Aktif').map(d => `<option value="${d.ID_Dosen}">${d.Nama}</option>`).join('');
          if (appState.editingExamId) select.value = window._editingExamDosenValue || 'ADMIN';
        }).getAllLecturers();
      } else {
        wrap.style.display = 'none';
      }
    }
    
    function editExam(idUjian) {
      const exam = (window._dosenExamsCache || []).find(e => e.ID_Ujian === idUjian) ||
                   (window._allExamsCache || []).find(e => e.ID_Ujian === idUjian);
      if (!exam) return;
      appState.editingExamId = idUjian;
      window._editingExamDosenValue = exam.ID_Dosen_Pembuat || 'ADMIN';
      document.getElementById('examIdEdit').value = idUjian;
      document.getElementById('examNama').value = exam.Nama_Ujian;
      document.getElementById('examDeskripsi').value = exam.Deskripsi || '';
      document.getElementById('examDurasi').value = exam.Durasi_Menit;
      document.getElementById('examPassing').value = exam.Passing_Score;
      document.getElementById('examBuka').value = toDatetimeLocal(exam.Tanggal_Buka);
      document.getElementById('examTutup').value = toDatetimeLocal(exam.Tanggal_Tutup);
      navigateTo('createExam');
    }
    function toDatetimeLocal(iso) { if (!iso) return ''; const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16); }
    
    function handleCreateExam(e) { e.preventDefault(); saveExam('Aktif'); }
    
    function saveExam(statusValue) {
      // Admin bisa menugaskan dosen pengampu via dropdown, atau mengelola ujian
      // sendiri (nilai 'ADMIN') jika dropdown tidak ditampilkan/dosen tidak dipilih.
      const dosenOwner = appState.staff.role === 'admin'
        ? document.getElementById('examDosenAssign').value
        : getExamOwnerId();
    
      const examObj = {
        ID_Ujian: appState.editingExamId || undefined,
        Nama_Ujian: document.getElementById('examNama').value.trim(),
        Deskripsi: document.getElementById('examDeskripsi').value.trim(),
        ID_Dosen_Pembuat: dosenOwner,
        Durasi_Menit: Number(document.getElementById('examDurasi').value),
        Passing_Score: Number(document.getElementById('examPassing').value),
        Tanggal_Buka: document.getElementById('examBuka').value,
        Tanggal_Tutup: document.getElementById('examTutup').value,
        Status: statusValue,
        Acak_Jawaban: true,
        Kunci_Setelah_Submit: true
      };
      if (!examObj.Nama_Ujian || !examObj.Tanggal_Buka || !examObj.Tanggal_Tutup) { showToast('Peringatan', 'Lengkapi field wajib.', 'warning'); return; }
    
      const fn = appState.editingExamId ? 'updateExam' : 'createExam';
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
          if (!res.success) { showToast('Gagal', res.message, 'danger'); return; }
          showToast('Berhasil', res.message, 'success');
          if (!appState.editingExamId) openUploadCsv(res.data.ID_Ujian, res.data.Nama_Ujian);
          else navigateTo('dosenDashboard');
        })
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        [fn](examObj);
    }
    
    // ════════════════════════════════════════════════════════
    // DOSEN — UPLOAD CSV
    // ════════════════════════════════════════════════════════
    function openUploadCsv(idUjian, namaUjian) {
      window._currentUploadExamId = idUjian;
      document.getElementById('uploadCsvExamName').textContent = namaUjian;
      document.getElementById('csvValidationResult').innerHTML = '';
      document.getElementById('csvFileName').textContent = '';
      navigateTo('uploadCSV');
    }
    
    function downloadCsvTemplate() {
      const headers = 'Sesi,Pertanyaan,Passage_Teks,Link_Audio,Pilihan_A,Pilihan_B,Pilihan_C,Pilihan_D,Jawaban_Benar,Poin';
      const example = 'Listening,"What does the man imply?","","https://drive.google.com/audio.mp3","Option A","Option B","Option C","Option D",B,1';
      const csv = headers + '\n' + example;
      const blob = new Blob([csv], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'template_soal_cbt.csv';
      link.click();
    }
    
    let selectedCsvFile = null;
    function handleCsvSelected(e) {
      selectedCsvFile = e.target.files[0];
      if (selectedCsvFile) document.getElementById('csvFileName').textContent = '📄 ' + selectedCsvFile.name;
    }
    
    function validateAndPreviewCsv() {
      if (!selectedCsvFile) { showToast('Peringatan', 'Pilih file CSV terlebih dahulu.', 'warning'); return; }
      Papa.parse(selectedCsvFile, {
        header: true, skipEmptyLines: true, encoding: 'UTF-8',
        complete: function(results) {
          appState.csvParsedQuestions = results.data;
          const errors = [];
          results.data.forEach((row, i) => {
            if (!row.Sesi || !row.Pertanyaan || !row.Jawaban_Benar) errors.push({ row: i + 1, msg: 'Kolom wajib kosong.' });
            else if (!['A','B','C','D'].includes(String(row.Jawaban_Benar).toUpperCase())) errors.push({ row: i + 1, msg: 'Jawaban_Benar harus A/B/C/D.' });
          });
          const validCount = results.data.length - errors.length;
          document.getElementById('csvValidationResult').innerHTML = `
            <div class="card-cbt">
              <div style="display:flex;gap:12px;margin-bottom:14px;">
                <span class="badge-pill badge-success"><span class="dot"></span>${validCount} Baris Valid</span>
                ${errors.length ? `<span class="badge-pill badge-danger"><span class="dot"></span>${errors.length} Baris Bermasalah</span>` : ''}
              </div>
              <div class="table-wrap"><table class="table-cbt">
                <thead><tr><th>Baris</th><th>Sesi</th><th>Cuplikan Pertanyaan</th><th>Status</th></tr></thead>
                <tbody>${results.data.slice(0,10).map((row,i) => {
                  const err = errors.find(e => e.row === i+1);
                  return `<tr><td>#${i+1}</td><td>${row.Sesi||'-'}</td><td>${(row.Pertanyaan||'').substring(0,60)}...</td>
                    <td>${err ? `<span class="badge-pill badge-danger"><span class="dot"></span>Error</span><div style="font-size:11px;color:var(--danger);">${err.msg}</div>` : `<span class="badge-pill badge-success"><span class="dot"></span>Valid</span>`}</td></tr>`;
                }).join('')}</tbody>
              </table></div>
              <div style="text-align:right;margin-top:14px;">
                <button class="btn-cbt btn-cbt-primary" ${errors.length ? 'disabled' : ''} onclick="confirmImportCsv()"><i class="bi bi-upload"></i> Konfirmasi Impor Soal (${validCount} Butir)</button>
              </div>
            </div>`;
        }
      });
    }
    
    function confirmImportCsv() {
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
          if (!res.success) { showToast('Gagal', res.message, 'danger'); return; }
          showToast('Berhasil', `${res.data.success} soal berhasil diimpor.`, 'success');
          navigateTo('dosenDashboard');
        })
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        .importQuestionsBatch(window._currentUploadExamId, appState.csvParsedQuestions);
    }
    
    // ════════════════════════════════════════════════════════
    // UPLOAD AUDIO LANGSUNG KE GOOGLE DRIVE (dari form Dosen)
    // ════════════════════════════════════════════════════════
    function fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    
    // Dipakai di halaman Upload CSV — hasil link ditampilkan untuk disalin manual ke kolom Link_Audio
    function handleAudioFileSelected(event) {
      const file = event.target.files[0];
      if (!file) return;
      const box = document.getElementById('audioUploadResult');
      box.innerHTML = `<div class="skeleton" style="height:44px;"></div>`;
    
      fileToBase64(file).then(base64 => {
        gasRun
          .withSuccessHandler(res => {
            if (!res) { box.innerHTML = ''; showToast('Koneksi Terputus', 'Tidak ada respons dari server saat upload audio.', 'danger'); return; }
            if (!res.success) { box.innerHTML = ''; showToast('Gagal', res.message, 'danger'); return; }
            box.innerHTML = `
              <div style="background:var(--success-bg);color:var(--success-text);border-radius:var(--radius-input);padding:12px;font-size:12.5px;">
                <i class="bi bi-check-circle-fill"></i> Audio berhasil diupload! Salin link berikut ke kolom <code>Link_Audio</code> pada baris CSV yang sesuai:
              </div>
              <div style="display:flex;gap:8px;margin-top:8px;">
                <input type="text" class="input-cbt" value="${res.data.fileUrl}" readonly id="lastAudioUrlField">
                <button type="button" class="btn-cbt btn-cbt-outline" onclick="copyCredentialField('lastAudioUrlField', this)"><i class="bi bi-clipboard"></i></button>
              </div>`;
            showToast('Berhasil', 'Audio berhasil diupload ke Google Drive.', 'success');
          })
          .withFailureHandler(err => { box.innerHTML = ''; showToast('Error', err.message, 'danger'); })
          .uploadAudioToDrive(base64, file.name, file.type || 'audio/mpeg');
      }).catch(() => showToast('Error', 'Gagal membaca file audio.', 'danger'));
    }
    
    // Dipakai di dalam modal Edit/Tambah Soal — otomatis mengisi field Link_Audio setelah upload selesai
    function handleQfAudioSelected(event) {
      const file = event.target.files[0];
      if (!file) return;
      const statusEl = document.getElementById('qfAudioUploadStatus');
      statusEl.textContent = 'Mengupload audio...';
    
      fileToBase64(file).then(base64 => {
        gasRun
          .withSuccessHandler(res => {
            if (!res) { statusEl.textContent = ''; showToast('Koneksi Terputus', 'Tidak ada respons dari server saat upload audio.', 'danger'); return; }
            if (!res.success) { statusEl.textContent = ''; showToast('Gagal', res.message, 'danger'); return; }
            document.getElementById('qfLinkAudio').value = res.data.fileUrl;
            statusEl.textContent = '✅ Audio berhasil diupload & link terisi otomatis.';
            showToast('Berhasil', 'Audio berhasil diupload.', 'success');
          })
          .withFailureHandler(err => { statusEl.textContent = ''; showToast('Error', err.message, 'danger'); })
          .uploadAudioToDrive(base64, file.name, file.type || 'audio/mpeg');
      }).catch(() => showToast('Error', 'Gagal membaca file audio.', 'danger'));
    }
    
    // ════════════════════════════════════════════════════════
    // KELOLA SOAL — EDIT / TAMBAH / HAPUS SOAL INDIVIDUAL
    // ════════════════════════════════════════════════════════
    function openManageQuestions(idUjian, namaUjian) {
      if (!idUjian) { showToast('Peringatan', 'Pilih ujian terlebih dahulu.', 'warning'); return; }
      window._manageQuestionsExamId = idUjian;
      document.getElementById('manageQuestionsExamName').textContent = namaUjian || idUjian;
      navigateTo('manageQuestions');
      loadManageQuestionsTable(idUjian);
    }
    
    function loadManageQuestionsTable(idUjian) {
      const tbody = document.getElementById('manageQuestionsTableBody');
      tbody.innerHTML = `<tr><td colspan="6"><div class="skeleton" style="height:40px;"></div></td></tr>`;
      gasRun
        .withSuccessHandler(res => {
          if (!res) { tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="color:var(--danger);">Tidak ada respons dari server.</div></td></tr>`; return; }
          if (!res.success) { tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="color:var(--danger);">${res.message}</div></td></tr>`; return; }
          const soal = res.data.sort((a, b) => Number(a.Nomor) - Number(b.Nomor));
          window._manageQuestionsCache = soal;
          tbody.innerHTML = soal.length ? soal.map(s => `
            <tr>
              <td>${s.Nomor}</td>
              <td><span class="badge-pill badge-indigo">${s.Sesi}</span></td>
              <td style="max-width:360px;">${(s.Pertanyaan || '').substring(0, 90)}${(s.Pertanyaan || '').length > 90 ? '...' : ''}</td>
              <td><strong>${s.Jawaban_Benar}</strong></td>
              <td>${s.Poin}</td>
              <td>
                <button class="btn-icon-sm" title="Edit" onclick="openQuestionFormModal('${s.ID_Soal}')"><i class="bi bi-pencil"></i></button>
                <button class="btn-icon-sm" title="Hapus" onclick="deleteQuestionRow('${s.ID_Soal}')"><i class="bi bi-trash" style="color:var(--danger);"></i></button>
              </td>
            </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state"><i class="bi bi-file-earmark-x"></i>Belum ada soal untuk ujian ini. Upload CSV atau tambah manual.</div></td></tr>`;
        })
        .withFailureHandler(err => { tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="color:var(--danger);">${err.message}</div></td></tr>`; })
        .getQuestionsByExam(idUjian);
    }
    
    function toggleAudioFieldVisibility() {
      const sesi = document.getElementById('qfSesi').value;
      document.getElementById('qfAudioWrap').style.display = sesi === 'Listening' ? '' : 'none';
    }
    
    function openQuestionFormModal(idSoal) {
      document.getElementById('qfAudioUploadStatus').textContent = '';
      if (idSoal) {
        const soal = (window._manageQuestionsCache || []).find(s => s.ID_Soal === idSoal);
        if (!soal) return;
        document.getElementById('questionFormTitle').innerHTML = '<i class="bi bi-pencil-square"></i> Edit Soal';
        document.getElementById('qfSoalId').value = soal.ID_Soal;
        document.getElementById('qfSesi').value = ['Listening','Structure','Reading'].includes(soal.Sesi) ? soal.Sesi : 'Listening';
        document.getElementById('qfPoin').value = soal.Poin || 1;
        document.getElementById('qfPertanyaan').value = soal.Pertanyaan || '';
        document.getElementById('qfPassage').value = soal.Passage_Teks || '';
        document.getElementById('qfLinkAudio').value = soal.Link_Audio || '';
        document.getElementById('qfPilihanA').value = soal.Pilihan_A || '';
        document.getElementById('qfPilihanB').value = soal.Pilihan_B || '';
        document.getElementById('qfPilihanC').value = soal.Pilihan_C || '';
        document.getElementById('qfPilihanD').value = soal.Pilihan_D || '';
        document.getElementById('qfJawabanBenar').value = soal.Jawaban_Benar || 'A';
      } else {
        document.getElementById('questionFormTitle').innerHTML = '<i class="bi bi-plus-circle"></i> Tambah Soal Manual';
        document.getElementById('qfSoalId').value = '';
        document.getElementById('qfSesi').value = 'Listening';
        document.getElementById('qfPoin').value = 1;
        ['qfPertanyaan','qfPassage','qfLinkAudio','qfPilihanA','qfPilihanB','qfPilihanC','qfPilihanD'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('qfJawabanBenar').value = 'A';
      }
      toggleAudioFieldVisibility();
      openModal('modalQuestionForm');
    }
    
    function submitQuestionForm() {
      const idSoal = document.getElementById('qfSoalId').value;
      const soalObj = {
        ID_Soal: idSoal || undefined,
        ID_Ujian: window._manageQuestionsExamId,
        Sesi: document.getElementById('qfSesi').value,
        Pertanyaan: document.getElementById('qfPertanyaan').value.trim(),
        Passage_Teks: document.getElementById('qfPassage').value.trim(),
        Link_Audio: document.getElementById('qfLinkAudio').value.trim(),
        Pilihan_A: document.getElementById('qfPilihanA').value.trim(),
        Pilihan_B: document.getElementById('qfPilihanB').value.trim(),
        Pilihan_C: document.getElementById('qfPilihanC').value.trim(),
        Pilihan_D: document.getElementById('qfPilihanD').value.trim(),
        Jawaban_Benar: document.getElementById('qfJawabanBenar').value,
        Poin: Number(document.getElementById('qfPoin').value) || 1
      };
      if (!soalObj.Pertanyaan || !soalObj.Pilihan_A || !soalObj.Pilihan_B) {
        showToast('Peringatan', 'Pertanyaan, Pilihan A, dan Pilihan B wajib diisi.', 'warning');
        return;
      }
    
      if (idSoal) {
        gasRun.withSuccessHandler(handleQuestionSaved).withFailureHandler(err => showToast('Error', err.message, 'danger')).updateQuestion(soalObj);
      } else {
        gasRun.withSuccessHandler(handleQuestionSaved).withFailureHandler(err => showToast('Error', err.message, 'danger')).addSingleQuestion(window._manageQuestionsExamId, soalObj);
      }
    }
    
    function handleQuestionSaved(res) {
      if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server.', 'danger'); return; }
      if (!res.success) { showToast('Gagal', res.message, 'danger'); return; }
      showToast('Berhasil', res.message, 'success');
      closeModal('modalQuestionForm');
      loadManageQuestionsTable(window._manageQuestionsExamId);
    }
    
    function deleteQuestionRow(idSoal) {
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server.', 'danger'); return; }
          showToast(res.success ? 'Berhasil' : 'Gagal', res.message, res.success ? 'success' : 'danger');
          loadManageQuestionsTable(window._manageQuestionsExamId);
        })
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        .deleteQuestion(idSoal);
    }
    
    // ════════════════════════════════════════════════════════
    // DOSEN — HASIL UJIAN
    // ════════════════════════════════════════════════════════
    function openExamResults(idUjian, namaUjian) {
      window._currentResultsExamId = idUjian;
      document.getElementById('resultsExamNameLabel').textContent = namaUjian;
      navigateTo('examResultsDosen');
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
          if (!res.success) return;
          const hasil = res.data;
          const total = hasil.length;
          const lulus = hasil.filter(h => h.Status_Lulus === 'Lulus').length;
          const avg = total ? Math.round(hasil.reduce((s,h) => s + Number(h.Skor_Total), 0) / total) : 0;
          const tinggi = total ? Math.max(...hasil.map(h => Number(h.Skor_Total))) : 0;
    
          document.getElementById('dosenResultStatCards').innerHTML =
            statCard('bi-people','icon-bg-teal', total, 'Total Peserta') +
            statCard('bi-graph-up','icon-bg-amber', avg, 'Rata-rata Skor') +
            statCard('bi-percent','icon-bg-indigo', total ? Math.round(lulus/total*100)+'%' : '0%', 'Tingkat Kelulusan') +
            statCard('bi-trophy','icon-bg-coral', tinggi, 'Skor Tertinggi');
    
          document.getElementById('dosenResultsTableBody').innerHTML = hasil.length ? hasil.map(h => `
            <tr><td>${h.Nama_Peserta}</td><td>${h.Skor_Listening}</td><td>${h.Skor_Grammar}</td><td>${h.Skor_Reading}</td>
            <td><strong>${h.Skor_Total}</strong></td><td>${h.Status_Lulus === 'Lulus' ? '<span class="badge-pill badge-success"><span class="dot"></span>LULUS</span>' : '<span class="badge-pill badge-danger"><span class="dot"></span>TIDAK LULUS</span>'}</td></tr>
          `).join('') : `<tr><td colspan="6"><div class="empty-state"><i class="bi bi-clipboard-x"></i>Belum ada peserta yang menyelesaikan ujian ini.</div></td></tr>`;
    
          window._currentResultsCache = hasil;
        })
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        .getExamResultsForLecturer(idUjian);
    }
    
    function downloadResultsExcel() {
      const data = window._currentResultsCache || window._globalReportCache || [];
      if (!data.length) { showToast('Info', 'Tidak ada data untuk diunduh.', 'warning'); return; }
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(r => Object.values(r).map(v => `"${v}"`).join(',')).join('\n');
      const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'rekap_hasil_ujian.csv';
      link.click();
    }
    
    // ════════════════════════════════════════════════════════
    // ADMIN — DASHBOARD
    // ════════════════════════════════════════════════════════
    function loadAdminDashboard() {
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
          if (!res.success) return;
          const d = res.data;
          document.getElementById('adminStatCards').innerHTML =
            statCard('bi-people-fill','icon-bg-teal', d.totalPeserta, 'Total Peserta Terdaftar') +
            statCard('bi-clipboard2-check','icon-bg-amber', d.ujianAktif, 'Ujian Aktif') +
            statCard('bi-bar-chart-line','icon-bg-indigo', d.rataRata, 'Rata-rata Skor Institusi') +
            statCard('bi-percent','icon-bg-coral', d.tingkatKelulusan + '%', 'Tingkat Kelulusan');
    
          renderDistribusiChart(d.distribusi);
    
          document.getElementById('recentActivityList').innerHTML = d.recentLogs.length ? d.recentLogs.map(l => `
            <div style="padding:10px 0;border-bottom:1px solid var(--border-color);">
              <div style="font-size:12.5px;font-weight:700;">${l.Nama_User} <span style="color:var(--text-muted);font-weight:400;">— ${l.Aksi}</span></div>
              <div style="font-size:11.5px;color:var(--text-muted);">${l.Detail || ''} · ${formatDate(l.Timestamp)}</div>
            </div>`).join('') : '<div class="empty-state">Belum ada aktivitas.</div>';
        })
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        .getAdminDashboardData();
    }
    
    function renderDistribusiChart(distribusi) {
      const ctx = document.getElementById('chartDistribusi');
      if (!ctx) return;
      if (appState.chartInstances.distribusi) appState.chartInstances.distribusi.destroy();
      appState.chartInstances.distribusi = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: distribusi.map(d => d.label),
          datasets: [{ data: distribusi.map(d => d.count), backgroundColor: ['#FB7185','#F59E0B','#FBBF24','#0F766E','#14B8A6','#6366F1'], borderRadius: 8 }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } }
        }
      });
    }
    
    // ════════════════════════════════════════════════════════
    // ADMIN — MANAJEMEN DOSEN
    // ════════════════════════════════════════════════════════
    function loadLecturers() {
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
          if (!res.success) return;
          document.getElementById('lecturerTableBody').innerHTML = res.data.length ? res.data.map(d => `
            <tr>
              <td><div class="avatar-circle" style="display:inline-flex;width:28px;height:28px;font-size:11px;margin-right:8px;">${d.Nama.charAt(0)}</div>${d.Nama}</td>
              <td>${d.Username}</td>
              <td>${d.Status === 'Aktif' ? '<span class="badge-pill badge-success"><span class="dot"></span>Aktif</span>' : '<span class="badge-pill badge-neutral"><span class="dot"></span>Nonaktif</span>'}</td>
              <td>
                <button class="btn-icon-sm" title="Reset Password" onclick="resetPassword('${d.ID_Dosen}')"><i class="bi bi-key"></i></button>
                <button class="btn-icon-sm" title="Toggle Status" onclick="toggleLecturer('${d.ID_Dosen}','${d.Status === 'Aktif' ? 'Nonaktif' : 'Aktif'}')"><i class="bi bi-toggle2-on"></i></button>
              </td>
            </tr>`).join('') : `<tr><td colspan="4"><div class="empty-state"><i class="bi bi-person-x"></i>Belum ada dosen terdaftar.</div></td></tr>`;
        })
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        .getAllLecturers();
    }
    
    function openAddLecturerModal() { document.getElementById('newLecturerName').value = ''; document.getElementById('newLecturerUsername').value = ''; openModal('modalAddLecturer'); }
    function submitAddLecturer() {
      const nama = document.getElementById('newLecturerName').value.trim();
      const username = document.getElementById('newLecturerUsername').value.trim();
      if (!nama || !username) { showToast('Peringatan', 'Lengkapi semua field.', 'warning'); return; }
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
          closeModal('modalAddLecturer');
          if (!res.success) { showToast('Gagal', res.message, 'danger'); return; }
          loadLecturers();
          showCredentialModal({
            title: 'Dosen Berhasil Ditambahkan',
            subtitle: nama,
            username: res.data.username,
            password: res.data.tempPassword,
            note: 'Bagikan username & password sementara ini kepada dosen secara langsung/pribadi. Dosen akan diminta mengganti password saat login pertama.'
          });
        })
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        .addLecturer(nama, username, 'Aktif');
    }
    function toggleLecturer(id, statusBaru) {
      gasRun.withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; } showToast(res.success ? 'Berhasil' : 'Gagal', res.message, res.success ? 'success' : 'danger'); loadLecturers(); }).toggleLecturerStatus(id, statusBaru);
    }
    function resetPassword(id) {
      const row = (document.getElementById('lecturerTableBody').querySelector(`button[onclick="resetPassword('${id}')"]`) || {}).closest ? document.getElementById('lecturerTableBody').querySelector(`button[onclick="resetPassword('${id}')"]`).closest('tr') : null;
      const namaDosen = row ? row.children[0].textContent.trim() : '';
      const usernameDosen = row ? row.children[1].textContent.trim() : '';
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
          if (!res.success) { showToast('Gagal', res.message, 'danger'); return; }
          showCredentialModal({
            title: 'Password Dosen Direset',
            subtitle: namaDosen,
            username: usernameDosen,
            password: res.data.newPass,
            note: 'Password lama sudah tidak berlaku. Bagikan password baru ini kepada dosen secara langsung/pribadi.'
          });
        })
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        .resetLecturerPassword(id);
    }
    
    // Modal generik untuk menampilkan kredensial (password sementara) agar mudah disalin & dibagikan
    function showCredentialModal(opts) {
      document.getElementById('modalGenericContent').innerHTML = `
        <div class="modal-header-cbt"><span><i class="bi bi-shield-lock"></i> ${opts.title}</span>
          <button style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;" onclick="closeModal('modalGeneric')">&times;</button></div>
        <div class="modal-body-cbt">
          <p style="font-size:13.5px;color:var(--text-muted);margin-top:0;">${opts.subtitle || ''}</p>
          <label class="field-label">Username</label>
          <div style="display:flex;gap:8px;margin-top:4px;margin-bottom:14px;">
            <input type="text" class="input-cbt" value="${opts.username}" readonly id="credUsernameField">
            <button type="button" class="btn-cbt btn-cbt-outline" onclick="copyCredentialField('credUsernameField', this)"><i class="bi bi-clipboard"></i></button>
          </div>
          <label class="field-label">Password Sementara</label>
          <div style="display:flex;gap:8px;margin-top:4px;">
            <input type="text" class="input-cbt" value="${opts.password}" readonly id="credPasswordField" style="font-family:monospace;font-weight:700;letter-spacing:.5px;">
            <button type="button" class="btn-cbt btn-cbt-outline" onclick="copyCredentialField('credPasswordField', this)"><i class="bi bi-clipboard"></i></button>
          </div>
          <div style="background:var(--warning-bg);color:var(--warning-text);border-radius:var(--radius-input);padding:12px;font-size:12.5px;margin-top:16px;">
            <i class="bi bi-info-circle-fill"></i> ${opts.note}
          </div>
        </div>
        <div class="modal-footer-cbt">
          <button class="btn-cbt btn-cbt-primary" onclick="copyBothCredentials('${opts.username}','${opts.password}');" ><i class="bi bi-clipboard-check"></i> Salin Username & Password</button>
          <button class="btn-cbt btn-cbt-ghost" onclick="closeModal('modalGeneric')">Tutup</button>
        </div>`;
      openModal('modalGeneric');
    }
    
    function copyCredentialField(fieldId, btnEl) {
      const field = document.getElementById(fieldId);
      field.select();
      navigator.clipboard.writeText(field.value).then(() => {
        const original = btnEl.innerHTML;
        btnEl.innerHTML = '<i class="bi bi-check-lg"></i>';
        setTimeout(() => btnEl.innerHTML = original, 1200);
      }).catch(() => showToast('Gagal', 'Tidak dapat menyalin otomatis, silakan salin manual.', 'warning'));
    }
    
    function copyBothCredentials(username, password) {
      const text = `Username: ${username}\nPassword: ${password}`;
      navigator.clipboard.writeText(text).then(() => {
        showToast('Disalin', 'Username & password berhasil disalin ke clipboard.', 'success');
      }).catch(() => showToast('Gagal', 'Tidak dapat menyalin otomatis, silakan salin manual.', 'warning'));
    }
    
    // ════════════════════════════════════════════════════════
    // ADMIN — PESERTA & KODE AKSES
    // ════════════════════════════════════════════════════════
    function loadParticipants() {
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
          if (!res.success) return;
          window._participantsCache = res.data;
          document.getElementById('participantTableBody').innerHTML = res.data.length ? res.data.map(p => `
            <tr>
              <td>${p.Nama || '<em style="color:var(--text-muted);">Belum login</em>'}</td>
              <td>${p.Kontak || '-'}</td>
              <td><span class="badge-pill badge-indigo">${p.Rombel || 'Umum'}</span></td>
              <td><code>${p.Kode_Akses}</code></td>
              <td>${p.ID_Ujian_Target || '-'}</td>
              <td>${accessStatusBadge(p.Status_Kode)}</td>
              <td><button class="btn-icon-sm" title="Nonaktifkan" onclick="deactivateCode('${p.ID_Peserta}')"><i class="bi bi-slash-circle"></i></button></td>
            </tr>`).join('') : `<tr><td colspan="7"><div class="empty-state"><i class="bi bi-key"></i>Belum ada kode akses dibuat.</div></td></tr>`;
        })
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        .getAllParticipants();
    
      // isi dropdown ujian target untuk modal generate & modal cetak
      gasRun.withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
        if (!res.success) return;
        window._examsListCache = res.data;
        document.getElementById('genCodeExamSelect').innerHTML = res.data.map(u => `<option value="${u.ID_Ujian}">${u.Nama_Ujian}</option>`).join('');
        document.getElementById('printCodesExamSelect').innerHTML = '<option value="">Semua Ujian (semua kode akses)</option>' +
          res.data.map(u => `<option value="${u.ID_Ujian}">${u.Nama_Ujian}</option>`).join('');
      }).getAllExamsAdmin();
    }
    function accessStatusBadge(status) {
      const map = { Aktif: 'badge-success', Used: 'badge-indigo', Expired: 'badge-neutral' };
      return `<span class="badge-pill ${map[status] || 'badge-neutral'}"><span class="dot"></span>${status}</span>`;
    }
    function openGenerateCodesModal() { openModal('modalGenerateCodes'); }
    function submitGenerateCodes() {
      const idUjian = document.getElementById('genCodeExamSelect').value;
      const jumlah = Number(document.getElementById('genCodeJumlah').value);
      const prefix = document.getElementById('genCodePrefix').value.trim().toUpperCase();
      const rombel = document.getElementById('genCodeRombel').value.trim();
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
          closeModal('modalGenerateCodes');
          if (!res.success) { showToast('Gagal', res.message, 'danger'); return; }
          showToast('Berhasil', res.message, 'success');
          loadParticipants();
          // Tawarkan cetak langsung untuk batch kode yang baru saja dibuat,
          // supaya tidak perlu membagikan kode satu per satu secara manual.
          const examName = (window._examsListCache || []).find(u => u.ID_Ujian === idUjian)?.Nama_Ujian || idUjian;
          offerPrintNewBatch(res.data.codes, examName);
        })
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        .generateAccessCodesBatch(idUjian, jumlah, prefix, rombel);
    }
    function deactivateCode(id) {
      gasRun.withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; } showToast(res.success ? 'Berhasil' : 'Gagal', res.message, res.success ? 'success' : 'danger'); loadParticipants(); }).deactivateAccessCode(id);
    }
    
    // ════════════════════════════════════════════════════════
    // CETAK / UNDUH KODE AKSES — supaya tidak perlu dibagikan satu per satu
    // ════════════════════════════════════════════════════════
    function openPrintCodesModal() { openModal('modalPrintCodes'); }
    
    function getExamNameById(idUjian) {
      const found = (window._examsListCache || []).find(u => u.ID_Ujian === idUjian);
      return found ? found.Nama_Ujian : (idUjian || '-');
    }
    
    function buildPrintableCodesHtml(codesData, headingText) {
      // codesData: array of { nama, kode, ujian, status }
      const cardsHtml = codesData.map(c => `
        <div class="pcard">
          <div class="pcard-label">Kode Akses Peserta</div>
          <div class="pcard-code">${c.kode}</div>
          <div class="pcard-exam">${c.ujian}</div>
          ${c.nama ? `<div class="pcard-nama">Untuk: ${c.nama}</div>` : ''}
        </div>`).join('');
    
      return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cetak Kode Akses - CBT Bahasa</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 24px; color: #0F172A; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .subtitle { color: #64748B; font-size: 12.5px; margin-bottom: 20px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
          .pcard { border: 1.5px dashed #94A3B8; border-radius: 10px; padding: 16px 14px; text-align: center; page-break-inside: avoid; }
          .pcard-label { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #64748B; margin-bottom: 6px; }
          .pcard-code { font-size: 22px; font-weight: 700; letter-spacing: 1px; color: #0F766E; font-family: monospace; margin-bottom: 8px; }
          .pcard-exam { font-size: 11.5px; color: #334155; font-weight: 600; }
          .pcard-nama { font-size: 11px; color: #64748B; margin-top: 4px; }
          .toolbar { margin-bottom: 20px; }
          .toolbar button { background: #F59E0B; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px; }
          @media print { .toolbar { display: none; } body { margin: 10mm; } }
        </style>
      </head><body>
        <div class="toolbar"><button onclick="window.print()">🖨️ Cetak Sekarang</button></div>
        <h1>${headingText}</h1>
        <div class="subtitle">CBT Bahasa — Total ${codesData.length} kode akses. Gunting/potong tiap kartu sesuai garis putus-putus untuk dibagikan satu per satu ke peserta.</div>
        <div class="grid">${cardsHtml}</div>
      </body></html>`;
    }
    
    function printAccessCodes() {
      const idUjian = document.getElementById('printCodesExamSelect').value;
      const all = window._participantsCache || [];
      // Hanya kode yang BELUM diakses (status 'Aktif') yang boleh dicetak/dibagikan —
      // kode yang sudah 'Used' atau 'Expired' tidak berguna lagi untuk peserta baru.
      let filtered = idUjian ? all.filter(p => p.ID_Ujian_Target === idUjian) : all;
      filtered = filtered.filter(p => p.Status_Kode === 'Aktif');
    
      if (!filtered.length) { showToast('Peringatan', 'Tidak ada kode akses yang masih aktif (belum dipakai) untuk dicetak pada pilihan ini.', 'warning'); return; }
    
      const codesData = filtered.map(p => ({
        nama: p.Nama || '',
        kode: p.Kode_Akses,
        ujian: getExamNameById(p.ID_Ujian_Target)
      }));
    
      const heading = idUjian ? `Kode Akses — ${getExamNameById(idUjian)}` : 'Kode Akses — Semua Ujian';
      const win = window.open('', '_blank');
      win.document.write(buildPrintableCodesHtml(codesData, heading));
      win.document.close();
      closeModal('modalPrintCodes');
    }
    
    function downloadAccessCodesCsv() {
      const idUjian = document.getElementById('printCodesExamSelect').value;
      const all = window._participantsCache || [];
      // Sama seperti cetak: hanya kode berstatus 'Aktif' (belum diakses) yang diunduh.
      let filtered = idUjian ? all.filter(p => p.ID_Ujian_Target === idUjian) : all;
      filtered = filtered.filter(p => p.Status_Kode === 'Aktif');
    
      if (!filtered.length) { showToast('Peringatan', 'Tidak ada kode akses yang masih aktif (belum dipakai) untuk diunduh pada pilihan ini.', 'warning'); return; }
    
      const rows = filtered.map(p => [p.Nama || '', p.Kontak || '', p.Kode_Akses, getExamNameById(p.ID_Ujian_Target), p.Status_Kode]);
      const csv = 'Nama,Kontak,Kode Akses,Ujian Target,Status\n' + rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'kode_akses_peserta.csv';
      link.click();
      closeModal('modalPrintCodes');
    }
    
    // Ditampilkan otomatis setelah generate kode massal baru, agar admin bisa
    // langsung mencetak batch tersebut tanpa perlu buka modal cetak terpisah.
    function offerPrintNewBatch(codes, examName) {
      document.getElementById('modalGenericContent').innerHTML = `
        <div class="modal-header-cbt"><span><i class="bi bi-printer"></i> ${codes.length} Kode Akses Berhasil Dibuat</span>
          <button style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;" onclick="closeModal('modalGeneric')">&times;</button></div>
        <div class="modal-body-cbt">
          <p style="font-size:13.5px;color:var(--text-muted);margin-top:0;">Ujian: <strong>${examName}</strong></p>
          <p style="font-size:13px;">Cetak sekarang sebagai kartu siap potong, atau buka nanti lewat tombol "Cetak / Unduh Kode Akses" di halaman ini.</p>
        </div>
        <div class="modal-footer-cbt">
          <button class="btn-cbt btn-cbt-ghost" onclick="closeModal('modalGeneric')">Nanti Saja</button>
          <button class="btn-cbt btn-cbt-primary" onclick="printNewBatchNow(${JSON.stringify(codes)}, '${examName.replace(/'/g,"")}')"><i class="bi bi-printer"></i> Cetak Sekarang</button>
        </div>`;
      openModal('modalGeneric');
    }
    function printNewBatchNow(codes, examName) {
      const codesData = codes.map(k => ({ nama: '', kode: k, ujian: examName }));
      const win = window.open('', '_blank');
      win.document.write(buildPrintableCodesHtml(codesData, `Kode Akses Baru — ${examName}`));
      win.document.close();
      closeModal('modalGeneric');
    }
    
    // ════════════════════════════════════════════════════════
    // ADMIN — KATALOG SEMUA UJIAN
    // ════════════════════════════════════════════════════════
    function loadAllExamsAdmin() {
      gasRun
        .withSuccessHandler(res => {
          if (!res) {
            showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger');
            document.getElementById('allExamsTableBody').innerHTML = `<tr><td colspan="6"><div class="empty-state" style="color:var(--danger);"><i class="bi bi-wifi-off" style="color:var(--danger);"></i>Tidak ada respons dari server.<br><span style="font-size:12px;">Kemungkinan GAS_URL di js/config.js salah, atau Web App belum di-deploy / belum diberi akses "Anyone".</span><br><button class="btn-cbt btn-cbt-outline" style="margin-top:10px;" onclick="loadAllExamsAdmin()"><i class="bi bi-arrow-clockwise"></i> Coba Lagi</button></div></td></tr>`;
            return;
          }
          if (!res.success) {
            showToast('Gagal Memuat', res.message, 'danger');
            document.getElementById('allExamsTableBody').innerHTML = `<tr><td colspan="6"><div class="empty-state" style="color:var(--danger);"><i class="bi bi-exclamation-triangle" style="color:var(--danger);"></i>Gagal memuat katalog ujian dari server:<br><code style="font-size:11.5px;">${res.message}</code></div></td></tr>`;
            return;
          }
          try {
            window._allExamsCache = res.data;
            document.getElementById('allExamsTableBody').innerHTML = res.data.length ? res.data.map(u => `
              <tr>
                <td><strong>${u.Nama_Ujian || '(Tanpa Nama)'}</strong><div style="font-size:11px;color:var(--text-muted);">${u.ID_Ujian} · ${u.jumlahSesi || 0} Sesi · ${u.jumlahSoal || 0} Soal</div></td>
                <td>${u.namaDosen || '-'}</td>
                <td>${formatDate(u.Tanggal_Buka)}</td>
                <td>${u.pesertaSelesai || 0}/${u.totalPeserta || 0}</td>
                <td>${statusBadge(u.Status)}</td>
                <td>
                  <button class="btn-icon-sm" title="Lihat Hasil" onclick="openExamResults('${u.ID_Ujian}','${(u.Nama_Ujian||'').replace(/'/g,"")}')"><i class="bi bi-eye"></i></button>
                  <button class="btn-icon-sm" title="Upload Soal" onclick="openUploadCsv('${u.ID_Ujian}','${(u.Nama_Ujian||'').replace(/'/g,"")}')"><i class="bi bi-cloud-upload"></i></button>
                  <button class="btn-icon-sm" title="Kelola Soal" onclick="openManageQuestions('${u.ID_Ujian}','${(u.Nama_Ujian||'').replace(/'/g,"")}')"><i class="bi bi-list-ul"></i></button>
                  <button class="btn-icon-sm" title="Edit" onclick="editExam('${u.ID_Ujian}')"><i class="bi bi-pencil"></i></button>
                  <button class="btn-icon-sm" title="Ubah Dosen Pengampu" onclick="openReassignDosenModal('${u.ID_Ujian}','${(u.Nama_Ujian||'').replace(/'/g,"")}','${u.ID_Dosen_Pembuat || 'ADMIN'}')"><i class="bi bi-person-gear"></i></button>
                </td>
              </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state"><i class="bi bi-journal-x"></i>Belum ada ujian dibuat oleh dosen ataupun admin.</div></td></tr>`;
          } catch (renderErr) {
            showToast('Error Tampilan', 'Gagal menampilkan katalog ujian: ' + renderErr.message, 'danger');
            document.getElementById('allExamsTableBody').innerHTML = `<tr><td colspan="6"><div class="empty-state" style="color:var(--danger);"><i class="bi bi-exclamation-triangle" style="color:var(--danger);"></i>Gagal menampilkan katalog ujian:<br><code style="font-size:11.5px;">${renderErr.message}</code></div></td></tr>`;
          }
        })
        .withFailureHandler(err => {
          showToast('Error', err.message, 'danger');
          document.getElementById('allExamsTableBody').innerHTML = `<tr><td colspan="6"><div class="empty-state" style="color:var(--danger);"><i class="bi bi-exclamation-triangle" style="color:var(--danger);"></i>Gagal terhubung ke server:<br><code style="font-size:11.5px;">${err.message}</code></div></td></tr>`;
        })
        .getAllExamsAdmin();
    }
    
    // Admin: buka modal untuk menugaskan/mengubah dosen pengampu suatu ujian
    function openReassignDosenModal(idUjian, namaUjian, currentDosenId) {
      window._reassignTargetExamId = idUjian;
      document.getElementById('reassignExamNameLabel').textContent = namaUjian;
      gasRun.withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
        if (!res.success) return;
        const select = document.getElementById('reassignDosenSelect');
        select.innerHTML = '<option value="ADMIN">Dikelola Langsung oleh Admin</option>' +
          res.data.filter(d => d.Status === 'Aktif').map(d => `<option value="${d.ID_Dosen}">${d.Nama}</option>`).join('');
        select.value = currentDosenId || 'ADMIN';
      }).getAllLecturers();
      openModal('modalReassignDosen');
    }
    
    function submitReassignDosen() {
      const idDosenBaru = document.getElementById('reassignDosenSelect').value;
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
          closeModal('modalReassignDosen');
          if (!res.success) { showToast('Gagal', res.message, 'danger'); return; }
          showToast('Berhasil', res.message, 'success');
          loadAllExamsAdmin();
        })
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        .reassignExamLecturer(window._reassignTargetExamId, idDosenBaru);
    }
    
    // ════════════════════════════════════════════════════════
    // ADMIN — LAPORAN GLOBAL
    // ════════════════════════════════════════════════════════
    function loadGlobalReport() {
      const filterUjian = document.getElementById('reportExamFilter').value;
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
          if (!res.success) return;
          window._globalReportCache = res.data;
          const total = res.data.length;
          const lulus = res.data.filter(h => h.Status_Lulus === 'Lulus').length;
          const avg = total ? Math.round(res.data.reduce((s,h) => s+Number(h.Skor_Total),0)/total) : 0;
          document.getElementById('reportStatCards').innerHTML =
            statCard('bi-people','icon-bg-teal', total, 'Total Entri') +
            statCard('bi-check-circle','icon-bg-amber', lulus, 'Lulus') +
            statCard('bi-x-circle','icon-bg-coral', total-lulus, 'Tidak Lulus') +
            statCard('bi-graph-up','icon-bg-indigo', avg, 'Rata-rata Skor');
    
          document.getElementById('globalReportTableBody').innerHTML = total ? res.data.map(h => `
            <tr><td>${h.Nama_Peserta}</td><td>${h.ID_Ujian}</td><td>${h.Skor_Listening}</td><td>${h.Skor_Grammar}</td><td>${h.Skor_Reading}</td>
            <td><strong>${h.Skor_Total}</strong></td><td>${h.Status_Lulus === 'Lulus' ? '<span class="badge-pill badge-success"><span class="dot"></span>LULUS</span>' : '<span class="badge-pill badge-danger"><span class="dot"></span>TIDAK LULUS</span>'}</td></tr>
          `).join('') : `<tr><td colspan="7"><div class="empty-state"><i class="bi bi-clipboard-data"></i>Belum ada data hasil ujian.</div></td></tr>`;
        })
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        .getGlobalReport(filterUjian || null);
    
      gasRun.withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
        if (res.success) document.getElementById('reportExamFilter').innerHTML = '<option value="">Semua Ujian</option>' + res.data.map(u => `<option value="${u.ID_Ujian}">${u.Nama_Ujian}</option>`).join('');
      }).getAllExamsAdmin();
    }
    
    // ════════════════════════════════════════════════════════
    // ADMIN — LOG AKTIVITAS
    // ════════════════════════════════════════════════════════
    function loadActivityLog() {
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
          if (!res.success) return;
          document.getElementById('activityLogTableBody').innerHTML = res.data.length ? res.data.map(l => `
            <tr><td style="white-space:nowrap;">${formatDate(l.Timestamp)}</td><td><span class="badge-pill badge-indigo">${l.Peran}</span></td>
            <td>${l.Nama_User}</td><td>${l.Aksi}</td><td style="color:var(--text-muted);">${l.Detail || ''}</td></tr>`).join('')
            : `<tr><td colspan="5"><div class="empty-state"><i class="bi bi-journal-x"></i>Belum ada log.</div></td></tr>`;
        })
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        .getActivityLog(100);
    }
    
    // ════════════════════════════════════════════════════════
    // ADMIN — PENGATURAN SISTEM
    // ════════════════════════════════════════════════════════
    function loadSystemSettings() {
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server. Periksa koneksi internet Anda, dan pastikan GAS_URL di js/config.js sudah diisi dengan URL Web App (/exec) yang benar dan aktif.', 'danger'); return; }
          if (!res.success) return;
          document.getElementById('settingPassing').value = res.data.passingScoreDefault || 500;
          document.getElementById('settingDurasi').value = res.data.durasiDefault || 115;
          document.getElementById('settingSkalaMin').value = res.data.skalaMin || 310;
          document.getElementById('settingSkalaMax').value = res.data.skalaMax || 677;
        })
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        .getSystemSettings();
    }
    function handleSaveSettings(e) {
      e.preventDefault();
      const skalaMin = Number(document.getElementById('settingSkalaMin').value);
      const skalaMax = Number(document.getElementById('settingSkalaMax').value);
      if (skalaMax <= skalaMin) { showToast('Peringatan', 'Skala Maksimum harus lebih besar dari Skala Minimum.', 'warning'); return; }
      const settings = {
        passingScoreDefault: document.getElementById('settingPassing').value,
        durasiDefault: document.getElementById('settingDurasi').value,
        skalaMin: skalaMin, skalaMax: skalaMax
      };
      gasRun
        .withSuccessHandler(res => showToast(res.success ? 'Berhasil' : 'Gagal', res.message, res.success ? 'success' : 'danger'))
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        .saveSystemSettings(settings);
    }
    
    // ════════════════════════════════════════════════════════
    // DIAGNOSTIK SISTEM
    // ════════════════════════════════════════════════════════
    function runDiagnostics() {
      const box = document.getElementById('diagnosticsResult');
      box.innerHTML = `<div class="skeleton" style="height:80px;"></div>`;
    
      gasRun
        .withSuccessHandler(res => {
          if (!res) {
            box.innerHTML = `<div style="background:var(--danger-bg);color:var(--danger-text);border-radius:var(--radius-input);padding:14px;font-size:13px;">
              <strong><i class="bi bi-wifi-off"></i> Tidak ada respons dari server sama sekali.</strong><br>
              Ini mengindikasikan masalah pada koneksi <code>fetch()</code> ke REST API GAS itu sendiri (bukan pada data) —
              kemungkinan GAS_URL di js/config.js salah, deployment belum diperbarui ke versi terbaru, atau ada gangguan jaringan/browser.
              Coba <strong>hard refresh (Ctrl+Shift+R)</strong> dan pastikan Anda sudah membuat <strong>New Version</strong> di Deploy → Manage Deployments.
            </div>`;
            return;
          }
          if (!res.success) {
            box.innerHTML = `<div style="background:var(--danger-bg);color:var(--danger-text);border-radius:var(--radius-input);padding:14px;font-size:13px;">Diagnostik gagal dijalankan: ${res.message}</div>`;
            return;
          }
          const d = res.data;
          const sheetRows = d.sheets.map(s => `
            <tr>
              <td>${s.name}</td>
              <td>${s.exists ? '<span class="badge-pill badge-success"><span class="dot"></span>Ada</span>' : '<span class="badge-pill badge-danger"><span class="dot"></span>Hilang</span>'}</td>
              <td>${s.exists ? s.rowCount + ' baris data' : '-'}</td>
            </tr>`).join('');
    
          const ujianPreviewRows = (d.ujianPreview || []).map(u => `
            <tr>
              <td>${u.ID_Ujian || '<em style="color:var(--danger);">(kosong)</em>'}</td>
              <td>${u.Nama_Ujian || '<em style="color:var(--danger);">(kosong)</em>'}</td>
              <td><code>${u.ID_Dosen_Pembuat || '<span style="color:var(--danger);">(KOSONG!)</span>'}</code></td>
              <td>${u.Status || '<em style="color:var(--danger);">(kosong)</em>'}</td>
              <td style="font-size:11px;">${u.Tanggal_Buka}</td>
            </tr>`).join('');
    
          box.innerHTML = `
            <div style="background:${d.ok ? 'var(--success-bg)' : 'var(--warning-bg)'};color:${d.ok ? 'var(--success-text)' : 'var(--warning-text)'};border-radius:var(--radius-input);padding:14px;font-size:13px;margin-bottom:14px;">
              <strong><i class="bi ${d.ok ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}"></i> ${d.ok ? 'Sistem sehat — koneksi & struktur database normal.' : 'Ditemukan masalah pada struktur database.'}</strong>
            </div>
            <div style="font-size:12.5px;color:var(--text-muted);margin-bottom:10px;">
              Spreadsheet ID: <code>${d.spreadsheetId || '-'}</code><br>
              ${d.spreadsheetUrl ? `<a href="${d.spreadsheetUrl}" target="_blank" style="color:var(--primary);">Buka Spreadsheet Database →</a>` : ''}
            </div>
            <div class="table-wrap"><table class="table-cbt">
              <thead><tr><th>Nama Sheet</th><th>Status</th><th>Jumlah Data</th></tr></thead>
              <tbody>${sheetRows}</tbody>
            </table></div>
            ${d.errors.length ? `<div style="background:var(--danger-bg);color:var(--danger-text);border-radius:var(--radius-input);padding:12px;font-size:12.5px;margin-top:14px;"><strong>Detail Error:</strong><br>${d.errors.join('<br>')}</div>` : ''}
            ${ujianPreviewRows ? `
            <div style="margin-top:20px;font-weight:700;font-family:'Poppins';font-size:14px;">Isi Mentah Sheet "Ujian" (untuk cek nilai ID_Dosen_Pembuat)</div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px;">Jika kolom "ID Dosen Pembuat" di bawah ini BUKAN persis <code>ADMIN</code> (atau ID dosen yang valid), itulah sebab ujian tidak muncul di daftar.</div>
            <div class="table-wrap"><table class="table-cbt">
              <thead><tr><th>ID Ujian</th><th>Nama Ujian</th><th>ID Dosen Pembuat</th><th>Status</th><th>Tanggal Buka</th></tr></thead>
              <tbody>${ujianPreviewRows}</tbody>
            </table></div>` : ''}
          `;
        })
        .withFailureHandler(err => {
          box.innerHTML = `<div style="background:var(--danger-bg);color:var(--danger-text);border-radius:var(--radius-input);padding:14px;font-size:13px;">Gagal terhubung ke server: ${err.message}</div>`;
        })
        .runDiagnostics();
    }
    
    // ════════════════════════════════════════════════════════
    // ITEM ANALYSIS — statistik tingkat kesulitan per butir soal
    // ════════════════════════════════════════════════════════
    function openItemAnalysis(idUjian, namaUjian) {
      if (!idUjian) { showToast('Peringatan', 'Pilih ujian terlebih dahulu.', 'warning'); return; }
      document.getElementById('itemAnalysisExamName').textContent = namaUjian || idUjian;
      navigateTo('itemAnalysis');
      const tbody = document.getElementById('itemAnalysisTableBody');
      const summaryBox = document.getElementById('itemAnalysisSummary');
      tbody.innerHTML = `<tr><td colspan="8"><div class="skeleton" style="height:40px;"></div></td></tr>`;
      summaryBox.innerHTML = '';
    
      gasRun
        .withSuccessHandler(res => {
          if (!res) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state" style="color:var(--danger);">Tidak ada respons dari server.</div></td></tr>`; return; }
          if (!res.success) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state" style="color:var(--danger);">${res.message}</div></td></tr>`; return; }
    
          const d = res.data;
          if (!d.items.length) {
            tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="bi bi-bar-chart"></i>Belum ada peserta yang menyelesaikan ujian ini, atau ujian belum memiliki soal.</div></td></tr>`;
            return;
          }
    
          const mudah = d.items.filter(i => i.tingkatKesulitan === 'Mudah').length;
          const sedang = d.items.filter(i => i.tingkatKesulitan === 'Sedang').length;
          const sulit = d.items.filter(i => i.tingkatKesulitan === 'Sulit').length;
          summaryBox.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">
              ${statCard('bi-people', 'icon-bg-teal', d.totalPeserta, 'Total Peserta Dianalisis')}
              ${statCard('bi-emoji-smile', 'icon-bg-success', mudah, 'Soal Kategori Mudah')}
              ${statCard('bi-emoji-neutral', 'icon-bg-amber', sedang, 'Soal Kategori Sedang')}
              ${statCard('bi-emoji-frown', 'icon-bg-coral', sulit, 'Soal Kategori Sulit')}
            </div>`;
    
          const difficultyBadge = { Mudah: 'badge-success', Sedang: 'badge-warning', Sulit: 'badge-danger' };
          tbody.innerHTML = d.items.map(it => `
            <tr>
              <td>${it.Nomor}</td>
              <td><span class="badge-pill badge-indigo">${it.Sesi}</span></td>
              <td style="max-width:320px;">${(it.Pertanyaan || '').substring(0, 80)}${(it.Pertanyaan || '').length > 80 ? '...' : ''}</td>
              <td><strong>${it.Jawaban_Benar}</strong></td>
              <td>${it.jumlahBenar}/${it.totalJawab}</td>
              <td><strong>${it.persentaseBenar}%</strong></td>
              <td><span class="badge-pill ${difficultyBadge[it.tingkatKesulitan]}"><span class="dot"></span>${it.tingkatKesulitan}</span></td>
              <td style="font-size:11.5px;">A:${it.distribusi.A} · B:${it.distribusi.B} · C:${it.distribusi.C} · D:${it.distribusi.D} · Kosong:${it.distribusi.Kosong}</td>
            </tr>`).join('');
        })
        .withFailureHandler(err => { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state" style="color:var(--danger);">${err.message}</div></td></tr>`; })
        .getItemAnalysis(idUjian);
    }
    
    // ════════════════════════════════════════════════════════
    // BANK SOAL TERPUSAT
    // ════════════════════════════════════════════════════════
    function initBankSoalPage() {
      // isi dropdown Topik dari daftar topik yang sudah pernah dipakai
      gasRun.withSuccessHandler(res => {
        if (!res || !res.success) return;
        const options = '<option value="">Semua Topik</option>' + res.data.map(t => `<option value="${t}">${t}</option>`).join('');
        document.getElementById('bankFilterTopik').innerHTML = options;
      }).getBankSoalTopics();
      loadBankSoalTable();
    }
    
    function loadBankSoalTable() {
      const filters = {
        sesi: document.getElementById('bankFilterSesi').value,
        topik: document.getElementById('bankFilterTopik').value,
        level: document.getElementById('bankFilterLevel').value
      };
      const tbody = document.getElementById('bankSoalTableBody');
      tbody.innerHTML = `<tr><td colspan="6"><div class="skeleton" style="height:40px;"></div></td></tr>`;
    
      gasRun
        .withSuccessHandler(res => {
          if (!res) { tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="color:var(--danger);">Tidak ada respons dari server.</div></td></tr>`; return; }
          if (!res.success) { tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="color:var(--danger);">${res.message}</div></td></tr>`; return; }
          window._bankSoalCache = res.data;
          const levelBadge = { Mudah: 'badge-success', Sedang: 'badge-warning', Sulit: 'badge-danger' };
          tbody.innerHTML = res.data.length ? res.data.map(b => `
            <tr>
              <td><span class="badge-pill badge-indigo">${b.Sesi}</span></td>
              <td>${b.Topik || 'Umum'}</td>
              <td><span class="badge-pill ${levelBadge[b.Level_Kesulitan] || 'badge-neutral'}"><span class="dot"></span>${b.Level_Kesulitan || 'Sedang'}</span></td>
              <td style="max-width:340px;">${(b.Pertanyaan || '').substring(0, 80)}${(b.Pertanyaan || '').length > 80 ? '...' : ''}</td>
              <td><strong>${b.Jawaban_Benar}</strong></td>
              <td>
                <button class="btn-icon-sm" title="Edit" onclick="openBankSoalFormModal('${b.ID_Bank}')"><i class="bi bi-pencil"></i></button>
                <button class="btn-icon-sm" title="Hapus" onclick="deleteBankSoalRow('${b.ID_Bank}')"><i class="bi bi-trash" style="color:var(--danger);"></i></button>
              </td>
            </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state"><i class="bi bi-collection"></i>Belum ada soal di Bank Soal. Tambah manual atau import CSV.</div></td></tr>`;
        })
        .withFailureHandler(err => { tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="color:var(--danger);">${err.message}</div></td></tr>`; })
        .getBankSoalList(filters);
    }
    
    function toggleBankAudioFieldVisibility() {
      document.getElementById('bfAudioWrap').style.display = document.getElementById('bfSesi').value === 'Listening' ? '' : 'none';
    }
    
    function openBankSoalFormModal(idBank) {
      document.getElementById('bfAudioUploadStatus').textContent = '';
      if (idBank) {
        const b = (window._bankSoalCache || []).find(x => x.ID_Bank === idBank);
        if (!b) return;
        document.getElementById('bankSoalFormTitle').innerHTML = '<i class="bi bi-pencil-square"></i> Edit Soal Bank';
        document.getElementById('bfIdBank').value = b.ID_Bank;
        document.getElementById('bfSesi').value = ['Listening','Structure','Reading'].includes(b.Sesi) ? b.Sesi : 'Listening';
        document.getElementById('bfLevel').value = b.Level_Kesulitan || 'Sedang';
        document.getElementById('bfTopik').value = b.Topik || '';
        document.getElementById('bfPoin').value = b.Poin || 1;
        document.getElementById('bfPertanyaan').value = b.Pertanyaan || '';
        document.getElementById('bfPassage').value = b.Passage_Teks || '';
        document.getElementById('bfLinkAudio').value = b.Link_Audio || '';
        document.getElementById('bfPilihanA').value = b.Pilihan_A || '';
        document.getElementById('bfPilihanB').value = b.Pilihan_B || '';
        document.getElementById('bfPilihanC').value = b.Pilihan_C || '';
        document.getElementById('bfPilihanD').value = b.Pilihan_D || '';
        document.getElementById('bfJawabanBenar').value = b.Jawaban_Benar || 'A';
      } else {
        document.getElementById('bankSoalFormTitle').innerHTML = '<i class="bi bi-plus-circle"></i> Tambah ke Bank Soal';
        document.getElementById('bfIdBank').value = '';
        document.getElementById('bfSesi').value = 'Listening';
        document.getElementById('bfLevel').value = 'Sedang';
        document.getElementById('bfPoin').value = 1;
        ['bfTopik','bfPertanyaan','bfPassage','bfLinkAudio','bfPilihanA','bfPilihanB','bfPilihanC','bfPilihanD'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('bfJawabanBenar').value = 'A';
      }
      toggleBankAudioFieldVisibility();
      openModal('modalBankSoalForm');
    }
    
    function handleBfAudioSelected(event) {
      const file = event.target.files[0];
      if (!file) return;
      const statusEl = document.getElementById('bfAudioUploadStatus');
      statusEl.textContent = 'Mengupload audio...';
      fileToBase64(file).then(base64 => {
        gasRun
          .withSuccessHandler(res => {
            if (!res) { statusEl.textContent = ''; showToast('Koneksi Terputus', 'Tidak ada respons dari server.', 'danger'); return; }
            if (!res.success) { statusEl.textContent = ''; showToast('Gagal', res.message, 'danger'); return; }
            document.getElementById('bfLinkAudio').value = res.data.fileUrl;
            statusEl.textContent = '✅ Audio berhasil diupload & link terisi otomatis.';
          })
          .withFailureHandler(err => { statusEl.textContent = ''; showToast('Error', err.message, 'danger'); })
          .uploadAudioToDrive(base64, file.name, file.type || 'audio/mpeg');
      }).catch(() => showToast('Error', 'Gagal membaca file audio.', 'danger'));
    }
    
    function submitBankSoalForm() {
      const idBank = document.getElementById('bfIdBank').value;
      const soalObj = {
        ID_Bank: idBank || undefined,
        Sesi: document.getElementById('bfSesi').value,
        Topik: document.getElementById('bfTopik').value.trim() || 'Umum',
        Level_Kesulitan: document.getElementById('bfLevel').value,
        Pertanyaan: document.getElementById('bfPertanyaan').value.trim(),
        Passage_Teks: document.getElementById('bfPassage').value.trim(),
        Link_Audio: document.getElementById('bfLinkAudio').value.trim(),
        Pilihan_A: document.getElementById('bfPilihanA').value.trim(),
        Pilihan_B: document.getElementById('bfPilihanB').value.trim(),
        Pilihan_C: document.getElementById('bfPilihanC').value.trim(),
        Pilihan_D: document.getElementById('bfPilihanD').value.trim(),
        Jawaban_Benar: document.getElementById('bfJawabanBenar').value,
        Poin: Number(document.getElementById('bfPoin').value) || 1
      };
      if (!soalObj.Pertanyaan || !soalObj.Pilihan_A || !soalObj.Pilihan_B) {
        showToast('Peringatan', 'Pertanyaan, Pilihan A, dan Pilihan B wajib diisi.', 'warning');
        return;
      }
      const idOwner = appState.staff.role === 'admin' ? 'ADMIN' : appState.staff.ID_Dosen;
      const handler = res => {
        if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server.', 'danger'); return; }
        if (!res.success) { showToast('Gagal', res.message, 'danger'); return; }
        showToast('Berhasil', res.message, 'success');
        closeModal('modalBankSoalForm');
        initBankSoalPage();
      };
      if (idBank) {
        gasRun.withSuccessHandler(handler).withFailureHandler(err => showToast('Error', err.message, 'danger')).updateBankSoal(soalObj);
      } else {
        gasRun.withSuccessHandler(handler).withFailureHandler(err => showToast('Error', err.message, 'danger')).addBankSoal(soalObj, idOwner);
      }
    }
    
    function deleteBankSoalRow(idBank) {
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server.', 'danger'); return; }
          showToast(res.success ? 'Berhasil' : 'Gagal', res.message, res.success ? 'success' : 'danger');
          loadBankSoalTable();
        })
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        .deleteBankSoal(idBank);
    }
    
    function downloadBankCsvTemplate() {
      const headers = 'Sesi,Topik,Level_Kesulitan,Pertanyaan,Passage_Teks,Link_Audio,Pilihan_A,Pilihan_B,Pilihan_C,Pilihan_D,Jawaban_Benar,Poin';
      const example = 'Structure,Tenses,Sedang,"She ___ to school every day.","","","goes","go","going","gone",A,1';
      const blob = new Blob([headers + '\n' + example], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'template_bank_soal.csv';
      link.click();
    }
    
    function openImportBankCsvModal() {
      document.getElementById('bankCsvFileName').textContent = '';
      document.getElementById('bankCsvValidationResult').innerHTML = '';
      openModal('modalImportBankCsv');
    }
    
    let selectedBankCsvFile = null;
    function handleBankCsvSelected(event) {
      selectedBankCsvFile = event.target.files[0];
      if (selectedBankCsvFile) document.getElementById('bankCsvFileName').textContent = '📄 ' + selectedBankCsvFile.name;
    }
    
    let parsedBankCsvQuestions = [];
    function validateAndPreviewBankCsv() {
      if (!selectedBankCsvFile) { showToast('Peringatan', 'Pilih file CSV terlebih dahulu.', 'warning'); return; }
      Papa.parse(selectedBankCsvFile, {
        header: true, skipEmptyLines: true, encoding: 'UTF-8',
        complete: function(results) {
          parsedBankCsvQuestions = results.data;
          const errors = [];
          results.data.forEach((row, i) => {
            if (!row.Sesi || !row.Pertanyaan || !row.Jawaban_Benar) errors.push({ row: i + 1, msg: 'Kolom wajib kosong.' });
            else if (!['A','B','C','D'].includes(String(row.Jawaban_Benar).toUpperCase())) errors.push({ row: i + 1, msg: 'Jawaban_Benar harus A/B/C/D.' });
          });
          const validCount = results.data.length - errors.length;
          document.getElementById('bankCsvValidationResult').innerHTML = `
            <div style="display:flex;gap:12px;margin-bottom:12px;">
              <span class="badge-pill badge-success"><span class="dot"></span>${validCount} Baris Valid</span>
              ${errors.length ? `<span class="badge-pill badge-danger"><span class="dot"></span>${errors.length} Baris Bermasalah</span>` : ''}
            </div>
            <div style="text-align:right;">
              <button class="btn-cbt btn-cbt-primary" ${errors.length ? 'disabled' : ''} onclick="confirmImportBankCsv()"><i class="bi bi-upload"></i> Konfirmasi Impor (${validCount} Butir)</button>
            </div>`;
        }
      });
    }
    
    function confirmImportBankCsv() {
      const idOwner = appState.staff.role === 'admin' ? 'ADMIN' : appState.staff.ID_Dosen;
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server.', 'danger'); return; }
          if (!res.success) { showToast('Gagal', res.message, 'danger'); return; }
          showToast('Berhasil', `${res.data.success} soal berhasil ditambahkan ke Bank Soal.`, 'success');
          closeModal('modalImportBankCsv');
          initBankSoalPage();
        })
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        .importBankSoalBatch(parsedBankCsvQuestions, idOwner);
    }
    
    // ════════════════════════════════════════════════════════
    // TARIK SOAL DARI BANK SOAL KE UJIAN (Manual / Acak)
    // ════════════════════════════════════════════════════════
    function openPullFromBankModal() {
      if (!window._manageQuestionsExamId) { showToast('Peringatan', 'Buka halaman Kelola Soal untuk ujian tertentu terlebih dahulu.', 'warning'); return; }
      switchPullTab('random');
      gasRun.withSuccessHandler(res => {
        if (!res || !res.success) return;
        document.getElementById('prTopik').innerHTML = '<option value="">Semua Topik</option>' + res.data.map(t => `<option value="${t}">${t}</option>`).join('');
      }).getBankSoalTopics();
      openModal('modalPullFromBank');
    }
    
    function switchPullTab(tab) {
      document.getElementById('pullTabRandom').classList.toggle('active', tab === 'random');
      document.getElementById('pullTabManual').classList.toggle('active', tab === 'manual');
      document.getElementById('pullRandomPanel').style.display = tab === 'random' ? '' : 'none';
      document.getElementById('pullManualPanel').style.display = tab === 'manual' ? '' : 'none';
      window._pullActiveTab = tab;
      if (tab === 'manual') loadManualBankPicker();
    }
    
    function loadManualBankPicker() {
      const sesi = document.getElementById('pmSesiFilter').value;
      const listEl = document.getElementById('manualBankPickerList');
      listEl.innerHTML = `<div class="skeleton" style="height:40px;"></div>`;
      gasRun
        .withSuccessHandler(res => {
          if (!res || !res.success) { listEl.innerHTML = `<div class="empty-state" style="color:var(--danger);">Gagal memuat Bank Soal.</div>`; return; }
          window._pullManualCache = res.data;
          listEl.innerHTML = res.data.length ? res.data.map(b => `
            <label style="display:flex;gap:10px;align-items:flex-start;padding:10px;border-bottom:1px solid var(--border-color);cursor:pointer;">
              <input type="checkbox" class="pull-manual-checkbox" value="${b.ID_Bank}" style="margin-top:3px;">
              <div>
                <span class="badge-pill badge-indigo" style="margin-right:6px;">${b.Sesi}</span>
                <span style="font-size:11.5px;color:var(--text-muted);">${b.Topik || 'Umum'} · ${b.Level_Kesulitan || 'Sedang'}</span>
                <div style="font-size:13px;margin-top:4px;">${(b.Pertanyaan || '').substring(0, 100)}</div>
              </div>
            </label>`).join('') : `<div class="empty-state">Tidak ada soal di Bank Soal untuk filter ini.</div>`;
        })
        .withFailureHandler(err => { listEl.innerHTML = `<div class="empty-state" style="color:var(--danger);">${err.message}</div>`; })
        .getBankSoalList(sesi ? { sesi } : {});
    }
    
    function submitPullFromBank() {
      const idUjian = window._manageQuestionsExamId;
      if (window._pullActiveTab === 'manual') {
        const checked = Array.from(document.querySelectorAll('.pull-manual-checkbox:checked')).map(c => c.value);
        if (!checked.length) { showToast('Peringatan', 'Pilih minimal satu soal.', 'warning'); return; }
        gasRun
          .withSuccessHandler(res => {
            if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server.', 'danger'); return; }
            if (!res.success) { showToast('Gagal', res.message, 'danger'); return; }
            showToast('Berhasil', res.message, 'success');
            closeModal('modalPullFromBank');
            loadManageQuestionsTable(idUjian);
          })
          .withFailureHandler(err => showToast('Error', err.message, 'danger'))
          .pullFromBankToExam(idUjian, checked);
      } else {
        const criteria = {
          sesi: document.getElementById('prSesi').value,
          topik: document.getElementById('prTopik').value,
          level: document.getElementById('prLevel').value,
          jumlah: Number(document.getElementById('prJumlah').value) || 0
        };
        if (criteria.jumlah <= 0) { showToast('Peringatan', 'Jumlah soal harus lebih dari 0.', 'warning'); return; }
        gasRun
          .withSuccessHandler(res => {
            if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server.', 'danger'); return; }
            if (!res.success) { showToast('Gagal', res.message, 'danger'); return; }
            showToast('Berhasil', res.message, 'success');
            closeModal('modalPullFromBank');
            loadManageQuestionsTable(idUjian);
          })
          .withFailureHandler(err => showToast('Error', err.message, 'danger'))
          .pullRandomFromBank(idUjian, criteria);
      }
    }
    
    // ════════════════════════════════════════════════════════
    // PERBANDINGAN PERFORMA ANTAR ROMBEL
    // ════════════════════════════════════════════════════════
    function initRombelComparisonPage() {
      gasRun.withSuccessHandler(res => {
        if (!res || !res.success) return;
        document.getElementById('rombelExamFilter').innerHTML = '<option value="">Semua Ujian</option>' +
          res.data.map(u => `<option value="${u.ID_Ujian}">${u.Nama_Ujian}</option>`).join('');
      }).getAllExamsAdmin();
      loadRombelComparison();
    }
    
    function loadRombelComparison() {
      const idUjian = document.getElementById('rombelExamFilter').value;
      const tbody = document.getElementById('rombelComparisonTableBody');
      tbody.innerHTML = `<tr><td colspan="8"><div class="skeleton" style="height:40px;"></div></td></tr>`;
    
      gasRun
        .withSuccessHandler(res => {
          if (!res) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state" style="color:var(--danger);">Tidak ada respons dari server.</div></td></tr>`; return; }
          if (!res.success) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state" style="color:var(--danger);">${res.message}</div></td></tr>`; return; }
    
          const data = res.data;
          if (!data.length) {
            tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="bi bi-bar-chart"></i>Belum ada data hasil ujian untuk dibandingkan.</div></td></tr>`;
            renderRombelChart([], []);
            return;
          }
    
          tbody.innerHTML = data.map(r => `
            <tr>
              <td><strong>${r.rombel}</strong></td>
              <td>${r.totalPeserta}</td>
              <td><strong>${r.rataRata}</strong></td>
              <td>${r.tertinggi}</td>
              <td>${r.terendah}</td>
              <td>${r.lulus}</td>
              <td>${r.tidakLulus}</td>
              <td>${r.tingkatKelulusan}%</td>
            </tr>`).join('');
    
          renderRombelChart(data.map(r => r.rombel), data.map(r => r.rataRata));
        })
        .withFailureHandler(err => { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state" style="color:var(--danger);">${err.message}</div></td></tr>`; })
        .getRombelComparison(idUjian || null);
    }
    
    function renderRombelChart(labels, values) {
      const ctx = document.getElementById('chartRombelComparison');
      if (!ctx) return;
      if (appState.chartInstances.rombel) appState.chartInstances.rombel.destroy();
      appState.chartInstances.rombel = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Rata-rata Skor', data: values, backgroundColor: '#0F766E', borderRadius: 8 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
      });
    }
    
    // ════════════════════════════════════════════════════════
    // IMPORT PESERTA MASSAL VIA CSV
    // ════════════════════════════════════════════════════════
    function openImportParticipantsModal() {
      document.getElementById('pesertaCsvFileName').textContent = '';
      document.getElementById('pesertaCsvValidationResult').innerHTML = '';
      gasRun.withSuccessHandler(res => {
        if (!res || !res.success) return;
        document.getElementById('importPesertaExamSelect').innerHTML = res.data.map(u => `<option value="${u.ID_Ujian}">${u.Nama_Ujian}</option>`).join('');
      }).getAllExamsAdmin();
      openModal('modalImportParticipants');
    }
    
    function downloadPesertaCsvTemplate() {
      const headers = 'Nama,Kontak,Rombel,Kode_Akses';
      const example = 'Budi Santoso,budi@mail.com,Rombel A,';
      const blob = new Blob([headers + '\n' + example], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'template_import_peserta.csv';
      link.click();
    }
    
    let selectedPesertaCsvFile = null;
    function handlePesertaCsvSelected(event) {
      selectedPesertaCsvFile = event.target.files[0];
      if (selectedPesertaCsvFile) document.getElementById('pesertaCsvFileName').textContent = '📄 ' + selectedPesertaCsvFile.name;
    }
    
    let parsedPesertaCsv = [];
    function validateAndPreviewPesertaCsv() {
      if (!selectedPesertaCsvFile) { showToast('Peringatan', 'Pilih file CSV terlebih dahulu.', 'warning'); return; }
      Papa.parse(selectedPesertaCsvFile, {
        header: true, skipEmptyLines: true, encoding: 'UTF-8',
        complete: function(results) {
          parsedPesertaCsv = results.data;
          const errors = [];
          results.data.forEach((row, i) => { if (!row.Nama || !row.Nama.trim()) errors.push({ row: i + 1, msg: 'Kolom Nama wajib diisi.' }); });
          const validCount = results.data.length - errors.length;
          document.getElementById('pesertaCsvValidationResult').innerHTML = `
            <div style="display:flex;gap:12px;margin-bottom:12px;">
              <span class="badge-pill badge-success"><span class="dot"></span>${validCount} Baris Valid</span>
              ${errors.length ? `<span class="badge-pill badge-danger"><span class="dot"></span>${errors.length} Baris Bermasalah</span>` : ''}
            </div>
            <div style="text-align:right;">
              <button class="btn-cbt btn-cbt-primary" ${errors.length ? 'disabled' : ''} onclick="confirmImportPesertaCsv()"><i class="bi bi-upload"></i> Konfirmasi Impor (${validCount} Peserta)</button>
            </div>`;
        }
      });
    }
    
    function confirmImportPesertaCsv() {
      const idUjian = document.getElementById('importPesertaExamSelect').value;
      gasRun
        .withSuccessHandler(res => {
          if (!res) { showToast('Koneksi Terputus', 'Tidak ada respons dari server.', 'danger'); return; }
          if (!res.success) { showToast('Gagal', res.message, 'danger'); return; }
          showToast('Berhasil', `${res.data.success} peserta berhasil diimpor.`, 'success');
          closeModal('modalImportParticipants');
          loadParticipants();
        })
        .withFailureHandler(err => showToast('Error', err.message, 'danger'))
        .importParticipantsBatch(idUjian, parsedPesertaCsv, 'LANG');
    }

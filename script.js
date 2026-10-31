/**
 * =============================================================
 *  Smart Bug & Issue Tracker – script.js
 *  Vanilla JavaScript | localStorage | CRUD | Search | Filter
 * =============================================================
 */

// ─────────────────────────────────────────────
//  CONSTANTS & STATE
// ─────────────────────────────────────────────

const STORAGE_KEY = 'smartBugTracker_bugs';

/**
 * 3 dummy data awal yang dimuat saat localStorage kosong.
 */
const INITIAL_BUGS = [
  {
    id: 'bug_1',
    title: 'Login gagal saat password mengandung karakter spesial',
    module: 'Autentikasi',
    severity: 'Critical',
    status: 'Open',
    description:
      'User tidak dapat login ketika password mengandung karakter seperti @, #, atau $. Sistem mengembalikan error 500 tanpa pesan yang jelas.',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'bug_2',
    title: 'Laporan penjualan tidak menampilkan data bulan berjalan',
    module: 'Pelaporan',
    severity: 'Major',
    status: 'In Progress',
    description:
      'Halaman laporan penjualan hanya menampilkan data hingga bulan lalu. Data bulan ini tidak muncul meskipun transaksi sudah tercatat di database.',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'bug_3',
    title: 'Tombol ekspor CSV tidak merespons di browser Firefox',
    module: 'Dashboard',
    severity: 'Minor',
    status: 'Resolved',
    description:
      'Tombol "Ekspor CSV" tidak berfungsi di Mozilla Firefox versi terbaru. Masalah sudah diperbaiki dengan mengganti event handler yang incompatible.',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

/**
 * State aplikasi – menyimpan data, filter aktif, dan id yang sedang di-edit/delete.
 */
const state = {
  bugs: [],           // semua data bug
  activeStatus: 'all', // tab filter status aktif
  searchQuery: '',    // kata kunci pencarian
  severityFilter: 'all', // filter severity
  editingId: null,    // id bug yang sedang diedit
  deletingId: null,   // id bug yang akan dihapus
};

// ─────────────────────────────────────────────
//  DOM ELEMENT REFERENCES
// ─────────────────────────────────────────────

const dom = {
  bugList:        document.getElementById('bug-list'),
  emptyState:     document.getElementById('empty-state'),
  searchInput:    document.getElementById('search-input'),
  severityFilter: document.getElementById('severity-filter'),

  // Stats
  statTotal:    document.getElementById('stat-total'),
  statCritical: document.getElementById('stat-critical'),
  statMajor:    document.getElementById('stat-major'),
  statMinor:    document.getElementById('stat-minor'),

  // Tab counts
  countAll:        document.getElementById('count-all'),
  countOpen:       document.getElementById('count-open'),
  countInProgress: document.getElementById('count-inprogress'),
  countResolved:   document.getElementById('count-resolved'),

  // Modal form
  modalOverlay: document.getElementById('modal-overlay'),
  modalTitle:   document.getElementById('modal-title'),
  bugForm:      document.getElementById('bug-form'),
  formId:       document.getElementById('form-id'),
  formTitle:    document.getElementById('form-title'),
  formModule:   document.getElementById('form-module'),
  formSeverity: document.getElementById('form-severity'),
  formStatus:   document.getElementById('form-status'),
  formDesc:     document.getElementById('form-desc'),

  // Error messages
  errTitle:    document.getElementById('err-title'),
  errModule:   document.getElementById('err-module'),
  errSeverity: document.getElementById('err-severity'),
  errDesc:     document.getElementById('err-desc'),

  // Buttons (modal)
  btnOpenModal:   document.getElementById('btn-open-modal'),
  btnCloseModal:  document.getElementById('btn-close-modal'),
  btnCancelForm:  document.getElementById('btn-cancel-form'),
  btnSubmitForm:  document.getElementById('btn-submit-form'),

  // Delete confirm modal
  deleteModal:       document.getElementById('delete-modal'),
  btnCancelDelete:   document.getElementById('btn-cancel-delete'),
  btnConfirmDelete:  document.getElementById('btn-confirm-delete'),

  // Toast
  toast:        document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message'),
  toastIcon:    document.getElementById('toast-icon'),
};

// ─────────────────────────────────────────────
//  LOCALSTORAGE HELPERS
// ─────────────────────────────────────────────

/** Membaca data dari localStorage. */
function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

/** Menyimpan data ke localStorage. */
function saveToStorage(bugs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bugs));
}

// ─────────────────────────────────────────────
//  UTILITY HELPERS
// ─────────────────────────────────────────────

/** Membuat ID unik sederhana berbasis timestamp + random. */
function generateId() {
  return `bug_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Memformat tanggal ISO ke format DD MMM YYYY. */
function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Mendapatkan kelas CSS untuk badge severity. */
function getSeverityClass(severity) {
  const map = { Critical: 'badge-critical', Major: 'badge-major', Minor: 'badge-minor' };
  return map[severity] || '';
}

/** Mendapatkan kelas CSS untuk badge status di card. */
function getStatusClass(status) {
  const map = { Open: 'status-open', 'In Progress': 'status-inprogress', Resolved: 'status-resolved' };
  return map[status] || '';
}

/** Mendapatkan kelas CSS untuk accent border card berdasarkan severity. */
function getSeverityCardClass(severity) {
  const map = { Critical: 'severity-critical', Major: 'severity-major', Minor: 'severity-minor' };
  return map[severity] || '';
}

// ─────────────────────────────────────────────
//  FILTER & SEARCH LOGIC
// ─────────────────────────────────────────────

/**
 * Menyaring array bugs berdasarkan state aktif (status, search query, severity).
 * @returns {Array} array bug yang sudah difilter
 */
function getFilteredBugs() {
  const query = state.searchQuery.toLowerCase().trim();

  return state.bugs.filter((bug) => {
    // Filter berdasarkan tab status
    const matchStatus =
      state.activeStatus === 'all' || bug.status === state.activeStatus;

    // Filter berdasarkan severity dropdown
    const matchSeverity =
      state.severityFilter === 'all' || bug.severity === state.severityFilter;

    // Filter berdasarkan search query (judul atau modul)
    const matchSearch =
      !query ||
      bug.title.toLowerCase().includes(query) ||
      bug.module.toLowerCase().includes(query);

    return matchStatus && matchSeverity && matchSearch;
  });
}

// ─────────────────────────────────────────────
//  RENDER – STATS & TAB COUNTS
// ─────────────────────────────────────────────

/**
 * Memperbarui angka statistik di bagian atas dashboard.
 * Stat berdasarkan SEMUA bug (tidak terpengaruh filter).
 */
function renderStats() {
  const all = state.bugs;
  dom.statTotal.textContent   = all.length;
  dom.statCritical.textContent = all.filter(b => b.severity === 'Critical').length;
  dom.statMajor.textContent    = all.filter(b => b.severity === 'Major').length;
  dom.statMinor.textContent    = all.filter(b => b.severity === 'Minor').length;
}

/**
 * Memperbarui angka pada setiap tab filter status.
 * Dihitung berdasarkan filter search + severity yang aktif, bukan status.
 */
function renderTabCounts() {
  // Kalkulasi dengan search dan severity filter aktif, tanpa status filter
  const query = state.searchQuery.toLowerCase().trim();
  const filtered = state.bugs.filter((bug) => {
    const matchSeverity = state.severityFilter === 'all' || bug.severity === state.severityFilter;
    const matchSearch = !query || bug.title.toLowerCase().includes(query) || bug.module.toLowerCase().includes(query);
    return matchSeverity && matchSearch;
  });

  dom.countAll.textContent        = filtered.length;
  dom.countOpen.textContent       = filtered.filter(b => b.status === 'Open').length;
  dom.countInProgress.textContent = filtered.filter(b => b.status === 'In Progress').length;
  dom.countResolved.textContent   = filtered.filter(b => b.status === 'Resolved').length;
}

// ─────────────────────────────────────────────
//  RENDER – BUG CARD
// ─────────────────────────────────────────────

/**
 * Membuat elemen HTML card untuk satu bug.
 * @param {Object} bug - objek data bug
 * @returns {HTMLElement} elemen article card
 */
function createBugCard(bug) {
  const card = document.createElement('article');
  card.className = `bug-card ${getSeverityCardClass(bug.severity)}`;
  card.dataset.id = bug.id;

  card.innerHTML = `
    <!-- Header card: judul + action buttons -->
    <div class="flex items-start justify-between gap-2">
      <h3 class="card-title text-white font-semibold text-sm leading-snug flex-1">${escapeHtml(bug.title)}</h3>
      <div class="flex items-center gap-1 flex-shrink-0 ml-1">
        <!-- Edit Button -->
        <button
          class="card-action-btn edit-btn"
          data-action="edit"
          data-id="${bug.id}"
          aria-label="Edit bug"
          title="Edit"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        <!-- Delete Button -->
        <button
          class="card-action-btn delete-btn"
          data-action="delete"
          data-id="${bug.id}"
          aria-label="Hapus bug"
          title="Hapus"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Modul -->
    <div class="flex items-center gap-1.5 text-xs text-slate-400">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
      </svg>
      <span>${escapeHtml(bug.module)}</span>
    </div>

    <!-- Deskripsi -->
    <p class="card-desc">${escapeHtml(bug.description)}</p>

    <!-- Footer card: severity badge + status control + tanggal -->
    <div class="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-slate-700/60 flex-wrap gap-y-2">
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Severity Badge -->
        <span class="badge-severity ${getSeverityClass(bug.severity)}">${escapeHtml(bug.severity)}</span>
        <!-- Status Badge -->
        <span class="badge-status ${getStatusClass(bug.status)}">${escapeHtml(bug.status)}</span>
      </div>
      <!-- Tanggal -->
      <span class="text-xs text-slate-500">${formatDate(bug.createdAt)}</span>
    </div>

    <!-- Quick Status Change -->
    <div class="flex items-center gap-2">
      <span class="text-xs text-slate-500">Ubah status:</span>
      <select
        class="status-select"
        data-action="status-change"
        data-id="${bug.id}"
        aria-label="Ubah status bug"
      >
        <option value="Open"        ${bug.status === 'Open'        ? 'selected' : ''}>Open</option>
        <option value="In Progress" ${bug.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
        <option value="Resolved"    ${bug.status === 'Resolved'    ? 'selected' : ''}>Resolved</option>
      </select>
    </div>
  `;

  return card;
}

/**
 * Merender ulang seluruh daftar bug ke DOM.
 * Dipanggil setiap kali data atau filter berubah.
 */
function renderBugList() {
  const filtered = getFilteredBugs();

  // Kosongkan dulu
  dom.bugList.innerHTML = '';

  if (filtered.length === 0) {
    dom.emptyState.classList.add('visible');
  } else {
    dom.emptyState.classList.remove('visible');
    const fragment = document.createDocumentFragment();
    filtered.forEach((bug) => fragment.appendChild(createBugCard(bug)));
    dom.bugList.appendChild(fragment);
  }

  // Update stats & tab counts
  renderStats();
  renderTabCounts();
}

// ─────────────────────────────────────────────
//  SECURITY – XSS Prevention
// ─────────────────────────────────────────────

/**
 * Escape karakter HTML untuk mencegah XSS saat memasukkan
 * konten dari user ke innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─────────────────────────────────────────────
//  MODAL HELPERS
// ─────────────────────────────────────────────

/** Membuka modal form dalam mode CREATE. */
function openCreateModal() {
  state.editingId = null;
  dom.modalTitle.textContent = 'Tambah Bug Baru';
  dom.btnSubmitForm.textContent = 'Simpan Bug';
  dom.bugForm.reset();
  clearFormErrors();
  dom.modalOverlay.classList.add('open');
  setTimeout(() => dom.formTitle.focus(), 100);
}

/**
 * Membuka modal form dalam mode EDIT, mengisi field dengan data bug yg ada.
 * @param {string} bugId
 */
function openEditModal(bugId) {
  const bug = state.bugs.find(b => b.id === bugId);
  if (!bug) return;

  state.editingId = bugId;
  dom.modalTitle.textContent = 'Edit Bug';
  dom.btnSubmitForm.textContent = 'Perbarui Bug';

  dom.formId.value       = bug.id;
  dom.formTitle.value    = bug.title;
  dom.formModule.value   = bug.module;
  dom.formSeverity.value = bug.severity;
  dom.formStatus.value   = bug.status;
  dom.formDesc.value     = bug.description;

  clearFormErrors();
  dom.modalOverlay.classList.add('open');
  setTimeout(() => dom.formTitle.focus(), 100);
}

/** Menutup modal form. */
function closeModal() {
  dom.modalOverlay.classList.remove('open');
  dom.bugForm.reset();
  clearFormErrors();
  state.editingId = null;
}

/** Membuka modal konfirmasi delete. */
function openDeleteModal(bugId) {
  state.deletingId = bugId;
  dom.deleteModal.classList.add('open');
}

/** Menutup modal konfirmasi delete. */
function closeDeleteModal() {
  dom.deleteModal.classList.remove('open');
  state.deletingId = null;
}

// ─────────────────────────────────────────────
//  FORM VALIDATION
// ─────────────────────────────────────────────

/** Menghapus semua pesan error di form. */
function clearFormErrors() {
  [dom.errTitle, dom.errModule, dom.errSeverity, dom.errDesc].forEach(el => el.classList.add('hidden'));
  [dom.formTitle, dom.formModule, dom.formSeverity, dom.formDesc].forEach(el => el.classList.remove('border-red-500'));
}

/**
 * Memvalidasi input form.
 * @returns {boolean} true jika valid, false jika ada error
 */
function validateForm() {
  let isValid = true;

  const fields = [
    { input: dom.formTitle,    error: dom.errTitle,    value: dom.formTitle.value.trim() },
    { input: dom.formModule,   error: dom.errModule,   value: dom.formModule.value.trim() },
    { input: dom.formSeverity, error: dom.errSeverity, value: dom.formSeverity.value },
    { input: dom.formDesc,     error: dom.errDesc,     value: dom.formDesc.value.trim() },
  ];

  clearFormErrors();

  fields.forEach(({ input, error, value }) => {
    if (!value) {
      error.classList.remove('hidden');
      input.classList.add('border-red-500');
      isValid = false;
    }
  });

  return isValid;
}

// ─────────────────────────────────────────────
//  CRUD OPERATIONS
// ─────────────────────────────────────────────

/**
 * Membuat bug baru dan menambahkannya ke state & localStorage.
 * @param {Object} bugData - data bug tanpa id & createdAt
 */
function createBug(bugData) {
  const newBug = {
    id: generateId(),
    ...bugData,
    createdAt: new Date().toISOString(),
  };
  state.bugs.unshift(newBug); // tambah di depan agar muncul paling atas
  saveToStorage(state.bugs);
}

/**
 * Memperbarui data bug yang sudah ada berdasarkan id.
 * @param {string} id
 * @param {Object} updatedData
 */
function updateBug(id, updatedData) {
  const idx = state.bugs.findIndex(b => b.id === id);
  if (idx === -1) return;
  state.bugs[idx] = { ...state.bugs[idx], ...updatedData };
  saveToStorage(state.bugs);
}

/**
 * Menghapus bug berdasarkan id.
 * @param {string} id
 */
function deleteBug(id) {
  state.bugs = state.bugs.filter(b => b.id !== id);
  saveToStorage(state.bugs);
}

// ─────────────────────────────────────────────
//  TOAST NOTIFICATION
// ─────────────────────────────────────────────

let toastTimer = null;

/**
 * Menampilkan toast notification.
 * @param {string} message - pesan yang ditampilkan
 * @param {'success'|'error'} type - jenis notifikasi
 */
function showToast(message, type = 'success') {
  const isSuccess = type === 'success';

  dom.toastIcon.innerHTML = isSuccess
    ? `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;

  dom.toastIcon.className = isSuccess ? 'text-green-400 flex-shrink-0' : 'text-red-400 flex-shrink-0';
  dom.toastMessage.textContent = message;
  dom.toast.classList.add('show');

  // Auto-hide setelah 3 detik
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('show'), 3000);
}

// ─────────────────────────────────────────────
//  TAB FILTER
// ─────────────────────────────────────────────

/** Memperbarui tampilan active state pada tab buttons. */
function updateTabUI() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.status === state.activeStatus) {
      btn.classList.add('active-tab');
    } else {
      btn.classList.remove('active-tab');
    }
  });
}

// ─────────────────────────────────────────────
//  EVENT LISTENERS
// ─────────────────────────────────────────────

/** Menyiapkan semua event listener aplikasi. */
function setupEventListeners() {

  // ── Tombol Tambah Bug ──
  dom.btnOpenModal.addEventListener('click', openCreateModal);

  // ── Tombol Tutup & Batal Modal ──
  dom.btnCloseModal.addEventListener('click', closeModal);
  dom.btnCancelForm.addEventListener('click', closeModal);

  // Tutup modal saat klik overlay background
  dom.modalOverlay.addEventListener('click', (e) => {
    if (e.target === dom.modalOverlay) closeModal();
  });

  // ── Submit Form (Create / Update) ──
  dom.bugForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const bugData = {
      title:       dom.formTitle.value.trim(),
      module:      dom.formModule.value.trim(),
      severity:    dom.formSeverity.value,
      status:      dom.formStatus.value,
      description: dom.formDesc.value.trim(),
    };

    if (state.editingId) {
      // UPDATE
      updateBug(state.editingId, bugData);
      showToast('Bug berhasil diperbarui.');
    } else {
      // CREATE
      createBug(bugData);
      showToast('Bug baru berhasil ditambahkan.');
    }

    closeModal();
    renderBugList();
  });

  // ── Delegasi event pada bug-list (Edit, Delete, Status Change) ──
  dom.bugList.addEventListener('click', (e) => {
    const target = e.target;
    const action = target.dataset.action;
    const id     = target.dataset.id;

    if (!action || !id) return;

    if (action === 'edit') {
      openEditModal(id);
    } else if (action === 'delete') {
      openDeleteModal(id);
    }
  });

  // Event change untuk quick status select (delegasi)
  dom.bugList.addEventListener('change', (e) => {
    const target = e.target;
    if (target.dataset.action !== 'status-change') return;

    const id        = target.dataset.id;
    const newStatus = target.value;

    updateBug(id, { status: newStatus });
    showToast(`Status bug diubah menjadi "${newStatus}".`);
    renderBugList();
  });

  // ── Delete Confirm Modal ──
  dom.btnCancelDelete.addEventListener('click', closeDeleteModal);
  dom.deleteModal.addEventListener('click', (e) => {
    if (e.target === dom.deleteModal) closeDeleteModal();
  });
  dom.btnConfirmDelete.addEventListener('click', () => {
    if (!state.deletingId) return;
    deleteBug(state.deletingId);
    showToast('Bug berhasil dihapus.', 'error');
    closeDeleteModal();
    renderBugList();
  });

  // ── Search Bar ──
  dom.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderBugList();
  });

  // ── Severity Filter Dropdown ──
  dom.severityFilter.addEventListener('change', (e) => {
    state.severityFilter = e.target.value;
    renderBugList();
  });

  // ── Status Tab Filter ──
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeStatus = btn.dataset.status;
      updateTabUI();
      renderBugList();
    });
  });

  // ── Keyboard shortcut: Esc menutup modal ──
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (dom.modalOverlay.classList.contains('open')) closeModal();
      if (dom.deleteModal.classList.contains('open')) closeDeleteModal();
    }
  });
}

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────

/**
 * Inisialisasi aplikasi:
 * 1. Muat data dari localStorage (atau pakai dummy data)
 * 2. Setup event listeners
 * 3. Render tampilan awal
 */
function init() {
  const stored = loadFromStorage();

  if (stored && stored.length > 0) {
    // Data sudah ada di localStorage
    state.bugs = stored;
  } else {
    // Pertama kali dibuka: gunakan dummy data
    state.bugs = INITIAL_BUGS;
    saveToStorage(state.bugs);
  }

  setupEventListeners();
  renderBugList();
}

// Jalankan saat DOM siap
document.addEventListener('DOMContentLoaded', init);

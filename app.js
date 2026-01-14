// Lógica principal de la app
// Este archivo define la estructura base para cargar datos,
// pintarlos en la tabla y aplicar filtros sin editar/guardar.

/* global CONFIG */

const ALL_VIEW = 'all';
const DAILY_VIEW = 'daily';
const TODAY_DELIVERIES_VIEW = 'today-deliveries';
const WEEKLY_PROGRAM_VIEW = 'weekly-program';
const DEFAULT_VIEW = DAILY_VIEW;
const DEFAULT_EMPTY_MESSAGE = 'No hay resultados para mostrar.';
const THEME_STORAGE_KEY = 'tracking-theme';
const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';
const BASE_STATUS_FILTERS = ['all', 'delivered', 'drop', 'cancelled'];
const ALLOWED_OVERDUE_STATUSES = new Set([
  'drop',
  'live',
  'loading',
  'qro yard',
  'mty yard',
  'in transit mx'
]);
const MEXICO_TZ = 'America/Mexico_City';
const DEFAULT_TABLE_COLUMNS = [
  { key: 'cliente', label: 'Cliente' },
  { key: 'estado', label: 'Estado' },
  { key: 'trip', label: 'Trip' },
  { key: 'caja', label: 'Caja' },
  { key: 'tr-mx', label: 'TR-MX' },
  { key: 'tr-usa', label: 'TR-USA' },
  { key: 'actions', label: 'Acciones' }
];
const DAILY_TABLE_COLUMNS = [
  { key: 'cliente', label: 'Cliente' },
  { key: 'estado', label: 'Estado' },
  { key: 'trip', label: 'Trip' },
  { key: 'caja', label: 'Caja' },
  { key: 'tr-mx', label: 'TR-MX' },
  { key: 'cita carga', label: 'Cita carga' },
  { key: 'actions', label: 'Acciones' }
];
const ADD_RECORD_FIELDS = [
  { key: 'referencia', label: 'Referencia' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'destino', label: 'Destino' },
  { key: 'estado', label: 'Estado' },
  { key: 'ejecutivo', label: 'Ejecutivo' },
  { key: 'trip', label: 'Trip', required: true },
  { key: 'caja', label: 'Caja' },
  { key: 'segmento', label: 'Segmento' },
  { key: 'tr-mx', label: 'TR-MX' },
  { key: 'tr-usa', label: 'TR-USA' },
  { key: 'tracking', label: 'Tracking' },
  { key: 'docs', label: 'Docs' },
  { key: 'cita carga', label: 'Cita carga', type: 'datetime-local' },
  { key: 'llegada carga', label: 'Llegada carga', type: 'datetime-local' },
  { key: 'cita entrega', label: 'Cita entrega', type: 'datetime-local' },
  { key: 'llegada entrega', label: 'Llegada entrega', type: 'datetime-local' },
  { key: 'comentarios', label: 'Comentarios', type: 'textarea' }
];

// Estado centralizado para reutilizar en render y filtros.
const state = {
  data: [],
  filtered: [],
  query: '',
  statusFilter: 'all',
  statusOptions: [],
  view: DEFAULT_VIEW,
  error: null,
  activeTripRow: null,
  isEditingTrip: false
};

// Referencias a elementos principales del DOM.
const dom = {
  app: document.getElementById('app'),
  themeToggle: document.getElementById('theme-toggle'),
  searchInput: null,
  searchToggle: null,
  searchField: null,
  tableBody: null,
  tableHead: null,
  tableWrapper: null,
  cardList: null,
  filterContainer: null,
  emptyState: null,
  menuButtons: null,
  menuToggle: null,
  menuContent: null,
  addRecordButton: null,
  addRecordModal: null,
  addRecordForm: null,
  addRecordError: null,
  addRecordCancel: null,
  addRecordSave: null,
  tripModal: null,
  tripModalBody: null,
  tripModalTitle: null,
  tripEditButton: null
};
const TRIP_EDIT_FIELDS = [
  { key: 'referencia', label: 'Referencia' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'destino', label: 'Destino' },
  { key: 'estado', label: 'Estado' },
  { key: 'ejecutivo', label: 'Ejecutivo' },
  { key: 'trip', label: 'Trip', disabled: true },
  { key: 'caja', label: 'Caja' },
  { key: 'segmento', label: 'Segmento' },
  { key: 'tr-mx', label: 'TR-MX' },
  { key: 'tr-usa', label: 'TR-USA' },
  { key: 'tracking', label: 'Tracking' },
  { key: 'docs', label: 'Docs' },
  { key: 'cita carga', label: 'Cita carga', type: 'datetime-local' },
  { key: 'llegada carga', label: 'Llegada carga', type: 'datetime-local' },
  { key: 'cita entrega', label: 'Cita entrega', type: 'datetime-local' },
  { key: 'llegada entrega', label: 'Llegada entrega', type: 'datetime-local' },
  { key: 'comentarios', label: 'Comentarios', type: 'textarea' }
];

// Punto de entrada de la app.
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  buildLayout();
  bindEvents();
  fetchData();
});

// Construye la estructura base dentro de #app.
function buildLayout() {
  dom.app.innerHTML = `
    <div class="app-layout">
      <section class="app-section">
        <div class="toolbar">
          <div class="toolbar-top">
            <div class="toolbar-main">
              <div class="side-menu" aria-label="Menú de navegación">
                <button
                  type="button"
                  class="side-menu-toggle"
                  aria-label="Mostrar u ocultar menú"
                  aria-expanded="false"
                >
                  ☰
                </button>
                <div class="side-menu-content" hidden>
                  <button type="button" class="side-menu-button" data-view="${ALL_VIEW}">
                    Todas
                  </button>
                  <button type="button" class="side-menu-button" data-view="${DAILY_VIEW}">
                    Cargas diarias
                  </button>
                  <button type="button" class="side-menu-button" data-view="${TODAY_DELIVERIES_VIEW}">
                    Entregas hoy
                  </button>
                  <button type="button" class="side-menu-button" data-view="${WEEKLY_PROGRAM_VIEW}">
                    Programa semanal
                  </button>
                </div>
              </div>
              <div class="search-group is-collapsed">
                <button
                  type="button"
                  class="search-toggle"
                  aria-label="Buscar embarque"
                  aria-expanded="false"
                >
                  🔍
                </button>
                <div class="search-field" hidden>
                  <label for="search" class="search-label">Buscar embarque</label>
                  <input
                    id="search"
                    type="search"
                    placeholder="Buscar por referencia, cliente, destino..."
                    autocomplete="off"
                  />
                </div>
              </div>
            </div>
            <button
              type="button"
              class="primary-button"
              id="add-record-button"
              aria-label="Agregar registro"
              title="Agregar registro"
            >
              +
            </button>
          </div>
          <div class="filter-chips" role="list"></div>
        </div>
        <div class="table-wrapper">
          <div class="table-scroll" role="region" aria-label="Tabla de tracking">
            <table class="tracking-table">
              <thead></thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
        <div class="card-list" role="list"></div>
        <p class="empty-state" hidden>${DEFAULT_EMPTY_MESSAGE}</p>
      </section>
    </div>
    <div class="modal-backdrop" hidden>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="trip-modal-title">
        <header class="modal-header">
          <h2 id="trip-modal-title">Detalle de trip</h2>
          <div class="modal-actions">
            <button type="button" class="modal-edit" aria-label="Editar trip" title="Editar">
              ✎
            </button>
            <button type="button" class="modal-close" aria-label="Cerrar">×</button>
          </div>
        </header>
        <div class="modal-body"></div>
      </div>
    </div>
    <div class="modal-backdrop add-record-modal" hidden>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="add-record-title">
        <header class="modal-header">
          <h2 id="add-record-title">Agregar registro</h2>
          <button type="button" class="modal-close" aria-label="Cerrar">×</button>
        </header>
        <div class="modal-body">
          ${buildAddRecordForm()}
        </div>
      </div>
    </div>
  `;

  dom.searchInput = dom.app.querySelector('#search');
  dom.searchToggle = dom.app.querySelector('.search-toggle');
  dom.searchField = dom.app.querySelector('.search-field');
  dom.tableBody = dom.app.querySelector('tbody');
  dom.tableHead = dom.app.querySelector('.tracking-table thead');
  dom.tableWrapper = dom.app.querySelector('.table-wrapper');
  dom.cardList = dom.app.querySelector('.card-list');
  dom.filterContainer = dom.app.querySelector('.filter-chips');
  dom.emptyState = dom.app.querySelector('.empty-state');
  dom.menuButtons = dom.app.querySelectorAll('.side-menu-button');
  dom.menuToggle = dom.app.querySelector('.side-menu-toggle');
  dom.menuContent = dom.app.querySelector('.side-menu-content');
  dom.addRecordButton = dom.app.querySelector('#add-record-button');
  dom.addRecordModal = dom.app.querySelector('.add-record-modal');
  dom.addRecordForm = dom.app.querySelector('.add-record-form');
  dom.addRecordError = dom.app.querySelector('.add-record-error');
  dom.addRecordCancel = dom.app.querySelector('.add-record-cancel');
  dom.addRecordSave = dom.app.querySelector('.add-record-save');
  dom.tripModal = dom.app.querySelector('.modal-backdrop');
  dom.tripModalBody = dom.app.querySelector('.modal-body');
  dom.tripModalTitle = dom.app.querySelector('#trip-modal-title');
  dom.tripEditButton = dom.app.querySelector('.modal-edit');
  dom.tripEditButton.hidden = true;

  updateMenuActiveState();
  setMenuOpen(false);
  setSearchOpen(false);
  updateStatusOptions();
  renderStatusFilters([]);
}

// Enlaza eventos de interacción básicos.
function bindEvents() {
  const debouncedSearch = debounce((value) => {
    state.query = value.trim();
    applyFilters();
  }, 250);

  if (dom.themeToggle) {
    dom.themeToggle.addEventListener('click', () => {
      const nextTheme = document.body.classList.contains('theme-dark')
        ? THEME_LIGHT
        : THEME_DARK;
      applyTheme(nextTheme);
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    });
  }

  dom.menuToggle.addEventListener('click', () => {
    const isOpen = dom.menuToggle.getAttribute('aria-expanded') === 'true';
    setMenuOpen(!isOpen);
  });

  dom.searchToggle.addEventListener('click', () => {
    const isOpen = dom.searchToggle.getAttribute('aria-expanded') === 'true';
    setSearchOpen(!isOpen);
    if (!isOpen) {
      dom.searchInput.focus();
    }
  });

  dom.searchInput.addEventListener('input', (event) => {
    debouncedSearch(event.target.value);
  });

  dom.addRecordButton.addEventListener('click', () => {
    openAddRecordModal();
  });

  dom.app.addEventListener('click', (event) => {
    const button = event.target.closest('.side-menu-button');
    if (!button) {
      return;
    }

    const view = button.dataset.view || DEFAULT_VIEW;
    setView(view);
    setMenuOpen(false);
  });

  dom.filterContainer.addEventListener('click', (event) => {
    const chip = event.target.closest('.filter-chip');
    if (!chip) {
      return;
    }
    setStatusFilter(chip.dataset.status || 'all');
  });

  dom.tableBody.addEventListener('click', (event) => {
    const target = event.target.closest('.trip-link');
    if (!target) {
      const viewButton = event.target.closest('.row-view');
      if (!viewButton) {
        return;
      }
      const rowIndex = Number(viewButton.dataset.rowIndex);
      const row = state.filtered[rowIndex];
      if (row) {
        openTripModal(row);
      }
      return;
    }

    const rowIndex = Number(target.dataset.rowIndex);
    const row = state.filtered[rowIndex];
    if (!row) {
      return;
    }

    openTripModal(row);
  });

  dom.cardList.addEventListener('click', (event) => {
    const viewButton = event.target.closest('.card-view-button');
    if (!viewButton) {
      return;
    }
    const rowIndex = Number(viewButton.dataset.rowIndex);
    const row = state.filtered[rowIndex];
    if (!row) {
      return;
    }
    openTripModal(row);
  });

  dom.tripModal.addEventListener('click', (event) => {
    if (event.target === dom.tripModal || event.target.closest('.modal-close')) {
      closeTripModal();
    }
  });
  dom.tripEditButton.addEventListener('click', () => {
    if (!state.activeTripRow) {
      return;
    }
    enterTripEditMode();
  });

  dom.tripModalBody.addEventListener('submit', (event) => {
    if (!event.target.closest('.trip-edit-form')) {
      return;
    }
    handleTripEditSubmit(event);
  });

  dom.tripModalBody.addEventListener('click', (event) => {
    const cancelButton = event.target.closest('.trip-edit-cancel');
    if (!cancelButton) {
      return;
    }
    exitTripEditMode();
  });

  dom.addRecordModal.addEventListener('click', (event) => {
    if (event.target === dom.addRecordModal || event.target.closest('.modal-close')) {
      closeAddRecordModal();
    }
  });

  dom.addRecordCancel.addEventListener('click', () => {
    closeAddRecordModal();
  });

  dom.addRecordForm.addEventListener('submit', (event) => {
    handleAddRecordSubmit(event);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    if (!dom.tripModal.hidden) {
      closeTripModal();
    }

    if (!dom.addRecordModal.hidden) {
      closeAddRecordModal();
    }
  });

  document.addEventListener('click', (event) => {
    if (!dom.menuToggle || !dom.menuContent) {
      return;
    }
    const isOpen = dom.menuToggle.getAttribute('aria-expanded') === 'true';
    if (!isOpen) {
      return;
    }
    const target = event.target;
    if (dom.menuToggle.contains(target) || dom.menuContent.contains(target)) {
      return;
    }
    setMenuOpen(false);
  });
}

function initTheme() {
  const storedTheme = getStoredTheme();
  const initialTheme = storedTheme || getSystemTheme();
  applyTheme(initialTheme);
}

function getStoredTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === THEME_DARK || stored === THEME_LIGHT) {
    return stored;
  }
  return null;
}

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? THEME_DARK
    : THEME_LIGHT;
}

function applyTheme(theme) {
  document.body.classList.toggle('theme-dark', theme === THEME_DARK);
  if (!dom.themeToggle) {
    return;
  }

  const isDark = theme === THEME_DARK;
  dom.themeToggle.setAttribute('aria-pressed', String(isDark));
  const label = dom.themeToggle.querySelector('.theme-toggle-text');
  if (label) {
    label.textContent = isDark ? 'Modo claro' : 'Modo oscuro';
  }
  const icon = dom.themeToggle.querySelector('.theme-toggle-icon');
  if (icon) {
    icon.textContent = isDark ? '☀️' : '🌙';
  }
}

function setMenuOpen(isOpen) {
  dom.menuToggle.setAttribute('aria-expanded', String(isOpen));
  dom.menuContent.hidden = !isOpen;
}

function setSearchOpen(isOpen) {
  dom.searchToggle.setAttribute('aria-expanded', String(isOpen));
  dom.searchField.hidden = !isOpen;
  dom.searchToggle.closest('.search-group').classList.toggle('is-collapsed', !isOpen);
}

// Obtiene datos desde Google Apps Script.
async function fetchData() {
  // Validación mínima de la URL para evitar errores silenciosos.
  if (!CONFIG || !CONFIG.API_URL || CONFIG.API_URL.includes('PEGAR_AQUI')) {
    state.error = 'Configura CONFIG.API_URL en config.js para conectar el backend.';
    console.warn(state.error);
    renderTable([]);
    renderCards([]);
    updateEmptyState([]);
    return;
  }

  try {
    const response = await fetch(CONFIG.API_URL);
    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    // Se espera un arreglo de objetos con llaves coherentes con la tabla.
    const payload = await response.json();
    if (payload?.success === false) {
      throw new Error(payload.error || 'El backend respondió con un error.');
    }
    const data = normalizePayload(payload);
    state.error = null;
    state.data = data;
    updateStatusOptions();
    applyFilters();
  } catch (error) {
    state.error =
      'No se pudieron cargar los registros. Revisa permisos y acceso del backend.';
    if (error instanceof Error && error.message) {
      state.error = `${state.error} (${error.message}).`;
    }
    console.error('Error al obtener datos:', error);
    renderTable([]);
    renderCards([]);
    updateEmptyState([]);
  }
}

function normalizePayload(payload) {
  if (Array.isArray(payload)) {
    return normalizeRows(payload);
  }

  if (payload && typeof payload === 'object') {
    const candidates = [payload.data, payload.records, payload.rows, payload.items];
    const list = candidates.find((candidate) => Array.isArray(candidate));
    if (list) {
      return normalizeRows(list);
    }

    if (Array.isArray(payload.values)) {
      return normalizeArrayRows(payload.values);
    }
  }

  return [];
}

function normalizeRows(rows) {
  if (!rows.length) {
    return [];
  }

  if (Array.isArray(rows[0])) {
    return normalizeArrayRows(rows);
  }

  if (typeof rows[0] === 'object' && rows[0] !== null) {
    return rows.map((row) => normalizeObjectRow(row));
  }

  return [];
}

function normalizeArrayRows(rows) {
  const [headerRow, ...dataRows] = rows;
  if (!Array.isArray(headerRow)) {
    return [];
  }

  const headers = headerRow.map((header) =>
    header ? header.toString().trim().toLowerCase() : ''
  );

  return dataRows.map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      if (!header) {
        return;
      }
      record[header] = row?.[index] ?? '';
    });
    return normalizeObjectRow(record);
  });
}

function normalizeObjectRow(row) {
  const normalizedRow = normalizeRowKeys(row);
  const citaCargaRaw = getRowValue(normalizedRow, ['cita carga']);
  const citaCargaDate = parseDateValue(citaCargaRaw);
  const citaEntregaRaw = getRowValue(normalizedRow, ['cita entrega']);
  const citaEntregaDate = parseDateValue(citaEntregaRaw);
  return {
    referencia: getRowValue(normalizedRow, ['referencia', 'reference', 'ref']),
    cliente: getRowValue(normalizedRow, ['cliente', 'client', 'customer']),
    destino: getRowValue(normalizedRow, ['destino', 'destination', 'dest']),
    estado: getRowValue(normalizedRow, ['estado', 'estatus', 'status']),
    ejecutivo: getRowValue(normalizedRow, ['ejecutivo']),
    trip: getRowValue(normalizedRow, ['trip']),
    caja: getRowValue(normalizedRow, ['caja']),
    segmento: getRowValue(normalizedRow, ['segmento']),
    'tr-mx': getRowValue(normalizedRow, ['tr-mx']),
    'tr-usa': getRowValue(normalizedRow, ['tr-usa']),
    tracking: getRowValue(normalizedRow, ['tracking']),
    docs: getRowValue(normalizedRow, ['docs']),
    'cita carga': formatDateTime(citaCargaRaw),
    'llegada carga': formatDateTime(getRowValue(normalizedRow, ['llegada carga'])),
    'cita entrega': formatDateTime(citaEntregaRaw),
    'llegada entrega': formatDateTime(getRowValue(normalizedRow, ['llegada entrega'])),
    comentarios: getRowValue(normalizedRow, ['comentarios']),
    citaCargaDate,
    citaEntregaDate
  };
}

function formatDateTime(value) {
  if (!value) {
    return '';
  }

  const rawValue = value.toString().trim();
  if (!rawValue) {
    return '';
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return rawValue;
  }

  const formatter = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: MEXICO_TZ
  });

  const parts = formatter.formatToParts(date).reduce((accumulator, part) => {
    accumulator[part.type] = part.value;
    return accumulator;
  }, {});

  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }

  const rawValue = value.toString().trim();
  if (!rawValue) {
    return null;
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getRowValue(row, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key];
    }
  }
  return '';
}

function normalizeRowKeys(row) {
  if (!row || typeof row !== 'object') {
    return {};
  }

  return Object.keys(row).reduce((accumulator, key) => {
    const normalizedKey = key ? key.toString().trim().toLowerCase() : '';
    if (!normalizedKey) {
      return accumulator;
    }
    if (!(normalizedKey in accumulator)) {
      accumulator[normalizedKey] = row[key];
    }
    return accumulator;
  }, {});
}

// Renderiza filas en la tabla con la data filtrada.
function renderTable(data) {
  if (!dom.tableBody) {
    return;
  }

  const columns = getTableColumns();
  renderTableHeader(columns);

  dom.tableBody.innerHTML = data
    .map((row, index) => {
      const cells = columns
        .map((column) => {
          if (column.key === 'trip') {
            return `<td>${renderTripCell(row.trip, index)}</td>`;
          }
          if (column.key === 'estado') {
            return `<td>${renderStatusChip(row.estado)}</td>`;
          }
          if (column.key === 'actions') {
            return `<td>${renderRowActions(index)}</td>`;
          }
          const value = row[column.key];
          return `<td>${value || '-'}</td>`;
        })
        .join('');
      return `
        <tr>
          ${cells}
        </tr>
      `;
    })
    .join('');
}

function renderTableHeader(columns) {
  if (!dom.tableHead) {
    return;
  }

  dom.tableHead.innerHTML = `
    <tr>
      ${columns.map((column) => `<th>${column.label}</th>`).join('')}
    </tr>
  `;
}

function getTableColumns() {
  return state.view === DAILY_VIEW || state.view === WEEKLY_PROGRAM_VIEW
    ? DAILY_TABLE_COLUMNS
    : DEFAULT_TABLE_COLUMNS;
}

function renderTripCell(tripValue, index) {
  if (!tripValue) {
    return '-';
  }

  return `
    <button type="button" class="trip-link" data-row-index="${index}" aria-label="Ver detalle del trip">
      ${tripValue}
    </button>
  `;
}

function renderRowActions(index) {
  return `
    <div class="row-actions">
      <button type="button" class="row-view" data-row-index="${index}" aria-label="Ver o editar registro">
        Ver/Editar
      </button>
      <button type="button" class="row-menu" aria-label="Más acciones">
        ⋯
      </button>
    </div>
  `;
}

function renderStatusChip(statusValue) {
  const label = statusValue || 'Sin estado';
  const statusKey = normalizeStatusKey(statusValue);
  const statusClass = `is-${statusKey}`;
  return `
    <span class="status-chip ${statusClass}">
      ${label}
    </span>
  `;
}

function normalizeStatusKey(statusValue) {
  if (!statusValue) {
    return 'default';
  }
  const normalized = statusValue.toString().trim().toLowerCase();
  if (!normalized) {
    return 'default';
  }
  if (normalized.includes('delivered')) {
    return 'delivered';
  }
  if (normalized.includes('drop')) {
    return 'drop';
  }
  if (normalized.includes('cancel')) {
    return 'cancelled';
  }
  if (normalized.includes('live')) {
    return 'live';
  }
  if (normalized.includes('transit')) {
    return 'in-transit';
  }
  return 'default';
}

function renderCards(data) {
  if (!dom.cardList) {
    return;
  }

  dom.cardList.innerHTML = data
    .map((row, index) => {
      const trMx = row['tr-mx'];
      const trUsa = row['tr-usa'];
      return `
        <article class="card" role="listitem">
          <header class="card-header">
            <div>
              <p class="card-title">${row.cliente || 'Cliente sin nombre'}</p>
              <p>${row.trip ? `Trip ${row.trip}` : 'Trip no asignado'}</p>
            </div>
            ${renderStatusChip(row.estado)}
          </header>
          <div class="card-details">
            <div><strong>Caja:</strong> ${row.caja || '-'}</div>
            <div><strong>Trip:</strong> ${row.trip || '-'}</div>
            ${trMx ? `<div><strong>TR-MX:</strong> ${trMx}</div>` : ''}
            ${trUsa ? `<div><strong>TR-USA:</strong> ${trUsa}</div>` : ''}
          </div>
          <div class="card-actions">
            <button type="button" class="primary-button card-view-button" data-row-index="${index}" aria-label="Ver detalle">
              Ver
            </button>
          </div>
        </article>
      `;
    })
    .join('');
}

function updateEmptyState(data) {
  dom.emptyState.textContent = state.error || DEFAULT_EMPTY_MESSAGE;
  dom.emptyState.hidden = data.length > 0;
}

function openTripModal(row) {
  const tripValue = row.trip || 'Trip';
  state.activeTripRow = row;
  state.isEditingTrip = false;
  dom.tripModalTitle.textContent = `Detalle de trip ${tripValue}`;
  dom.tripModalBody.innerHTML = buildTripDetails(row);
  dom.tripEditButton.hidden = false;
  dom.tripModal.hidden = false;
}

function closeTripModal() {
  dom.tripModal.hidden = true;
  dom.tripModalBody.innerHTML = '';
  dom.tripModalTitle.textContent = 'Detalle de trip';
  dom.tripEditButton.hidden = true;
  state.activeTripRow = null;
  state.isEditingTrip = false;
}

function openAddRecordModal() {
  if (!dom.addRecordModal) {
    return;
  }

  closeTripModal();
  dom.addRecordModal.hidden = false;
  dom.addRecordForm.reset();
  setAddRecordError('');
}

function closeAddRecordModal() {
  if (!dom.addRecordModal) {
    return;
  }

  dom.addRecordModal.hidden = true;
  setAddRecordError('');
}

function buildTripDetails(row) {
  const fields = [
    { label: 'Referencia', value: row.referencia },
    { label: 'Cliente', value: row.cliente },
    { label: 'Destino', value: row.destino },
    { label: 'Estado', value: row.estado },
    { label: 'Ejecutivo', value: row.ejecutivo },
    { label: 'Trip', value: row.trip },
    { label: 'Caja', value: row.caja },
    { label: 'Segmento', value: row.segmento },
    { label: 'TR-MX', value: row['tr-mx'] },
    { label: 'TR-USA', value: row['tr-usa'] },
    { label: 'Tracking', value: row.tracking },
    { label: 'Docs', value: row.docs },
    { label: 'Cita carga', value: row['cita carga'] },
    { label: 'Llegada carga', value: row['llegada carga'] },
    { label: 'Cita entrega', value: row['cita entrega'] },
    { label: 'Llegada entrega', value: row['llegada entrega'] },
    { label: 'Comentarios', value: row.comentarios }
  ];

  return `
    <dl class="trip-details">
      ${fields
        .map((field) => {
          const value =
            field.label === 'Tracking'
              ? buildTrackingLink(field.value)
              : field.value || '-';
          return `
            <div class="trip-details-row">
              <dt>${field.label}</dt>
              <dd>${value}</dd>
            </div>
          `;
        })
        .join('')}
    </dl>
  `;
}

function buildTrackingLink(value) {
  if (!value) {
    return '-';
  }

  if (isValidUrl(value)) {
    const safeUrl = escapeHtml(value);
    return `<a class="tracking-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`;
  }

  return value;
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const escaped = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return escaped[char] || char;
  });
}

function buildTripEditForm(row) {
  return `
    <form class="trip-edit-form">
      <p class="form-hint">
        Puedes editar la información del trip seleccionado. El número de trip no se puede modificar.
      </p>
      <div class="form-grid">
        ${TRIP_EDIT_FIELDS.map((field, index) => buildTripEditField(field, index, row)).join('')}
      </div>
      <p class="trip-edit-error" role="alert" aria-live="polite" hidden></p>
      <div class="form-actions">
        <button type="button" class="secondary-button trip-edit-cancel">Cancelar</button>
        <button type="submit" class="primary-button trip-edit-save">Guardar cambios</button>
      </div>
    </form>
  `;
}

function buildTripEditField(field, index, row) {
  const id = `trip-edit-field-${index}`;
  const inputType = field.type || 'text';
  const value = getTripFieldValue(row, field.key);
  const inputValue =
    inputType === 'datetime-local' ? toInputDateTimeValue(value) : value || '';
  const disabled = field.disabled ? 'disabled' : '';

  if (inputType === 'textarea') {
    return `
      <div class="form-field form-field-full">
        <label for="${id}">${field.label}</label>
        <textarea id="${id}" data-field="${field.key}" rows="3" ${disabled}>${inputValue}</textarea>
      </div>
    `;
  }

  return `
    <div class="form-field">
      <label for="${id}">${field.label}</label>
      <input id="${id}" type="${inputType}" data-field="${field.key}" value="${inputValue}" ${disabled} />
    </div>
  `;
}

function getTripFieldValue(row, key) {
  if (!row) {
    return '';
  }
  return row[key] ?? '';
}

function toInputDateTimeValue(value) {
  if (!value) {
    return '';
  }

  const stringValue = value.toString().trim();
  if (!stringValue) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(stringValue)) {
    return stringValue.slice(0, 16);
  }

  const match = stringValue.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
  if (match) {
    const [, day, month, year, hour, minute] = match;
    return `${year}-${month}-${day}T${hour}:${minute}`;
  }

  const date = parseDateValue(stringValue);
  if (!date) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function enterTripEditMode() {
  if (!state.activeTripRow) {
    return;
  }
  state.isEditingTrip = true;
  const tripValue = state.activeTripRow.trip || 'Trip';
  dom.tripModalTitle.textContent = `Editar trip ${tripValue}`;
  dom.tripModalBody.innerHTML = buildTripEditForm(state.activeTripRow);
  dom.tripEditButton.hidden = true;
}

function exitTripEditMode() {
  if (!state.activeTripRow) {
    return;
  }
  state.isEditingTrip = false;
  const tripValue = state.activeTripRow.trip || 'Trip';
  dom.tripModalTitle.textContent = `Detalle de trip ${tripValue}`;
  dom.tripModalBody.innerHTML = buildTripDetails(state.activeTripRow);
  dom.tripEditButton.hidden = false;
}

function getTripEditFormData() {
  const record = {};
  dom.tripModalBody.querySelectorAll('[data-field]').forEach((input) => {
    const key = input.dataset.field;
    const value = input.value.trim();
    if (key) {
      record[key] = value;
    }
  });
  return record;
}

function setTripEditError(message) {
  const errorElement = dom.tripModalBody.querySelector('.trip-edit-error');
  if (!errorElement) {
    return;
  }
  errorElement.textContent = message;
  errorElement.hidden = !message;
}

function setTripEditSubmitting(isSubmitting) {
  const saveButton = dom.tripModalBody.querySelector('.trip-edit-save');
  const cancelButton = dom.tripModalBody.querySelector('.trip-edit-cancel');
  if (saveButton) {
    saveButton.disabled = isSubmitting;
  }
  if (cancelButton) {
    cancelButton.disabled = isSubmitting;
  }
}

async function handleTripEditSubmit(event) {
  event.preventDefault();
  if (!state.activeTripRow) {
    return;
  }

  if (!CONFIG || !CONFIG.API_URL || CONFIG.API_URL.includes('PEGAR_AQUI')) {
    setTripEditError('Configura CONFIG.API_URL en config.js para guardar cambios.');
    return;
  }

  const record = getTripEditFormData();
  record.trip = state.activeTripRow.trip || record.trip;

  setTripEditError('');
  setTripEditSubmitting(true);

  try {
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: new URLSearchParams({
        action: 'update',
        record: JSON.stringify(record)
      })
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (payload?.success === false) {
      throw new Error(payload.error || 'El backend respondió con un error.');
    }

    const normalizedRecord = normalizeObjectRow(record);
    Object.assign(state.activeTripRow, normalizedRecord);
    updateStatusOptions();
    applyFilters();
    exitTripEditMode();
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? `No se pudo actualizar el registro. (${error.message}).`
        : 'No se pudo actualizar el registro.';
    setTripEditError(message);
  } finally {
    setTripEditSubmitting(false);
  }
}

function buildAddRecordForm() {
  return `
    <form class="add-record-form">
      <p class="form-hint">
        Completa todos los campos que apliquen. <span class="required-marker">*</span> Trip es obligatorio.
      </p>
      <div class="form-grid">
        ${ADD_RECORD_FIELDS.map((field, index) => buildAddRecordField(field, index)).join('')}
      </div>
      <p class="add-record-error" role="alert" aria-live="polite"></p>
      <div class="form-actions">
        <button type="button" class="secondary-button add-record-cancel">Cancelar</button>
        <button type="submit" class="primary-button add-record-save">Guardar</button>
      </div>
    </form>
  `;
}

function buildAddRecordField(field, index) {
  const id = `add-record-field-${index}`;
  const required = field.required ? 'required' : '';
  const requiredMark = field.required ? '<span class="required-marker">*</span>' : '';
  const inputType = field.type || 'text';

  if (inputType === 'textarea') {
    return `
      <div class="form-field form-field-full">
        <label for="${id}">${field.label} ${requiredMark}</label>
        <textarea id="${id}" data-field="${field.key}" rows="3" ${required}></textarea>
      </div>
    `;
  }

  return `
    <div class="form-field">
      <label for="${id}">${field.label} ${requiredMark}</label>
      <input id="${id}" type="${inputType}" data-field="${field.key}" ${required} />
    </div>
  `;
}

function getAddRecordFormData() {
  const record = {};
  dom.addRecordForm.querySelectorAll('[data-field]').forEach((input) => {
    const key = input.dataset.field;
    const value = input.value.trim();
    if (key) {
      record[key] = value;
    }
  });
  return record;
}

function setAddRecordError(message) {
  if (!dom.addRecordError) {
    return;
  }
  dom.addRecordError.textContent = message;
  dom.addRecordError.hidden = !message;
}

function setAddRecordSubmitting(isSubmitting) {
  if (dom.addRecordSave) {
    dom.addRecordSave.disabled = isSubmitting;
  }
  if (dom.addRecordCancel) {
    dom.addRecordCancel.disabled = isSubmitting;
  }
}

async function handleAddRecordSubmit(event) {
  event.preventDefault();
  if (!CONFIG || !CONFIG.API_URL || CONFIG.API_URL.includes('PEGAR_AQUI')) {
    setAddRecordError('Configura CONFIG.API_URL en config.js para guardar registros.');
    return;
  }

  const record = getAddRecordFormData();
  if (!record.trip) {
    setAddRecordError('Trip es obligatorio.');
    return;
  }

  setAddRecordError('');
  setAddRecordSubmitting(true);

  try {
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      body: new URLSearchParams({
        action: 'create',
        record: JSON.stringify(record)
      })
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (payload?.success === false) {
      throw new Error(payload.error || 'El backend respondió con un error.');
    }

    const normalizedRecord = normalizeObjectRow(record);
    state.data = [normalizedRecord, ...state.data];
    updateStatusOptions();
    applyFilters();
    closeAddRecordModal();
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? `No se pudo guardar el registro. (${error.message}).`
        : 'No se pudo guardar el registro.';
    setAddRecordError(message);
  } finally {
    setAddRecordSubmitting(false);
  }
}

function setView(view) {
  if (state.view === view) {
    return;
  }

  state.view = view;
  updateMenuActiveState();
  setMenuOpen(false);
  applyFilters();
}

function updateMenuActiveState() {
  if (!dom.menuButtons) {
    return;
  }

  dom.menuButtons.forEach((button) => {
    const isActive = button.dataset.view === state.view;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive.toString());
  });
}

function updateStatusOptions() {
  const statusMap = new Map();
  state.data.forEach((row) => {
    const rawStatus = row.estado ? row.estado.toString().trim() : '';
    if (!rawStatus) {
      return;
    }
    const key = rawStatus.toLowerCase();
    if (!statusMap.has(key)) {
      statusMap.set(key, rawStatus);
    }
  });

  const options = [{ key: 'all', label: 'All' }];
  BASE_STATUS_FILTERS.filter((key) => key !== 'all').forEach((key) => {
    const label = statusMap.get(key) || formatStatusLabel(key);
    options.push({ key, label });
  });

  const extraOptions = Array.from(statusMap.entries())
    .filter(([key]) => !BASE_STATUS_FILTERS.includes(key))
    .sort((a, b) => a[1].localeCompare(b[1], 'es', { sensitivity: 'base' }))
    .map(([key, label]) => ({ key, label }));

  state.statusOptions = [...options, ...extraOptions];

  const availableKeys = new Set(state.statusOptions.map((option) => option.key));
  if (!availableKeys.has(state.statusFilter)) {
    state.statusFilter = 'all';
  }
}

function renderStatusFilters(data) {
  if (!dom.filterContainer) {
    return;
  }
  dom.filterContainer.innerHTML = state.statusOptions
    .map((option) => {
      const count = option.key === 'all' ? data.length : countStatus(data, option.key);
      const isActive = option.key === state.statusFilter;
      return `
        <button
          type="button"
          class="filter-chip ${isActive ? 'is-active' : ''}"
          data-status="${option.key}"
          aria-pressed="${isActive}"
        >
          ${option.label}
          <span class="chip-count">${count}</span>
        </button>
      `;
    })
    .join('');
}

function countStatus(data, statusKey) {
  return data.reduce((accumulator, row) => {
    if (matchesStatusFilter(row, statusKey)) {
      return accumulator + 1;
    }
    return accumulator;
  }, 0);
}

function setStatusFilter(statusKey) {
  if (state.statusFilter === statusKey) {
    return;
  }
  state.statusFilter = statusKey;
  applyFilters();
}

function matchesStatusFilter(row, statusKey) {
  const statusValue = getRowStatusValue(row);
  if (!statusValue) {
    return false;
  }
  if (BASE_STATUS_FILTERS.includes(statusKey)) {
    return statusValue.includes(statusKey);
  }
  return statusValue === statusKey;
}

function getRowStatusValue(row) {
  return row.estado ? row.estado.toString().trim().toLowerCase() : '';
}

function formatStatusLabel(statusKey) {
  const labelMap = {
    delivered: 'Delivered',
    drop: 'Drop',
    cancelled: 'Cancelled'
  };
  if (labelMap[statusKey]) {
    return labelMap[statusKey];
  }
  return statusKey
    .split(/[-\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function debounce(callback, delay) {
  let timeoutId = null;
  return (...args) => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, delay);
  };
}

function getMexicoDateParts(date) {
  const formatter = new Intl.DateTimeFormat('es-MX', {
    timeZone: MEXICO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(date).reduce((accumulator, part) => {
    accumulator[part.type] = part.value;
    return accumulator;
  }, {});

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day)
  };
}

function compareMexicoDates(dateA, dateB) {
  const partsA = getMexicoDateParts(dateA);
  const partsB = getMexicoDateParts(dateB);

  if (partsA.year !== partsB.year) {
    return partsA.year - partsB.year;
  }

  if (partsA.month !== partsB.month) {
    return partsA.month - partsB.month;
  }

  return partsA.day - partsB.day;
}

function shouldIncludeInDailyLoads(row, today) {
  if (!row.citaCargaDate) {
    return false;
  }

  const comparison = compareMexicoDates(row.citaCargaDate, today);
  if (comparison === 0) {
    return true;
  }

  if (comparison < 0) {
    const status = row.estado ? row.estado.toString().trim().toLowerCase() : '';
    return ALLOWED_OVERDUE_STATUSES.has(status);
  }

  return false;
}

function shouldIncludeInTodayDeliveries(row, today) {
  if (!row.citaEntregaDate) {
    return false;
  }

  const comparison = compareMexicoDates(row.citaEntregaDate, today);
  if (comparison > 0) {
    return false;
  }

  const status = row.estado ? row.estado.toString().trim().toLowerCase() : '';
  return status !== 'delivered' && status !== 'cancelled';
}

function getMexicoWeekRange(date) {
  const { year, month, day } = getMexicoDateParts(date);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = utcDate.getUTCDay();
  const startDate = new Date(Date.UTC(year, month - 1, day - dayOfWeek, 12));
  const endDate = new Date(Date.UTC(year, month - 1, day - dayOfWeek + 6, 12));
  return { startDate, endDate };
}

function shouldIncludeInWeeklyProgram(row, weekRange) {
  if (!row.citaCargaDate) {
    return false;
  }

  const startsAfterOrSame =
    compareMexicoDates(row.citaCargaDate, weekRange.startDate) >= 0;
  const endsBeforeOrSame = compareMexicoDates(row.citaCargaDate, weekRange.endDate) <= 0;
  return startsAfterOrSame && endsBeforeOrSame;
}

// Filtra la data en memoria usando un query simple.
function applyFilters() {
  const today = new Date();
  let baseData = state.data;
  if (state.view === DAILY_VIEW) {
    baseData = state.data.filter((row) => shouldIncludeInDailyLoads(row, today));
  } else if (state.view === TODAY_DELIVERIES_VIEW) {
    baseData = state.data.filter((row) => shouldIncludeInTodayDeliveries(row, today));
  } else if (state.view === WEEKLY_PROGRAM_VIEW) {
    const weekRange = getMexicoWeekRange(today);
    baseData = state.data.filter((row) => shouldIncludeInWeeklyProgram(row, weekRange));
  }

  renderStatusFilters(baseData);

  let filteredData = baseData;
  if (state.statusFilter !== 'all') {
    filteredData = filteredData.filter((row) =>
      matchesStatusFilter(row, state.statusFilter)
    );
  }

  if (state.query) {
    const normalizedQuery = state.query.toLowerCase();
    filteredData = filteredData.filter((row) => {
      return [
        row.referencia,
        row.cliente,
        row.destino,
        row.estado,
        row.ejecutivo,
        row.trip,
        row.caja,
        row.segmento,
        row['tr-mx'],
        row['tr-usa'],
        row.tracking,
        row.docs,
        row.comentarios
      ]
        .filter(Boolean)
        .some((value) => value.toString().toLowerCase().includes(normalizedQuery));
    });
  }

  state.filtered = [...filteredData];
  state.filtered.sort((a, b) => {
    const dateA = a.citaCargaDate;
    const dateB = b.citaCargaDate;
    if (!dateA && !dateB) {
      return 0;
    }
    if (!dateA) {
      return 1;
    }
    if (!dateB) {
      return -1;
    }
    return dateA - dateB;
  });
  renderTable(state.filtered);
  renderCards(state.filtered);
  updateEmptyState(state.filtered);
}

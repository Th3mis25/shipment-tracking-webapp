// Lógica principal de la app
// Este archivo define la estructura base para cargar datos,
// pintarlos en la tabla y aplicar filtros sin editar/guardar.

/* global CONFIG */

const ALL_VIEW = 'all';
const DAILY_VIEW = 'daily';
const TODAY_DELIVERIES_VIEW = 'today-deliveries';
const WEEKLY_PROGRAM_VIEW = 'weekly-program';
const KPI_VIEW = 'kpis';
const CONTROL_TOWER_VIEW = 'control-tower';
const USA_DOMESTIC_VIEW = 'usa-domestic';
const DEFAULT_VIEW = DAILY_VIEW;
const DEFAULT_EMPTY_MESSAGE = 'No hay resultados para mostrar.';
const THEME_STORAGE_KEY = 'theme';
const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';
const BASE_STATUS_FILTERS = ['all', 'delivered', 'drop', 'cancelled'];
const CONTROL_TOWER_MISSING_EVENT_HOURS = 12;
const CONTROL_TOWER_RISK_WINDOW_HOURS = 4;
const CONTROL_TOWER_RANGE_DAYS = 15;
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
const ALL_TABLE_COLUMNS = [
  { key: 'cliente', label: 'Cliente' },
  { key: 'estado', label: 'Estado' },
  { key: 'trip', label: 'Trip' },
  { key: 'caja', label: 'Caja' },
  { key: 'tr-mx', label: 'TR-MX' },
  { key: 'tr-usa', label: 'TR-USA' },
  { key: 'actions', label: 'Acciones' }
];
const KPI_DEFINITIONS = {
  otd: {
    label: 'OTD',
    citaKey: 'cita entrega',
    llegadaKey: 'llegada entrega',
    citaDateKey: 'citaEntregaDate'
  },
  otp: {
    label: 'OTP',
    citaKey: 'cita carga',
    llegadaKey: 'llegada carga',
    citaDateKey: 'citaCargaDate'
  }
};
// Clientes excluidos del cálculo OTP (no se consideran en numerador ni denominador).
const OTP_EXCLUDED_CLIENTS = new Set(['kone', 'prebeo']);
const CONTROL_TOWER_ALERT_TYPES = {
  risk: { label: 'Riesgo', priority: 1, tone: 'warning' },
  delay: { label: 'Retraso confirmado', priority: 2, tone: 'danger' },
  missing: { label: 'Falta de evento', priority: 3, tone: 'info' }
};
const DAILY_TABLE_COLUMNS = [
  { key: 'cliente', label: 'Cliente' },
  { key: 'estado', label: 'Estado' },
  { key: 'trip', label: 'Trip' },
  { key: 'caja', label: 'Caja' },
  { key: 'tr-mx', label: 'TR-MX' },
  { key: 'cita carga', label: 'Cita carga' },
  { key: 'actions', label: 'Acciones' }
];
// Vista USA Domestic: viajes activos de Kone/Prebeo con tabla simplificada.
const USA_DOMESTIC_TABLE_COLUMNS = [
  { key: 'cliente', label: 'Cliente' },
  { key: 'estado', label: 'Estado' },
  { key: 'trip', label: 'Trip' },
  { key: 'caja', label: 'Caja' },
  { key: 'tr-usa', label: 'TR-USA' },
  { key: 'cita entrega', label: 'Cita entrega' }
];
const USA_DOMESTIC_CLIENTS = new Set(['kone', 'prebeo']);
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
  clientFilter: 'all',
  clientOptions: [],
  dateStartFilter: null,
  dateEndFilter: null,
  view: DEFAULT_VIEW,
  kpiType: 'otd',
  kpiStartDate: null,
  kpiEndDate: null,
  error: null,
  activeTripRow: null,
  isEditingTrip: false,
  controlTowerAlerts: [],
  controlTowerActiveRows: []
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
  filterControls: null,
  searchGroup: null,
  trackingContent: null,
  kpiContent: null,
  kpiTypeSelect: null,
  kpiStartInput: null,
  kpiEndInput: null,
  dateStartInput: null,
  dateEndInput: null,
  clientSelect: null,
  kpiGeneralValue: null,
  kpiActiveLabel: null,
  kpiTableBody: null,
  kpiEmptyState: null,
  controlTowerContent: null,
  controlTowerAlerts: null,
  controlTowerEmpty: null,
  controlTowerActiveCard: null,
  controlTowerActiveModal: null,
  controlTowerActiveList: null,
  controlTowerActiveEmpty: null,
  controlTowerActiveTitle: null,
  controlTowerActiveSubtitle: null,
  controlTowerValues: {},
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

initTheme();

// Punto de entrada de la app.
document.addEventListener('DOMContentLoaded', () => {
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
                  <button type="button" class="side-menu-button" data-view="${USA_DOMESTIC_VIEW}">
                    USA Domestic
                  </button>
                  <button type="button" class="side-menu-button" data-view="${KPI_VIEW}">
                    KPIs
                  </button>
                  <button type="button" class="side-menu-button" data-view="${CONTROL_TOWER_VIEW}">
                    Control Tower
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
          <!-- Filtros adicionales para la vista "Todas" -->
          <div class="toolbar-filters" data-filter-group="all">
            <div class="filter-block" data-filter="date">
              <button
                type="button"
                class="filter-toggle"
                data-filter-toggle="date"
                aria-expanded="false"
                aria-controls="filter-date-panel"
              >
                <span class="filter-toggle-icon" aria-hidden="true">📅</span>
                <span class="filter-toggle-text">Rango de fechas</span>
              </button>
              <div class="filter-panel filter-panel-date" id="filter-date-panel" data-filter-panel="date">
                <div class="filter-field">
                  <label for="filter-date-start">Fecha inicio</label>
                  <input id="filter-date-start" type="date" />
                </div>
                <div class="filter-field">
                  <label for="filter-date-end">Fecha fin</label>
                  <input id="filter-date-end" type="date" />
                </div>
              </div>
            </div>
            <div class="filter-block" data-filter="client">
              <button
                type="button"
                class="filter-toggle"
                data-filter-toggle="client"
                aria-expanded="false"
                aria-controls="filter-client-panel"
              >
                <span class="filter-toggle-icon" aria-hidden="true">🏢</span>
                <span class="filter-toggle-text">Cliente</span>
              </button>
              <div class="filter-panel filter-panel-client" id="filter-client-panel" data-filter-panel="client">
                <div class="filter-field">
                  <label for="filter-client">Cliente</label>
                  <select id="filter-client">
                    <option value="all">Todos los clientes</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div class="filter-chips" role="list"></div>
        </div>
        <div class="tracking-content">
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
        </div>
        <div class="kpi-content" hidden>
          <header class="kpi-header">
            <div>
              <h2 class="kpi-title">KPIs operativos</h2>
              <p class="kpi-subtitle">
                Resultados para <strong id="kpi-active-label">OTD</strong>
              </p>
            </div>
          </header>
          <div class="kpi-filters">
            <div class="form-field">
              <label for="kpi-type">Tipo de KPI</label>
              <select id="kpi-type">
                <option value="otd" selected>OTD</option>
                <option value="otp">OTP</option>
              </select>
            </div>
            <div class="form-field">
              <label for="kpi-start">Fecha inicio</label>
              <input id="kpi-start" type="date" />
            </div>
            <div class="form-field">
              <label for="kpi-end">Fecha fin</label>
              <input id="kpi-end" type="date" />
            </div>
          </div>
          <div class="kpi-summary">
            <article class="kpi-card">
              <p class="kpi-card-title">KPI general</p>
              <p class="kpi-card-value" id="kpi-general">0%</p>
            </article>
          </div>
          <div class="table-wrapper kpi-table-wrapper">
            <div class="table-scroll" role="region" aria-label="Tabla KPI por cliente">
              <table class="tracking-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Total evaluados</th>
                    <th>Cumple</th>
                    <th>% de cumplimiento</th>
                  </tr>
                </thead>
                <tbody id="kpi-table-body"></tbody>
              </table>
            </div>
          </div>
          <p class="kpi-empty-state" hidden>No hay registros para el rango seleccionado.</p>
        </div>
        <div class="control-tower-content" hidden>
          <header class="control-tower-header">
            <div>
              <h2 class="control-tower-title">Control Tower</h2>
              <p class="control-tower-subtitle">
                Panel central para monitorear alertas y estado global.
              </p>
            </div>
          </header>
          <section class="control-tower-section">
            <div class="control-tower-section-header">
              <h3>Estado global</h3>
              <p>Indicadores rápidos con el rango actual de datos.</p>
            </div>
            <div class="control-tower-summary">
              <article
                class="control-tower-card control-tower-card--interactive control-tower-card--secondary"
                data-control-action="active-shipments"
                role="button"
                tabindex="0"
                aria-label="Ver detalle de envíos activos"
              >
                <p class="control-tower-card-title">Total de envíos activos</p>
                <p class="control-tower-card-value" data-control-value="active-shipments">0</p>
                <p class="control-tower-card-hint">Ver detalle</p>
              </article>
              <article
                class="control-tower-card control-tower-card--interactive"
                data-control-action="otd-global"
                role="button"
                tabindex="0"
                aria-label="Ver detalle de OTD global"
              >
                <p class="control-tower-card-title" data-control-title="otd-global">% OTD global</p>
                <p class="control-tower-card-value" data-control-value="otd-global">0%</p>
              </article>
              <article
                class="control-tower-card control-tower-card--interactive"
                data-control-action="otp-global"
                role="button"
                tabindex="0"
                aria-label="Ver detalle de OTP global"
              >
                <p class="control-tower-card-title" data-control-title="otp-global">% OTP global</p>
                <p class="control-tower-card-value" data-control-value="otp-global">0%</p>
              </article>
              <article
                class="control-tower-card control-tower-card--priority control-tower-card--interactive"
                data-control-action="alert-shipments"
                role="button"
                tabindex="0"
                aria-label="Ver detalle de envíos con alerta"
              >
                <p class="control-tower-card-title">Total de envíos con alerta</p>
                <p class="control-tower-card-value" data-control-value="alert-shipments">0</p>
              </article>
            </div>
          </section>
          <section class="control-tower-section">
            <div class="control-tower-section-header">
              <h3>Alertas críticas</h3>
              <p>Prioridad: riesgo, retraso confirmado y falta de evento.</p>
            </div>
            <div class="control-tower-alerts" role="list"></div>
            <p class="control-tower-empty" hidden>No hay alertas críticas en este momento.</p>
          </section>
        </div>
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
    <div class="modal-backdrop control-tower-active-modal" hidden>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="control-tower-detail-title">
        <header class="modal-header">
          <div>
            <h2 id="control-tower-detail-title">Envíos activos</h2>
            <p class="control-tower-active-subtitle">
              Auditoría rápida de los registros activos en el rango actual.
            </p>
          </div>
          <button type="button" class="modal-close" aria-label="Cerrar">×</button>
        </header>
        <div class="modal-body">
          <div class="control-tower-active-list" role="list"></div>
          <p class="control-tower-active-empty" hidden>No hay envíos activos</p>
        </div>
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
  dom.searchGroup = dom.app.querySelector('.search-group');
  dom.tableBody = dom.app.querySelector('tbody');
  dom.tableHead = dom.app.querySelector('.tracking-table thead');
  dom.tableWrapper = dom.app.querySelector('.table-wrapper');
  dom.cardList = dom.app.querySelector('.card-list');
  dom.filterContainer = dom.app.querySelector('.filter-chips');
  dom.filterControls = dom.app.querySelector('.toolbar-filters');
  dom.trackingContent = dom.app.querySelector('.tracking-content');
  dom.kpiContent = dom.app.querySelector('.kpi-content');
  dom.kpiTypeSelect = dom.app.querySelector('#kpi-type');
  dom.kpiStartInput = dom.app.querySelector('#kpi-start');
  dom.kpiEndInput = dom.app.querySelector('#kpi-end');
  dom.dateStartInput = dom.app.querySelector('#filter-date-start');
  dom.dateEndInput = dom.app.querySelector('#filter-date-end');
  dom.clientSelect = dom.app.querySelector('#filter-client');
  dom.kpiGeneralValue = dom.app.querySelector('#kpi-general');
  dom.kpiActiveLabel = dom.app.querySelector('#kpi-active-label');
  dom.kpiTableBody = dom.app.querySelector('#kpi-table-body');
  dom.kpiEmptyState = dom.app.querySelector('.kpi-empty-state');
  dom.controlTowerContent = dom.app.querySelector('.control-tower-content');
  dom.controlTowerAlerts = dom.app.querySelector('.control-tower-alerts');
  dom.controlTowerEmpty = dom.app.querySelector('.control-tower-empty');
  dom.controlTowerActiveCard = dom.app.querySelector('[data-control-action="active-shipments"]');
  dom.controlTowerActiveModal = dom.app.querySelector('.control-tower-active-modal');
  dom.controlTowerActiveList = dom.app.querySelector('.control-tower-active-list');
  dom.controlTowerActiveEmpty = dom.app.querySelector('.control-tower-active-empty');
  dom.controlTowerActiveTitle = dom.app.querySelector('#control-tower-detail-title');
  dom.controlTowerActiveSubtitle = dom.app.querySelector('.control-tower-active-subtitle');
  dom.controlTowerValues = {
    activeShipments: dom.app.querySelector('[data-control-value="active-shipments"]'),
    otdGlobal: dom.app.querySelector('[data-control-value="otd-global"]'),
    otpGlobal: dom.app.querySelector('[data-control-value="otp-global"]'),
    alertShipments: dom.app.querySelector('[data-control-value="alert-shipments"]')
  };
  dom.controlTowerTitles = {
    otdGlobal: dom.app.querySelector('[data-control-title="otd-global"]'),
    otpGlobal: dom.app.querySelector('[data-control-title="otp-global"]')
  };
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
  updateViewLayout();
  updateStatusOptions();
  renderStatusFilters([]);
  updateClientOptions();
}

// Enlaza eventos de interacción básicos.
function bindEvents() {
  const debouncedSearch = debounce((value) => {
    state.query = value.trim();
    applyFilters();
  }, 250);

  if (dom.themeToggle) {
    dom.themeToggle.addEventListener('click', () => {
      toggleTheme();
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

  if (dom.kpiTypeSelect) {
    dom.kpiTypeSelect.addEventListener('change', (event) => {
      state.kpiType = event.target.value || 'otd';
      renderKpiView();
    });
  }

  if (dom.kpiStartInput) {
    dom.kpiStartInput.addEventListener('change', (event) => {
      state.kpiStartDate = parseDateInputValue(event.target.value);
      renderKpiView();
    });
  }

  if (dom.kpiEndInput) {
    dom.kpiEndInput.addEventListener('change', (event) => {
      state.kpiEndDate = parseDateInputValue(event.target.value);
      renderKpiView();
    });
  }

  if (dom.dateStartInput) {
    dom.dateStartInput.addEventListener('change', (event) => {
      state.dateStartFilter = parseDateInputValue(event.target.value);
      applyFilters();
    });
  }

  if (dom.dateEndInput) {
    dom.dateEndInput.addEventListener('change', (event) => {
      state.dateEndFilter = parseDateInputValue(event.target.value);
      applyFilters();
    });
  }

  if (dom.clientSelect) {
    dom.clientSelect.addEventListener('change', (event) => {
      state.clientFilter = event.target.value || 'all';
      applyFilters();
    });
  }

  if (dom.filterControls) {
    dom.filterControls.addEventListener('click', (event) => {
      const toggle = event.target.closest('.filter-toggle');
      if (!toggle) {
        return;
      }
      const block = toggle.closest('.filter-block');
      if (!block) {
        return;
      }
      const isOpen = block.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

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

  if (dom.controlTowerAlerts) {
    dom.controlTowerAlerts.addEventListener('click', (event) => {
      const groupToggle = event.target.closest('.control-tower-alert-group-header');
      if (groupToggle) {
        const group = groupToggle.closest('.control-tower-alert-group');
        if (!group) {
          return;
        }
        const isExpanded = !group.classList.contains('is-expanded');
        setControlTowerAlertGroupState(group, isExpanded);
        return;
      }
      const alertCard = event.target.closest('[data-alert-index]');
      if (!alertCard) {
        return;
      }
      const alertIndex = Number(alertCard.dataset.alertIndex);
      const alert = state.controlTowerAlerts[alertIndex];
      if (alert && alert.row) {
        openTripModal(alert.row);
      }
    });

    dom.controlTowerAlerts.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      const alertCard = event.target.closest('[data-alert-index]');
      if (!alertCard) {
        return;
      }
      event.preventDefault();
      const alertIndex = Number(alertCard.dataset.alertIndex);
      const alert = state.controlTowerAlerts[alertIndex];
      if (alert && alert.row) {
        openTripModal(alert.row);
      }
    });
  }

  if (dom.controlTowerContent) {
    const summaryCards = dom.controlTowerContent.querySelectorAll('[data-control-action]');
    summaryCards.forEach((card) => {
      card.addEventListener('click', () => {
        handleControlTowerSummaryAction(card.dataset.controlAction);
      });
      card.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }
        event.preventDefault();
        handleControlTowerSummaryAction(card.dataset.controlAction);
      });
    });
  }

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

  if (dom.controlTowerActiveModal) {
    dom.controlTowerActiveModal.addEventListener('click', (event) => {
      if (event.target === dom.controlTowerActiveModal || event.target.closest('.modal-close')) {
        closeControlTowerActiveModal();
      }
    });
  }

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

    if (dom.controlTowerActiveModal && !dom.controlTowerActiveModal.hidden) {
      closeControlTowerActiveModal();
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
  applyTheme(getPreferredTheme());
}

function getStoredTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === THEME_DARK || stored === THEME_LIGHT) {
    return stored;
  }
  return null;
}

function getSystemTheme() {
  if (!window.matchMedia) {
    return null;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? THEME_DARK
    : THEME_LIGHT;
}

function getPreferredTheme() {
  return getStoredTheme() || getSystemTheme() || THEME_DARK;
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || THEME_DARK;
  const nextTheme = currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
  applyTheme(nextTheme);
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
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
    updateClientOptions();
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
    : state.view === ALL_VIEW
      ? ALL_TABLE_COLUMNS
      : state.view === USA_DOMESTIC_VIEW
        ? USA_DOMESTIC_TABLE_COLUMNS
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
  // Estados específicos con estilo diferenciado por requerimiento operativo.
  if (normalized === 'nuevo laredo yard') {
    return 'nuevo-laredo-yard';
  }
  if (normalized.includes('loading')) {
    return 'loading';
  }
  if (normalized === 'at destination') {
    return 'at-destination';
  }
  if (normalized.includes('drop')) {
    return 'drop';
  }
  if (normalized.includes('retraso confirmado')) {
    return 'retraso-confirmado';
  }
  if (normalized.includes('riesgo')) {
    return 'riesgo';
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

  const isUsaView = state.view === USA_DOMESTIC_VIEW;
  dom.cardList.innerHTML = data
    .map((row, index) => {
      const trMx = row['tr-mx'];
      const trUsa = row['tr-usa'];
      const citaCarga = row['cita carga'];
      const citaEntrega = row['cita entrega'];
      const cardTitle = isUsaView
        ? row.trip
          ? `Trip ${row.trip}`
          : 'Trip no asignado'
        : row.cliente || 'Cliente sin nombre';
      const cardSubtitle = isUsaView
        ? row.cliente || 'Cliente sin nombre'
        : row.trip
          ? `Trip ${row.trip}`
          : 'Trip no asignado';
      const detailMarkup = isUsaView
        ? `
            <div class="card-meta card-meta-client"><strong>Cliente:</strong> ${row.cliente || '-'}</div>
            <div class="card-meta card-meta-box"><strong>Caja:</strong> ${row.caja || '-'}</div>
            ${trUsa ? `<div class="card-meta card-meta-tr"><strong>TR-USA:</strong> ${trUsa}</div>` : ''}
            ${citaEntrega ? `<div class="card-meta card-meta-cita"><strong>Cita entrega:</strong> ${citaEntrega}</div>` : ''}
          `
        : `
            <div class="card-meta card-meta-box"><strong>Caja:</strong> ${row.caja || '-'}</div>
            <div class="card-meta card-meta-trip"><strong>Trip:</strong> ${row.trip || '-'}</div>
            ${trMx ? `<div class="card-meta card-meta-tr"><strong>TR-MX:</strong> ${trMx}</div>` : ''}
            ${trUsa ? `<div class="card-meta card-meta-tr"><strong>TR-USA:</strong> ${trUsa}</div>` : ''}
            ${citaCarga ? `<div class="card-meta card-meta-cita"><strong>Cita carga:</strong> ${citaCarga}</div>` : ''}
          `;
      return `
        <article class="card" role="listitem">
          <header class="card-header">
            <div class="card-title-group">
              <p class="card-title">${cardTitle}</p>
              <p>${cardSubtitle}</p>
            </div>
            <div class="card-header-actions">
              ${renderStatusChip(row.estado)}
              <button type="button" class="primary-button card-view-button" data-row-index="${index}" aria-label="Ver detalle">
                Ver
              </button>
            </div>
          </header>
          <div class="card-details">
            ${detailMarkup}
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

// Modal de auditoría para envíos activos en Control Tower.
function openControlTowerActiveModal() {
  const activeRows = state.controlTowerActiveRows.length
    ? state.controlTowerActiveRows
    : getControlTowerActiveRows();
  openControlTowerDetailModal({
    title: 'Envíos activos',
    subtitle: 'Auditoría rápida de los registros activos en el rango actual.',
    emptyMessage: 'No hay envíos activos',
    rows: activeRows
  });
}

function openControlTowerDetailModal({ title, subtitle, emptyMessage, rows }) {
  if (!dom.controlTowerActiveModal) {
    return;
  }
  if (dom.controlTowerActiveTitle) {
    dom.controlTowerActiveTitle.textContent = title;
  }
  if (dom.controlTowerActiveSubtitle) {
    dom.controlTowerActiveSubtitle.textContent = subtitle;
  }
  if (dom.controlTowerActiveEmpty) {
    dom.controlTowerActiveEmpty.textContent = emptyMessage;
  }
  renderControlTowerActiveList(rows);
  dom.controlTowerActiveModal.hidden = false;
}

function openControlTowerKpiModal(kpiKey) {
  const definition = getKpiDefinition(kpiKey);
  const rollingRange = getMexicoRollingRange(CONTROL_TOWER_RANGE_DAYS);
  const rows = getControlTowerKpiRows(definition, rollingRange.startDate, rollingRange.endDate);
  const label = definition.label;
  openControlTowerDetailModal({
    title: `Detalle KPI ${label}`,
    subtitle: `Registros considerados para ${label} en el rango actual.`,
    emptyMessage: 'No hay registros en el rango actual',
    rows
  });
}

function openControlTowerAlertsModal() {
  const alerts = state.controlTowerAlerts.length
    ? state.controlTowerAlerts
    : buildControlTowerAlerts(getControlTowerActiveRows());
  const rows = getControlTowerAlertRows(alerts);
  openControlTowerDetailModal({
    title: 'Envíos con alerta',
    subtitle: 'Listado de registros que activan alertas críticas en el rango actual.',
    emptyMessage: 'No hay envíos con alerta',
    rows
  });
}

function handleControlTowerSummaryAction(action) {
  if (!action) {
    return;
  }
  if (action === 'active-shipments') {
    openControlTowerActiveModal();
    return;
  }
  if (action === 'otd-global') {
    openControlTowerKpiModal('otd');
    return;
  }
  if (action === 'otp-global') {
    openControlTowerKpiModal('otp');
    return;
  }
  if (action === 'alert-shipments') {
    openControlTowerAlertsModal();
  }
}

function closeControlTowerActiveModal() {
  if (!dom.controlTowerActiveModal || !dom.controlTowerActiveList) {
    return;
  }

  dom.controlTowerActiveModal.hidden = true;
  dom.controlTowerActiveList.innerHTML = '';
  if (dom.controlTowerActiveEmpty) {
    dom.controlTowerActiveEmpty.hidden = true;
  }
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
    updateClientOptions();
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
    updateClientOptions();
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
  resetFiltersForViewChange();
  updateMenuActiveState();
  setMenuOpen(false);
  updateViewLayout();
  applyFilters();
}

function updateViewLayout() {
  const isKpiView = state.view === KPI_VIEW;
  const isControlTowerView = state.view === CONTROL_TOWER_VIEW;
  if (dom.trackingContent) {
    dom.trackingContent.hidden = isKpiView || isControlTowerView;
  }
  if (dom.kpiContent) {
    dom.kpiContent.hidden = !isKpiView;
  }
  if (dom.controlTowerContent) {
    dom.controlTowerContent.hidden = !isControlTowerView;
  }
  if (dom.filterContainer) {
    dom.filterContainer.hidden = isKpiView || isControlTowerView;
  }
  if (dom.filterControls) {
    dom.filterControls.hidden = isKpiView || isControlTowerView || state.view !== ALL_VIEW;
  }
  if (dom.searchGroup) {
    dom.searchGroup.hidden = isKpiView || isControlTowerView;
  }
  if (dom.addRecordButton) {
    dom.addRecordButton.hidden = isKpiView || isControlTowerView;
  }
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

// Configura opciones de clientes dinámicas para el filtro de "Todas".
function updateClientOptions() {
  const clientMap = new Map();
  state.data.forEach((row) => {
    const rawClient = row.cliente ? row.cliente.toString().trim() : '';
    if (!rawClient) {
      return;
    }
    const key = rawClient.toLowerCase();
    if (!clientMap.has(key)) {
      clientMap.set(key, rawClient);
    }
  });

  const options = [{ key: 'all', label: 'Todos los clientes' }];
  const extraOptions = Array.from(clientMap.entries())
    .sort((a, b) => a[1].localeCompare(b[1], 'es', { sensitivity: 'base' }))
    .map(([key, label]) => ({ key, label }));

  state.clientOptions = [...options, ...extraOptions];

  const availableKeys = new Set(state.clientOptions.map((option) => option.key));
  if (!availableKeys.has(state.clientFilter)) {
    state.clientFilter = 'all';
  }

  renderClientOptions();
}

function renderClientOptions() {
  if (!dom.clientSelect) {
    return;
  }

  dom.clientSelect.innerHTML = state.clientOptions
    .map((option) => `<option value="${option.key}">${option.label}</option>`)
    .join('');

  dom.clientSelect.value = state.clientFilter;
}

function renderStatusFilters(data) {
  if (!dom.filterContainer) {
    return;
  }
  dom.filterContainer.innerHTML = state.statusOptions
    .map((option) => {
      const count = option.key === 'all' ? data.length : countStatus(data, option.key);
      if (option.key !== 'all' && count === 0) {
        return '';
      }
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

function resetFiltersForViewChange() {
  state.query = '';
  state.statusFilter = 'all';
  state.clientFilter = 'all';
  state.dateStartFilter = null;
  state.dateEndFilter = null;

  if (dom.searchInput) {
    dom.searchInput.value = '';
  }
  if (dom.dateStartInput) {
    dom.dateStartInput.value = '';
  }
  if (dom.dateEndInput) {
    dom.dateEndInput.value = '';
  }
  if (dom.clientSelect) {
    dom.clientSelect.value = 'all';
  }
  if (dom.filterControls) {
    dom.filterControls.querySelectorAll('.filter-block.is-open').forEach((block) => {
      block.classList.remove('is-open');
      const toggle = block.querySelector('.filter-toggle');
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
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

function parseDateInputValue(value) {
  if (!value) {
    return null;
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function parseDateTimeValue(value) {
  if (!value) {
    return null;
  }
  const stringValue = value.toString().trim();
  if (!stringValue) {
    return null;
  }

  const match = stringValue.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
  if (match) {
    const [, day, month, year, hour, minute] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  }

  const parsed = parseDateValue(stringValue);
  return parsed;
}

function getKpiDefinition(type) {
  return KPI_DEFINITIONS[type] || KPI_DEFINITIONS.otd;
}

function normalizeClientName(value) {
  if (!value) {
    return '';
  }
  return value.toString().trim().toLowerCase();
}

function isUsaDomesticClient(row) {
  const clientName = normalizeClientName(row.cliente);
  if (!clientName) {
    return false;
  }
  return USA_DOMESTIC_CLIENTS.has(clientName);
}

function getActiveShipments(rows) {
  return rows.filter((row) => isActiveShipmentForControlTower(row));
}

// Filtro centralizado para la vista USA Domestic (clientes + viajes activos).
function getUsaDomesticRows() {
  return getActiveShipments(state.data).filter((row) => isUsaDomesticClient(row));
}

function isOtpDefinition(definition) {
  return definition === KPI_DEFINITIONS.otp;
}

function shouldExcludeFromOtp(row) {
  const clientName = normalizeClientName(row.cliente);
  if (!clientName) {
    return false;
  }
  return OTP_EXCLUDED_CLIENTS.has(clientName);
}

function isWithinKpiRange(citaDate, startDate, endDate) {
  if (!citaDate) {
    return false;
  }
  if (startDate && compareMexicoDates(citaDate, startDate) < 0) {
    return false;
  }
  if (endDate && compareMexicoDates(citaDate, endDate) > 0) {
    return false;
  }
  return true;
}

function formatPercentage(value) {
  return `${value.toFixed(1)}%`;
}

// KPI: lógica preparada para sumar gráficas en el futuro sin reescribir cálculos.
function renderKpiView() {
  if (!dom.kpiContent) {
    return;
  }

  const definition = getKpiDefinition(state.kpiType);
  const startDate = state.kpiStartDate;
  const endDate = state.kpiEndDate;

  if (dom.kpiActiveLabel) {
    dom.kpiActiveLabel.textContent = definition.label;
  }

  const results = calculateKpiResults(definition, startDate, endDate);
  if (dom.kpiGeneralValue) {
    dom.kpiGeneralValue.textContent = results.total === 0
      ? '0%'
      : formatPercentage(results.complianceRate);
    toggleComplianceHighlight(dom.kpiGeneralValue, results.complianceRate, results.total);
  }

  renderKpiTable(results.byClient);
}

function calculateKpiResults(definition, startDate, endDate) {
  const summary = {
    total: 0,
    compliant: 0,
    complianceRate: 0,
    byClient: []
  };

  const clientMap = new Map();

  state.data.forEach((row) => {
    // Regla de negocio: excluir clientes específicos del cálculo OTP.
    if (isOtpDefinition(definition) && shouldExcludeFromOtp(row)) {
      return;
    }

    const citaDate = row[definition.citaDateKey];
    if (!isWithinKpiRange(citaDate, startDate, endDate)) {
      return;
    }

    const llegadaDate = parseDateTimeValue(row[definition.llegadaKey]);
    const isCompliant = Boolean(citaDate && llegadaDate && llegadaDate <= citaDate);
    summary.total += 1;
    if (isCompliant) {
      summary.compliant += 1;
    }

    const clientLabel = row.cliente ? row.cliente.toString().trim() : '';
    const clientKey = clientLabel || 'Sin cliente';
    const existing = clientMap.get(clientKey) || { total: 0, compliant: 0 };
    existing.total += 1;
    if (isCompliant) {
      existing.compliant += 1;
    }
    clientMap.set(clientKey, existing);
  });

  summary.complianceRate = summary.total
    ? (summary.compliant / summary.total) * 100
    : 0;

  summary.byClient = Array.from(clientMap.entries()).map(([client, values]) => {
    const rate = values.total ? (values.compliant / values.total) * 100 : 0;
    return {
      client,
      total: values.total,
      compliant: values.compliant,
      rate
    };
  });

  return summary;
}

function renderKpiTable(rows) {
  if (!dom.kpiTableBody || !dom.kpiEmptyState) {
    return;
  }

  const sorted = [...rows].sort((a, b) => {
    if (b.rate !== a.rate) {
      return b.rate - a.rate;
    }
    return b.total - a.total;
  });

  dom.kpiTableBody.innerHTML = sorted
    .map((row) => {
      const rateText = row.total === 0 ? '0%' : formatPercentage(row.rate);
      return `
        <tr>
          <td>${row.client}</td>
          <td>${row.total}</td>
          <td>${row.compliant}</td>
          <td>${rateText}</td>
        </tr>
      `;
    })
    .join('');

  dom.kpiEmptyState.hidden = sorted.length > 0;
  if (dom.kpiContent) {
    const tableWrapper = dom.kpiContent.querySelector('.kpi-table-wrapper');
    if (tableWrapper) {
      tableWrapper.hidden = sorted.length === 0;
    }
  }
}

// Control Tower: lógica central para alertas y estado global.
function renderControlTower() {
  if (!dom.controlTowerContent) {
    return;
  }

  const complianceThreshold = 90;
  const rangeLabel = getControlTowerRangeLabel();
  const metrics = calculateControlTowerMetrics();
  state.controlTowerAlerts = metrics.alerts;
  state.controlTowerActiveRows = metrics.activeRows;
  if (dom.controlTowerValues.activeShipments) {
    dom.controlTowerValues.activeShipments.textContent = metrics.activeCount.toString();
  }
  if (dom.controlTowerTitles) {
    if (dom.controlTowerTitles.otdGlobal) {
      dom.controlTowerTitles.otdGlobal.textContent = `% OTD global (${rangeLabel})`;
    }
    if (dom.controlTowerTitles.otpGlobal) {
      dom.controlTowerTitles.otpGlobal.textContent = `% OTP global (${rangeLabel})`;
    }
  }
  if (dom.controlTowerValues.otdGlobal) {
    dom.controlTowerValues.otdGlobal.textContent = metrics.otd.total === 0
      ? '0%'
      : formatPercentage(metrics.otd.complianceRate);
    toggleComplianceHighlight(
      dom.controlTowerValues.otdGlobal,
      metrics.otd.complianceRate,
      metrics.otd.total,
      complianceThreshold
    );
  }
  if (dom.controlTowerValues.otpGlobal) {
    dom.controlTowerValues.otpGlobal.textContent = metrics.otp.total === 0
      ? '0%'
      : formatPercentage(metrics.otp.complianceRate);
    toggleComplianceHighlight(
      dom.controlTowerValues.otpGlobal,
      metrics.otp.complianceRate,
      metrics.otp.total,
      complianceThreshold
    );
  }
  if (dom.controlTowerValues.alertShipments) {
    dom.controlTowerValues.alertShipments.textContent = metrics.alerts.length.toString();
  }

  renderControlTowerAlerts(metrics.alerts);
}

function getControlTowerRangeLabel() {
  const rollingRange = getMexicoRollingRange(CONTROL_TOWER_RANGE_DAYS);
  const totalDays = getInclusiveRangeDays(rollingRange.startDate, rollingRange.endDate);
  const dayLabel = totalDays === 1 ? 'día' : 'días';
  return `últimos ${totalDays} ${dayLabel}`;
}

function getInclusiveRangeDays(startDate, endDate) {
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

function setControlTowerAlertGroupState(group, isExpanded) {
  if (!group) {
    return;
  }
  group.classList.toggle('is-expanded', isExpanded);
  group.classList.toggle('is-collapsed', !isExpanded);
  const header = group.querySelector('.control-tower-alert-group-header');
  if (header) {
    header.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
  }
  const list = group.querySelector('.control-tower-alert-group-list');
  if (list) {
    list.setAttribute('aria-hidden', isExpanded ? 'false' : 'true');
  }
}

function toggleComplianceHighlight(element, complianceRate, total, threshold = 90) {
  if (!element) {
    return;
  }
  const classList = element.classList;
  classList.remove('status-value--danger', 'status-value--warning', 'status-value--success');
  if (total <= 0) {
    return;
  }
  if (complianceRate < threshold) {
    classList.add('status-value--danger');
    return;
  }
  if (complianceRate < 95) {
    classList.add('status-value--warning');
    return;
  }
  classList.add('status-value--success');
}

function calculateControlTowerMetrics() {
  const activeRows = getControlTowerActiveRows();
  const rollingRange = getMexicoRollingRange(CONTROL_TOWER_RANGE_DAYS);
  // Estructura lista para agregar tendencias y gráficas sin recalcular datos base.
  const otdResults = calculateKpiResults(
    KPI_DEFINITIONS.otd,
    rollingRange.startDate,
    rollingRange.endDate
  );
  const otpResults = calculateKpiResults(
    KPI_DEFINITIONS.otp,
    rollingRange.startDate,
    rollingRange.endDate
  );
  const alerts = buildControlTowerAlerts(activeRows);

  return {
    activeRows,
    activeCount: activeRows.length,
    otd: otdResults,
    otp: otpResults,
    alerts
  };
}

function getControlTowerKpiRows(definition, startDate, endDate) {
  return state.data.filter((row) => {
    const citaDate = row[definition.citaDateKey];
    return isWithinKpiRange(citaDate, startDate, endDate);
  });
}

function getControlTowerAlertRows(alerts) {
  const uniqueRows = [];
  const seen = new Set();
  alerts.forEach((alert) => {
    if (!alert || !alert.row || seen.has(alert.row)) {
      return;
    }
    seen.add(alert.row);
    uniqueRows.push(alert.row);
  });
  return uniqueRows;
}

function getControlTowerActiveRows() {
  return getActiveShipments(state.data);
}

function isActiveShipmentForControlTower(row) {
  const statusValue = getRowStatusValue(row);
  if (!statusValue) {
    return true;
  }
  return !statusValue.includes('delivered') && !statusValue.includes('cancelled');
}

function buildControlTowerAlerts(rows) {
  const now = new Date();
  const alerts = [];

  rows.forEach((row) => {
    const cargaAlert = createControlTowerAlert(row, {
      citaKey: 'cita carga',
      llegadaKey: 'llegada carga',
      citaLabel: 'Cita carga',
      now
    });
    const entregaAlert = createControlTowerAlert(row, {
      citaKey: 'cita entrega',
      llegadaKey: 'llegada entrega',
      citaLabel: 'Cita entrega',
      now
    });
    const bothDelays = cargaAlert && entregaAlert && cargaAlert.typeKey === 'delay' && entregaAlert.typeKey === 'delay';

    if (!bothDelays && cargaAlert) {
      alerts.push(cargaAlert);
    }
    if (entregaAlert) {
      alerts.push(entregaAlert);
    }
  });

  return alerts.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.citaDate - b.citaDate;
  });
}

function formatControlTowerRelativeTime(citaDate, now) {
  const minutesDiff = Math.round((citaDate - now) / (1000 * 60));
  const minutesAbs = Math.abs(minutesDiff);
  const hours = Math.floor(minutesAbs / 60);
  const minutes = minutesAbs % 60;
  const timeLabel = `${hours}h ${minutes}m`;
  if (minutesDiff >= 0) {
    return `Faltan ${timeLabel} para la cita`;
  }
  return `Cita vencida hace ${timeLabel}`;
}

function evaluateControlTowerRisk({ citaDate, llegadaDate, now, citaKey }) {
  if (!citaDate || llegadaDate) {
    return null;
  }

  const hoursAfterCita = (now - citaDate) / (1000 * 60 * 60);
  if (hoursAfterCita >= CONTROL_TOWER_MISSING_EVENT_HOURS) {
    return null;
  }

  const minutesUntilCita = Math.round((citaDate - now) / (1000 * 60));
  if (minutesUntilCita > CONTROL_TOWER_RISK_WINDOW_HOURS * 60) {
    return null;
  }

  const citaType = citaKey === 'cita entrega' ? 'entrega' : 'carga';
  const relativeTime = formatControlTowerRelativeTime(citaDate, now);
  return {
    statusHint: `Riesgo de incumplir cita de ${citaType}. ${relativeTime}`
  };
}

function createControlTowerAlert(row, { citaKey, llegadaKey, citaLabel, now }) {
  const citaValue = row[citaKey];
  const citaDate = parseDateTimeValue(citaValue);
  if (!citaDate) {
    return null;
  }

  const llegadaDate = parseDateTimeValue(row[llegadaKey]);
  const hoursAfterCita = (now - citaDate) / (1000 * 60 * 60);
  const riskAssessment = evaluateControlTowerRisk({
    citaDate,
    llegadaDate,
    now,
    citaKey
  });

  let typeKey = null;
  let statusHint = '';

  if (llegadaDate) {
    if (llegadaDate > citaDate) {
      typeKey = 'delay';
      statusHint = citaKey === 'cita entrega'
        ? 'Llegó después de la cita de entrega.'
        : 'Llegó después de la cita de carga.';
    } else {
      return null;
    }
  } else if (hoursAfterCita >= CONTROL_TOWER_MISSING_EVENT_HOURS) {
    typeKey = 'missing';
    statusHint = 'Llegada no registrada después del tiempo esperado.';
  } else if (riskAssessment) {
    typeKey = 'risk';
    statusHint = riskAssessment.statusHint;
  } else {
    return null;
  }

  const alertType = CONTROL_TOWER_ALERT_TYPES[typeKey];
  return {
    row,
    typeKey,
    typeLabel: alertType.label,
    priority: alertType.priority,
    tone: alertType.tone,
    client: row.cliente || 'Sin cliente',
    trip: row.trip || 'Sin trip',
    citaLabel,
    citaValue: citaValue || 'Sin cita',
    citaDate,
    status: row.estado || 'Sin estado',
    statusHint
  };
}

function renderControlTowerAlerts(alerts) {
  if (!dom.controlTowerAlerts || !dom.controlTowerEmpty) {
    return;
  }

  const indexedAlerts = alerts.map((alert, index) => ({ alert, index }));
  const collapsedAlertTypes = new Set(['missing']);
  const orderedTypes = Object.entries(CONTROL_TOWER_ALERT_TYPES)
    .sort((a, b) => a[1].priority - b[1].priority)
    .map(([typeKey, typeInfo]) => ({ typeKey, label: typeInfo.label }));

  dom.controlTowerAlerts.innerHTML = orderedTypes
    .map((typeInfo) => {
      const groupAlerts = indexedAlerts.filter((item) => item.alert.typeKey === typeInfo.typeKey);
      if (!groupAlerts.length) {
        return '';
      }
      const isCollapsed = collapsedAlertTypes.has(typeInfo.typeKey);
      const listId = `control-tower-alert-group-${typeInfo.typeKey}`;
      return `
        <div class="control-tower-alert-group ${isCollapsed ? 'is-collapsed' : 'is-expanded'}">
          <button
            class="control-tower-alert-group-header"
            type="button"
            aria-expanded="${isCollapsed ? 'false' : 'true'}"
            aria-controls="${listId}"
          >
            <span class="control-tower-alert-group-title">${typeInfo.label}</span>
            <span class="control-tower-alert-group-meta">
              <span class="control-tower-alert-group-count">${groupAlerts.length}</span>
              <span class="control-tower-alert-group-chevron" aria-hidden="true">▾</span>
            </span>
          </button>
          <div
            class="control-tower-alert-group-list"
            role="list"
            id="${listId}"
            aria-hidden="${isCollapsed ? 'true' : 'false'}"
          >
            ${groupAlerts
              .map(({ alert, index }) => {
                return `
                  <article
                    class="alert-card alert-card--${alert.tone} alert-card--${alert.typeKey}"
                    role="listitem"
                    tabindex="0"
                    data-alert-index="${index}"
                  >
                    <p class="alert-scan-line">${formatControlTowerScanLine(alert)}</p>
                    <div class="alert-card-main">
                      <div class="alert-primary">
                        <span class="alert-badge alert-badge--${alert.tone}">${alert.typeLabel}</span>
                        <div class="alert-core">
                          <p class="alert-core-label">Cliente</p>
                          <p class="alert-core-value">${alert.client}</p>
                        </div>
                        <div class="alert-core">
                          <p class="alert-core-label">Trip</p>
                          <p class="alert-core-value">${alert.trip}</p>
                        </div>
                      </div>
                      <p class="alert-problem">${alert.statusHint}</p>
                    </div>
                    <div class="alert-secondary">
                      <div>
                        <p class="alert-meta-label">Estado actual</p>
                        <p class="alert-meta-value">${alert.status}</p>
                      </div>
                      <div>
                        <p class="alert-meta-label">${alert.citaLabel}</p>
                        <p class="alert-meta-value">${alert.citaValue}</p>
                      </div>
                    </div>
                  </article>
                `;
              })
              .join('')}
          </div>
        </div>
      `;
    })
    .join('');

  dom.controlTowerEmpty.hidden = alerts.length > 0;
}

function formatControlTowerScanLine(alert) {
  const client = alert.client || 'Sin cliente';
  const trip = alert.trip || 'Sin trip';
  const citaLabel = alert.citaLabel || 'Cita';
  const citaValue = alert.citaValue || 'Sin cita';
  return `${client} · Trip ${trip} · ${citaLabel} ${citaValue}`;
}

// Renderiza el listado detallado de envíos activos en el modal.
function renderControlTowerActiveList(rows) {
  if (!dom.controlTowerActiveList || !dom.controlTowerActiveEmpty) {
    return;
  }

  if (!rows.length) {
    dom.controlTowerActiveList.innerHTML = '';
    dom.controlTowerActiveEmpty.hidden = false;
    return;
  }

  dom.controlTowerActiveEmpty.hidden = true;
  dom.controlTowerActiveList.innerHTML = rows
    .map((row) => {
      const client = row.cliente || 'Cliente sin nombre';
      const trip = row.trip || 'Sin trip';
      const status = row.estado || 'Sin estado';
      const cita = getControlTowerRelevantCita(row);

      return `
        <article class="control-tower-active-card" role="listitem">
          <header class="control-tower-active-header">
            <div>
              <p class="control-tower-active-label">Cliente</p>
              <p class="control-tower-active-value">${client}</p>
            </div>
            <div class="control-tower-active-status">
              ${renderStatusChip(status)}
            </div>
          </header>
          <div class="control-tower-active-body">
            <div class="control-tower-active-meta">
              <div>
                <p class="control-tower-active-label">Trip</p>
                <p class="control-tower-active-value">${trip}</p>
              </div>
              <div>
                <p class="control-tower-active-label">${cita.label}</p>
                <p class="control-tower-active-value">${cita.value}</p>
              </div>
            </div>
            <!-- Espacio reservado para acciones futuras (ej. ver detalle). -->
            <div class="control-tower-active-actions" aria-hidden="true"></div>
          </div>
        </article>
      `;
    })
    .join('');
}

function getControlTowerRelevantCita(row) {
  const citaCandidates = [
    { key: 'cita carga', label: 'Cita carga' },
    { key: 'cita entrega', label: 'Cita entrega' }
  ]
    .map(({ key, label }) => {
      const value = row[key];
      const date = parseDateTimeValue(value);
      return {
        label,
        value: value || 'Sin cita',
        date
      };
    })
    .filter((item) => item.value && item.value !== 'Sin cita');

  if (citaCandidates.length === 0) {
    return { label: 'Cita', value: 'Sin cita' };
  }

  const now = new Date();
  const upcoming = citaCandidates
    .filter((item) => item.date && item.date >= now)
    .sort((a, b) => a.date - b.date);

  if (upcoming.length) {
    return upcoming[0];
  }

  const past = citaCandidates
    .filter((item) => item.date)
    .sort((a, b) => b.date - a.date);

  if (past.length) {
    return past[0];
  }

  return citaCandidates[0];
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

function getMexicoRollingRange(days) {
  const { year, month, day } = getMexicoDateParts(new Date());
  const endDate = new Date(Date.UTC(year, month - 1, day, 12));
  const startDate = new Date(Date.UTC(year, month - 1, day - (days - 1), 12));
  return { startDate, endDate };
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

// Determina la fecha relevante según la vista activa.
function getRelevantDateForRow(row) {
  if (state.view === TODAY_DELIVERIES_VIEW) {
    return row.citaEntregaDate;
  }
  if (state.view === DAILY_VIEW || state.view === WEEKLY_PROGRAM_VIEW) {
    return row.citaCargaDate;
  }
  return row.citaCargaDate || row.citaEntregaDate;
}

function matchesDateRangeFilter(row) {
  if (!state.dateStartFilter && !state.dateEndFilter) {
    return true;
  }

  const relevantDate = getRelevantDateForRow(row);
  if (!relevantDate) {
    return false;
  }

  if (state.dateStartFilter && compareMexicoDates(relevantDate, state.dateStartFilter) < 0) {
    return false;
  }
  if (state.dateEndFilter && compareMexicoDates(relevantDate, state.dateEndFilter) > 0) {
    return false;
  }
  return true;
}

function matchesClientFilter(row) {
  if (state.clientFilter === 'all') {
    return true;
  }
  const clientValue = row.cliente ? row.cliente.toString().trim().toLowerCase() : '';
  return clientValue === state.clientFilter;
}

// Filtra la data en memoria usando un query simple.
function applyFilters() {
  if (state.view === KPI_VIEW) {
    renderKpiView();
    return;
  }
  if (state.view === CONTROL_TOWER_VIEW) {
    renderControlTower();
    return;
  }

  const today = new Date();
  let baseData = state.data;
  if (state.view === DAILY_VIEW) {
    baseData = state.data.filter((row) => shouldIncludeInDailyLoads(row, today));
  } else if (state.view === TODAY_DELIVERIES_VIEW) {
    baseData = state.data.filter((row) => shouldIncludeInTodayDeliveries(row, today));
  } else if (state.view === WEEKLY_PROGRAM_VIEW) {
    const weekRange = getMexicoWeekRange(today);
    baseData = state.data.filter((row) => shouldIncludeInWeeklyProgram(row, weekRange));
  } else if (state.view === USA_DOMESTIC_VIEW) {
    baseData = getUsaDomesticRows();
  }

  let searchableData = baseData;
  if (state.query) {
    const normalizedQuery = state.query.toLowerCase();
    searchableData = searchableData.filter((row) => {
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

  // Los filtros adicionales solo aplican en la vista "Todas".
  if (state.view === ALL_VIEW) {
    searchableData = searchableData.filter(
      (row) => matchesDateRangeFilter(row) && matchesClientFilter(row)
    );
  }

  const activeFilterCount =
    state.statusFilter === 'all'
      ? searchableData.length
      : countStatus(searchableData, state.statusFilter);
  if (state.statusFilter !== 'all' && activeFilterCount === 0) {
    state.statusFilter = 'all';
  }

  renderStatusFilters(searchableData);

  let filteredData = searchableData;
  if (state.statusFilter !== 'all') {
    filteredData = searchableData.filter((row) =>
      matchesStatusFilter(row, state.statusFilter)
    );
  }

  state.filtered = [...filteredData];
  const sortDateKey = state.view === USA_DOMESTIC_VIEW ? 'citaEntregaDate' : 'citaCargaDate';
  state.filtered.sort((a, b) => {
    const dateA = a[sortDateKey];
    const dateB = b[sortDateKey];
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

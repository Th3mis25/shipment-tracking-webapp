// Lógica principal de la app
// Este archivo define la estructura base para cargar datos,
// pintarlos en la tabla y aplicar filtros sin editar/guardar.

/* global CONFIG */

// Estado centralizado para reutilizar en render y filtros.
const state = {
  data: [],
  filtered: [],
  query: '',
  error: null
};

// Referencias a elementos principales del DOM.
const dom = {
  app: document.getElementById('app'),
  searchInput: null,
  tableBody: null,
  emptyState: null,
  tripModal: null,
  tripModalBody: null,
  tripModalTitle: null
};

const DEFAULT_EMPTY_MESSAGE = 'No hay resultados para mostrar.';

// Punto de entrada de la app.
document.addEventListener('DOMContentLoaded', () => {
  buildLayout();
  bindEvents();
  fetchData();
});

// Construye la estructura base dentro de #app.
function buildLayout() {
  dom.app.innerHTML = `
    <section class="app-section">
      <label for="search" class="search-label">Buscar embarque</label>
      <input
        id="search"
        type="search"
        placeholder="Buscar por referencia, cliente, destino..."
        autocomplete="off"
      />
      <div class="table-wrapper">
        <table class="tracking-table">
          <thead>
            <tr>
              <th>Referencia</th>
              <th>Cliente</th>
              <th>Origen</th>
              <th>Destino</th>
              <th>Estado</th>
              <th>Ejecutivo</th>
              <th>Trip</th>
              <th>Caja</th>
              <th>Segmento</th>
              <th>TR-MX</th>
              <th>TR-USA</th>
              <th>Cita carga</th>
              <th>Llegada carga</th>
              <th>Cita entrega</th>
              <th>Llegada entrega</th>
              <th>Comentarios</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <p class="empty-state" hidden>${DEFAULT_EMPTY_MESSAGE}</p>
    </section>
    <div class="modal-backdrop" hidden>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="trip-modal-title">
        <header class="modal-header">
          <h2 id="trip-modal-title">Detalle de trip</h2>
          <button type="button" class="modal-close" aria-label="Cerrar">×</button>
        </header>
        <div class="modal-body"></div>
      </div>
    </div>
  `;

  dom.searchInput = dom.app.querySelector('#search');
  dom.tableBody = dom.app.querySelector('tbody');
  dom.emptyState = dom.app.querySelector('.empty-state');
  dom.tripModal = dom.app.querySelector('.modal-backdrop');
  dom.tripModalBody = dom.app.querySelector('.modal-body');
  dom.tripModalTitle = dom.app.querySelector('#trip-modal-title');
}

// Enlaza eventos de interacción básicos.
function bindEvents() {
  dom.searchInput.addEventListener('input', (event) => {
    state.query = event.target.value.trim();
    applyFilters(state.query);
  });

  dom.tableBody.addEventListener('click', (event) => {
    const target = event.target.closest('.trip-link');
    if (!target) {
      return;
    }

    const rowIndex = Number(target.dataset.rowIndex);
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

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !dom.tripModal.hidden) {
      closeTripModal();
    }
  });
}

// Obtiene datos desde Google Apps Script.
async function fetchData() {
  // Validación mínima de la URL para evitar errores silenciosos.
  if (!CONFIG || !CONFIG.API_URL || CONFIG.API_URL.includes('PEGAR_AQUI')) {
    state.error = 'Configura CONFIG.API_URL en config.js para conectar el backend.';
    console.warn(state.error);
    renderTable([]);
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
    state.filtered = [...state.data];
    renderTable(state.filtered);
  } catch (error) {
    state.error =
      'No se pudieron cargar los registros. Revisa permisos y acceso del backend.';
    if (error instanceof Error && error.message) {
      state.error = `${state.error} (${error.message}).`;
    }
    console.error('Error al obtener datos:', error);
    renderTable([]);
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
  return {
    referencia: getRowValue(normalizedRow, ['referencia', 'reference', 'ref']),
    cliente: getRowValue(normalizedRow, ['cliente', 'client', 'customer']),
    origen: getRowValue(normalizedRow, ['origen', 'origin', 'source']),
    destino: getRowValue(normalizedRow, ['destino', 'destination', 'dest']),
    estado: getRowValue(normalizedRow, ['estado', 'estatus', 'status']),
    ejecutivo: getRowValue(normalizedRow, ['ejecutivo']),
    trip: getRowValue(normalizedRow, ['trip']),
    caja: getRowValue(normalizedRow, ['caja']),
    segmento: getRowValue(normalizedRow, ['segmento']),
    'tr-mx': getRowValue(normalizedRow, ['tr-mx']),
    'tr-usa': getRowValue(normalizedRow, ['tr-usa']),
    'cita carga': formatDateTime(getRowValue(normalizedRow, ['cita carga'])),
    'llegada carga': formatDateTime(getRowValue(normalizedRow, ['llegada carga'])),
    'cita entrega': formatDateTime(getRowValue(normalizedRow, ['cita entrega'])),
    'llegada entrega': formatDateTime(getRowValue(normalizedRow, ['llegada entrega'])),
    comentarios: getRowValue(normalizedRow, ['comentarios'])
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
    timeZone: 'America/Mexico_City'
  });

  const parts = formatter.formatToParts(date).reduce((accumulator, part) => {
    accumulator[part.type] = part.value;
    return accumulator;
  }, {});

  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
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

  dom.tableBody.innerHTML = data
    .map((row, index) => {
      return `
        <tr>
          <td>${row.referencia || '-'}</td>
          <td>${row.cliente || '-'}</td>
          <td>${row.origen || '-'}</td>
          <td>${row.destino || '-'}</td>
          <td>${row.estado || '-'}</td>
          <td>${row.ejecutivo || '-'}</td>
          <td>${renderTripCell(row.trip, index)}</td>
          <td>${row.caja || '-'}</td>
          <td>${row.segmento || '-'}</td>
          <td>${row['tr-mx'] || '-'}</td>
          <td>${row['tr-usa'] || '-'}</td>
          <td>${row['cita carga'] || '-'}</td>
          <td>${row['llegada carga'] || '-'}</td>
          <td>${row['cita entrega'] || '-'}</td>
          <td>${row['llegada entrega'] || '-'}</td>
          <td>${row.comentarios || '-'}</td>
        </tr>
      `;
    })
    .join('');

  dom.emptyState.textContent = state.error || DEFAULT_EMPTY_MESSAGE;
  dom.emptyState.hidden = data.length > 0;
}

function renderTripCell(tripValue, index) {
  if (!tripValue) {
    return '-';
  }

  return `
    <button type="button" class="trip-link" data-row-index="${index}">
      ${tripValue}
    </button>
  `;
}

function openTripModal(row) {
  const tripValue = row.trip || 'Trip';
  dom.tripModalTitle.textContent = `Detalle de trip ${tripValue}`;
  dom.tripModalBody.innerHTML = buildTripDetails(row);
  dom.tripModal.hidden = false;
}

function closeTripModal() {
  dom.tripModal.hidden = true;
  dom.tripModalBody.innerHTML = '';
  dom.tripModalTitle.textContent = 'Detalle de trip';
}

function buildTripDetails(row) {
  const fields = [
    { label: 'Referencia', value: row.referencia },
    { label: 'Cliente', value: row.cliente },
    { label: 'Origen', value: row.origen },
    { label: 'Destino', value: row.destino },
    { label: 'Estado', value: row.estado },
    { label: 'Ejecutivo', value: row.ejecutivo },
    { label: 'Trip', value: row.trip },
    { label: 'Caja', value: row.caja },
    { label: 'Segmento', value: row.segmento },
    { label: 'TR-MX', value: row['tr-mx'] },
    { label: 'TR-USA', value: row['tr-usa'] },
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
          const value = field.value || '-';
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

// Filtra la data en memoria usando un query simple.
function applyFilters(query) {
  if (!query) {
    state.filtered = [...state.data];
    renderTable(state.filtered);
    return;
  }

  const normalizedQuery = query.toLowerCase();
  state.filtered = state.data.filter((row) => {
    return [
      row.referencia,
      row.cliente,
      row.origen,
      row.destino,
      row.estado
    ]
      .filter(Boolean)
      .some((value) => value.toString().toLowerCase().includes(normalizedQuery));
  });

  renderTable(state.filtered);
}

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
  emptyState: null
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
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <p class="empty-state" hidden>${DEFAULT_EMPTY_MESSAGE}</p>
    </section>
  `;

  dom.searchInput = dom.app.querySelector('#search');
  dom.tableBody = dom.app.querySelector('tbody');
  dom.emptyState = dom.app.querySelector('.empty-state');
}

// Enlaza eventos de interacción básicos.
function bindEvents() {
  dom.searchInput.addEventListener('input', (event) => {
    state.query = event.target.value.trim();
    applyFilters(state.query);
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
  return {
    referencia: getRowValue(row, ['referencia', 'reference', 'ref']),
    cliente: getRowValue(row, ['cliente', 'client', 'customer']),
    origen: getRowValue(row, ['origen', 'origin', 'source']),
    destino: getRowValue(row, ['destino', 'destination', 'dest']),
    estado: getRowValue(row, ['estado', 'status'])
  };
}

function getRowValue(row, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key];
    }
  }
  return '';
}

// Renderiza filas en la tabla con la data filtrada.
function renderTable(data) {
  if (!dom.tableBody) {
    return;
  }

  dom.tableBody.innerHTML = data
    .map((row) => {
      return `
        <tr>
          <td>${row.referencia || '-'}</td>
          <td>${row.cliente || '-'}</td>
          <td>${row.origen || '-'}</td>
          <td>${row.destino || '-'}</td>
          <td>${row.estado || '-'}</td>
        </tr>
      `;
    })
    .join('');

  dom.emptyState.textContent = state.error || DEFAULT_EMPTY_MESSAGE;
  dom.emptyState.hidden = data.length > 0;
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

/**
 * @file Pure UI helper utilities for MEDICARE HMS.
 * These helpers are intentionally DOM-focused but stateless:
 * they do not know about AppState or any domain services.
 */

/**
 * Render a premium Tailwind-styled table into a container element.
 *
 * @param {Object} params
 * @param {string} params.containerId - ID of the container element to render into.
 * @param {Array<string>} params.columns - Column header labels.
 * @param {Array<unknown>} params.data - Row data array passed into {@link rowTemplate}.
 * @param {(row: unknown, index: number) => string} params.rowTemplate - Function that returns a `<tr>...</tr>` HTML string.
 * @returns {void}
 */
export function renderTable({ containerId, columns, data, rowTemplate }) {
  /** @type {HTMLElement | null} */
  const container = document.getElementById(containerId);
  if (!container) return;

  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeData = Array.isArray(data) ? data : [];

  const thead = `
    <thead class="bg-slate-50/80">
      <tr>
        ${safeColumns.map((label) =>
          `<th scope="col" class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">${escapeHtml(String(label))}</th>`
        ).join('')}
      </tr>
    </thead>
  `;

  const tbody = `
    <tbody class="divide-y divide-slate-100 bg-white">
      ${safeData.map((row, index) => {
        try {
          return rowTemplate(row, index) || '';
        } catch {
          return '';
        }
      }).join('')}
    </tbody>
  `;

  const tableHtml = `
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm text-slate-800">
        ${thead}
        ${tbody}
      </table>
    </div>
  `;

  container.innerHTML = tableHtml;
}

/**
 * Show a Bootstrap toast with the given message and visual style.
 *
 * If no container exists, this function will create a generic
 * `#globalToastContainer` appended to `<body>`.
 *
 * @param {Object} params
 * @param {string} params.message - Message text to show.
 * @param {'success'|'error'|'info'|'warning'} [params.type='success'] - Toast style.
 * @returns {void}
 */
export function showToast({ message, type = 'success' }) {
  if (typeof document === 'undefined') return;

  /** @type {HTMLElement | null} */
  let container = document.getElementById('globalToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'globalToastContainer';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }

  const variantClass = getToastVariantClass(type);

  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center ${variantClass} border-0`;
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');

  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${escapeHtml(String(message))}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  container.appendChild(toastEl);

  // Rely on Bootstrap 5's Toast constructor if available.
  try {
    // @ts-ignore - bootstrap may be globally available at runtime.
    const Toast = window.bootstrap && window.bootstrap.Toast;
    if (Toast) {
      const toast = new Toast(toastEl, { delay: 3000 });
      toast.show();
      toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
      });
    } else {
      // Fallback: show for a short time, then remove.
      toastEl.classList.add('show');
      setTimeout(() => toastEl.remove(), 3000);
    }
  } catch {
    // As a safety net, ensure the element is removed eventually.
    toastEl.classList.add('show');
    setTimeout(() => toastEl.remove(), 3000);
  }
}

/**
 * Resolve a Bootstrap contextual background class from a toast type.
 *
 * @param {'success'|'error'|'info'|'warning'} type
 * @returns {string}
 */
function getToastVariantClass(type) {
  switch (type) {
    case 'error':
      return 'text-bg-danger';
    case 'warning':
      return 'text-bg-warning';
    case 'info':
      return 'text-bg-info';
    case 'success':
    default:
      return 'text-bg-success';
  }
}

/**
 * Escape a string for safe HTML injection.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

export default {
  renderTable,
  showToast,
};


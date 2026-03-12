/**
 * @file Pharmacy Dashboard controller.
 * Connects InventoryService and AppState to the pharmacist-facing UI:
 * - Reactive inventory table rendering
 * - Bootstrap-based Add Medication and Update Stock flows
 * - Low stock alerts and expiry highlighting
 * - Live search/filtering
 */

import AppState from '../core/app-state.js';
import inventoryService from '../services/inventory-service.js';
import prescriptionService from '../services/prescription-service.js';
import { renderTable, showToast } from '../core/ui-components.js';

/**
 * @typedef {import('../services/inventory-service.js').InventoryItem} InventoryItem
 */

const LOW_STOCK_THRESHOLD = 10;
const NEAR_EXPIRY_DAYS = 30;

/**
 * Controller class for the pharmacy inventory view.
 */
class PharmacyDashboard {
  constructor() {
    /** @type {InventoryItem[]} */
    this._allItems = [];
    /** @type {string} */
    this._searchQuery = '';
    /** @type {boolean} */
    this._initialized = false;
  }

  /**
   * Initialize the dashboard controller and wire all interactions.
   *
   * @returns {void}
   */
  init() {
    if (this._initialized) return;
    this._initialized = true;

    if (typeof document === 'undefined') return;

    this._attachSearchHandler();
    this._attachAddMedicationHandler();
    this._subscribeToInventory();
    this._subscribeToPrescriptions();
  }

  /**
   * Subscribe to AppState inventory changes and trigger re-render.
   *
   * @private
   * @returns {void}
   */
  _subscribeToInventory() {
    AppState.subscribe('inventory', (items) => {
      this._allItems = Array.isArray(items) ? items : [];
      this._renderInventoryTable();
      this._updateLowStockBanner();
    });
  }

  _subscribeToPrescriptions() {
    AppState.subscribe('prescriptions', () => this._renderPendingPrescriptions());
  }

  _renderPendingPrescriptions() {
    const tbody = document.getElementById('pendingPrescriptionsBody');
    if (!tbody) return;
    const pending = prescriptionService.getAll().filter((p) => p.status === 'pending');
    if (pending.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary py-4">No pending prescriptions</td></tr>';
      return;
    }
    tbody.innerHTML = pending.map((rx) => `
      <tr data-id="${this._escapeHtml(rx.id)}">
        <td>
          <div class="fw-semibold">${this._escapeHtml(rx.patientName)}</div>
          <div class="small text-secondary">${this._escapeHtml(rx.patientId)}</div>
        </td>
        <td>${this._escapeHtml((rx.lines || []).map((l) => l.medication).join(', '))}</td>
        <td>${(rx.lines || []).reduce((s, l) => s + l.qty, 0)}</td>
        <td>
          <button type="button" class="btn btn-primary btn-sm js-dispense" data-rx-id="${this._escapeHtml(rx.id)}">
            <i class="fas fa-check me-1"></i> Dispense
          </button>
        </td>
      </tr>
    `).join('');
    tbody.querySelectorAll('.js-dispense').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-rx-id');
        if (id) {
          prescriptionService.markDispensed(id);
          showToast({ message: 'Prescription dispensed.', type: 'success' });
        }
      });
    });
  }

  /**
   * Render the inventory table using ui-components.renderTable.
   *
   * @private
   * @returns {void}
   */
  _renderInventoryTable() {
    if (typeof document === 'undefined') return;

    const container = document.getElementById('drugInventoryTableContainer');
    const tbody = document.getElementById('drugInventoryBody');
    const tableContainerId = container ? 'drugInventoryTableContainer' : 'drugInventoryTableWrapper';

    // Ensure a container wrapper exists to host the premium table layout.
    if (!container) {
      const tableEl = document.getElementById('drugInventoryTable');
      if (tableEl && tableEl.parentElement) {
        const wrapper = document.createElement('div');
        wrapper.id = tableContainerId;
        tableEl.parentElement.insertBefore(wrapper, tableEl.parentElement.firstChild);
        tableEl.closest('.table-responsive')?.classList.add('d-none');
      }
    }

    const filtered = this._getFilteredItems();

    // If premium table already has a tbody in the DOM, only inject rows to preserve thead with icons.
    if (tbody && tbody.closest('#' + tableContainerId)) {
      tbody.innerHTML = filtered
        .map((item) => this._buildRowTemplate(/** @type {InventoryItem} */ (item)))
        .join('');
    } else {
      renderTable({
        containerId: tableContainerId,
        columns: ['Drug Name', 'Category', 'Quantity', 'Expiry', 'Actions'],
        data: filtered,
        rowTemplate: (item) => this._buildRowTemplate(/** @type {InventoryItem} */ (item)),
      });
    }

    this._wireRowActions();
  }

  /**
   * Build a single table row HTML string with premium visuals.
   *
   * @private
   * @param {InventoryItem} item
   * @returns {string}
   */
  _buildRowTemplate(item) {
    const qty = Number(item.qty) || 0;
    const { rowClass, badgeClass } = this._getExpiryVisualState(item.expiryDate);
    const qtyBadgeClass =
      qty === 0
        ? 'bg-rose-50 text-rose-700'
        : qty <= LOW_STOCK_THRESHOLD
          ? 'bg-amber-50 text-amber-700'
          : 'bg-emerald-50 text-emerald-700';

    const safeName = this._escapeHtml(item.name || '—');
    const safeCategory = this._escapeHtml(item.category || '—');
    const safeExpiry = item.expiryDate ? this._formatDate(item.expiryDate) : '—';

    return `
      <tr class="hover:bg-slate-50/80 transition-colors ${rowClass}">
        <td class="px-6 py-4 align-top">
          <div class="flex flex-col">
            <span class="text-sm font-semibold text-slate-900 tracking-tight">${safeName}</span>
            <span class="mt-1 text-xs text-slate-400">${safeCategory || '—'}</span>
          </div>
        </td>
        <td class="px-6 py-4 align-top">
          <span class="text-xs text-slate-500">${safeCategory || '—'}</span>
        </td>
        <td class="px-6 py-4 align-top">
          <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${qtyBadgeClass}">${qty} units</span>
        </td>
        <td class="px-6 py-4 align-top">
          <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${badgeClass}">
            <i class="fas fa-clock mr-1 text-[10px]"></i>${safeExpiry}
          </span>
        </td>
        <td class="px-6 py-4 align-top text-right">
          <button type="button" class="js-update-stock inline-flex items-center gap-1.5 border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all" data-item-id="${this._escapeHtml(item.id)}">
            <i class="fas fa-boxes-stacked text-[11px] text-slate-500"></i>
            <span>Update</span>
          </button>
        </td>
      </tr>
    `;
  }

  /**
   * Attach click handlers for row actions (update stock).
   *
   * @private
   * @returns {void}
   */
  _wireRowActions() {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('drugInventoryTableContainer') ||
      document.getElementById('drugInventoryTableWrapper');
    if (!container) return;

    const buttons = container.querySelectorAll('.js-update-stock');
    buttons.forEach((btn) => {
      if (!(btn instanceof HTMLButtonElement)) return;
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-item-id');
        if (id) this._openUpdateStockModal(id);
      });
    });
  }

  /**
   * Attach handler for the Add Medication button.
   *
   * @private
   * @returns {void}
   */
  _attachAddMedicationHandler() {
    if (typeof document === 'undefined') return;
    const btn = document.getElementById('btnAddDrug');
    if (!btn) return;

    btn.addEventListener('click', () => {
      this._openAddMedicationModal();
    });
  }

  /**
   * Attach live search behavior if a search input exists.
   *
   * @private
   * @returns {void}
   */
  _attachSearchHandler() {
    if (typeof document === 'undefined') return;
    const input = document.getElementById('pharmacyInventorySearch');
    if (!(input instanceof HTMLInputElement)) return;

    input.addEventListener('input', () => {
      this._searchQuery = input.value || '';
      this._renderInventoryTable();
    });
  }

  /**
   * Compute the filtered item list based on the current search query.
   *
   * @private
   * @returns {InventoryItem[]}
   */
  _getFilteredItems() {
    const query = this._searchQuery.trim().toLowerCase();
    if (!query) return this._allItems;
    return this._allItems.filter((item) => {
      const name = (item.name || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      return name.includes(query) || category.includes(query);
    });
  }

  /**
   * Show or hide the low-stock banner based on current inventory.
   *
   * @private
   * @returns {void}
   */
  _updateLowStockBanner() {
    if (typeof document === 'undefined') return;

    const container = document.getElementById('drugInventoryTableContainer');
    const card = container?.closest('.hms-card');
    if (!card) return;

    let banner = document.getElementById('pharmacyLowStockBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'pharmacyLowStockBanner';
      banner.className = 'rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2 shadow-sm';
      banner.setAttribute('role', 'status');
      card.insertBefore(banner, container);
    }

    const lowItems = this._allItems.filter((item) => {
      const qty = Number(item.qty) || 0;
      return qty > 0 && qty <= LOW_STOCK_THRESHOLD;
    });

    if (lowItems.length === 0) {
      banner.classList.add('hidden');
      banner.textContent = '';
      return;
    }

    const names = lowItems.map((i) => i.name).filter(Boolean).slice(0, 3);
    const moreCount = Math.max(0, lowItems.length - names.length);

    const summary = [
      `Low stock on ${lowItems.length} medication${lowItems.length > 1 ? 's' : ''}`,
      names.length ? `: ${names.join(', ')}` : '',
      moreCount > 0 ? ` and ${moreCount} more` : '',
    ].join('');

    banner.classList.remove('hidden');
    banner.innerHTML = `
      <i class="fas fa-triangle-exclamation text-amber-600 mr-2"></i>
      <span class="text-sm text-amber-800">${this._escapeHtml(summary)}</span>
    `;
  }

  /**
   * Open the Add Medication modal.
   *
   * @private
   * @returns {void}
   */
  _openAddMedicationModal() {
    if (typeof document === 'undefined') return;
    const modalEl = this._ensureAddMedicationModal();

    // @ts-ignore - Bootstrap may be attached globally.
    const Modal = window.bootstrap && window.bootstrap.Modal;
    if (!Modal) return;

    const modal = Modal.getOrCreateInstance(modalEl);
    const form = modalEl.querySelector('form');
    if (form instanceof HTMLFormElement) {
      form.reset();
    }
    modal.show();
  }

  /**
   * Ensure the Add Medication modal exists in the DOM, creating it if necessary.
   *
   * @private
   * @returns {HTMLElement}
   */
  _ensureAddMedicationModal() {
    let modalEl = document.getElementById('pharmacyAddMedicationModal');
    if (modalEl instanceof HTMLElement) return modalEl;

    modalEl = document.createElement('div');
    modalEl.id = 'pharmacyAddMedicationModal';
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow-lg">
          <div class="modal-header">
            <h5 class="modal-title">Add Medication</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <form class="needs-validation" novalidate>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label" for="addDrugName">Drug Name</label>
                <input type="text" class="form-control" id="addDrugName" required>
                <div class="invalid-feedback">Please enter a valid drug name.</div>
              </div>
              <div class="mb-3">
                <label class="form-label" for="addDrugCategory">Category</label>
                <input type="text" class="form-control" id="addDrugCategory">
              </div>
              <div class="mb-3">
                <label class="form-label" for="addDrugQty">Initial Quantity</label>
                <input type="number" class="form-control" id="addDrugQty" min="0" value="0" required>
                <div class="invalid-feedback">Quantity must be zero or greater.</div>
              </div>
              <div class="mb-3">
                <label class="form-label" for="addDrugExpiry">Expiry Date</label>
                <input type="date" class="form-control" id="addDrugExpiry">
                <div class="invalid-feedback">Expiry date cannot be in the past.</div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-check me-1"></i> Save Medication
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);

    const form = modalEl.querySelector('form');
    if (form instanceof HTMLFormElement) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        this._handleAddMedicationSubmit(form, modalEl);
      });
    }

    return modalEl;
  }

  /**
   * Handle Add Medication form submission with validation.
   *
   * @private
   * @param {HTMLFormElement} form
   * @param {HTMLElement} modalEl
   * @returns {void}
   */
  _handleAddMedicationSubmit(form, modalEl) {
    const nameInput = /** @type {HTMLInputElement | null} */ (form.querySelector('#addDrugName'));
    const categoryInput = /** @type {HTMLInputElement | null} */ (form.querySelector('#addDrugCategory'));
    const qtyInput = /** @type {HTMLInputElement | null} */ (form.querySelector('#addDrugQty'));
    const expiryInput = /** @type {HTMLInputElement | null} */ (form.querySelector('#addDrugExpiry'));

    if (!nameInput || !qtyInput) return;

    const name = nameInput.value.trim();
    const category = categoryInput ? categoryInput.value.trim() : '';
    const qty = Number(qtyInput.value || '0');
    const expiry = expiryInput && expiryInput.value ? expiryInput.value : undefined;

    let isValid = true;

    if (!name) {
      isValid = false;
      nameInput.classList.add('is-invalid');
    } else {
      nameInput.classList.remove('is-invalid');
    }

    if (!Number.isFinite(qty) || qty < 0) {
      isValid = false;
      qtyInput.classList.add('is-invalid');
    } else {
      qtyInput.classList.remove('is-invalid');
    }

    if (expiry) {
      const expiryDate = new Date(expiry);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate < today) {
        isValid = false;
        expiryInput?.classList.add('is-invalid');
      } else {
        expiryInput?.classList.remove('is-invalid');
      }
    } else if (expiryInput) {
      expiryInput.classList.remove('is-invalid');
    }

    if (!isValid) {
      return;
    }

    inventoryService.addMedication({
      name,
      category,
      qty,
      expiryDate: expiry,
    });

    // @ts-ignore
    const Modal = window.bootstrap && window.bootstrap.Modal;
    if (Modal) {
      const modal = Modal.getInstance(modalEl) || new Modal(modalEl);
      modal.hide();
    }

    showToast({ message: 'Medication added to inventory.', type: 'success' });
  }

  /**
   * Open the Update Stock modal for a specific item.
   *
   * @private
   * @param {string} itemId
   * @returns {void}
   */
  _openUpdateStockModal(itemId) {
    if (typeof document === 'undefined') return;

    const item = this._allItems.find((i) => i.id === itemId);
    if (!item) return;

    const modalEl = this._ensureUpdateStockModal();

    const nameEl = modalEl.querySelector('[data-update-name]');
    const qtyInput = modalEl.querySelector('#updateDrugQty');

    if (nameEl) {
      nameEl.textContent = item.name || 'Medication';
    }
    if (qtyInput instanceof HTMLInputElement) {
      qtyInput.value = String(item.qty ?? 0);
    }

    modalEl.setAttribute('data-item-id', itemId);

    // @ts-ignore
    const Modal = window.bootstrap && window.bootstrap.Modal;
    if (!Modal) return;
    const modal = Modal.getOrCreateInstance(modalEl);
    modal.show();
  }

  /**
   * Ensure the Update Stock modal exists in the DOM.
   *
   * @private
   * @returns {HTMLElement}
   */
  _ensureUpdateStockModal() {
    let modalEl = document.getElementById('pharmacyUpdateStockModal');
    if (modalEl instanceof HTMLElement) return modalEl;

    modalEl = document.createElement('div');
    modalEl.id = 'pharmacyUpdateStockModal';
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content shadow-lg">
          <div class="modal-header">
            <h5 class="modal-title">Update Stock</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <form class="needs-validation" novalidate>
            <div class="modal-body">
              <p class="mb-2 small text-secondary">Adjust the quantity for:</p>
              <p class="fw-semibold mb-3" data-update-name></p>
              <div class="mb-3">
                <label class="form-label" for="updateDrugQty">New Quantity</label>
                <input type="number" class="form-control" id="updateDrugQty" min="0" required>
                <div class="invalid-feedback">Quantity must be zero or greater.</div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-check me-1"></i> Update Stock
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);

    const form = modalEl.querySelector('form');
    if (form instanceof HTMLFormElement) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        this._handleUpdateStockSubmit(form, modalEl);
      });
    }

    return modalEl;
  }

  /**
   * Handle Update Stock submission.
   *
   * @private
   * @param {HTMLFormElement} form
   * @param {HTMLElement} modalEl
   * @returns {void}
   */
  _handleUpdateStockSubmit(form, modalEl) {
    const qtyInput = /** @type {HTMLInputElement | null} */ (form.querySelector('#updateDrugQty'));
    if (!qtyInput) return;

    const rawQty = Number(qtyInput.value || '0');
    let isValid = true;

    if (!Number.isFinite(rawQty) || rawQty < 0) {
      isValid = false;
      qtyInput.classList.add('is-invalid');
    } else {
      qtyInput.classList.remove('is-invalid');
    }

    if (!isValid) return;

    const itemId = modalEl.getAttribute('data-item-id');
    if (!itemId) return;

    inventoryService.updateStock(itemId, rawQty);

    // @ts-ignore
    const Modal = window.bootstrap && window.bootstrap.Modal;
    if (Modal) {
      const modal = Modal.getInstance(modalEl) || new Modal(modalEl);
      modal.hide();
    }

    showToast({ message: 'Stock updated successfully.', type: 'success' });
  }

  /**
   * Determine expiry visual state (status text, row class, badge class).
   *
   * @private
   * @param {string | undefined} expiryDateStr
   * @returns {{ status: string; rowClass: string; badgeClass: string }}
   */
  _getExpiryVisualState(expiryDateStr) {
    if (!expiryDateStr) {
      return { status: 'No expiry', rowClass: '', badgeClass: 'bg-slate-50 text-slate-500' };
    }

    const expiry = new Date(expiryDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: 'Expired',
        rowClass: 'bg-rose-50/50',
        badgeClass: 'bg-rose-50 text-rose-700',
      };
    }

    if (diffDays <= NEAR_EXPIRY_DAYS) {
      return {
        status: 'Near Expiry',
        rowClass: 'bg-amber-50/50',
        badgeClass: 'bg-amber-50 text-amber-700',
      };
    }

    return {
      status: 'In Stock',
      rowClass: '',
      badgeClass: 'bg-emerald-50 text-emerald-700',
    };
  }

  /**
   * Format an ISO date as a localized display string.
   *
   * @private
   * @param {string} iso
   * @returns {string}
   */
  _formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Escape a string for safe HTML interpolation.
   *
   * @private
   * @param {string} value
   * @returns {string}
   */
  _escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }
}

/**
 * Shared PharmacyDashboard instance.
 * @type {PharmacyDashboard}
 */
const pharmacyDashboard = new PharmacyDashboard();

export { PharmacyDashboard };
export default pharmacyDashboard;


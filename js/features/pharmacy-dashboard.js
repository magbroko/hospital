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

    // Mobile: expandable cards (no horizontal scroll) - drugInventoryCardsContainer in pharmacy-inventory
    const cardsContainer = document.getElementById('drugInventoryCardsContainer');
    if (cardsContainer) {
      cardsContainer.innerHTML = filtered
        .map((item) => this._buildCardTemplate(/** @type {InventoryItem} */ (item)))
        .join('');
      this._wireCardExpand();
    }

    this._wireRowActions();
  }

  /**
   * Build expandable card for mobile (collapsed: Drug Name + Status; expanded: Expiry, Quantity, Update).
   * Preserves .js-update-stock and data-item-id for zero-break logic.
   *
   * @private
   * @param {InventoryItem} item
   * @returns {string}
   */
  _buildCardTemplate(item) {
    const qty = Number(item.qty) || 0;
    const { badgeClass } = this._getExpiryVisualState(item.expiryDate);
    const statusClass =
      qty === 0
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : qty <= LOW_STOCK_THRESHOLD
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200';
    const statusLabel = qty === 0 ? 'Out' : qty <= LOW_STOCK_THRESHOLD ? 'Low' : 'OK';
    const safeName = this._escapeHtml(item.name || '—');
    const safeExpiry = item.expiryDate ? this._formatDate(item.expiryDate) : '—';

    return `
      <div class="drug-inventory-card bg-white border-b border-slate-100 last:border-b-0" data-expanded="false" data-item-id="${this._escapeHtml(item.id)}">
        <div class="drug-card-collapsed min-h-[48px] flex items-center justify-between gap-3 px-4 py-3 cursor-pointer" role="button" tabindex="0" aria-expanded="false">
          <span class="text-sm font-semibold text-slate-900 truncate">${safeName}</span>
          <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusClass} shrink-0">${statusLabel}</span>
        </div>
        <div class="drug-card-expanded hidden">
          <div class="px-4 pb-4 pt-2 space-y-2 text-sm border-t border-slate-100">
            <div><span class="text-slate-500">Expiry:</span> <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}">${safeExpiry}</span></div>
            <div><span class="text-slate-500">Quantity:</span> <span class="font-semibold">${qty} units</span></div>
            <button type="button" class="js-update-stock portal-touch-target btn-haptic w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all min-h-[48px]" data-item-id="${this._escapeHtml(item.id)}">
              <i class="fas fa-boxes-stacked text-slate-500"></i>
              <span>Update</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Wire expand/collapse for mobile drug cards.
   *
   * @private
   * @returns {void}
   */
  _wireCardExpand() {
    const container = document.getElementById('drugInventoryCardsContainer');
    if (!container) return;
    container.addEventListener('click', (e) => {
      const collapsed = e.target.closest('.drug-card-collapsed');
      if (!collapsed) return;
      const card = collapsed.closest('.drug-inventory-card');
      const expanded = card?.querySelector('.drug-card-expanded');
      if (!card || !expanded) return;
      const isOpen = card.getAttribute('data-expanded') === 'true';
      card.setAttribute('data-expanded', !isOpen);
      expanded.classList.toggle('hidden', isOpen);
      collapsed.setAttribute('aria-expanded', !isOpen);
    });
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
      <tr class="hover:bg-slate-50/80 transition-colors ${rowClass}" data-item-id="${this._escapeHtml(item.id)}">
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
        if (id) this._openMedicationModal(id);
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
      this._openMedicationModal(null);
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
   * Open the medication modal for Add or Update.
   * Single handler: if itemId is passed, pre-fill for Update; otherwise blank for Add.
   *
   * @private
   * @param {string | null} itemId - ID of item to edit, or null for Add.
   * @returns {void}
   */
  _openMedicationModal(itemId = null) {
    if (typeof document === 'undefined') return;
    const modalEl = this._ensureMedicationModal();
    const form = modalEl.querySelector('form');
    const titleEl = modalEl.querySelector('#pharmacyAddModalTitle');
    const nameInput = modalEl.querySelector('#addDrugName');
    const categoryInput = modalEl.querySelector('#addDrugCategory');
    const qtyInput = modalEl.querySelector('#addDrugQty');
    const unitPriceInput = modalEl.querySelector('#addDrugUnitPrice');
    const expiryInput = modalEl.querySelector('#addDrugExpiry');
    const saveText = modalEl.querySelector('.pharmacy-btn-save-text');

    if (form instanceof HTMLFormElement) {
      form.reset();
    }
    this._clearAddMedicationValidation(modalEl);
    modalEl.removeAttribute('data-edit-id');

    if (itemId) {
      const item = this._allItems.find((i) => i.id === itemId);
      if (!item) return;

      modalEl.setAttribute('data-edit-id', itemId);
      if (titleEl) titleEl.textContent = 'Update Medication';
      if (saveText) saveText.innerHTML = '<i class="fas fa-check mr-2"></i> Save Changes';

      if (nameInput instanceof HTMLInputElement) nameInput.value = item.name || '';
      if (categoryInput instanceof HTMLSelectElement) {
        const cat = item.category || '';
        const hasOption = Array.from(categoryInput.options).some((o) => o.value === cat);
        if (cat && !hasOption) {
          const opt = document.createElement('option');
          opt.value = cat;
          opt.textContent = cat;
          categoryInput.insertBefore(opt, categoryInput.lastElementChild);
        }
        categoryInput.value = cat;
      }
      if (qtyInput instanceof HTMLInputElement) qtyInput.value = String(item.qty ?? 0);
      if (unitPriceInput instanceof HTMLInputElement) unitPriceInput.value = String(item.unitPrice ?? 0);
      if (expiryInput instanceof HTMLInputElement) {
        expiryInput.value = this._formatDateForInput(item.expiryDate);
      }

      const categoryGroup = categoryInput?.closest('.pharmacy-form-group');
      if (categoryGroup && (item.category || '')) {
        categoryGroup.classList.add('pharmacy-has-value');
      }
    } else {
      if (titleEl) titleEl.textContent = 'Add Medication';
      if (saveText) saveText.innerHTML = '<i class="fas fa-check mr-2"></i> Save Medication';
      if (qtyInput instanceof HTMLInputElement) qtyInput.value = '0';
      if (unitPriceInput instanceof HTMLInputElement) unitPriceInput.value = '0';
    }

    modalEl.classList.remove('pharmacy-modal-closed');
    modalEl.classList.add('pharmacy-modal-open');
    modalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close the Add Medication modal with smooth fade-out.
   *
   * @private
   * @param {HTMLElement} modalEl
   * @returns {void}
   */
  _closeAddMedicationModal(modalEl) {
    modalEl.classList.remove('pharmacy-modal-open');
    modalEl.classList.add('pharmacy-modal-closed');
    modalEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /**
   * Clear validation states on modal inputs.
   *
   * @private
   * @param {HTMLElement} modalEl
   * @returns {void}
   */
  _clearAddMedicationValidation(modalEl) {
    modalEl.querySelectorAll('.pharmacy-input-invalid').forEach((el) => el.classList.remove('pharmacy-input-invalid'));
    modalEl.querySelectorAll('.pharmacy-input-valid').forEach((el) => el.classList.remove('pharmacy-input-valid'));
    modalEl.querySelectorAll('.pharmacy-form-group.pharmacy-has-value').forEach((el) => el.classList.remove('pharmacy-has-value'));
  }

  /**
   * Ensure the medication modal exists in the DOM, creating it if necessary.
   * Premium Tailwind modal: backdrop-blur, desktop center / mobile bottom-sheet.
   * Used for both Add and Update.
   *
   * @private
   * @returns {HTMLElement}
   */
  _ensureMedicationModal() {
    let modalEl = document.getElementById('pharmacyAddMedicationModal');
    if (modalEl instanceof HTMLElement) return modalEl;

    modalEl = document.createElement('div');
    modalEl.id = 'pharmacyAddMedicationModal';
    modalEl.className = 'pharmacy-modal pharmacy-modal-closed';
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-labelledby', 'pharmacyAddModalTitle');
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.setAttribute('role', 'dialog');
    modalEl.innerHTML = `
      <div class="pharmacy-modal-backdrop"></div>
      <div class="pharmacy-modal-panel">
        <div class="pharmacy-modal-header">
          <h2 id="pharmacyAddModalTitle" class="text-lg font-semibold text-slate-900">Add Medication</h2>
          <button type="button" class="pharmacy-modal-close" aria-label="Close">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <form class="pharmacy-modal-form" novalidate>
          <div class="pharmacy-modal-body">
            <div class="pharmacy-form-group">
              <input type="text" id="addDrugName" class="pharmacy-input" placeholder=" " required autocomplete="off">
              <label for="addDrugName" class="pharmacy-floating-label">Drug Name</label>
              <span class="pharmacy-input-error hidden" data-for="addDrugName">Please enter a valid drug name.</span>
            </div>
            <div class="pharmacy-form-group">
              <select id="addDrugCategory" class="pharmacy-input pharmacy-select">
                <option value="">Select category</option>
                <option value="Antibiotics">Antibiotics</option>
                <option value="Analgesics">Analgesics</option>
                <option value="Cardiovascular">Cardiovascular</option>
                <option value="Diabetes">Diabetes</option>
                <option value="Anticoagulants">Anticoagulants</option>
                <option value="Antihypertensives">Antihypertensives</option>
                <option value="Other">Other</option>
              </select>
              <label for="addDrugCategory" class="pharmacy-floating-label">Category</label>
            </div>
            <div class="pharmacy-form-group">
              <input type="number" id="addDrugQty" class="pharmacy-input" min="0" value="0" required>
              <label for="addDrugQty" class="pharmacy-floating-label">Initial Quantity</label>
              <span class="pharmacy-input-error hidden" data-for="addDrugQty">Quantity must be zero or greater.</span>
            </div>
            <div class="pharmacy-form-group">
              <input type="number" id="addDrugUnitPrice" class="pharmacy-input" min="0" step="0.01" value="0" placeholder="0">
              <label for="addDrugUnitPrice" class="pharmacy-floating-label">Unit Price ($)</label>
            </div>
            <div class="pharmacy-form-group">
              <input type="date" id="addDrugExpiry" class="pharmacy-input">
              <label for="addDrugExpiry" class="pharmacy-floating-label">Expiry Date</label>
              <span class="pharmacy-input-error hidden" data-for="addDrugExpiry">Expiry date cannot be in the past.</span>
            </div>
          </div>
          <div class="pharmacy-modal-footer">
            <button type="button" class="pharmacy-btn-ghost pharmacy-modal-cancel">Cancel</button>
            <button type="submit" class="pharmacy-btn-save" id="pharmacySaveMedicationBtn">
              <span class="pharmacy-btn-save-text">
                <i class="fas fa-check mr-2"></i> Save Medication
              </span>
              <span class="pharmacy-btn-save-loading hidden">
                <svg class="pharmacy-spinner w-5 h-5" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="32" stroke-dashoffset="12" stroke-linecap="round"></circle>
                </svg>
                Saving…
              </span>
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modalEl);

    this._wireAddMedicationModalEvents(modalEl);
    return modalEl;
  }

  /**
   * Wire events for the Add Medication modal.
   *
   * @private
   * @param {HTMLElement} modalEl
   * @returns {void}
   */
  _wireAddMedicationModalEvents(modalEl) {
    const form = modalEl.querySelector('form');
    const backdrop = modalEl.querySelector('.pharmacy-modal-backdrop');
    const closeBtn = modalEl.querySelector('.pharmacy-modal-close');
    const cancelBtn = modalEl.querySelector('.pharmacy-modal-cancel');

    const close = () => {
      this._closeAddMedicationModal(modalEl);
    };

    if (form instanceof HTMLFormElement) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this._handleAddMedicationSubmit(form, modalEl);
      });
    }

    backdrop?.addEventListener('click', close);
    closeBtn?.addEventListener('click', close);
    cancelBtn?.addEventListener('click', close);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalEl.classList.contains('pharmacy-modal-open')) {
        close();
      }
    });

    this._wireAddMedicationValidation(modalEl);
  }

  /**
   * Wire real-time validation for Add Medication inputs.
   *
   * @private
   * @param {HTMLElement} modalEl
   * @returns {void}
   */
  _wireAddMedicationValidation(modalEl) {
    const nameInput = modalEl.querySelector('#addDrugName');
    const qtyInput = modalEl.querySelector('#addDrugQty');
    const expiryInput = modalEl.querySelector('#addDrugExpiry');

    const validateName = () => {
      if (!(nameInput instanceof HTMLInputElement)) return;
      const val = nameInput.value.trim();
      const isValid = val.length > 0;
      nameInput.classList.toggle('pharmacy-input-invalid', !isValid);
      nameInput.classList.toggle('pharmacy-input-valid', isValid);
      modalEl.querySelector(`[data-for="addDrugName"]`)?.classList.toggle('hidden', isValid);
    };

    const validateQty = () => {
      if (!(qtyInput instanceof HTMLInputElement)) return;
      const val = Number(qtyInput.value || '0');
      const isValid = Number.isFinite(val) && val >= 0;
      qtyInput.classList.toggle('pharmacy-input-invalid', !isValid);
      qtyInput.classList.toggle('pharmacy-input-valid', isValid);
      modalEl.querySelector(`[data-for="addDrugQty"]`)?.classList.toggle('hidden', isValid);
    };

    const validateExpiry = () => {
      if (!(expiryInput instanceof HTMLInputElement)) return;
      const val = expiryInput.value;
      if (!val) {
        expiryInput.classList.remove('pharmacy-input-invalid', 'pharmacy-input-valid');
        modalEl.querySelector(`[data-for="addDrugExpiry"]`)?.classList.add('hidden');
        return;
      }
      const expiryDate = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isValid = expiryDate >= today;
      expiryInput.classList.toggle('pharmacy-input-invalid', !isValid);
      expiryInput.classList.toggle('pharmacy-input-valid', isValid);
      modalEl.querySelector(`[data-for="addDrugExpiry"]`)?.classList.toggle('hidden', isValid);
    };

    const categoryInput = modalEl.querySelector('#addDrugCategory');
    const updateCategoryLabel = () => {
      const group = categoryInput?.closest('.pharmacy-form-group');
      if (group && categoryInput instanceof HTMLSelectElement) {
        group.classList.toggle('pharmacy-has-value', !!categoryInput.value);
      }
    };

    nameInput?.addEventListener('input', validateName);
    nameInput?.addEventListener('blur', validateName);
    qtyInput?.addEventListener('input', validateQty);
    qtyInput?.addEventListener('blur', validateQty);
    expiryInput?.addEventListener('input', validateExpiry);
    expiryInput?.addEventListener('change', validateExpiry);
    categoryInput?.addEventListener('change', updateCategoryLabel);
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
    const categoryInput = /** @type {HTMLSelectElement | null} */ (form.querySelector('#addDrugCategory'));
    const qtyInput = /** @type {HTMLInputElement | null} */ (form.querySelector('#addDrugQty'));
    const unitPriceInput = /** @type {HTMLInputElement | null} */ (form.querySelector('#addDrugUnitPrice'));
    const expiryInput = /** @type {HTMLInputElement | null} */ (form.querySelector('#addDrugExpiry'));
    const saveBtn = modalEl.querySelector('#pharmacySaveMedicationBtn');
    const saveText = modalEl.querySelector('.pharmacy-btn-save-text');
    const saveLoading = modalEl.querySelector('.pharmacy-btn-save-loading');

    if (!nameInput || !qtyInput) return;

    const name = nameInput.value.trim();
    const category = categoryInput?.value?.trim() || '';
    const qty = Number(qtyInput.value || '0');
    const unitPrice = Number(unitPriceInput?.value || '0') || 0;
    const expiry = expiryInput?.value || undefined;

    let isValid = true;

    if (!name) {
      isValid = false;
      nameInput.classList.add('pharmacy-input-invalid');
      modalEl.querySelector(`[data-for="addDrugName"]`)?.classList.remove('hidden');
    } else {
      nameInput.classList.remove('pharmacy-input-invalid');
      nameInput.classList.add('pharmacy-input-valid');
      modalEl.querySelector(`[data-for="addDrugName"]`)?.classList.add('hidden');
    }

    if (!Number.isFinite(qty) || qty < 0) {
      isValid = false;
      qtyInput.classList.add('pharmacy-input-invalid');
      modalEl.querySelector(`[data-for="addDrugQty"]`)?.classList.remove('hidden');
    } else {
      qtyInput.classList.remove('pharmacy-input-invalid');
      qtyInput.classList.add('pharmacy-input-valid');
      modalEl.querySelector(`[data-for="addDrugQty"]`)?.classList.add('hidden');
    }

    if (expiry) {
      const expiryDate = new Date(expiry);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(expiryDate.getTime()) || expiryDate < today) {
        isValid = false;
        expiryInput?.classList.add('pharmacy-input-invalid');
        modalEl.querySelector(`[data-for="addDrugExpiry"]`)?.classList.remove('hidden');
      } else {
        expiryInput?.classList.remove('pharmacy-input-invalid');
        expiryInput?.classList.add('pharmacy-input-valid');
        modalEl.querySelector(`[data-for="addDrugExpiry"]`)?.classList.add('hidden');
      }
    } else if (expiryInput) {
      expiryInput.classList.remove('pharmacy-input-invalid', 'pharmacy-input-valid');
      modalEl.querySelector(`[data-for="addDrugExpiry"]`)?.classList.add('hidden');
    }

    if (!isValid) return;

    saveBtn?.setAttribute('disabled', 'true');
    saveText?.classList.add('hidden');
    saveLoading?.classList.remove('hidden');

    const editId = modalEl.getAttribute('data-edit-id');
    const isEditMode = !!editId;

    if (isEditMode && editId) {
      const updatedItem = inventoryService.updateMedication(editId, {
        name,
        category,
        qty,
        unitPrice,
        expiryDate: expiry || undefined,
      });

      this._closeAddMedicationModal(modalEl);
      this._renderInventoryTable();
      if (updatedItem) {
        this._highlightNewRow(updatedItem.id);
      }
      showToast({ message: 'Inventory updated successfully.', type: 'success' });
    } else {
      const newItem = inventoryService.addMedication({
        name,
        category,
        qty,
        unitPrice,
        expiryDate: expiry,
      });

      this._closeAddMedicationModal(modalEl);
      this._renderInventoryTable();
      this._highlightNewRow(newItem.id);
      showToast({ message: 'Medication added to inventory.', type: 'success' });
    }

    saveBtn?.removeAttribute('disabled');
    saveText?.classList.remove('hidden');
    saveLoading?.classList.add('hidden');
  }

  /**
   * Highlight the newly added row with a brief teal glow animation.
   *
   * @private
   * @param {string} itemId
   * @returns {void}
   */
  _highlightNewRow(itemId) {
    if (typeof document === 'undefined') return;

    const tableRow = document.querySelector(`tr[data-item-id="${this._escapeHtml(itemId)}"]`);
    const cardEl = document.querySelector(`.drug-inventory-card[data-item-id="${this._escapeHtml(itemId)}"]`);

    const target = tableRow || cardEl;
    if (!target) return;

    target.classList.add('pharmacy-row-highlight');
    setTimeout(() => {
      target.classList.remove('pharmacy-row-highlight');
    }, 2500);
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
   * Format a date string for input[type="date"] (YYYY-MM-DD).
   * Handles ISO strings, "Mon Day, Year" and invalid dates safely.
   *
   * @private
   * @param {string | undefined} dateStr
   * @returns {string}
   */
  _formatDateForInput(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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


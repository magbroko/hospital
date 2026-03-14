/**
 * @file Admin Prescription Modal - New Prescription with automated billing.
 * On save: creates prescription, triggers generateBill() from inventory pricing,
 * creates Patient bill with status Pending. Patient Portal syncs via AppState.
 */

import AppState from '../core/app-state.js';
import { PrescriptionManager } from '../app-core.js';
import inventoryService from '../services/inventory-service.js';
import appointmentService from '../services/appointment-service.js';
import { showToast } from '../core/ui-components.js';

const MODAL_ID = 'adminNewPrescriptionModal';

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

class AdminPrescriptionModal {
  constructor() {
    this._lines = [];
    this._initialized = false;
  }

  init() {
    if (this._initialized || typeof document === 'undefined') return;
    this._initialized = true;
    this._ensureModal();
    this._wireOpenButton();
    this._wireForm();
    this._wireAddLine();
    this._wireClose();
  }

  _ensureModal() {
    if (document.getElementById(MODAL_ID)) return;

    const drugs = inventoryService.getAll();
    const drugOptions = drugs.map((d) =>
      `<option value="${escapeHtml(d.name)}" data-price="${Number(d.unitPrice) || 0}">${escapeHtml(d.name)}${d.unitPrice ? ` — $${d.unitPrice}` : ''}</option>`
    ).join('');

    const patients = [...new Set(appointmentService.getAll().map((a) => ({ id: a.patientId, name: a.patientName })))];
    const patientOptions = patients.length
      ? patients.map((p) => `<option value="${escapeHtml(p.id)}" data-name="${escapeHtml(p.name || '')}">${escapeHtml(p.name || p.id)} (${escapeHtml(p.id)})</option>`).join('')
      : '<option value="">No patients in queue</option>';

    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'fixed inset-0 z-50 hidden items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm';
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="admin-prescription-modal-content w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl border border-slate-200">
        <div class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-slate-900">New Prescription</h2>
          <button type="button" class="admin-prescription-modal-close rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <form id="adminPrescriptionForm" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Patient</label>
            <select id="adminRxPatient" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required>
              <option value="">Select patient…</option>
              ${patientOptions}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Diagnosis (optional)</label>
            <input type="text" id="adminRxDiagnosis" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Hypertension">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Clinical Notes (optional)</label>
            <textarea id="adminRxNotes" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows="2" placeholder="Additional notes…"></textarea>
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-slate-700">Prescription Lines</label>
              <button type="button" id="adminRxAddLine" class="text-sm font-medium text-teal-600 hover:text-teal-700">
                <i class="fas fa-plus mr-1"></i> Add Drug
              </button>
            </div>
            <div id="adminRxLinesContainer" class="space-y-3">
              <!-- Lines injected here -->
            </div>
          </div>
          <div class="flex gap-3 pt-4 border-t border-slate-200">
            <button type="submit" class="flex-1 rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700">
              Save Prescription & Generate Bill
            </button>
            <button type="button" class="admin-prescription-modal-close rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Line template for add
    this._lineTemplate = (idx) => {
      const drugs = inventoryService.getAll();
      const options = drugs.map((d) =>
        `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`
      ).join('');
      return `
        <div class="admin-rx-line flex gap-2 items-end" data-line-idx="${idx}">
          <div class="flex-1">
            <select class="admin-rx-drug w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required>
              <option value="">Select drug…</option>
              ${options}
            </select>
          </div>
          <div class="w-24">
            <input type="number" class="admin-rx-qty w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" min="1" value="1" required>
          </div>
          <button type="button" class="admin-rx-remove rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600" data-remove-idx="${idx}" aria-label="Remove line">
            <i class="fas fa-trash text-sm"></i>
          </button>
        </div>
      `;
    };
  }

  _wireOpenButton() {
    document.querySelectorAll('[data-open-prescription-modal]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      });
    });
  }

  _wireForm() {
    const form = document.getElementById('adminPrescriptionForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this._save();
    });
  }

  _wireAddLine() {
    const btn = document.getElementById('adminRxAddLine');
    const container = document.getElementById('adminRxLinesContainer');
    if (!btn || !container) return;

    btn.addEventListener('click', () => {
      const idx = this._lines.length;
      this._lines.push({ medication: '', qty: 1 });
      container.insertAdjacentHTML('beforeend', this._lineTemplate(idx));
      this._wireLineRemove(container.querySelector(`[data-line-idx="${idx}"]`));
    });
  }

  _wireLineRemove(lineEl) {
    if (!lineEl) return;
    const removeBtn = lineEl.querySelector('.admin-rx-remove');
    const idx = parseInt(lineEl.getAttribute('data-line-idx') || '0', 10);
    removeBtn?.addEventListener('click', () => {
      this._lines.splice(idx, 1);
      lineEl.remove();
    });
  }

  _wireClose() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;

    const close = () => this.close();
    modal.querySelectorAll('.admin-prescription-modal-close').forEach((btn) => {
      btn.addEventListener('click', close);
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') close();
    });
  }

  open() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;

    this._lines = [{ medication: '', qty: 1 }];
    const container = document.getElementById('adminRxLinesContainer');
    if (container) {
      container.innerHTML = this._lineTemplate(0);
      this._wireLineRemove(container.querySelector('[data-line-idx="0"]'));
    }

    const patientSelect = document.getElementById('adminRxPatient');
    if (patientSelect) {
      const appointments = appointmentService.getAll();
      const patients = [...new Map(appointments.map((a) => [a.patientId, { id: a.patientId, name: a.patientName }])).values()];
      patientSelect.innerHTML = '<option value="">Select patient…</option>' +
        patients.map((p) => `<option value="${escapeHtml(p.id)}" data-name="${escapeHtml(p.name || '')}">${escapeHtml(p.name || p.id)} (${escapeHtml(p.id)})</option>`).join('');
    }

    document.getElementById('adminRxDiagnosis').value = '';
    document.getElementById('adminRxNotes').value = '';

    modal.setAttribute('aria-hidden', 'false');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.display = 'flex';
  }

  close() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.style.display = 'none';
  }

  _save() {
    const patientSelect = document.getElementById('adminRxPatient');
    const patientId = patientSelect?.value?.trim();
    const patientName = patientSelect?.selectedOptions?.[0]?.getAttribute('data-name') || patientId || 'Unknown';
    const diagnosis = document.getElementById('adminRxDiagnosis')?.value?.trim();
    const clinicalNotes = document.getElementById('adminRxNotes')?.value?.trim();

    const lines = [];
    document.querySelectorAll('.admin-rx-line').forEach((lineEl) => {
      const drug = lineEl.querySelector('.admin-rx-drug')?.value?.trim();
      const qty = parseInt(lineEl.querySelector('.admin-rx-qty')?.value || '1', 10);
      if (drug && qty > 0) lines.push({ medication: drug, qty });
    });

    if (!patientId || lines.length === 0) {
      showToast({ message: 'Please select a patient and add at least one drug.', type: 'error' });
      return;
    }

    PrescriptionManager.prescribe({
      patientId,
      patientName,
      diagnosis,
      clinicalNotes,
      lines,
      doctorId: AppState.get('userSession')?.staffId,
    });

    showToast({ message: 'Prescription saved and bill generated.', type: 'success' });
    this.close();
  }
}

const adminPrescriptionModal = new AdminPrescriptionModal();
export { AdminPrescriptionModal };
export default adminPrescriptionModal;

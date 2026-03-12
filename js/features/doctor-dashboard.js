/**
 * @file Doctor Dashboard controller.
 * Appointment queue (Accept / Reject / Consult), consultation modal with
 * Clinical Notes and eRx generator; split-pane queue + patient history.
 */

import AppState from '../core/app-state.js';
import appointmentService from '../services/appointment-service.js';
import prescriptionService from '../services/prescription-service.js';
import inventoryService from '../services/inventory-service.js';
import { renderTable, showToast } from '../core/ui-components.js';

/** @typedef {import('../services/appointment-service.js').Appointment} Appointment */
/** @typedef {import('../services/prescription-service.js').Prescription} Prescription */
/** @typedef {import('../services/prescription-service.js').PrescriptionLine} PrescriptionLine */

const STATUS_BADGES = {
  waiting: 'bg-primary text-white',
  'in-consultation': 'bg-warning text-dark',
  completed: 'bg-success text-white',
  rejected: 'bg-secondary text-white',
};

class DoctorDashboard {
  constructor() {
    /** @type {Appointment | null} */
    this._selectedAppointment = null;
    /** @type {PrescriptionLine[]} */
    this._erxLines = [];
    /** @type {boolean} */
    this._initialized = false;
  }

  /**
   * Initialize queue rendering and modal wiring.
   */
  init() {
    if (this._initialized) return;
    this._initialized = true;
    if (typeof document === 'undefined') return;

    this._renderQueue();
    this._renderPatientHistory();
    this._renderPrescriptionsList();
    this._subscribeAppointments();
    this._subscribePrescriptions();
    this._ensureConsultationModal();
    this._wireConsultButton();
  }

  _subscribeAppointments() {
    AppState.subscribe('appointments', () => {
      this._renderQueue();
      this._renderPatientHistory();
    });
  }

  _subscribePrescriptions() {
    AppState.subscribe('prescriptions', () => {
      this._renderPrescriptionsList();
      this._renderPatientHistory();
    });
  }

  _renderPrescriptionsList() {
    const container = document.getElementById('doctorPrescriptionsList');
    if (!container) return;
    const list = prescriptionService.getAll();
    if (list.length === 0) {
      container.innerHTML = '<p class="text-secondary small mb-0">No prescriptions yet.</p>';
      return;
    }
    container.innerHTML = list.map((rx) => `
      <div class="card shadow-sm mb-2">
        <div class="card-body py-2">
          <div class="d-flex justify-content-between align-items-center">
            <strong>${this._escape(rx.patientName)}</strong>
            <span class="badge ${rx.status === 'pending' ? 'bg-warning text-dark' : 'bg-success'}">${rx.status}</span>
          </div>
          <p class="small text-secondary mb-1">${this._formatDate(rx.createdAt)}</p>
          ${rx.diagnosis ? `<p class="small mb-1">Diagnosis: ${this._escape(rx.diagnosis)}</p>` : ''}
          <ul class="small mb-0">${(rx.lines || []).map((l) => `<li>${this._escape(l.medication)} × ${l.qty}</li>`).join('')}</ul>
        </div>
      </div>
    `).join('');
  }

  _renderQueue() {
    const container = document.getElementById('doctorQueueContainer');
    if (!container) return;

    const appointments = appointmentService.getAll();

    renderTable({
      containerId: 'doctorQueueContainer',
      columns: ['Patient', 'Department', 'Time', 'Status', 'Actions'],
      data: appointments,
      rowTemplate: (row) => this._queueRowTemplate(/** @type {Appointment} */ (row)),
    });

    container.querySelectorAll('.js-consult').forEach((btn) => {
      btn.addEventListener('click', () => this._openConsult(btn.getAttribute('data-apt-id')));
    });
    container.querySelectorAll('.js-accept').forEach((btn) => {
      btn.addEventListener('click', () => this._setStatus(btn.getAttribute('data-apt-id'), 'in-consultation'));
    });
    container.querySelectorAll('.js-reject').forEach((btn) => {
      btn.addEventListener('click', () => this._setStatus(btn.getAttribute('data-apt-id'), 'rejected'));
    });
  }

  _queueRowTemplate(apt) {
    const badgeClass = STATUS_BADGES[apt.status] || 'bg-secondary';
    const name = this._escape(apt.patientName || '—');
    const dept = this._escape(apt.department || '—');
    const time = this._escape(apt.time || '—');
    const status = (apt.status || 'waiting').replace(/-/g, ' ');
    return `
      <tr>
        <td><span class="fw-semibold">${name}</span><br><span class="small text-secondary">${this._escape(apt.patientId || '')}</span></td>
        <td>${dept}</td>
        <td>${time}</td>
        <td><span class="badge ${badgeClass}">${status}</span></td>
        <td>
          <div class="d-flex gap-1 flex-wrap">
            ${apt.status === 'waiting' ? `<button type="button" class="btn btn-sm btn-outline-primary js-accept" data-apt-id="${this._escape(apt.id)}">Accept</button>` : ''}
            ${apt.status === 'waiting' ? `<button type="button" class="btn btn-sm btn-outline-secondary js-reject" data-apt-id="${this._escape(apt.id)}">Reject</button>` : ''}
            ${apt.status !== 'rejected' && apt.status !== 'completed' ? `<button type="button" class="btn btn-sm btn-primary js-consult" data-apt-id="${this._escape(apt.id)}">Consult</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }

  _setStatus(aptId, status) {
    if (!aptId) return;
    appointmentService.updateStatus(aptId, status);
    showToast({ message: `Appointment ${status.replace(/-/g, ' ')}`, type: 'success' });
  }

  _wireConsultButton() {
    document.querySelectorAll('.js-consult').forEach((btn) => {
      btn.addEventListener('click', () => this._openConsult(btn.getAttribute('data-apt-id')));
    });
  }

  _openConsult(aptId) {
    if (!aptId) return;
    const apt = appointmentService.getById(aptId);
    if (!apt) return;

    appointmentService.updateStatus(aptId, 'in-consultation');
    this._selectedAppointment = apt;
    this._erxLines = [];

    const modal = document.getElementById('doctorConsultationModal');
    if (!modal) return;

    const nameEl = modal.querySelector('[data-consult-patient]');
    const notesEl = modal.querySelector('#doctorClinicalNotes');
    const diagnosisEl = modal.querySelector('#doctorDiagnosis');
    const drugSelect = modal.querySelector('#doctorDrugSelect');
    const qtyInput = modal.querySelector('#doctorErxQty');
    const linesContainer = modal.querySelector('#doctorErxLines');

    if (nameEl) nameEl.textContent = apt.patientName || 'Patient';
    if (notesEl instanceof HTMLTextAreaElement) notesEl.value = apt.notes || '';
    if (diagnosisEl instanceof HTMLInputElement) diagnosisEl.value = '';

    this._fillDrugSelect(drugSelect);
    if (qtyInput instanceof HTMLInputElement) qtyInput.value = '1';
    if (linesContainer) linesContainer.innerHTML = '';

    modal.setAttribute('data-apt-id', aptId);
    const Modal = window.bootstrap?.Modal;
    if (Modal) Modal.getOrCreateInstance(modal).show();

    this._renderPatientHistory();
  }

  _ensureConsultationModal() {
    let modal = document.getElementById('doctorConsultationModal');
    if (modal) return modal;

    const inventory = inventoryService.getAll();
    const options = inventory
      .filter((d) => (Number(d.qty) || 0) > 0)
      .map((d) => `<option value="${this._escape(d.name || '')}" data-max="${d.qty}">${this._escape(d.name || '')} (${d.qty} in stock)</option>`)
      .join('');

    modal = document.createElement('div');
    modal.id = 'doctorConsultationModal';
    modal.className = 'modal fade';
    modal.setAttribute('tabindex', '-1');
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content shadow-lg">
          <div class="modal-header">
            <h5 class="modal-title">Consultation & eRx</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p class="mb-2 small text-secondary">Patient</p>
            <p class="fw-semibold mb-3" data-consult-patient></p>
            <div class="mb-3">
              <label class="form-label" for="doctorClinicalNotes">Clinical Notes</label>
              <textarea class="form-control" id="doctorClinicalNotes" rows="3" placeholder="Notes..."></textarea>
            </div>
            <div class="mb-3">
              <label class="form-label" for="doctorDiagnosis">Diagnosis</label>
              <input type="text" class="form-control" id="doctorDiagnosis" placeholder="Diagnosis">
            </div>
            <hr>
            <h6 class="mb-2">Electronic Prescription (eRx)</h6>
            <p class="small text-secondary mb-2">Select medication (quantity cannot exceed stock).</p>
            <div class="row g-2 mb-2">
              <div class="col-md-7">
                <select class="form-select" id="doctorDrugSelect">${options}</select>
              </div>
              <div class="col-md-3">
                <input type="number" class="form-control" id="doctorErxQty" min="1" value="1" placeholder="Qty">
              </div>
              <div class="col-md-2">
                <button type="button" class="btn btn-outline-primary w-100" id="doctorErxAddLine">Add</button>
              </div>
            </div>
            <div id="doctorErxLines" class="mb-3"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="doctorSendToPharmacy">
              <i class="fas fa-paper-plane me-1"></i> Send to Pharmacy
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const addBtn = modal.querySelector('#doctorErxAddLine');
    const sendBtn = modal.querySelector('#doctorSendToPharmacy');
    const drugSelect = modal.querySelector('#doctorDrugSelect');
    const qtyInput = modal.querySelector('#doctorErxQty');

    if (addBtn) {
      addBtn.addEventListener('click', () => this._addErxLine(modal));
    }
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this._sendToPharmacy(modal));
    }
    if (drugSelect) {
      drugSelect.addEventListener('change', () => this._updateErxQtyMax(modal));
    }
    this._updateErxQtyMax(modal);

    return modal;
  }

  _fillDrugSelect(select) {
    if (!select) return;
    const drugs = inventoryService.getAll().filter((d) => (Number(d.qty) || 0) > 0);
    select.innerHTML = '<option value="">Select medication</option>' +
      drugs.map((d) => `<option value="${this._escape(d.name || '')}" data-max="${d.qty}">${this._escape(d.name || '')} (${d.qty})</option>`).join('');
  }

  _updateErxQtyMax(modal) {
    const select = modal?.querySelector('#doctorDrugSelect');
    const qtyInput = modal?.querySelector('#doctorErxQty');
    if (!select || !(qtyInput instanceof HTMLInputElement)) return;
    const opt = select.selectedOptions[0];
    const max = opt ? parseInt(opt.getAttribute('data-max') || '0', 10) : 0;
    qtyInput.max = String(max);
    if (Number(qtyInput.value) > max) qtyInput.value = String(max);
  }

  _addErxLine(modal) {
    const select = modal.querySelector('#doctorDrugSelect');
    const qtyInput = modal.querySelector('#doctorErxQty');
    const linesContainer = modal.querySelector('#doctorErxLines');
    if (!select || !qtyInput || !linesContainer) return;

    const medication = select.value?.trim();
    const qty = Math.max(0, parseInt(qtyInput.value || '0', 10));
    const max = parseInt(select.selectedOptions[0]?.getAttribute('data-max') || '0', 10);
    const actualQty = Math.min(qty, max);
    if (!medication || actualQty <= 0) return;

    this._erxLines.push({ medication, qty: actualQty });
    this._renderErxLines(modal);
    if (qtyInput instanceof HTMLInputElement) qtyInput.value = '1';
    this._updateErxQtyMax(modal);
  }

  _renderErxLines(modal) {
    const container = modal?.querySelector('#doctorErxLines');
    if (!container) return;
    container.innerHTML = this._erxLines
      .map((line, i) => `
        <div class="d-flex align-items-center justify-content-between py-1 border-bottom">
          <span>${this._escape(line.medication)} × ${line.qty}</span>
          <button type="button" class="btn btn-sm btn-outline-danger js-erx-remove" data-index="${i}">Remove</button>
        </div>
      `).join('');
    container.querySelectorAll('.js-erx-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index') || '0', 10);
        this._erxLines.splice(idx, 1);
        this._renderErxLines(modal);
      });
    });
  }

  _sendToPharmacy(modal) {
    const aptId = modal.getAttribute('data-apt-id');
    const apt = aptId ? appointmentService.getById(aptId) : this._selectedAppointment;
    if (!apt) return;

    const notesEl = modal.querySelector('#doctorClinicalNotes');
    const diagnosisEl = modal.querySelector('#doctorDiagnosis');
    const clinicalNotes = notesEl instanceof HTMLTextAreaElement ? notesEl.value.trim() : '';
    const diagnosis = diagnosisEl instanceof HTMLInputElement ? diagnosisEl.value.trim() : '';

    if (this._erxLines.length === 0) {
      showToast({ message: 'Add at least one medication to send a prescription.', type: 'warning' });
      return;
    }

    prescriptionService.create({
      patientId: apt.patientId,
      patientName: apt.patientName,
      diagnosis: diagnosis || undefined,
      clinicalNotes: clinicalNotes || undefined,
      lines: this._erxLines,
    });

    if (aptId) {
      appointmentService.updateStatus(aptId, 'completed');
      appointmentService.updateNotes(aptId, { notes: clinicalNotes });
    }

    const Modal = window.bootstrap?.Modal;
    if (Modal) Modal.getInstance(modal)?.hide();
    showToast({ message: 'Prescription sent to Pharmacy.', type: 'success' });
    this._renderQueue();
    this._renderPatientHistory();
  }

  _renderPatientHistory() {
    const container = document.getElementById('doctorPatientHistory');
    if (!container) return;

    const apt = this._selectedAppointment;
    if (!apt) {
      container.innerHTML = '<p class="text-secondary small mb-0">Select a patient from the queue or start a consultation to view history.</p>';
      return;
    }

    const prescriptions = prescriptionService.getByPatient(apt.patientId);
    if (prescriptions.length === 0) {
      container.innerHTML = `<p class="text-secondary small mb-0">No prescriptions yet for ${this._escape(apt.patientName)}.</p>`;
      return;
    }

    container.innerHTML = `
      <h6 class="mb-2">History for ${this._escape(apt.patientName)}</h6>
      ${prescriptions.map((rx) => `
        <div class="card shadow-sm mb-2">
          <div class="card-body py-2">
            <div class="d-flex justify-content-between align-items-start">
              <span class="badge ${rx.status === 'pending' ? 'bg-warning' : 'bg-success'}">${rx.status}</span>
              <span class="small text-secondary">${this._formatDate(rx.createdAt)}</span>
            </div>
            ${rx.diagnosis ? `<p class="small mb-1 mt-1"><strong>Diagnosis:</strong> ${this._escape(rx.diagnosis)}</p>` : ''}
            <ul class="small mb-0">${(rx.lines || []).map((l) => `<li>${this._escape(l.medication)} × ${l.qty}</li>`).join('')}</ul>
          </div>
        </div>
      `).join('')}
    `;
  }

  _formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { dateStyle: 'short' });
  }

  _escape(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
}

const doctorDashboard = new DoctorDashboard();
export { DoctorDashboard };
export default doctorDashboard;

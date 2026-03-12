/**
 * @deprecated Use js/services/prescription-service.js and js/features/pharmacy-dashboard.js. See js/legacy/README.md.
 * Pharmacy Prescriptions - Pending orders (legacy IIFE)
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'hms_pending_prescriptions';

  function getPrescriptions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : getMockPrescriptions();
    } catch {
      return getMockPrescriptions();
    }
  }

  function getMockPrescriptions() {
    return [
      { id: 'rx1', patient: 'Robert Johnson', patientId: 'RJ-20240524', medication: 'Lisinopril 10mg', qty: 30, status: 'pending' },
      { id: 'rx2', patient: 'Emily Rodriguez', patientId: 'ER-20240210', medication: 'Amoxicillin 500mg', qty: 21, status: 'pending' },
      { id: 'rx3', patient: 'David Chen', patientId: 'DC-20240201', medication: 'Metformin 500mg', qty: 60, status: 'pending' },
      { id: 'rx4', patient: 'Sarah Williams', patientId: 'SW-20240315', medication: 'Paracetamol 500mg', qty: 20, status: 'pending' },
      { id: 'rx5', patient: 'Michael Brown', patientId: 'MB-20240401', medication: 'Ibuprofen 400mg', qty: 14, status: 'pending' },
    ];
  }

  function savePrescriptions(prescriptions) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prescriptions));
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function showSuccessToast(message) {
    const container = document.getElementById('pharmacyToastContainer');
    if (!container) return;
    const toastEl = document.createElement('div');
    toastEl.className = 'toast align-items-center text-bg-success border-0';
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          <i class="fas fa-check-circle me-2"></i>${escapeHtml(message)}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;
    container.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
  }

  function decrementInventoryForMedication(medication, amount) {
    if (!window.HMSInventory || !window.HMSInventory.getDrugs || !window.HMSInventory.saveDrugs) return;
    const drugs = window.HMSInventory.getDrugs();
    const drug = drugs.find((d) => d.name.toLowerCase().includes(medication.toLowerCase().split(' ')[0]));
    if (drug && drug.qty > 0) {
      drug.qty = Math.max(0, drug.qty - amount);
      window.HMSInventory.saveDrugs(drugs);
      if (window.HMSInventory.render) window.HMSInventory.render();
    }
  }

  function handleDispense(rxId) {
    const prescriptions = getPrescriptions();
    const idx = prescriptions.findIndex((p) => p.id === rxId);
    if (idx === -1) return;

    const rx = prescriptions[idx];
    prescriptions[idx].status = 'dispensed';
    savePrescriptions(prescriptions);
    render();

    decrementInventoryForMedication(rx.medication, 1);
    showSuccessToast('Prescription dispensed successfully for ' + rx.patient);

    if (window.HMSInventory && typeof window.HMSInventory.render === 'function') {
      window.HMSInventory.render();
    }
  }

  function render() {
    const tbody = document.getElementById('pendingPrescriptionsBody');
    if (!tbody) return;

    const prescriptions = getPrescriptions().filter((p) => p.status === 'pending');
    if (prescriptions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary py-4">No pending prescriptions</td></tr>';
      return;
    }

    tbody.innerHTML = prescriptions.map((rx) => `
      <tr data-id="${escapeHtml(rx.id)}">
        <td>
          <div class="fw-semibold">${escapeHtml(rx.patient)}</div>
          <div class="small text-secondary">${escapeHtml(rx.patientId)}</div>
        </td>
        <td>${escapeHtml(rx.medication)}</td>
        <td>${rx.qty}</td>
        <td>
          <button type="button" class="btn btn-primary btn-sm btn-dispense" data-rx-id="${escapeHtml(rx.id)}">
            <i class="fas fa-check me-1"></i> Dispense
          </button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-dispense').forEach((btn) => {
      btn.addEventListener('click', function() {
        const id = this.getAttribute('data-rx-id');
        if (id) handleDispense(id);
      });
    });
  }

  function init() {
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.HMSPharmacyPrescriptions = { getPrescriptions, savePrescriptions, render, handleDispense };
})();

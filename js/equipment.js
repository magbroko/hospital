/**
 * @deprecated Use js/services/equipment-service.js and js/features/admin-dashboard.js. See js/legacy/README.md.
 * Equipment Ledger - Hospital hardware tracking (legacy IIFE)
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'hms_equipment';

  function getEquipment() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : getDefaultEquipment();
    } catch {
      return getDefaultEquipment();
    }
  }

  function getDefaultEquipment() {
    return [
      { id: 'EQ-001', name: 'MRI Scanner', location: 'Radiology', status: 'Operational' },
      { id: 'EQ-002', name: 'CT Scanner', location: 'Radiology', status: 'Operational' },
      { id: 'EQ-003', name: 'Ventilator Unit', location: 'ICU', status: 'In Use' },
      { id: 'EQ-004', name: 'ECG Monitor', location: 'Cardiology', status: 'Operational' },
      { id: 'EQ-005', name: 'Ultrasound Machine', location: 'Imaging', status: 'Maintenance' },
      { id: 'EQ-006', name: 'Defibrillator', location: 'ER', status: 'Operational' },
    ];
  }

  function saveEquipment(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function render() {
    const tbody = document.getElementById('equipmentBody');
    if (!tbody) return;

    const items = getEquipment();
    tbody.innerHTML = items.map((e) => `
      <tr>
        <td><strong>${escapeHtml(e.id)}</strong></td>
        <td>${escapeHtml(e.name)}</td>
        <td>${escapeHtml(e.location)}</td>
        <td><span class="badge ${e.status === 'Operational' ? 'bg-success' : e.status === 'In Use' ? 'bg-primary' : 'bg-warning text-dark'}">${escapeHtml(e.status)}</span></td>
      </tr>
    `).join('');
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function openAddModal() {
    const id = prompt('Asset ID (e.g. EQ-007):');
    if (!id) return;
    const name = prompt('Equipment name:');
    if (!name) return;
    const location = prompt('Location:');
    if (!location) return;
    const status = prompt('Status (Operational / In Use / Maintenance):') || 'Operational';

    const items = getEquipment();
    items.push({ id, name, location, status });
    saveEquipment(items);
    render();
  }

  function init() {
    render();
    document.getElementById('btnAddEquipment')?.addEventListener('click', openAddModal);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.HMSEquipment = { getEquipment, saveEquipment, render };
})();

/**
 * @deprecated Use js/services/inventory-service.js and js/features/admin-dashboard.js or pharmacy-dashboard.js. See js/legacy/README.md.
 * Drug Inventory Manager - Pharmacy (legacy IIFE)
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'hms_drug_inventory';
  const NEAR_EXPIRY_DAYS = 30;

  function getDrugs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : getDefaultDrugs();
    } catch {
      return getDefaultDrugs();
    }
  }

  function getDefaultDrugs() {
    const today = new Date();
    const addDays = (d, n) => {
      const x = new Date(d);
      x.setDate(x.getDate() + n);
      return x;
    };
    return [
      { id: '1', name: 'Paracetamol 500mg', qty: 250, expiryDate: addDays(today, 90).toISOString().slice(0, 10) },
      { id: '2', name: 'Amoxicillin 500mg', qty: 120, expiryDate: addDays(today, 45).toISOString().slice(0, 10) },
      { id: '3', name: 'Ibuprofen 400mg', qty: 200, expiryDate: addDays(today, 15).toISOString().slice(0, 10) },
      { id: '4', name: 'Metformin 850mg', qty: 90, expiryDate: addDays(today, 120).toISOString().slice(0, 10) },
      { id: '5', name: 'Lisinopril 10mg', qty: 150, expiryDate: addDays(today, 8).toISOString().slice(0, 10) },
      { id: '6', name: 'Omeprazole 20mg', qty: 80, expiryDate: addDays(today, 60).toISOString().slice(0, 10) },
      { id: '7', name: 'IV Saline 0.9%', qty: 120, expiryDate: addDays(today, 25).toISOString().slice(0, 10) },
    ];
  }

  function saveDrugs(drugs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drugs));
  }

  function isNearExpiry(expiryDateStr) {
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= NEAR_EXPIRY_DAYS;
  }

  function isExpired(expiryDateStr) {
    return new Date(expiryDateStr) < new Date();
  }

  function getStatus(expiryDateStr) {
    if (isExpired(expiryDateStr)) return 'Expired';
    if (isNearExpiry(expiryDateStr)) return 'Near Expiry';
    return 'In Stock';
  }

  function formatDate(str) {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function render() {
    const tbody = document.getElementById('drugInventoryBody');
    if (!tbody) return;

    const drugs = getDrugs();
    tbody.innerHTML = drugs.map((d) => {
      const nearExpiry = isNearExpiry(d.expiryDate);
      const status = getStatus(d.expiryDate);
      const rowClass = nearExpiry ? 'drug-row near-expiry text-warning' : 'drug-row';
      return `<tr class="${rowClass}" data-id="${d.id}">
        <td>${escapeHtml(d.name)}</td>
        <td>${d.qty}</td>
        <td>${formatDate(d.expiryDate)}</td>
        <td><span class="badge ${status === 'Expired' ? 'bg-danger' : status === 'Near Expiry' ? 'bg-warning text-dark' : 'bg-success'}">${status}</span></td>
      </tr>`;
    }).join('');
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function openAddModal() {
    const name = prompt('Drug name:');
    if (!name) return;
    const qty = parseInt(prompt('Quantity:') || '0', 10);
    if (isNaN(qty) || qty < 0) return;
    const expiry = prompt('Expiry date (YYYY-MM-DD):');
    if (!expiry) return;

    const drugs = getDrugs();
    const id = String(Date.now());
    drugs.push({ id, name, qty, expiryDate: expiry });
    saveDrugs(drugs);
    render();
  }

  function init() {
    render();
    const btn = document.getElementById('btnAddDrug');
    if (btn) btn.addEventListener('click', openAddModal);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.HMSInventory = { getDrugs, saveDrugs, render };
})();

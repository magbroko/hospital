/**
 * @deprecated Use js/services/billing-service.js and js/features/admin-dashboard.js. See js/legacy/README.md.
 * Billing Generation - Interactive (legacy IIFE)
 */
(function() {
  'use strict';

  const TAX_RATE = 0.08;
  const STORAGE_KEY = 'hms_billing_items';

  function getItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function addItem(desc, qty, price) {
    const items = getItems();
    items.push({ id: Date.now(), desc, qty: parseInt(qty, 10) || 1, price: parseFloat(price) || 0 });
    saveItems(items);
    render();
  }

  function removeItem(id) {
    const items = getItems().filter((i) => i.id !== id);
    saveItems(items);
    render();
  }

  function clearItems() {
    saveItems([]);
    render();
  }

  function calcTotals(items) {
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }

  function formatMoney(n) {
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function updateInvoiceDate() {
    const el = document.getElementById('invoiceDate');
    if (el) el.textContent = 'Date: ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function render() {
    updateInvoiceDate();
    const tbody = document.getElementById('billingBody');
    const subEl = document.getElementById('billingSubtotal');
    const taxEl = document.getElementById('billingTax');
    const totalEl = document.getElementById('billingTotal');
    if (!tbody) return;

    const items = getItems();
    const { subtotal, tax, total } = calcTotals(items);

    tbody.innerHTML = items.map((i) => {
      const amount = i.qty * i.price;
      return `<tr data-id="${i.id}">
        <td>${escapeHtml(i.desc)}</td>
        <td>${i.qty}</td>
        <td>${formatMoney(i.price)}</td>
        <td>${formatMoney(amount)}</td>
        <td class="no-print"><button type="button" class="btn btn-sm btn-outline-danger remove-billing-item" data-id="${i.id}" aria-label="Remove item"><i class="fas fa-times"></i></button></td>
      </tr>`;
    }).join('');

    if (subEl) subEl.textContent = formatMoney(subtotal);
    if (taxEl) taxEl.textContent = formatMoney(tax);
    if (totalEl) totalEl.textContent = formatMoney(total);

    tbody.querySelectorAll('.remove-billing-item').forEach((btn) => {
      btn.addEventListener('click', () => removeItem(parseInt(btn.dataset.id, 10)));
    });
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function handleAdd() {
    const desc = document.getElementById('billingItem')?.value?.trim();
    const qty = document.getElementById('billingQty')?.value || '1';
    const price = document.getElementById('billingPrice')?.value || '0';
    if (!desc) return;
    addItem(desc, qty, price);
    document.getElementById('billingItem').value = '';
    document.getElementById('billingQty').value = '1';
    document.getElementById('billingPrice').value = '';
  }

  function printInvoice() {
    window.print();
  }

  function init() {
    render();
    document.getElementById('btnAddBillingItem')?.addEventListener('click', handleAdd);
    document.getElementById('btnPrintInvoice')?.addEventListener('click', printInvoice);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.HMSBilling = { getItems, addItem, removeItem, clearItems, render };
})();

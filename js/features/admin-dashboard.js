/**
 * @file Admin HMS Dashboard - overview, inventory, equipment, billing, expenses, case notes.
 * Uses services + AppState; renders via DOM and ui-components. Backup exports from AppState.
 */

import AppState from '../core/app-state.js';
import inventoryService from '../services/inventory-service.js';
import equipmentService from '../services/equipment-service.js';
import billingService from '../services/billing-service.js';
import expensesService, { EXPENSE_CATEGORIES } from '../services/expenses-service.js';
import caseNotesService from '../services/case-notes-service.js';
import analyticsService from '../services/analytics-service.js';
import { renderTable, showToast } from '../core/ui-components.js';

const NEAR_EXPIRY_DAYS = 30;

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatMoney(n) {
  return '$' + (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getExpiryRowClass(expiryStr) {
  if (!expiryStr) return '';
  const expiry = new Date(expiryStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  if (expiry < today) return 'table-danger';
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays <= NEAR_EXPIRY_DAYS) return 'table-warning';
  return '';
}

function getExpiryBadgeClass(expiryStr) {
  if (!expiryStr) return 'bg-secondary';
  const expiry = new Date(expiryStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  if (expiry < today) return 'bg-danger text-white';
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays <= NEAR_EXPIRY_DAYS) return 'bg-warning text-dark';
  return 'bg-success';
}

class AdminDashboard {
  constructor() {
    this._initialized = false;
  }

  init() {
    if (this._initialized || typeof document === 'undefined') return;
    this._initialized = true;

    AppState.subscribe('inventory', () => { this._renderInventory(); this._renderAnalyticsCards(); });
    AppState.subscribe('equipment', () => this._renderEquipment());
    AppState.subscribe('billing', () => { this._renderBilling(); this._renderAnalyticsCards(); });
    AppState.subscribe('expenses', () => { this._renderExpenses(); this._renderAnalyticsCards(); });
    AppState.subscribe('caseNotes', () => this._renderCaseNotes());
    AppState.subscribe('appointments', () => this._renderAnalyticsCards());
    AppState.subscribe('prescriptions', () => this._renderAnalyticsCards());

    this._renderAnalyticsCards();
    this._renderInventory();
    this._renderEquipment();
    this._renderBilling();
    this._renderExpenses();
    this._renderCaseNotes();

    this._wireBillingForm();
    this._wireCaseNotesInput();
    this._wireBackup();
    this._wireAddDrug();
    this._wireAddEquipment();
    this._wireAddExpense();
  }

  _renderAnalyticsCards() {
    const container = document.getElementById('adminAnalyticsCards');
    if (!container) return;

    const { totalRevenue } = analyticsService.getRevenueSummary();
    const { completed, rejected, completionRate, active } = analyticsService.getStaffEfficiency();
    const { critical } = analyticsService.getInventoryHealth();
    const totalPatients = analyticsService.getTotalPatientsServed();

    const revenueTarget = 20000;
    const revenueProgress = Math.max(0, Math.min(100, Math.round((totalRevenue / revenueTarget) * 100)));

    const efficiencyPercent = Math.round(completionRate * 100);

    const cards = [
      {
        title: 'Total Revenue',
        value: formatMoney(totalRevenue),
        subtitle: 'Target: ' + formatMoney(revenueTarget),
        progress: revenueProgress,
        progressLabel: `${revenueProgress}% of monthly target`,
      },
      {
        title: 'Active Appointments',
        value: String(active),
        subtitle: `Completed vs Rejected: ${completed}/${rejected}`,
        progress: efficiencyPercent,
        progressLabel: `${efficiencyPercent}% completion rate`,
      },
      {
        title: 'Critical Inventory',
        value: String(critical),
        subtitle: 'Low stock / near expiry / expired',
        progress: Math.max(0, Math.min(100, critical * 5)),
        progressLabel: 'Inventory risk index',
      },
      {
        title: 'Patients Served',
        value: String(totalPatients),
        subtitle: 'Unique patients with appointments',
        progress: Math.max(0, Math.min(100, totalPatients * 3)),
        progressLabel: 'Population coverage (relative)',
      },
    ];

    container.innerHTML = cards.map((card) => `
      <div class="col-12 col-sm-6 col-xl-3">
        <div class="hms-card h-100 d-flex flex-column justify-content-between shadow-sm">
          <div>
            <p class="text-secondary small mb-1">${escapeHtml(card.title)}</p>
            <p class="h4 mb-1">${escapeHtml(card.value)}</p>
            <p class="small text-muted mb-2">${escapeHtml(card.subtitle)}</p>
          </div>
          <div>
            <div class="progress" style="height: 4px;">
              <div class="progress-bar bg-primary" role="progressbar" style="width: ${card.progress}%"></div>
            </div>
            <p class="small text-secondary mt-1 mb-0">${escapeHtml(card.progressLabel)}</p>
          </div>
        </div>
      </div>
    `).join('');
  }

  _renderInventory() {
    const tbody = document.getElementById('drugInventoryBody');
    if (!tbody) return;
    const items = inventoryService.getAll();
    tbody.innerHTML = items.map((item) => {
      const rowClass = getExpiryRowClass(item.expiryDate);
      const badgeClass = getExpiryBadgeClass(item.expiryDate);
      const status = !item.expiryDate ? 'In Stock' : new Date(item.expiryDate) < new Date() ? 'Expired' : 'In Stock';
      return `<tr class="${rowClass}">
        <td>${escapeHtml(item.name)}</td>
        <td>${item.qty}</td>
        <td>${formatDate(item.expiryDate)}</td>
        <td><span class="badge ${badgeClass}">${status}</span></td>
      </tr>`;
    }).join('');
  }

  _renderEquipment() {
    const tbody = document.getElementById('equipmentBody');
    if (!tbody) return;
    const items = equipmentService.getAll();
    tbody.innerHTML = items.map((e) => {
      const badgeClass = e.status === 'Operational' ? 'bg-success' : e.status === 'In Use' ? 'bg-primary' : 'bg-warning text-dark';
      return `<tr>
        <td><strong>${escapeHtml(e.id)}</strong></td>
        <td>${escapeHtml(e.name)}</td>
        <td>${escapeHtml(e.location)}</td>
        <td><span class="badge ${badgeClass}">${escapeHtml(e.status)}</span></td>
      </tr>`;
    }).join('');
  }

  _renderBilling() {
    const items = billingService.getAll();
    const { subtotal, tax, total } = billingService.calcTotals(items);
    const dateEl = document.getElementById('invoiceDate');
    if (dateEl) dateEl.textContent = 'Date: ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const tbody = document.getElementById('billingBody');
    if (tbody) {
      tbody.innerHTML = items.map((i) => {
        const amount = i.qty * i.price;
        return `<tr data-id="${i.id}">
          <td>${escapeHtml(i.desc)}</td>
          <td>${i.qty}</td>
          <td>${formatMoney(i.price)}</td>
          <td>${formatMoney(amount)}</td>
          <td class="no-print"><button type="button" class="btn btn-sm btn-outline-danger js-remove-billing" data-id="${i.id}" aria-label="Remove"><i class="fas fa-times"></i></button></td>
        </tr>`;
      }).join('');
      tbody.querySelectorAll('.js-remove-billing').forEach((btn) => {
        btn.addEventListener('click', () => billingService.removeItem(Number(btn.getAttribute('data-id'))));
      });
    }
    const subEl = document.getElementById('billingSubtotal');
    const taxEl = document.getElementById('billingTax');
    const totalEl = document.getElementById('billingTotal');
    if (subEl) subEl.textContent = formatMoney(subtotal);
    if (taxEl) taxEl.textContent = formatMoney(tax);
    if (totalEl) totalEl.textContent = formatMoney(total);
  }

  _wireBillingForm() {
    const addBtn = document.getElementById('btnAddBillingItem');
    const printBtn = document.getElementById('btnPrintInvoice');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const desc = document.getElementById('billingItem')?.value?.trim();
        const qty = document.getElementById('billingQty')?.value || '1';
        const price = document.getElementById('billingPrice')?.value || '0';
        if (!desc) return;
        billingService.addItem(desc, qty, price);
        const i = document.getElementById('billingItem');
        const q = document.getElementById('billingQty');
        const p = document.getElementById('billingPrice');
        if (i) i.value = '';
        if (q) q.value = '1';
        if (p) p.value = '';
      });
    }
    if (printBtn) printBtn.addEventListener('click', () => window.print());
  }

  _renderExpenses() {
    const grid = document.getElementById('expenseGrid');
    if (!grid) return;
    const expenses = expensesService.getAll();
    grid.innerHTML = EXPENSE_CATEGORIES.map((cat) => `
      <div class="hms-expense-card">
        <div class="expense-label">${escapeHtml(cat)}</div>
        <div class="expense-value">${formatMoney(expenses[cat])}</div>
      </div>
    `).join('');
  }

  _renderCaseNotes() {
    const container = document.getElementById('caseNotesTimeline');
    if (!container) return;
    const notes = caseNotesService.getAll();
    container.innerHTML = notes.map((n) => `
      <div class="hms-timeline-item" data-id="${n.id}">
        <div class="hms-timeline-dot"></div>
        <div class="hms-timeline-date">${formatDate(n.date)}</div>
        <div class="hms-timeline-content">${escapeHtml(n.text)}</div>
      </div>
    `).join('');
  }

  _wireCaseNotesInput() {
    const btn = document.getElementById('btnAddCaseNote');
    const input = document.getElementById('caseNoteInput');
    if (btn && input) {
      const add = () => {
        const text = input.value?.trim();
        if (text) {
          caseNotesService.addNote(text);
          input.value = '';
        }
      };
      btn.addEventListener('click', add);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    }
  }

  _wireBackup() {
    const btn = document.getElementById('btnBackup');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const state = AppState.getState();
      const data = {
        exportedAt: new Date().toISOString(),
        inventory: state.inventory,
        equipment: state.equipment,
        billing: state.billing,
        expenses: state.expenses,
        caseNotes: state.caseNotes,
        appointments: state.appointments,
        prescriptions: state.prescriptions,
      };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'medicare-hms-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      showToast({ message: 'Backup exported.', type: 'success' });
    });
  }

  _wireAddDrug() {
    const btn = document.getElementById('btnAddDrug');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const name = prompt('Drug name:');
      if (!name) return;
      const qty = parseInt(prompt('Quantity:') || '0', 10);
      if (!Number.isFinite(qty) || qty < 0) return;
      const expiry = prompt('Expiry date (YYYY-MM-DD):') || undefined;
      inventoryService.addMedication({ name: name.trim(), qty, expiryDate: expiry });
      showToast({ message: 'Medication added.', type: 'success' });
    });
  }

  _wireAddEquipment() {
    const btn = document.getElementById('btnAddEquipment');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const id = prompt('Asset ID (e.g. EQ-007):');
      if (!id) return;
      const name = prompt('Equipment name:');
      if (!name) return;
      const location = prompt('Location:');
      if (!location) return;
      const status = prompt('Status (Operational / In Use / Maintenance):') || 'Operational';
      equipmentService.add({ id: id.trim(), name: name.trim(), location: location.trim(), status });
      showToast({ message: 'Equipment added.', type: 'success' });
    });
  }

  _wireAddExpense() {
    const btn = document.getElementById('btnAddExpense');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const cat = prompt('Category: ' + EXPENSE_CATEGORIES.join(', '));
      if (!cat || !EXPENSE_CATEGORIES.includes(cat)) return;
      const amount = parseFloat(prompt('Amount ($):') || '0');
      if (!Number.isFinite(amount) || amount <= 0) return;
      expensesService.addExpense(cat, amount);
      showToast({ message: 'Expense logged.', type: 'success' });
    });
  }
}

const adminDashboard = new AdminDashboard();
export { AdminDashboard };
export default adminDashboard;

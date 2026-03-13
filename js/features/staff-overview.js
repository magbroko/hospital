/**
 * @file Staff Overview - data-driven KPIs and Recent Patients for the Staff Dashboard.
 * Subscribes to AppState; updates Total Patients, Bed Occupancy, Pending Lab Orders,
 * HMS critical count, dynamic Alert Banner, and Recent Patients table.
 */

import AppState from '../core/app-state.js';
import appointmentService from '../services/appointment-service.js';
import analyticsService from '../services/analytics-service.js';
import inventoryService from '../services/inventory-service.js';
import transactionLedgerService from '../services/transaction-ledger-service.js';
import { renderTable } from '../core/ui-components.js';

const BED_OCCUPANCY_DEFAULT = 84;
const PENDING_LAB_ORDERS_DEFAULT = 8;
/** Low-inventory threshold for alert banner and KPI (items with qty <= this are "low"; use 4 for "qty < 5"). */
const LOW_INVENTORY_THRESHOLD = 4;

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function statusBadgeClass(status) {
  switch (status) {
    case 'completed': return 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700';
    case 'rejected': return 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-700';
    case 'in-consultation': return 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-rose-50 text-rose-700';
    default: return 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-700';
  }
}

function statusLabel(status) {
  switch (status) {
    case 'completed': return 'Completed';
    case 'rejected': return 'Rejected';
    case 'in-consultation': return 'In Care';
    case 'waiting': return 'Awaiting';
    default: return status || '—';
  }
}

class StaffOverview {
  constructor() {
    this._initialized = false;
  }

  init() {
    if (this._initialized || typeof document === 'undefined') return;
    this._initialized = true;

    AppState.subscribe('appointments', () => {
      this._renderKPIs();
      this._renderRecentPatients();
      this._renderAlertBanner();
    });
    AppState.subscribe('inventory', () => {
      this._renderKPIs();
      this._renderAlertBanner();
      this._renderInventoryMonitor();
    });
    AppState.subscribe('transactionLedger', () => {
      this._renderKPIs();
      this._renderRevenue();
    });

    // Cross-tab sync: Pharmacy inventory updates reflect in Admin without refresh
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel('medicare_inventory');
      ch.onmessage = (e) => {
        const d = e?.data;
        if (d?.type === 'inventory_update' && Array.isArray(d.inventory)) {
          AppState.commit('inventory', d.inventory);
        }
      };
    }

    this._renderKPIs();
    this._renderRecentPatients();
    this._renderAlertBanner();
    this._renderRevenue();
    this._renderInventoryMonitor();
  }

  _renderInventoryMonitor() {
    const container = document.getElementById('adminInventoryMonitor');
    if (!container) return;
    const items = inventoryService.getAll();
    const lowStock = inventoryService.getLowStock(10);
    if (items.length === 0) {
      container.innerHTML = '<p class="text-sm text-slate-500">No inventory data. Pharmacy will populate stock.</p>';
      return;
    }
    const rows = items.slice(0, 8).map((item) => {
      const qty = Number(item.qty) || 0;
      const isLow = qty <= 10;
      const badge = isLow ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700';
      return `
        <div class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
          <span class="text-sm font-medium text-slate-800">${escapeHtml(item.name || '—')}</span>
          <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge}">${qty} units</span>
        </div>
      `;
    }).join('');
    const lowAlert = lowStock.length > 0
      ? `<p class="text-xs text-amber-600 font-medium mb-2"><i class="fas fa-exclamation-triangle mr-1"></i>${lowStock.length} low-stock item(s)</p>`
      : '';
    container.innerHTML = lowAlert + rows;
  }

  _renderRevenue() {
    const revenueEl = document.getElementById('adminRevenueTotal');
    if (!revenueEl) return;
    const revenue = transactionLedgerService.getTotalRevenue();
    revenueEl.textContent = `$${revenue.toFixed(2)}`;
  }

  _renderKPIs() {
    const totalPatients = analyticsService.getTotalPatientsServed();
    const lowInventoryCount = inventoryService.getLowStock(LOW_INVENTORY_THRESHOLD).length;

    const totalEl = document.getElementById('totalPatientsCount');
    const bedEl = document.getElementById('bedOccupancyCount');
    const labEl = document.getElementById('pendingLabOrdersCount');
    const hmsEl = document.getElementById('hmsCriticalCount');

    if (totalEl) totalEl.textContent = String(totalPatients);
    if (bedEl) bedEl.textContent = `${BED_OCCUPANCY_DEFAULT}%`;
    if (labEl) labEl.textContent = String(PENDING_LAB_ORDERS_DEFAULT);
    if (hmsEl) hmsEl.textContent = String(lowInventoryCount);
  }

  _renderRecentPatients() {
    const container = document.getElementById('recentPatientsTable');
    if (!container) return;

    const appointments = appointmentService.getAll();
    const sorted = [...appointments]
      .sort((a, b) => {
        const da = a.date && a.time ? `${a.date}T${a.time}` : a.date || '';
        const db = b.date && b.time ? `${b.date}T${b.time}` : b.date || '';
        return db.localeCompare(da);
      })
      .slice(0, 10);

    renderTable({
      containerId: 'recentPatientsTable',
      columns: ['Patient ID', 'Name', 'Department', 'Status', 'Action'],
      data: sorted,
      rowTemplate: (apt) => `
        <tr class="hover:bg-slate-50/80 transition-colors duration-200">
          <td class="px-6 py-4 font-semibold text-slate-900">${escapeHtml(apt.patientId || '—')}</td>
          <td class="px-6 py-4 text-slate-700">${escapeHtml(apt.patientName || '—')}</td>
          <td class="px-6 py-4 text-slate-600">${escapeHtml(apt.department || '—')}</td>
          <td class="px-6 py-4"><span class="${statusBadgeClass(apt.status)}">${escapeHtml(statusLabel(apt.status))}</span></td>
          <td class="px-6 py-4"><a href="patient-management.html" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all duration-200 min-h-[44px] active:scale-95">View</a></td>
        </tr>
      `,
    });
  }

  _renderAlertBanner() {
    const banner = document.getElementById('staffAlertBanner');
    if (!banner) return;

    const lowStockItems = inventoryService.getLowStock(LOW_INVENTORY_THRESHOLD);
    const { active } = analyticsService.getStaffEfficiency();

    const parts = [];
    if (lowStockItems.length > 0) {
      const names = lowStockItems.slice(0, 3).map((i) => i.name).filter(Boolean);
      parts.push(`Low inventory: ${names.join(', ')}${lowStockItems.length > 3 ? ' and more' : ''}.`);
    }
    if (active > 0) {
      parts.push(`${active} patient(s) in queue.`);
    }

    const count = lowStockItems.length + (active > 0 ? 1 : 0);
    const message = parts.length ? parts.join(' ') : 'No critical alerts.';

    if (count === 0 && parts.length === 0) {
      banner.style.display = 'none';
      return;
    }

    banner.style.display = 'flex';
    const dot = banner.querySelector('.pulse-dot');
    if (dot) dot.classList.toggle('pulse-dot--active', count > 0);

    const messageSpan = banner.querySelector('.alert-banner-message');
    if (messageSpan) {
      const label = count > 0 ? `${count} Critical Alert${count !== 1 ? 's' : ''}` : 'Alerts';
      messageSpan.innerHTML = `<strong>${escapeHtml(label)}</strong> — ${escapeHtml(message)}`;
    }
  }
}

const staffOverview = new StaffOverview();
export { StaffOverview };
export default staffOverview;

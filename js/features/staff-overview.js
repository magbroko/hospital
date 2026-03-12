/**
 * @file Staff Overview - data-driven KPIs and Recent Patients for the Staff Dashboard.
 * Subscribes to AppState; updates Total Patients, Bed Occupancy, Pending Lab Orders,
 * HMS critical count, dynamic Alert Banner, and Recent Patients table.
 */

import AppState from '../core/app-state.js';
import appointmentService from '../services/appointment-service.js';
import analyticsService from '../services/analytics-service.js';
import inventoryService from '../services/inventory-service.js';
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
    case 'completed': return 'badge-status available';
    case 'rejected': return 'badge-status pending';
    case 'in-consultation': return 'badge-status occupied';
    default: return 'badge-status pending';
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
    });

    this._renderKPIs();
    this._renderRecentPatients();
    this._renderAlertBanner();
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
        <tr>
          <td><strong>${escapeHtml(apt.patientId || '—')}</strong></td>
          <td>${escapeHtml(apt.patientName || '—')}</td>
          <td>${escapeHtml(apt.department || '—')}</td>
          <td><span class="${statusBadgeClass(apt.status)}">${escapeHtml(statusLabel(apt.status))}</span></td>
          <td><a href="admin-portal/patient-management.html" class="btn btn-sm btn-secondary">View</a></td>
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
      banner.classList.add('d-none');
      return;
    }

    banner.classList.remove('d-none');
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

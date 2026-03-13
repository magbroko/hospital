/**
 * @file Patient Dashboard feature controller (EMR shell).
 * Wires sidebar, dropdowns, filters, and real-time Active Prescriptions + Unpaid Bills
 * from AppState (prescriptions, patientBills). Listens for Admin prescription saves.
 */

import AppState from '../core/app-state.js';
import prescriptionService from '../services/prescription-service.js';
import patientBillingService from '../services/patient-billing-service.js';

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function getPatientId() {
  const session = AppState.get('userSession');
  return session?.patientId || 'RJ-20240524';
}

function renderActivePrescriptions() {
  const container = document.getElementById('dashActivePrescriptions');
  if (!container) return;
  const patientId = getPatientId();
  const prescriptions = prescriptionService.getByPatient(patientId)
    .filter((p) => p.status === 'pending' || (p.status === 'dispensed' && isRecent(p.createdAt, 7)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  if (prescriptions.length === 0) {
    container.innerHTML = '<p class="dash-caption text-slate-500">No active prescriptions.</p>';
    return;
  }

  container.innerHTML = prescriptions.map((rx) => {
    const statusClass = rx.status === 'pending' ? 'dash-badge dash-badge--tooltip warning' : 'dash-badge dash-badge--tooltip normal';
    const statusLabel = rx.status === 'pending' ? 'Pending' : 'Dispensed';
    const lines = (rx.lines || []).map((l) => `${escapeHtml(l.medication)} × ${l.qty}`).join(', ');
    const date = rx.createdAt ? new Date(rx.createdAt).toLocaleDateString() : '—';
    return `
      <div class="dash-prescription-card dash-med-card mb-3">
        <div class="dash-med-icon primary">Rx</div>
        <div class="flex-grow-1">
          <div class="flex justify-between items-start mb-1">
            <h4 class="dash-title-3 mb-0">${escapeHtml(lines || 'No medications')}</h4>
            <span class="${statusClass}">${statusLabel}</span>
          </div>
          <p class="dash-meta mb-0">${escapeHtml(date)}${rx.diagnosis ? ` · ${escapeHtml(rx.diagnosis)}` : ''}</p>
        </div>
      </div>
    `;
  }).join('');
}

function isRecent(isoDate, days) {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  const now = new Date();
  return (now - d) / (1000 * 60 * 60 * 24) <= days;
}

function renderUnpaidBills() {
  const container = document.getElementById('dashUnpaidBills');
  if (!container) return;
  const patientId = getPatientId();
  const bills = patientBillingService.getUnpaidByPatient(patientId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  if (bills.length === 0) {
    container.innerHTML = '<p class="dash-caption text-slate-500">No unpaid bills.</p>';
    return;
  }

  container.innerHTML = bills.map((bill) => {
    const { total } = patientBillingService.calcTotals(bill.items);
    const date = bill.createdAt ? new Date(bill.createdAt).toLocaleDateString() : '—';
    const desc = (bill.items || []).map((i) => i.desc).join(', ') || 'Prescription';
    return `
      <div class="dash-bill-card dash-med-card mb-3">
        <div class="dash-med-icon accent">$</div>
        <div class="flex-grow-1">
          <h4 class="dash-title-3 mb-1">${escapeHtml(desc)}</h4>
          <p class="dash-meta mb-0">${escapeHtml(date)} · $${total.toFixed(2)}</p>
        </div>
        <a href="/emr-portal/billing.html" class="btn btn-primary btn-sm">Pay</a>
      </div>
    `;
  }).join('');
}

function initPrescriptionsAndBills() {
  renderActivePrescriptions();
  renderUnpaidBills();

  AppState.subscribe('prescriptions', () => {
    renderActivePrescriptions();
  });
  AppState.subscribe('patientBills', () => {
    renderUnpaidBills();
  });
}

/**
 * Initialize the patient EMR dashboard interactions.
 * Safe to call multiple times; event listeners are only attached once.
 */
export function initPatientDashboard() {
  if (typeof document === 'undefined') return;
  if (document.documentElement.dataset.patientDashboardInit === '1') return;
  document.documentElement.dataset.patientDashboardInit = '1';

  document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initNotificationDropdown();
    initPatientActionsMenu();
    initGlobalSearchDropdown();
    initViewTrendsToggle();
    initTableFilters();
    initClickOutsideToClose();
    initEscapeKey();
    initPrescriptionsAndBills();
  });
}

/**
 * Mobile sidebar drawer for patient portal.
 * Skip when universal sidebar is used (#sidebar-container).
 */
function initSidebar() {
  if (document.getElementById('sidebar-container')) return;
  const sidebar = document.getElementById('dashSidebar');
  const overlay = document.getElementById('dashOverlay');
  const toggle = document.getElementById('dashSidebarToggle');

  function openDrawer() {
    sidebar?.classList.add('dash-mobile-open');
    overlay?.classList.add('active');
    overlay?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    sidebar?.classList.remove('dash-mobile-open');
    overlay?.classList.remove('active');
    overlay?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  toggle?.addEventListener('click', () => {
    sidebar?.classList.contains('dash-mobile-open') ? closeDrawer() : openDrawer();
  });

  overlay?.addEventListener('click', closeDrawer);
}

/**
 * Ensure only one header dropdown (notifications / profile) is open.
 */
function closeOtherHeaderDropdown(exceptId) {
  const notifDropdown = document.getElementById('dashNotificationDropdown');
  const notifTrigger = document.getElementById('dashNotification');
  const profileMenu = document.getElementById('dashPatientActionsMenu');
  const profileTrigger = document.getElementById('dashPatientActions');

  if (exceptId !== 'dashNotificationDropdown' && notifDropdown?.classList.contains('is-open')) {
    notifDropdown.classList.remove('is-open');
    notifDropdown.setAttribute('aria-hidden', 'true');
    notifTrigger?.setAttribute('aria-expanded', 'false');
  }
  if (exceptId !== 'dashPatientActionsMenu' && profileMenu?.classList.contains('is-open')) {
    profileMenu.classList.remove('is-open');
    profileMenu.setAttribute('aria-hidden', 'true');
    profileTrigger?.setAttribute('aria-expanded', 'false');
  }
}

/**
 * Notification dropdown with Unread / All tabs.
 */
function initNotificationDropdown() {
  const trigger = document.getElementById('dashNotification');
  const dropdown = document.getElementById('dashNotificationDropdown');
  const tabs = dropdown?.querySelectorAll('.dash-notification-tab');
  const tabContents = dropdown?.querySelectorAll('[data-tab-content]');

  if (!trigger || !dropdown) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    closeOtherHeaderDropdown('dashNotificationDropdown');
    const isOpen = dropdown.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(isOpen));
    dropdown.setAttribute('aria-hidden', String(!isOpen));
  });

  tabs?.forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('active', active);
        t.setAttribute('aria-selected', String(active));
      });
      tabContents?.forEach((content) => {
        const show = content.getAttribute('data-tab-content') === tabName;
        content.classList.toggle('d-none', !show);
      });
    });
  });
}

/**
 * Patient actions menu (Edit profile, Export record, etc.).
 */
function initPatientActionsMenu() {
  const trigger = document.getElementById('dashPatientActions');
  const menu = document.getElementById('dashPatientActionsMenu');
  const menuItems = menu?.querySelectorAll('.dash-actions-menu-item');

  if (!trigger || !menu) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    closeOtherHeaderDropdown('dashPatientActionsMenu');
    const isOpen = menu.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(isOpen));
    menu.setAttribute('aria-hidden', String(!isOpen));
  });

  menuItems?.forEach((item) => {
    item.addEventListener('click', () => {
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      trigger.setAttribute('aria-expanded', 'false');
    });
  });
}

/**
 * Global search pill dropdown in the dashboard header.
 */
function initGlobalSearchDropdown() {
  const trigger = document.getElementById('dashGlobalSearchToggle');
  const dropdown = document.getElementById('dashGlobalSearchDropdown');
  const pills = dropdown?.querySelectorAll('.dash-search-pill');

  if (!trigger || !dropdown) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(isOpen));
    dropdown.setAttribute('aria-hidden', String(!isOpen));
  });

  pills?.forEach((pill) => {
    pill.addEventListener('click', () => {
      pills.forEach((p) => p.classList.toggle('active', p === pill));
    });
  });
}

/**
 * Toggle between Today / 30 days / 6 months for trend charts.
 */
function initViewTrendsToggle() {
  const toggles = document.querySelectorAll('[data-trend-range]');
  const chart = document.querySelector('[data-trend-chart]');

  if (!toggles.length || !chart) return;

  toggles.forEach((btn) => {
    btn.addEventListener('click', () => {
      const range = btn.getAttribute('data-trend-range');
      toggles.forEach((b) => b.classList.toggle('active', b === btn));
      chart.setAttribute('data-active-range', range || '');
    });
  });
}

/**
 * Simple table/filter helpers (e.g., medication filter).
 */
function initTableFilters() {
  const medFilter = document.getElementById('dashMedFilter');
  const medsContainer = document.querySelector('[data-filterable="meds"]');

  if (medFilter && medsContainer) {
    medFilter.addEventListener('input', () => {
      const q = medFilter.value.toLowerCase();
      const cards = medsContainer.querySelectorAll('.dash-med-card');
      cards.forEach((card) => {
        const text = (card.getAttribute('data-filter-text') || '').toLowerCase();
        card.classList.toggle('d-none', q && !text.includes(q));
      });
    });
  }
}

/**
 * Close any open dropdown when clicking outside of header menus.
 */
function initClickOutsideToClose() {
  document.addEventListener('click', () => {
    closeOtherHeaderDropdown(null);
  });
}

/**
 * Close open drawers/menus with Escape key.
 */
function initEscapeKey() {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeOtherHeaderDropdown(null);
    const overlay = document.getElementById('adminOverlay') || document.getElementById('dashOverlay');
    const sidebar = document.querySelector('.universal-sidebar-wrapper') || document.getElementById('dashSidebar');
    if (overlay?.classList.contains('active')) {
      sidebar?.classList.remove('active', 'dash-mobile-open');
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  });
}

export default {
  init: initPatientDashboard,
};


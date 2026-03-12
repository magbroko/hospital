/**
 * @file Patient Dashboard feature controller (EMR shell).
 * Converts legacy emr-dashboard.js into an ES module that wires
 * sidebar drawer, header dropdowns, filters and small UI interactions.
 *
 * This module is intentionally UI-only for now; data still comes from
 * static HTML. It can later be wired to AppState and services.
 */

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
  });
}

/**
 * Mobile sidebar drawer for patient portal.
 */
function initSidebar() {
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
    const overlay = document.getElementById('dashOverlay');
    const sidebar = document.getElementById('dashSidebar');
    if (overlay?.classList.contains('active')) {
      sidebar?.classList.remove('dash-mobile-open');
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  });
}

export default {
  init: initPatientDashboard,
};


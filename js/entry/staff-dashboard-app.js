/**
 * @file Entry point for the Staff Dashboard (admin-dashboard.html).
 * Wires NavigationShell, StaffOverview, and logout to session clear + redirect.
 */

import AppState from '../core/app-state.js';
import Router from '../core/router.js';
import navigationShell from '../features/navigation-shell.js';
import staffOverview from '../features/staff-overview.js';

const AUTH_STORAGE_KEY = 'medicare_user';
const ROLE_STORAGE_KEY = 'medicare_userRole';

// Prime userSession for staff view (medical overview).
const existingSession = AppState.get('userSession');
if (!existingSession) {
  AppState.commit('userSession', {
    role: 'Staff',
    name: 'Dr. Sarah Johnson',
    staffId: 'SJ-2024',
  });
}

const router = new Router({
  defaultRoute: '#/overview',
  routesMeta: { overview: { title: 'Staff Dashboard' } },
});

function wireLogout() {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(ROLE_STORAGE_KEY);
    } catch (_) {}
    window.location.href = 'auth.html';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  navigationShell.init(router);
  staffOverview.init();
  wireLogout();

  if (!window.location.hash || window.location.hash === '#') {
    router.map('overview');
  } else {
    router.handleRoute();
  }

  // eslint-disable-next-line no-console
  console.log('MEDICARE Staff Dashboard Initialized');
});

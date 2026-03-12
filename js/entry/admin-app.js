/**
 * @file Entry point for the MEDICARE Admin HMS shell.
 * Wires up AppState, Router, and the shared NavigationShell controller.
 */

import AppState from '../core/app-state.js';
import Router from '../core/router.js';
import navigationShell from '../features/navigation-shell.js';
import adminDashboard from '../features/admin-dashboard.js';

// Optional: prime userSession with a sensible default if empty.
const existingSession = AppState.get('userSession');
if (!existingSession) {
  AppState.commit('userSession', {
    role: 'Admin',
    name: 'Dr. Sarah Johnson',
    staffId: 'SJ-2024',
  });
}

// Configure routes with human-readable titles.
const router = new Router({
  defaultRoute: '#/overview',
  routesMeta: {
    overview: { title: 'Admin Overview' },
    inventory: { title: 'Inventory' },
    billing: { title: 'Billing' },
  },
});

document.addEventListener('DOMContentLoaded', () => {
  navigationShell.init(router);
  adminDashboard.init();

  if (!window.location.hash || window.location.hash === '#') {
    router.map('overview');
  } else {
    router.handleRoute();
  }

  // eslint-disable-next-line no-console
  console.log('MEDICARE Admin Shell Initialized');
});


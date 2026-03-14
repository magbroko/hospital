/**
 * @file Entry point for the Staff Dashboard (admin-dashboard.html).
 * Wires NavigationShell, StaffOverview, Backup, and logout to session clear + redirect.
 */

import AppState from '../core/app-state.js';
import Router from '../core/router.js';
import { showToast } from '../core/ui-components.js';
import navigationShell from '../features/navigation-shell.js';
import staffOverview from '../features/staff-overview.js';
import adminPrescriptionModal from '../features/admin-prescription-modal.js';

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

function wireBackup() {
  const btn = document.getElementById('btnBackup');
  if (!btn) return;
  const textEl = btn.querySelector('.btn-backup-text');
  const loadingEl = btn.querySelector('.btn-backup-loading');
  btn.addEventListener('click', () => {
    if (!textEl || !loadingEl) return;
    textEl.classList.add('hidden');
    loadingEl.classList.remove('hidden');
    btn.disabled = true;

    // Simulate async export (AppState is sync; delay mimics network/processing)
    requestAnimationFrame(() => {
      try {
        const state = AppState.getState();
        const data = {
          exportedAt: new Date().toISOString(),
          inventory: state.inventory,
          equipment: state.equipment,
          billing: state.billing,
          patientBills: state.patientBills,
          transactionLedger: state.transactionLedger,
          dispensedReceipts: state.dispensedReceipts,
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
      } catch (err) {
        showToast({ message: 'Backup failed.', type: 'error' });
      } finally {
        textEl.classList.remove('hidden');
        loadingEl.classList.add('hidden');
        btn.disabled = false;
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  navigationShell.init(router);
  staffOverview.init();
  adminPrescriptionModal.init();
  wireLogout();
  wireBackup();

  if (!window.location.hash || window.location.hash === '#') {
    router.map('overview');
  } else {
    router.handleRoute();
  }

  // eslint-disable-next-line no-console
  console.log('MEDICARE Staff Dashboard Initialized');
});

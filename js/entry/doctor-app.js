/**
 * @file Entry point for the MediCare Doctor dashboard.
 * Routes: #/doctor/appointments, #/doctor/prescriptions, #/doctor/history.
 */

import AppState from '../core/app-state.js';
import Router from '../core/router.js';
import navigationShell from '../features/navigation-shell.js';
import doctorDashboard from '../features/doctor-dashboard.js';

const existingSession = AppState.get('userSession');
if (!existingSession) {
  AppState.commit('userSession', {
    role: 'Doctor',
    name: 'Dr. Sarah Johnson',
    staffId: 'SJ-2024',
  });
}

const router = new Router({
  defaultRoute: '#/doctor/appointments',
  routesMeta: {
    'doctor/appointments': { title: 'Doctor | Appointments' },
    'doctor/prescriptions': { title: 'Doctor | Prescriptions' },
    'doctor/history': { title: 'Doctor | History' },
  },
});

document.addEventListener('DOMContentLoaded', () => {
  navigationShell.init(router);

  if (!window.location.hash || window.location.hash === '#') {
    router.map('doctor/appointments');
  } else {
    router.handleRoute();
  }

  doctorDashboard.init();
});

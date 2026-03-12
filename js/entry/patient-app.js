/**
 * @file Entry point for the Patient EMR Dashboard shell.
 * Wires AppState userSession (role: Patient) and initializes
 * the patient-dashboard feature controller.
 */

import AppState from '../core/app-state.js';
import patientDashboard from '../features/patient-dashboard.js';

// Prime userSession for patient if not already set.
const existingSession = AppState.get('userSession');
if (!existingSession) {
  AppState.commit('userSession', {
    role: 'Patient',
    name: 'Jane Doe',
    patientId: 'P-0001',
  });
}

document.addEventListener('DOMContentLoaded', () => {
  patientDashboard.init();
  // eslint-disable-next-line no-console
  console.log('MEDICARE Patient Dashboard Initialized');
});


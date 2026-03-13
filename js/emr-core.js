/**
 * @file emr-core.js - Elite EMR Patient Portal
 * Centralized source of truth for patient data. All EMR portal pages
 * use this module to ensure data is never duplicated or out of sync.
 * Listens for Admin dashboard prescription/lab order updates in real time.
 */

import AppState from './core/app-state.js';
import prescriptionService from './services/prescription-service.js';
import patientBillingService from './services/patient-billing-service.js';

/** @type {string} Default patient ID when no session */
const DEFAULT_PATIENT_ID = 'RJ-20240524';

/**
 * Get current patient session. Primes session if missing (for demo).
 * @returns {{ patientId: string; name: string; role?: string }}
 */
export function getPatientSession() {
  let session = AppState.get('userSession');
  if (!session?.patientId) {
    session = {
      role: 'Patient',
      name: 'Robert Johnson',
      patientId: DEFAULT_PATIENT_ID,
    };
    AppState.commit('userSession', session);
  }
  return session;
}

/**
 * Get prescriptions for current patient. Real-time from AppState.
 * @returns {Array<{id:string;lines:Array;status:string;createdAt:string;diagnosis?:string}>}
 */
export function getPrescriptionsForPatient() {
  const { patientId } = getPatientSession();
  return prescriptionService
    .getByPatient(patientId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Map prescription status to pharmacy display status.
 * @param {string} status - 'pending' | 'dispensed'
 * @returns {{ label: string; variant: string }}
 */
export function getPharmacyStatus(status) {
  const map = {
    pending: { label: 'Preparing', variant: 'preparing' },
    dispensed: { label: 'Ready for Pickup', variant: 'ready' },
  };
  return map[status] || { label: status, variant: 'unknown' };
}

/**
 * Get bill linked to a prescription (if any).
 * @param {string} prescriptionId
 * @returns {Object|null} PatientBill or null
 */
export function getBillForPrescription(prescriptionId) {
  const { patientId } = getPatientSession();
  const bills = patientBillingService.getByPatient(patientId);
  return bills.find((b) => b.prescriptionId === prescriptionId) || null;
}

/**
 * Get unpaid bills for current patient.
 * @returns {Array}
 */
export function getUnpaidBillsForPatient() {
  const { patientId } = getPatientSession();
  return patientBillingService
    .getUnpaidByPatient(patientId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Subscribe to prescription updates (Admin/Pharmacy → Patient Portal).
 * @param {(prescriptions: Array) => void} callback
 * @returns {() => void} Unsubscribe
 */
export function subscribeToPrescriptions(callback) {
  const unsub = AppState.subscribe('prescriptions', () => {
    callback(getPrescriptionsForPatient());
  });
  return unsub;
}

/**
 * Subscribe to patient bill updates.
 * @param {(bills: Array) => void} callback
 * @returns {() => void} Unsubscribe
 */
export function subscribeToBills(callback) {
  const unsub = AppState.subscribe('patientBills', () => {
    const { patientId } = getPatientSession();
    callback(patientBillingService.getByPatient(patientId));
  });
  return unsub;
}

/**
 * Escape HTML for safe rendering.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/**
 * Format date for display.
 * @param {string} isoDate
 * @returns {string}
 */
export function formatDate(isoDate) {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export { prescriptionService, patientBillingService, AppState };

/**
 * @file app-core.js - Universal HMS Shared Data Layer & Global Observer
 * Centralized entry point for Admin, Pharmacy, and Patient dashboards.
 * Ensures real-time data flow: Admin prescriptions → Pharmacy inventory → Patient billing.
 *
 * Usage: import { AppState, GlobalObserver, PrescriptionManager, inventoryService } from '/js/app-core.js';
 */

import AppState from './core/app-state.js';
import inventoryService from './services/inventory-service.js';
import prescriptionService from './services/prescription-service.js';
import patientBillingService from './services/patient-billing-service.js';
import transactionLedgerService from './services/transaction-ledger-service.js';

export { AppState, inventoryService, prescriptionService, patientBillingService, transactionLedgerService };
export { default as billingService } from './services/billing-service.js';
export { default as appointmentService } from './services/appointment-service.js';
export { default as analyticsService } from './services/analytics-service.js';
export { renderTable, showToast } from './core/ui-components.js';

/**
 * Global Observer - cross-dashboard event bus for real-time UI refresh.
 * Pharmacy drug sold → Admin revenue/inventory widgets update.
 * Admin prescription → Patient billing section updates.
 */
export const GlobalObserver = {
  _listeners: new Map(),

  on(event, callback) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(callback);
    return () => this._listeners.get(event)?.delete(callback);
  },

  emit(event, detail = {}) {
    this._listeners.get(event)?.forEach((cb) => { try { cb(detail); } catch (_) {} });
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent(`hms:${event}`, { detail }));
    }
    try {
      const ch = new BroadcastChannel('medicare_hms');
      ch.postMessage({ event, detail });
      ch.close();
    } catch (_) {}
  },
};

// Cross-tab sync
if (typeof BroadcastChannel !== 'undefined') {
  const ch = new BroadcastChannel('medicare_hms');
  ch.onmessage = (e) => {
    const { event, detail } = e?.data || {};
    if (event) GlobalObserver.emit(event, detail);
  };
}

/**
 * PrescriptionManager - Doctor → Pharmacist → Patient data chain.
 */
export const PrescriptionManager = {
  prescribe(data) {
    const rx = prescriptionService.create(data);
    patientBillingService.generateBill({
      patientId: rx.patientId,
      patientName: rx.patientName,
      prescriptionId: rx.id,
      lines: rx.lines,
      source: 'admin',
    });
    GlobalObserver.emit('prescription_created', { prescription: rx });
    return rx;
  },

  dispense(prescriptionId) {
    const { prescription, receipt } = prescriptionService.markDispensed(prescriptionId);
    if (prescription) GlobalObserver.emit('drug_dispensed', { prescription, receipt });
    return { prescription, receipt };
  },

  getByPatient(patientId) {
    return prescriptionService.getByPatient(patientId);
  },
};

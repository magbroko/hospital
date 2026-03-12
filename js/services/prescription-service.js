/**
 * @file PrescriptionService - eRx creation and listing.
 * create() persists to AppState so Pharmacist "Pending" updates in real-time.
 */

import AppState from '../core/app-state.js';
import inventoryService from './inventory-service.js';

/**
 * @typedef {Object} PrescriptionLine
 * @property {string} medication - Drug name (must match inventory)
 * @property {number} qty - Quantity prescribed (capped to available stock)
 */

/**
 * @typedef {Object} Prescription
 * @property {string} id
 * @property {string} patientId
 * @property {string} patientName
 * @property {string} [diagnosis]
 * @property {string} [clinicalNotes]
 * @property {PrescriptionLine[]} lines
 * @property {'pending'|'dispensed'} status
 * @property {string} createdAt - ISO string
 * @property {string} [doctorId]
 */

/**
 * @typedef {Object} PrescriptionData
 * @property {string} patientId
 * @property {string} patientName
 * @property {string} [diagnosis]
 * @property {string} [clinicalNotes]
 * @property {PrescriptionLine[]} lines
 * @property {string} [doctorId]
 */

/**
 * PrescriptionService: create and query prescriptions; syncs with AppState.
 */
class PrescriptionService {
  /**
   * Create a new prescription. Quantities are capped to current inventory.
   * Commits to AppState so Pharmacist pending badge updates in real time.
   *
   * @param {PrescriptionData} prescriptionData
   * @returns {Prescription}
   */
  create(prescriptionData) {
    const inventory = inventoryService.getAll();
    const lines = (prescriptionData.lines || []).map((line) => {
      const drug = inventory.find(
        (d) => (d.name || '').toLowerCase() === (line.medication || '').toLowerCase()
      );
      const available = drug ? Number(drug.qty) || 0 : 0;
      const requested = Math.max(0, Number(line.qty) || 0);
      const qty = Math.min(requested, available);
      return { medication: line.medication || drug?.name || '', qty };
    }).filter((l) => l.qty > 0);

    /** @type {Prescription} */
    const prescription = {
      id: `rx-${Date.now()}`,
      patientId: prescriptionData.patientId || '',
      patientName: prescriptionData.patientName || 'Unknown',
      diagnosis: prescriptionData.diagnosis,
      clinicalNotes: prescriptionData.clinicalNotes,
      lines,
      status: 'pending',
      createdAt: new Date().toISOString(),
      doctorId: prescriptionData.doctorId,
    };

    const list = this.getAll();
    list.push(prescription);
    AppState.commit('prescriptions', list);
    return prescription;
  }

  /**
   * @returns {Prescription[]}
   */
  getAll() {
    const list = AppState.get('prescriptions');
    return Array.isArray(list) ? list.slice() : [];
  }

  /**
   * @param {string} patientId
   * @returns {Prescription[]}
   */
  getByPatient(patientId) {
    return this.getAll().filter((p) => p.patientId === patientId);
  }

  /**
   * Pending count for Pharmacist badge.
   * @returns {number}
   */
  getPendingCount() {
    return this.getAll().filter((p) => p.status === 'pending').length;
  }

  /**
   * Mark prescription as dispensed and decrement inventory for each line.
   * @param {string} prescriptionId
   * @returns {Prescription | null}
   */
  markDispensed(prescriptionId) {
    const list = this.getAll().slice();
    const idx = list.findIndex((p) => p.id === prescriptionId);
    if (idx === -1) return null;
    const rx = list[idx];
    list[idx] = { ...rx, status: 'dispensed' };
    const inventory = inventoryService.getAll().slice();
    (rx.lines || []).forEach((line) => {
      const drug = inventory.find(
        (d) => (d.name || '').toLowerCase() === (line.medication || '').toLowerCase()
      );
      if (drug && drug.qty != null) {
        drug.qty = Math.max(0, Number(drug.qty) - (line.qty || 0));
      }
    });
    AppState.commit('inventory', inventory);
    AppState.commit('prescriptions', list);
    return list[idx];
  }
}

const prescriptionService = new PrescriptionService();
export { PrescriptionService };
export default prescriptionService;

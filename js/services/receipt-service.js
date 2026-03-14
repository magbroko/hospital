/**
 * @file ReceiptService - Drug Sale Receipts for patients.
 * Receipts are stored when Pharmacy dispenses a prescription.
 * Patient Portal displays receipts for proof-of-dispensing.
 */

import AppState from '../core/app-state.js';

/**
 * @typedef {Object} DrugReceipt
 * @property {string} id
 * @property {string} prescriptionId
 * @property {string} patientId
 * @property {string} patientName
 * @property {Array<{medication: string, qty: number, unitPrice: number}>} lines
 * @property {number} total
 * @property {string} dispensedAt - ISO string
 */

class ReceiptService {
  /**
   * @returns {DrugReceipt[]}
   */
  getAll() {
    const list = AppState.get('dispensedReceipts');
    return Array.isArray(list) ? list.slice() : [];
  }

  /**
   * @param {string} patientId
   * @returns {DrugReceipt[]}
   */
  getByPatient(patientId) {
    return this.getAll().filter((r) => r.patientId === patientId);
  }

  /**
   * Subscribe to receipt updates.
   * @param {(receipts: DrugReceipt[]) => void} callback
   * @returns {() => void} Unsubscribe
   */
  subscribe(callback) {
    return AppState.subscribe('dispensedReceipts', callback);
  }
}

const receiptService = new ReceiptService();
export { ReceiptService };
export default receiptService;

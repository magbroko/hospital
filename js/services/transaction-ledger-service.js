/**
 * @file TransactionLedgerService - Master Transaction Ledger for HMS money flow.
 * Tracks: Service Bill (Admin), Drug Bill (Pharmacy), Payment (Patient).
 * Single source of truth for revenue and billing reconciliation.
 */

import AppState from '../core/app-state.js';

/** @typedef {'service_bill'|'drug_bill'|'payment'} TransactionType */
/** @typedef {'admin'|'pharmacy'|'patient'} TransactionSource */

/**
 * @typedef {Object} TransactionEntry
 * @property {string} id
 * @property {TransactionType} type
 * @property {TransactionSource} source
 * @property {number} amount
 * @property {string} [patientId]
 * @property {string} [patientName]
 * @property {string} [prescriptionId]
 * @property {string} [billId]
 * @property {string} [description]
 * @property {string} createdAt - ISO string
 */

/**
 * TransactionLedgerService - centralized ledger for all money flows.
 */
class TransactionLedgerService {
  /**
   * @returns {TransactionEntry[]}
   */
  getAll() {
    const list = AppState.get('transactionLedger');
    return Array.isArray(list) ? list.slice() : [];
  }

  /**
   * Add a transaction entry.
   * @param {Object} entry
   * @param {TransactionType} entry.type
   * @param {TransactionSource} entry.source
   * @param {number} entry.amount
   * @param {string} [entry.patientId]
   * @param {string} [entry.patientName]
   * @param {string} [entry.prescriptionId]
   * @param {string} [entry.billId]
   * @param {string} [entry.description]
   * @returns {TransactionEntry}
   */
  add(entry) {
    const list = this.getAll();
    const tx = {
      id: `tx-${Date.now()}`,
      type: entry.type,
      source: entry.source,
      amount: Number(entry.amount) || 0,
      patientId: entry.patientId,
      patientName: entry.patientName,
      prescriptionId: entry.prescriptionId,
      billId: entry.billId,
      description: entry.description,
      createdAt: new Date().toISOString(),
    };
    list.push(tx);
    AppState.commit('transactionLedger', list);
    return tx;
  }

  /**
   * Total revenue (sum of all non-payment transactions, or net: bills - refunds).
   * @returns {number}
   */
  getTotalRevenue() {
    return this.getAll().reduce((sum, tx) => {
      if (tx.type === 'payment') return sum - tx.amount;
      return sum + (Number(tx.amount) || 0);
    }, 0);
  }

  /**
   * Recent dispositions (drug sales) for Admin dashboard.
   * @param {number} [limit=10]
   * @returns {TransactionEntry[]}
   */
  getRecentDispositions(limit = 10) {
    return this.getAll()
      .filter((tx) => tx.type === 'drug_bill')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }
}

const transactionLedgerService = new TransactionLedgerService();
export { TransactionLedgerService };
export default transactionLedgerService;

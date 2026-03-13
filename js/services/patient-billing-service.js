/**
 * @file PatientBillingService - per-patient bills linked to prescriptions.
 * Generates bills from Admin prescriptions (drug pricing from inventory).
 * Patient Portal reads unpaid bills; payments update revenue.
 */

import AppState from '../core/app-state.js';
import inventoryService from './inventory-service.js';
import transactionLedgerService from './transaction-ledger-service.js';

const TAX_RATE = 0.08;

/** @typedef {{ id: string; desc: string; qty: number; price: number }} BillLineItem */
/**
 * @typedef {Object} PatientBill
 * @property {string} id
 * @property {string} patientId
 * @property {string} patientName
 * @property {BillLineItem[]} items
 * @property {'pending'|'paid'} status
 * @property {string} [prescriptionId]
 * @property {string} [source] - 'admin'|'pharmacy'
 * @property {string} createdAt - ISO string
 */

class PatientBillingService {
  /**
   * @returns {PatientBill[]}
   */
  getAll() {
    const list = AppState.get('patientBills');
    return Array.isArray(list) ? list.slice() : [];
  }

  /**
   * @param {string} patientId
   * @returns {PatientBill[]}
   */
  getByPatient(patientId) {
    return this.getAll().filter((b) => b.patientId === patientId);
  }

  /**
   * @param {string} patientId
   * @returns {PatientBill[]}
   */
  getUnpaidByPatient(patientId) {
    return this.getByPatient(patientId).filter((b) => b.status === 'pending');
  }

  /**
   * Get drug unit price from inventory (default 0 if not found).
   * @param {string} drugName
   * @returns {number}
   */
  getDrugPrice(drugName) {
    const inventory = inventoryService.getAll();
    const drug = inventory.find(
      (d) => (d.name || '').toLowerCase() === (drugName || '').toLowerCase()
    );
    return drug && Number.isFinite(drug.unitPrice) ? Number(drug.unitPrice) : 0;
  }

  /**
   * Generate a patient bill from a prescription.
   * Pulls drug pricing from inventory-service.
   * @param {Object} params
   * @param {string} params.patientId
   * @param {string} params.patientName
   * @param {string} params.prescriptionId
   * @param {Array<{medication: string, qty: number}>} params.lines
   * @param {string} [params.source='admin']
   * @returns {PatientBill}
   */
  generateBill({ patientId, patientName, prescriptionId, lines, source = 'admin' }) {
    const items = (lines || []).map((line) => {
      const price = this.getDrugPrice(line.medication);
      return {
        id: `bl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        desc: String(line.medication || '').trim(),
        qty: Math.max(0, Number(line.qty) || 0),
        price,
      };
    }).filter((i) => i.qty > 0);

    const bill = {
      id: `bill-${Date.now()}`,
      patientId: String(patientId || ''),
      patientName: String(patientName || 'Unknown'),
      items,
      status: 'pending',
      prescriptionId: prescriptionId || undefined,
      source,
      createdAt: new Date().toISOString(),
    };

    const list = this.getAll();
    list.push(bill);
    AppState.commit('patientBills', list);

    // Ledger: Service Bill (Admin) or Drug Bill (Pharmacy)
    const amount = items.reduce((s, i) => s + i.qty * i.price, 0);
    const tax = amount * TAX_RATE;
    const total = amount + tax;
    if (total > 0) {
      transactionLedgerService.add({
        type: source === 'pharmacy' ? 'drug_bill' : 'service_bill',
        source: source === 'pharmacy' ? 'pharmacy' : 'admin',
        amount: total,
        patientId,
        patientName,
        prescriptionId,
        billId: bill.id,
        description: `Prescription ${prescriptionId || ''}`,
      });
    }

    return bill;
  }

  /**
   * Mark bill as paid; record payment in ledger.
   * @param {string} billId
   * @param {number} [amount] - amount paid (default: bill total)
   * @returns {PatientBill | null}
   */
  markPaid(billId, amount) {
    const list = this.getAll().slice();
    const idx = list.findIndex((b) => b.id === billId);
    if (idx === -1) return null;

    const bill = list[idx];
    const total = bill.items.reduce((s, i) => s + i.qty * i.price, 0);
    const tax = total * TAX_RATE;
    const billTotal = total + tax;
    const paidAmount = Number.isFinite(amount) ? amount : billTotal;

    list[idx] = { ...bill, status: 'paid' };
    AppState.commit('patientBills', list);

    transactionLedgerService.add({
      type: 'payment',
      source: 'patient',
      amount: paidAmount,
      patientId: bill.patientId,
      patientName: bill.patientName,
      billId,
      description: `Payment for bill ${billId}`,
    });

    return list[idx];
  }

  /**
   * Calculate totals for a bill.
   * @param {BillLineItem[]} items
   * @returns {{ subtotal: number; tax: number; total: number }}
   */
  calcTotals(items) {
    const subtotal = (items || []).reduce((s, i) => s + i.qty * i.price, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }
}

const patientBillingService = new PatientBillingService();
export { PatientBillingService };
export default patientBillingService;

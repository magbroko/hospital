/**
 * @file AnalyticsService - centralized hospital insights from AppState.
 */

import AppState from '../core/app-state.js';
import transactionLedgerService from './transaction-ledger-service.js';

/**
 * Sum total revenue from billing items + transaction ledger (prescriptions, drug sales, payments).
 * @returns {{ totalRevenue: number, itemCount: number }}
 */
export function getRevenueSummary() {
  const billing = AppState.get('billing');
  const billingRevenue = Array.isArray(billing)
    ? billing.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0)
    : 0;
  const ledgerRevenue = transactionLedgerService.getTotalRevenue();
  return {
    totalRevenue: billingRevenue + ledgerRevenue,
    itemCount: Array.isArray(billing) ? billing.length : 0,
  };
}

/**
 * Top N most prescribed drugs by total quantity.
 * @param {number} [limit=3]
 * @returns {{ medication: string, totalQty: number }[]}
 */
export function getTopPrescribedDrugs(limit = 3) {
  const prescriptions = AppState.get('prescriptions');
  if (!Array.isArray(prescriptions)) return [];
  /** @type {Record<string, number>} */
  const map = {};
  prescriptions.forEach((rx) => {
    (rx.lines || []).forEach((line) => {
      const name = String(line.medication || '').trim();
      if (!name) return;
      const qty = Number(line.qty) || 0;
      map[name] = (map[name] || 0) + qty;
    });
  });
  return Object.entries(map)
    .map(([medication, totalQty]) => ({ medication, totalQty }))
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, limit);
}

/**
 * Staff efficiency from appointments.
 * @returns {{ completed: number, rejected: number, completionRate: number, active: number, total: number }}
 */
export function getStaffEfficiency() {
  const appointments = AppState.get('appointments');
  if (!Array.isArray(appointments)) {
    return { completed: 0, rejected: 0, completionRate: 0, active: 0, total: 0 };
  }
  let completed = 0;
  let rejected = 0;
  let active = 0;
  appointments.forEach((a) => {
    if (a.status === 'completed') completed += 1;
    else if (a.status === 'rejected') rejected += 1;
    else if (a.status === 'waiting' || a.status === 'in-consultation') active += 1;
  });
  const total = completed + rejected;
  const completionRate = total > 0 ? completed / total : 0;
  return { completed, rejected, completionRate, active, total };
}

/**
 * Inventory health metrics.
 * @returns {{ lowStock: number, nearExpiry: number, expired: number, critical: number }}
 */
export function getInventoryHealth() {
  const inventory = AppState.get('inventory');
  if (!Array.isArray(inventory)) {
    return { lowStock: 0, nearExpiry: 0, expired: 0, critical: 0 };
  }
  const LOW_STOCK_THRESHOLD = 10;
  const NEAR_EXPIRY_DAYS = 30;
  let lowStock = 0;
  let nearExpiry = 0;
  let expired = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  inventory.forEach((item) => {
    const qty = Number(item.qty) || 0;
    if (qty > 0 && qty <= LOW_STOCK_THRESHOLD) lowStock += 1;

    if (item.expiryDate) {
      const expiry = new Date(item.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) expired += 1;
      else if (diffDays <= NEAR_EXPIRY_DAYS) nearExpiry += 1;
    }
  });

  const critical = lowStock + expired + nearExpiry;
  return { lowStock, nearExpiry, expired, critical };
}

/**
 * Total patients served (unique patientId across appointments with any status).
 * @returns {number}
 */
export function getTotalPatientsServed() {
  const appointments = AppState.get('appointments');
  if (!Array.isArray(appointments)) return 0;
  const ids = new Set();
  appointments.forEach((a) => {
    if (a.patientId) ids.add(a.patientId);
  });
  return ids.size;
}

export default {
  getRevenueSummary,
  getTopPrescribedDrugs,
  getStaffEfficiency,
  getInventoryHealth,
  getTotalPatientsServed,
};


/**
 * @file BillingService - invoice items and totals for Admin HMS.
 * Uses AppState.billing; no DOM.
 */

import AppState from '../core/app-state.js';

const TAX_RATE = 0.08;

/** @typedef {{ id: number; desc: string; qty: number; price: number }} BillingItem */

class BillingService {
  getAll() {
    const list = AppState.get('billing');
    return Array.isArray(list) ? list.slice() : [];
  }

  addItem(desc, qty, price) {
    const list = this.getAll();
    list.push({
      id: Date.now(),
      desc: String(desc || '').trim(),
      qty: Math.max(0, parseInt(String(qty), 10) || 1),
      price: Math.max(0, parseFloat(String(price)) || 0),
    });
    AppState.commit('billing', list);
  }

  removeItem(id) {
    const list = this.getAll().filter((i) => i.id !== id);
    AppState.commit('billing', list);
  }

  clear() {
    AppState.commit('billing', []);
  }

  /**
   * @param {BillingItem[]} [items]
   * @returns {{ subtotal: number; tax: number; total: number }}
   */
  calcTotals(items = this.getAll()) {
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }
}

const billingService = new BillingService();
export { BillingService };
export default billingService;

/**
 * @file InventoryService - pure data service for pharmacy inventory.
 * This module does NOT touch the DOM. It only coordinates with AppState.
 */

import AppState from '../core/app-state.js';

/**
 * @typedef {Object} InventoryItem
 * @property {string} id - Unique identifier for the medication item.
 * @property {string} name - Human-readable medication name.
 * @property {number} qty - Current quantity in stock.
 * @property {number} [unitPrice] - Price per unit for billing.
 * @property {string} [expiryDate] - ISO date string (YYYY-MM-DD) for expiry.
 * @property {string} [category] - Optional category (e.g. "Antibiotics").
 * @property {string} [supplier] - Optional supplier name.
 */

/**
 * InventoryService encapsulates read/write operations for the inventory slice
 * of {@link AppState}. It is intentionally UI-agnostic.
 */
class InventoryService {
  /**
   * Retrieve the full inventory list from AppState.
   *
   * @returns {InventoryItem[]} Array of inventory items.
   */
  getAll() {
    const items = AppState.get('inventory');
    return Array.isArray(items) ? items.slice() : [];
  }

  /**
   * Return a filtered subset of items whose quantity is
   * less than or equal to the provided threshold.
   *
   * @param {number} threshold - Quantity threshold for low stock.
   * @returns {InventoryItem[]} Array of low-stock items.
   */
  getLowStock(threshold) {
    const safeThreshold = Number.isFinite(threshold) ? threshold : 0;
    return this.getAll().filter((item) => {
      const qty = Number(item.qty) || 0;
      return qty <= safeThreshold;
    });
  }

  /**
   * Add a new medication to the inventory.
   *
   * @param {Partial<InventoryItem>} data - Minimal data for the new item.
   *                                        At least `name` and `qty` should be provided.
   * @returns {InventoryItem} The newly-created inventory item.
   */
  addMedication(data) {
    const current = this.getAll();

    const id = data.id || String(Date.now());
    const qty = this._sanitizeQuantity(data.qty);
    const name = this._sanitizeDrugName(data.name);

    /** @type {InventoryItem} */
    const newItem = {
      id,
      name: name,
      qty: Number.isFinite(qty) && qty >= 0 ? qty : 0,
      unitPrice: Number.isFinite(data.unitPrice) ? data.unitPrice : 0,
      expiryDate: data.expiryDate,
      category: data.category,
      supplier: data.supplier,
    };

    const next = current.concat(newItem);
    this._commitAndBroadcast(next);
    return newItem;
  }

  /**
   * Update the quantity for a specific inventory item.
   *
   * @param {string} id - ID of the inventory item to update.
   * @param {number} newQty - New quantity value to set (will be clamped to >= 0).
   * @returns {InventoryItem | null} Updated item if found, otherwise null.
   */
  updateStock(id, newQty) {
    const items = this.getAll();
    const safeQty = Number.isFinite(newQty) ? Math.max(0, newQty) : 0;

    let updatedItem = null;

    const next = items.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, qty: safeQty };
      updatedItem = updated;
      return updated;
    });

    this._commitAndBroadcast(next);
    return updatedItem;
  }

  /**
   * Update a medication's full details (name, category, qty, expiryDate).
   *
   * @param {string} id - ID of the inventory item to update.
   * @param {Partial<InventoryItem>} data - Fields to update.
   * @returns {InventoryItem | null} Updated item if found, otherwise null.
   */
  updateMedication(id, data) {
    const items = this.getAll();
    const qty = Number(data.qty ?? 0);

    let updatedItem = null;

    const next = items.map((item) => {
      if (item.id !== id) return item;
      const updated = {
        ...item,
        name: data.name !== undefined ? String(data.name).trim() : item.name,
        category: data.category !== undefined ? (data.category || '') : item.category,
        qty: Number.isFinite(qty) && qty >= 0 ? qty : item.qty,
        unitPrice: data.unitPrice !== undefined ? (Number(data.unitPrice) || 0) : item.unitPrice,
        expiryDate: data.expiryDate !== undefined ? data.expiryDate : item.expiryDate,
      };
      updatedItem = updated;
      return updated;
    });

    this._commitAndBroadcast(next);
    return updatedItem;
  }

  /**
   * Sanitize drug name for storage: strip control chars and disallow unsafe chars.
   * @param {unknown} raw
   * @returns {string}
   * @private
   */
  _sanitizeDrugName(raw) {
    if (raw == null) return '';
    const s = String(raw).replace(/[\x00-\x1F\x7F]/g, '').replace(/[^\w\s\-'.()]/g, '').replace(/\s+/g, ' ').trim();
    return s;
  }

  /**
   * Sanitize quantity: extract numeric value.
   * @param {unknown} raw
   * @returns {number}
   * @private
   */
  _sanitizeQuantity(raw) {
    if (raw == null || raw === '') return 0;
    const parsed = parseFloat(String(raw).replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
  }

  /**
   * Commit inventory and broadcast global_inventory_update for Admin/Pharmacy sync.
   * @param {InventoryItem[]} next
   * @private
   */
  _commitAndBroadcast(next) {
    AppState.commit('inventory', next);
    if (typeof window !== 'undefined') {
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('global_inventory_update', { detail: { inventory: next } }));
      }
      try {
        const channel = new BroadcastChannel('medicare_inventory');
        channel.postMessage({ type: 'inventory_update', inventory: next });
        channel.close();
      } catch (_) {}
    }
  }

  /**
   * Get inventory summary for Pharmacy/Admin dashboards.
   * @param {Object} [opts]
   * @param {number} [opts.lowStockThreshold=10]
   * @param {number} [opts.expirySoonDays=30]
   * @returns {{ totalItems: number; lowStockCount: number; lowStockItems: InventoryItem[] }}
   */
  getSummary(opts = {}) {
    const items = this.getAll();
    const threshold = Number.isFinite(opts.lowStockThreshold) ? opts.lowStockThreshold : 10;
    const lowStockItems = items.filter((i) => (Number(i.qty) || 0) <= threshold);
    return {
      totalItems: items.length,
      lowStockCount: lowStockItems.length,
      lowStockItems,
    };
  }

  /**
   * Subscribe to inventory changes (via AppState).
   * @param {(items: InventoryItem[]) => void} callback
   * @returns {() => void} Unsubscribe function
   */
  subscribe(callback) {
    return AppState.subscribe('inventory', callback);
  }
}

/**
 * Shared InventoryService instance.
 * @type {InventoryService}
 */
const inventoryService = new InventoryService();

export { InventoryService };
export default inventoryService;


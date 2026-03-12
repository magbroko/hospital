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
    const qty = Number(data.qty ?? 0);

    /** @type {InventoryItem} */
    const newItem = {
      id,
      name: String(data.name ?? '').trim(),
      qty: Number.isFinite(qty) && qty >= 0 ? qty : 0,
      expiryDate: data.expiryDate,
      category: data.category,
      supplier: data.supplier,
    };

    const next = current.concat(newItem);
    AppState.commit('inventory', next);
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

    AppState.commit('inventory', next);
    return updatedItem;
  }
}

/**
 * Shared InventoryService instance.
 * @type {InventoryService}
 */
const inventoryService = new InventoryService();

export { InventoryService };
export default inventoryService;


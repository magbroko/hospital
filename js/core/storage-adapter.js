/**
 * @file Storage adapter for MEDICARE HMS.
 * Wraps {@link window.localStorage} with safety guards and
 * performs one-time migration into a MEDICARE_ namespace.
 */

/**
 * Namespacing prefix used for all MEDICARE HMS keys.
 * @type {string}
 */
export const MEDICARE_STORAGE_PREFIX = 'MEDICARE_';

/**
 * Map of legacy (pre-refactor) keys to their new MEDICARE_ namespaced keys.
 * Extend this as additional legacy keys are discovered.
 * @type {Record<string, string>}
 */
const LEGACY_MIGRATION_MAP = {
  // Existing HMS keys from legacy scripts
  hms_drug_inventory: `${MEDICARE_STORAGE_PREFIX}inventory`,
  hms_pending_prescriptions: `${MEDICARE_STORAGE_PREFIX}prescriptions`,
  hms_billing_items: `${MEDICARE_STORAGE_PREFIX}billing`,
  hms_expenses: `${MEDICARE_STORAGE_PREFIX}expenses`,
  hms_case_notes: `${MEDICARE_STORAGE_PREFIX}case_notes`,
  hms_equipment: `${MEDICARE_STORAGE_PREFIX}equipment`,
};

/**
 * Simple wrapper around localStorage with:
 * - JSON serialization/deserialization
 * - Graceful failure when storage is unavailable
 * - One-time migration of legacy keys into a MEDICARE_ namespace
 */
export class StorageAdapter {
  /**
   * @param {Storage} [storage=window.localStorage] - Storage implementation to use.
   *                                                 Primarily for testing; defaults to localStorage.
   */
  constructor(storage = window.localStorage) {
    /**
     * Underlying storage implementation.
     * @type {Storage | null}
     * @private
     */
    this._storage = storage ?? null;

    /**
     * In-memory fallback when storage is not available.
     * @type {Record<string, unknown>}
     * @private
     */
    this._memoryFallback = {};

    this._runLegacyMigration();
  }

  /**
   * Safely read a value from storage.
   *
   * @template T
   * @param {string} key - Fully-qualified storage key (already namespaced).
   * @param {T} [defaultValue=null] - Value to return when nothing is stored or an error occurs.
   * @returns {T|null} Parsed value if present, otherwise {@link defaultValue}.
   */
  get(key, defaultValue = null) {
    try {
      if (!this._storage) {
        return (this._memoryFallback[key] ?? defaultValue);
      }
      const raw = this._storage.getItem(key);
      if (raw == null) return defaultValue;
      return JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  }

  /**
   * Persist a value under the given key.
   *
   * @param {string} key - Fully-qualified storage key (already namespaced).
   * @param {unknown} value - Serializable value to persist.
   * @returns {void}
   */
  set(key, value) {
    try {
      const serialized = JSON.stringify(value);
      if (!this._storage) {
        this._memoryFallback[key] = value;
        return;
        }
      this._storage.setItem(key, serialized);
    } catch {
      // As a last resort, keep data in memory for the current session.
      this._memoryFallback[key] = value;
    }
  }

  /**
   * Remove a key from storage.
   *
   * @param {string} key - Fully-qualified storage key (already namespaced).
   * @returns {void}
   */
  remove(key) {
    try {
      if (!this._storage) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete this._memoryFallback[key];
        return;
      }
      this._storage.removeItem(key);
    } catch {
      // If removal fails, at least clear the in-memory copy.
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this._memoryFallback[key];
    }
  }

  /**
   * Prefix a logical key with the MEDICARE_ namespace.
   *
   * @param {string} logicalKey - Logical state key (e.g. "inventory").
   * @returns {string} Namespaced storage key.
   */
  static toNamespacedKey(logicalKey) {
    return `${MEDICARE_STORAGE_PREFIX}${logicalKey}`;
  }

  /**
   * Perform one-time migration from legacy keys into the MEDICARE_ namespace.
   * Safe to run multiple times; it will no-op after first successful migration.
   *
   * @private
   * @returns {void}
   */
  _runLegacyMigration() {
    if (!this._storage) return;

    try {
      const migrationFlagKey = `${MEDICARE_STORAGE_PREFIX}migration_done`;
      const alreadyMigrated = this._storage.getItem(migrationFlagKey);
      if (alreadyMigrated === 'true') return;

      Object.entries(LEGACY_MIGRATION_MAP).forEach(([legacyKey, newKey]) => {
        const existing = this._storage.getItem(legacyKey);
        if (existing != null && this._storage.getItem(newKey) == null) {
          // Move (not just copy) the value to the new namespaced key.
          this._storage.setItem(newKey, existing);
          this._storage.removeItem(legacyKey);
        }
      });

      this._storage.setItem(migrationFlagKey, 'true');
    } catch {
      // Swallow migration errors to avoid breaking the app startup path.
    }
  }
}

/**
 * Default shared instance used by the rest of the application.
 * @type {StorageAdapter}
 */
const defaultStorageAdapter = new StorageAdapter();

export default defaultStorageAdapter;


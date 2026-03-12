/**
 * @file Centralized AppState singleton for MEDICARE HMS.
 * Implements a simple observer pattern and persists state
 * slices via the shared StorageAdapter.
 */

import storageAdapter, { MEDICARE_STORAGE_PREFIX, StorageAdapter } from './storage-adapter.js';

/**
 * Keys used for persisting top-level app state slices.
 * @type {const}
 */
const STATE_KEYS = {
  inventory: 'inventory',
  appointments: 'appointments',
  prescriptions: 'prescriptions',
  billing: 'billing',
  equipment: 'equipment',
  expenses: 'expenses',
  caseNotes: 'case_notes',
  userSession: 'userSession',
};

/** State key -> storage logical key (for legacy MEDICARE_case_notes etc.) */
const STATE_TO_STORAGE_KEY = {
  caseNotes: 'case_notes',
};

/**
 * Derive the full storage key for a state key.
 *
 * @param {string} stateKey
 * @returns {string}
 */
function toStorageKey(stateKey) {
  const logical = STATE_TO_STORAGE_KEY[stateKey] || stateKey;
  return StorageAdapter.toNamespacedKey(logical);
}

/**
 * @typedef {Object} AppStateShape
 * @property {Array<Object>} inventory
 * @property {Array<Object>} appointments
 * @property {Array<Object>} prescriptions
 * @property {Array<Object>} billing
 * @property {Array<Object>} equipment
 * @property {Object.<string, number>} expenses
 * @property {Array<Object>} caseNotes
 * @property {Object|null} userSession
 */

/**
 * AppStateManager coordinates in-memory application state, persistence,
 * and subscriptions for slice-level updates.
 */
class AppStateManager {
  /**
   * @param {import('./storage-adapter.js').default} adapter - Storage adapter instance.
   */
  constructor(adapter) {
    /**
     * @type {import('./storage-adapter.js').default}
     * @private
     */
    this._storage = adapter;

    /**
     * @type {AppStateShape}
     * @private
     */
    this._state = this._hydrateInitialState();

    /**
     * Map of state key -> Set of subscriber callbacks.
     * @type {Record<string, Set<(value: unknown) => void>>}
     * @private
     */
    this._subscribers = {};
  }

  /**
   * Rehydrate initial state from storage, falling back to sensible defaults.
   *
   * @private
   * @returns {AppStateShape}
   */
  _hydrateInitialState() {
    /** @type {AppStateShape} */
    const initial = {
      inventory: this._storage.get(toStorageKey(STATE_KEYS.inventory), []),
      appointments: this._storage.get(toStorageKey(STATE_KEYS.appointments), []),
      prescriptions: this._storage.get(toStorageKey(STATE_KEYS.prescriptions), []),
      billing: this._storage.get(toStorageKey(STATE_KEYS.billing), []),
      equipment: this._storage.get(toStorageKey(STATE_KEYS.equipment), []),
      expenses: this._storage.get(toStorageKey(STATE_KEYS.expenses), {}),
      caseNotes: this._storage.get(toStorageKey('caseNotes'), []),
      userSession: this._storage.get(toStorageKey(STATE_KEYS.userSession), null),
    };
    return initial;
  }

  /**
   * Read-only snapshot of the entire state tree.
   *
   * @returns {AppStateShape}
   */
  getState() {
    // Shallow clone to avoid accidental external mutation.
    return { ...this._state };
  }

  /**
   * Get a specific top-level slice by key.
   *
   * @template K
   * @param {K & keyof AppStateShape} key
   * @returns {AppStateShape[K]}
   */
  get(key) {
    return this._state[key];
  }

  /**
   * Subscribe to updates for a particular key.
   *
   * @template K
   * @param {K & keyof AppStateShape} key - State slice key (e.g. "inventory").
   * @param {(value: AppStateShape[K]) => void} callback - Called after each commit for this key.
   * @returns {() => void} Unsubscribe function.
   */
  subscribe(key, callback) {
    const k = String(key);
    if (!this._subscribers[k]) {
      this._subscribers[k] = new Set();
    }
    this._subscribers[k].add(callback);

    // Immediately emit current value so subscribers can render initial UI.
    callback(this._state[key]);

    return () => {
      this._subscribers[k].delete(callback);
    };
  }

  /**
   * Notify all subscribers for a given key.
   *
   * @template K
   * @param {K & keyof AppStateShape} key
   * @returns {void}
   */
  notify(key) {
    const k = String(key);
    const current = this._state[key];
    const set = this._subscribers[k];
    if (!set || set.size === 0) return;

    set.forEach((cb) => {
      try {
        cb(current);
      } catch {
        // Swallow subscriber errors to avoid breaking other listeners.
      }
    });
  }

  /**
   * Commit a new value for the specified state key:
   * - Updates in-memory state
   * - Persists to storage
   * - Notifies subscribers
   *
   * @template K
   * @param {K & keyof AppStateShape} key
   * @param {AppStateShape[K]} newData
   * @returns {void}
   */
  commit(key, newData) {
    this._state = {
      ...this._state,
      [key]: newData,
    };

    const storageKey = toStorageKey(String(key));
    this._storage.set(storageKey, newData);
    this.notify(key);
  }
}

/**
 * Shared AppState singleton instance.
 * @type {AppStateManager}
 */
export const AppState = new AppStateManager(storageAdapter);

export default AppState;


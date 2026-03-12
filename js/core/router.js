/**
 * @file Hash-based Router for MEDICARE HMS dashboards.
 * Keeps the shell (sidebar/topbar) static and swaps content views
 * using simple data-view attributes and CSS utilities.
 */

/**
 * @typedef {Object} RouteMeta
 * @property {string} [title] - Optional human-friendly title for this route (e.g. "Overview").
 */

/**
 * @typedef {Object} RouteChange
 * @property {string} path - Normalized path segment (e.g. "overview", "inventory").
 * @property {string} hash - Full hash string (e.g. "#/overview").
 */

/**
 * Simple hash-based router that shows/hides sections with matching
 * `data-view` attributes and emits route change events.
 */
export class Router {
  /**
   * @param {Object} [options]
   * @param {string} [options.defaultRoute='#/overview'] - Hash to use when none is present.
   * @param {Record<string, RouteMeta>} [options.routesMeta={}] - Optional per-route metadata.
   */
  constructor({ defaultRoute = '#/overview', routesMeta = {} } = {}) {
    /**
     * @type {string}
     * @private
     */
    this._defaultRoute = defaultRoute;

    /**
     * @type {Record<string, RouteMeta>}
     * @private
     */
    this._routesMeta = routesMeta;

    /**
     * Subscribers notified after each successful route change.
     * @type {Set<(ctx: RouteChange) => void>}
     * @private
     */
    this._listeners = new Set();

    this.handleRoute = this.handleRoute.bind(this);

    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', this.handleRoute);
      window.addEventListener('load', this.handleRoute);
    }
  }

  /**
   * Subscribe to route changes.
   *
   * @param {(change: RouteChange) => void} callback
   * @returns {() => void} Unsubscribe function.
   */
  onChange(callback) {
    this._listeners.add(callback);
    // Immediately emit the current route so listeners can sync initial UI.
    const { path, hash } = this._getCurrentRoute();
    callback({ path, hash });
    return () => this._listeners.delete(callback);
  }

  /**
   * Programmatically navigate to a given route path or hash.
   *
   * @param {string} target - Either "inventory" or "#/inventory".
   * @returns {void}
   */
  map(target) {
    if (typeof window === 'undefined') return;
    if (!target) return;

    let hash = target;
    if (!hash.startsWith('#')) {
      const normalized = target.replace(/^\/+/, '');
      hash = `#/${normalized}`;
    }

    if (window.location.hash === hash) {
      // Force re-handle if already on this hash.
      this.handleRoute();
      return;
    }

    window.location.hash = hash;
  }

  /**
   * Alias for {@link Router.map} retained for compatibility.
   *
   * @param {string} target
   * @returns {void}
   */
  Maps(target) {
    this.map(target);
  }

  /**
   * Internal helper to normalize the current location hash.
   *
   * @private
   * @returns {RouteChange}
   */
  _getCurrentRoute() {
    if (typeof window === 'undefined') {
      return { path: 'overview', hash: this._defaultRoute };
    }

    let hash = window.location.hash || this._defaultRoute;
    if (!hash || hash === '#') {
      hash = this._defaultRoute;
    }

    const cleaned = hash.replace(/^#\/?/, '');
    const path = cleaned.split('?')[0] || 'overview';
    return { path, hash };
  }

  /**
   * Core route handler:
   * - Resolves the current path
   * - Shows the matching `[data-view="path"]` section
   * - Hides all other `[data-view]` sections
   * - Applies a subtle fade-in animation
   * - Updates the document title
   * - Notifies subscribers
   *
   * @returns {void}
   */
  handleRoute() {
    const { path, hash } = this._getCurrentRoute();

    if (typeof document === 'undefined') return;

    const allViews = document.querySelectorAll('[data-view]');
    let activeView = null;

    allViews.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      const viewId = el.getAttribute('data-view') || '';
      const isActive = viewId === path;
      if (isActive) {
        activeView = el;
        el.classList.remove('d-none');
        el.removeAttribute('hidden');

        // Restart fade-in animation.
        el.classList.remove('view-fade-in');
        // Trigger reflow
        // eslint-disable-next-line no-void
        void el.offsetWidth;
        el.classList.add('view-fade-in');
      } else {
        el.classList.add('d-none');
        el.setAttribute('hidden', 'true');
      }
    });

    // Ensure at least some view is visible (fallback to default route).
    if (!activeView) {
      if (hash !== this._defaultRoute) {
        this.map(this._defaultRoute);
        return;
      }
    }

    this._updateDocumentTitle(path);

    const ctx = { path, hash };
    this._listeners.forEach((cb) => {
      try {
        cb(ctx);
      } catch {
        // Ignore subscriber errors to avoid breaking routing.
      }
    });
  }

  /**
   * Update the document.title based on route metadata.
   *
   * @private
   * @param {string} path
   * @returns {void}
   */
  _updateDocumentTitle(path) {
    if (typeof document === 'undefined') return;

    const base = 'MediCare';
    const meta = this._routesMeta[path];
    const suffix = meta && meta.title
      ? meta.title
      : path.charAt(0).toUpperCase() + path.slice(1);

    document.title = suffix ? `${base} | ${suffix}` : base;
  }
}

export default Router;


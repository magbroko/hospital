/**
 * @file Shared navigation shell controller for MEDICARE HMS dashboards.
 * Handles:
 * - Sidebar toggle (mobile/desktop)
 * - Active sidebar link state based on the current hash route
 * - Topbar user role display from AppState.userSession
 */

import AppState from '../core/app-state.js';

/**
 * @typedef {import('../core/router.js').Router} Router
 */

/**
 * Controller for the persistent navigation shell (sidebar + topbar).
 */
class NavigationShell {
  constructor() {
    /** @type {boolean} */
    this._initialized = false;

    /** @type {Router | null} */
    this._router = null;
  }

  /**
   * Initialize navigation shell behaviors.
   *
   * @param {Router} router - Router instance used to navigate and listen to route changes.
   * @returns {void}
   */
  init(router) {
    if (this._initialized) return;
    this._initialized = true;
    this._router = router;

    this._initSidebarToggle();
    this._initSidebarLinks();
    this._initUserRoleDisplay();

    if (this._router && typeof this._router.onChange === 'function') {
      this._router.onChange((change) => {
        this._syncActiveSidebarLink(change.path);
      });
    }
  }

  /**
   * Wire up the sidebar drawer toggle for mobile/compact layouts.
   *
   * @private
   * @returns {void}
   */
  _initSidebarToggle() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('sidebar-container')) return;

    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('adminOverlay');
    const toggle = document.getElementById('adminSidebarToggle');

    if (!(sidebar instanceof HTMLElement) || !overlay || !toggle) return;

    const openDrawer = () => {
      sidebar.classList.add('active');
      overlay.classList.add('active');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };

    const closeDrawer = () => {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    toggle.addEventListener('click', () => {
      if (sidebar.classList.contains('active')) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    overlay.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('active')) {
        closeDrawer();
      }
    });
  }

  /**
   * Setup sidebar navigation links to drive hash-based routing.
   *
   * @private
   * @returns {void}
   */
  _initSidebarLinks() {
    if (typeof document === 'undefined' || !this._router) return;

    const links = Array.from(
      document.querySelectorAll('.sidebar-nav-link[data-route]')
    );

    links.forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;

      link.addEventListener('click', (event) => {
        const route = link.getAttribute('data-route');
        if (!route) return;
        event.preventDefault();
        this._router.map(route);
      });
    });
  }

  /**
   * Keep the active sidebar link in sync with the current path.
   *
   * @private
   * @param {string} path
   * @returns {void}
   */
  _syncActiveSidebarLink(path) {
    if (typeof document === 'undefined') return;

    const links = Array.from(
      document.querySelectorAll('.sidebar-nav-link[data-route]')
    );

    links.forEach((link) => {
      if (!(link instanceof HTMLAnchorElement)) return;
      const route = link.getAttribute('data-route') || '';
      const isActive = route === path;
      link.classList.toggle('active', isActive);
    });
  }

  /**
   * Subscribe to userSession changes and reflect the role in the topbar.
   *
   * Expects markup with elements using:
   * - [data-user-role]
   * - [data-user-name] (optional)
   * - [data-user-id] (optional)
   *
   * @private
   * @returns {void}
   */
  _initUserRoleDisplay() {
    if (typeof document === 'undefined') return;

    AppState.subscribe('userSession', (session) => {
      const roleEl = document.querySelector('[data-user-role]');
      const nameEl = document.querySelector('[data-user-name]');
      const idEl = document.querySelector('[data-user-id]');

      const fallbackRole = 'Admin';
      const fallbackName = 'Staff User';
      const fallbackId = 'ID: MED-0001';

      const role = session && session.role ? String(session.role) : fallbackRole;
      const name = session && session.name ? String(session.name) : fallbackName;
      const staffId =
        session && session.staffId ? String(session.staffId) : fallbackId;

      if (roleEl) roleEl.textContent = role;
      if (nameEl) nameEl.textContent = name;
      if (idEl) idEl.textContent = staffId;
    });
  }
}

/**
 * Shared NavigationShell instance.
 * @type {NavigationShell}
 */
const navigationShell = new NavigationShell();

export { NavigationShell };
export default navigationShell;


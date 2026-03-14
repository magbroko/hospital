/**
 * Universal Master Sidebar - Load and inject sidebar from central partial.
 * Automatically sets active state based on window.location.pathname.
 * Mobile: Syncs slide-out drawer with same nav; overlay + toggle.
 *
 * Usage: loadSidebar('admin' | 'pharmacy' | 'patient')
 * Requires: <div id="sidebar-container"></div> and overlay + toggle elements.
 */
(function () {
  'use strict';

  const PARTIALS = {
    admin: '/partials/sidebar-admin.html',
    pharmacy: '/partials/sidebar-pharmacy.html',
    patient: '/partials/sidebar-patient.html',
  };

  /**
   * Get current page identifier from pathname for active-state matching.
   * @returns {string|null}
   */
  function getCurrentPage() {
    const path = (window.location.pathname || '').toLowerCase();
    const parts = path.split('/').filter(Boolean);
    const file = parts[parts.length - 1] || '';
    const base = file.replace(/\.html$/, '');
    if (base) return base;
    if (path.includes('admin-portal') && !path.includes('pharmacy') && !path.includes('emr-patient')) return 'admin-dashboard';
    if (path.includes('emr-portal')) return parts[parts.length - 1]?.replace(/\.html$/, '') || 'emr-patient-dashboard';
    return null;
  }

  /**
   * Set active class on the nav link matching current page.
   * Active: vertical teal pill, bg-teal-500/10, white text.
   */
  function setActiveFromPathname(container) {
    if (!container) return;
    const current = getCurrentPage();
    const links = container.querySelectorAll('.universal-nav-link');
    links.forEach(function (link) {
      const nav = link.getAttribute('data-nav');
      const href = (link.getAttribute('href') || '').toLowerCase();
      const hrefBase = href.split('/').pop().replace(/\.html$/, '');
      const isMatch = (nav && nav === current) || hrefBase === current || (current === 'prescriptions' && href.includes('prescriptions'));
      link.classList.remove('universal-nav-active');
      link.querySelector('.universal-nav-pill')?.classList.remove('!bg-teal-500');
      link.querySelector('.universal-nav-pill')?.classList.add('bg-transparent');
      if (link.querySelector('span:last-of-type')) {
        link.classList.remove('!text-white', '!bg-teal-500/10');
        link.querySelector('span:last-of-type')?.classList.remove('!text-teal-400');
      }
      if (isMatch) {
        link.classList.add('universal-nav-active');
        const pill = link.querySelector('.universal-nav-pill');
        if (pill) {
          pill.classList.remove('bg-transparent');
          pill.classList.add('!bg-teal-500');
        }
        link.classList.add('!text-white', '!bg-teal-500/10');
        const iconWrap = link.querySelector('.flex.h-8.w-8');
        if (iconWrap) iconWrap.classList.add('!text-teal-400');
      }
    });
  }

  /**
   * Initialize mobile drawer: overlay + toggle. Uses same sidebar container.
   * Sidebar = parent of container (the <aside>).
   */
  function initMobileDrawer(container) {
    const overlay = document.getElementById('adminOverlay') || document.getElementById('sidebarOverlay') || document.getElementById('dashOverlay') || document.getElementById('emrOverlay');
    const toggle = document.getElementById('adminSidebarToggle') || document.getElementById('sidebarToggle') || document.getElementById('dashSidebarToggle') || document.getElementById('emrDrawerToggle');
    const sidebar = container?.closest('.universal-sidebar-wrapper') || container?.parentElement?.closest('aside') || container?.parentElement;

    if (!sidebar || !overlay || !toggle) return;

    function openDrawer() {
      sidebar.classList.add('active');
      overlay.classList.add('active');
      overlay.classList.remove('opacity-0', 'pointer-events-none');
      overlay.style.pointerEvents = 'auto';
      overlay.style.opacity = '1';
      overlay.setAttribute('aria-hidden', 'false');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
      overlay.classList.add('opacity-0', 'pointer-events-none');
      overlay.style.pointerEvents = 'none';
      overlay.style.opacity = '0';
      overlay.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    toggle.addEventListener('click', function () {
      sidebar.classList.contains('active') ? closeDrawer() : openDrawer();
    });
    overlay.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('active')) closeDrawer();
    });
  }

  /**
   * Load sidebar HTML from partial and inject into container.
   * @param {'admin'|'pharmacy'|'patient'} type
   * @param {Object} [opts] - { containerId: 'sidebar-container', basePath: '/partials' }
   */
  function loadSidebar(type, opts) {
    const config = opts || {};
    const containerId = config.containerId || 'sidebar-container';
    const basePath = (config.basePath || '').replace(/\/$/, '');
    const partialName = 'sidebar-' + type + '.html';
    const url = basePath ? basePath + '/partials/' + partialName : '../partials/' + partialName;

    const container = document.getElementById(containerId);
    if (!container) {
      console.warn('sidebar-universal: #' + containerId + ' not found');
      return;
    }

    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('Sidebar fetch failed: ' + r.status);
        return r.text();
      })
      .then(function (html) {
        container.innerHTML = html;
        setActiveFromPathname(container);
        initMobileDrawer(container);
      })
      .catch(function (err) {
        console.error('sidebar-universal:', err);
        container.innerHTML = '<div class="p-4 text-amber-400 text-sm border border-amber-500/30 rounded-lg m-3"><p class="font-medium">Sidebar failed to load.</p><p class="mt-1 text-xs text-slate-400">Serve via HTTP (e.g. <code class="bg-slate-800 px-1 rounded">npx serve .</code>). File protocol blocks fetch.</p></div>';
      });
  }

  window.loadSidebar = loadSidebar;
  window.setSidebarActive = setActiveFromPathname;
})();

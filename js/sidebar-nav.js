/**
 * Sidebar Navigation - Active state persistence and click handling
 * Applies .active to the current page link and persists on reload
 */
(function () {
  'use strict';
  const STORAGE_KEY = 'hms_sidebar_active';

  function getCurrentPage() {
    const path = window.location.pathname || '';
    const href = window.location.href || '';
    if (path.includes('pharmacy-home') || href.includes('pharmacy-home')) return 'pharmacy-home.html';
    if (path.includes('pharmacy-inventory') || href.includes('pharmacy-inventory')) return 'pharmacy-inventory.html';
    if (path.includes('hms-dashboard') || href.includes('hms-dashboard')) return 'hms-dashboard.html';
    if (path.includes('admin-dashboard') || href.includes('admin-dashboard')) return 'admin-dashboard.html';
    if (path.includes('inventory') || href.includes('inventory')) return 'inventory';
    if (path.includes('prescriptions') || href.includes('prescriptions')) return 'prescriptions';
    if (path.includes('dispense-logs') || href.includes('dispense-logs')) return 'dispense-logs';
    if (path.includes('expiry-reports') || href.includes('expiry-reports')) return 'expiry-reports';
    if (path.includes('patient-management') || href.includes('patient-management')) return 'patient-management';
    if (path.includes('alerts') || href.includes('alerts')) return 'alerts';
    return null;
  }

  function setActiveLink() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;

    const current = getCurrentPage();
    const links = nav.querySelectorAll('.sidebar-nav-link');

    links.forEach(function (link) {
      link.classList.remove('active');
      const href = (link.getAttribute('href') || '').toLowerCase();
      let isActive = false;
      if (current === 'pharmacy-home.html' && href.includes('pharmacy-home')) {
        isActive = true;
      } else if (current === 'pharmacy-inventory.html' && href.includes('pharmacy-inventory')) {
        isActive = true;
      } else if (current === 'hms-dashboard.html' && href.includes('hms-dashboard')) {
        isActive = true;
      } else if (current === 'admin-dashboard.html' && href.includes('admin-dashboard')) {
        isActive = true;
      } else if (current === 'inventory' && href.includes('inventory')) {
        isActive = true;
      } else if (current === 'prescriptions' && href.includes('prescriptions')) {
        isActive = true;
      } else if (current === 'dispense-logs' && href.includes('dispense-logs')) {
        isActive = true;
      } else if (current === 'expiry-reports' && href.includes('expiry-reports')) {
        isActive = true;
      } else if (current === 'patient-management' && href.includes('patient-management')) {
        isActive = true;
      } else if (current === 'alerts' && href.includes('alerts')) {
        isActive = true;
      }
      if (isActive) link.classList.add('active');
    });
  }

  function init() {
    setActiveLink();
    var links = document.querySelectorAll('.sidebar-nav-link');
    if (links && links.length) {
      links.forEach(function (link) {
        link.addEventListener('click', function () {
          try {
            localStorage.setItem(STORAGE_KEY, link.getAttribute('href') || '');
          } catch (_) {}
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

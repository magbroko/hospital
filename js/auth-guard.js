/**
 * Auth guard – redirects to auth page if this page requires auth and no session exists.
 * RBAC: Pharmacist cannot access Admin billing/clinical routes (admin-dashboard, hms-dashboard, patient-management, etc.).
 * Reads data-auth-required from body; checks sessionStorage medicare_user.
 */
(function () {
  'use strict';
  var AUTH_KEY = 'medicare_user';
  var ROLE_KEY = 'medicare_userRole';
  var AUTH_PAGE = 'auth.html';

  /** Admin-only routes: Pharmacist must not access these. */
  var ADMIN_ONLY_PAGES = [
    'admin-dashboard', 'hms-dashboard', 'patient-management', 'lab-orders',
    'bed-allocation', 'shift-management', 'inventory', 'alerts', 'emr-patient-dashboard'
  ];

  /** Pharmacy-allowed pages (Pharmacist can access). */
  var PHARMACY_PAGES = ['pharmacy-dashboard', 'pharmacy-inventory', 'prescriptions'];

  function getRole() {
    try {
      var raw = sessionStorage.getItem(AUTH_KEY) || sessionStorage.getItem(ROLE_KEY);
      if (raw) {
        var data = typeof raw === 'string' && raw.startsWith('{') ? JSON.parse(raw) : { role: raw };
        return (data.role || '').toLowerCase();
      }
    } catch (_) {}
    return '';
  }

  function getPageFromPath() {
    var path = (window.location.pathname || '').toLowerCase();
    var parts = path.split('/').filter(Boolean);
    var file = parts[parts.length - 1] || '';
    return file.replace(/\.html$/, '');
  }

  function isPharmacistRole(role) {
    var r = (role || '').toLowerCase();
    return r === 'pharmacist' || r === 'pharmacy';
  }

  function isAdminRole(role) {
    var r = (role || '').toLowerCase();
    return r === 'admin' || r === 'doctor' || r === 'staff' || r === 'physician';
  }

  function check() {
    var body = document.body;
    if (!body || !body.getAttribute('data-auth-required')) return;

    var raw = sessionStorage.getItem(AUTH_KEY);
    if (!raw) {
      var pathname = window.location.pathname || '';
      window.location.replace(pathname.indexOf('/admin-portal/') !== -1 ? 'auth.html' : AUTH_PAGE);
      return;
    }

    var role = getRole();
    var page = getPageFromPath();

    /* RBAC: Pharmacist cannot access Admin billing/clinical routes */
    if (isPharmacistRole(role) && ADMIN_ONLY_PAGES.indexOf(page) !== -1) {
      window.location.replace('pharmacy-dashboard.html');
      return;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', check);
  } else {
    check();
  }
})();

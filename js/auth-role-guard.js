/**
 * Auth Role Guard – restricts page access by role.
 * Use data-allowed-roles="admin,doctor" on body to allow only those roles.
 * Pharmacist cannot access Admin billing routes (e.g. HMS Dashboard).
 */
(function () {
  'use strict';
  var AUTH_KEY = 'medicare_user';
  var FALLBACK_REDIRECT = 'pharmacy-dashboard.html';

  function check() {
    var body = document.body;
    var allowed = body?.getAttribute('data-allowed-roles');
    if (!allowed) return;

    var userRole = '';
    try {
      var raw = sessionStorage.getItem(AUTH_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        userRole = (data?.role || '').toLowerCase();
      }
    } catch (_) {}

    var roles = allowed.split(',').map(function (r) { return r.trim().toLowerCase(); });
    if (roles.indexOf(userRole) !== -1) return;

    window.location.replace(FALLBACK_REDIRECT);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', check);
  } else {
    check();
  }
})();

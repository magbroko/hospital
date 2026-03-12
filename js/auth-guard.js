/**
 * Auth guard – redirects to auth page if this page requires auth and no session exists.
 * Reads data-auth-required from body; checks sessionStorage medicare_user.
 */
(function () {
  'use strict';
  var AUTH_KEY = 'medicare_user';
  var AUTH_PAGE = 'auth.html';

  function check() {
    var body = document.body;
    if (!body || !body.getAttribute('data-auth-required')) return;
    try {
      var raw = sessionStorage.getItem(AUTH_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && data.role) return; /* has session */
      }
    } catch (_) {}
    /* Require auth but no session: redirect to auth page */
    var pathname = window.location.pathname || '';
    if (pathname.indexOf('/admin-portal/') !== -1) {
      window.location.replace('auth.html');
    } else {
      window.location.replace(AUTH_PAGE);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', check);
  } else {
    check();
  }
})();

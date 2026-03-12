/**
 * HMS RBAC – makes the shell visible after role/access is ready.
 * Pages use body{visibility:hidden} and body.rbac-ready{visibility:visible}.
 */
(function () {
  'use strict';
  function ready() {
    document.body.classList.add('rbac-ready');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }
})();

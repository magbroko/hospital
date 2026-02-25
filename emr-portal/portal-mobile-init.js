/**
 * Portal Mobile - Slide-out sidebar, overlay, hamburger toggle
 * Include on all portal sub-pages (medical-history, lab-results, etc.)
 */
(function() {
  var sidebar = document.querySelector('.portal-body .sidebar');
  var overlay = document.getElementById('portalOverlay');
  var toggle = document.getElementById('portalHamburger');

  function openMenu() {
    if (sidebar) sidebar.classList.add('portal-menu-open');
    if (overlay) {
      overlay.classList.add('portal-overlay-active');
      overlay.setAttribute('aria-hidden', 'false');
    }
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    if (sidebar) sidebar.classList.remove('portal-menu-open');
    if (overlay) {
      overlay.classList.remove('portal-overlay-active');
      overlay.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = '';
  }

  if (toggle) {
    toggle.addEventListener('click', function() {
      sidebar && sidebar.classList.contains('portal-menu-open') ? closeMenu() : openMenu();
    });
  }

  if (overlay) overlay.addEventListener('click', closeMenu);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && sidebar && sidebar.classList.contains('portal-menu-open')) {
      closeMenu();
    }
  });

  /* Accordion toggle */
  document.querySelectorAll('.portal-accordion-header').forEach(function(header) {
    header.addEventListener('click', function() {
      var item = this.closest('.portal-accordion-item');
      var wasOpen = item.classList.contains('open');
      document.querySelectorAll('.portal-accordion-item').forEach(function(i) { i.classList.remove('open'); });
      if (!wasOpen) item.classList.add('open');
    });
  });
})();

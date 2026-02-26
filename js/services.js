/**
 * MediCare Services Page - Premium Interface
 * Intersection Observer for scroll animations, navbar behavior
 */

document.addEventListener('DOMContentLoaded', function() {
  initServiceCardObserver();
  initNavbarScroll();
  initNavbarHamburger();
  initSmoothScroll();
});

/**
 * Intersection Observer - Fade and slide up service cards on scroll
 */
function initServiceCardObserver() {
  var cards = document.querySelectorAll('[data-service-card]');
  if (!cards.length) return;

  var observer = new IntersectionObserver(
    function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('service-card--visible');
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    }
  );

  cards.forEach(function(card) {
    observer.observe(card);
  });
}

/**
 * Navbar scroll - floating to fixed when scrolled
 */
function initNavbarScroll() {
  var navbar = document.getElementById('mainNavbar');
  if (!navbar || !navbar.classList.contains('navbar--floating')) return;

  function onScroll() {
    var scrolled = window.pageYOffset > 80;
    navbar.classList.toggle('navbar--scrolled', scrolled);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/**
 * Sync hamburger aria-expanded with Bootstrap collapse
 */
function initNavbarHamburger() {
  var hamburger = document.getElementById('navbarHamburger');
  var collapse = document.getElementById('navbarNav');
  if (!hamburger || !collapse) return;

  collapse.addEventListener('show.bs.collapse', function() {
    hamburger.setAttribute('aria-expanded', 'true');
  });
  collapse.addEventListener('hide.bs.collapse', function() {
    hamburger.setAttribute('aria-expanded', 'false');
  });

  collapse.addEventListener('click', function(e) {
    if (collapse.classList.contains('show') && !e.target.closest('.navbar-nav')) {
      var bsCollapse = bootstrap.Collapse.getInstance(collapse);
      if (bsCollapse) bsCollapse.hide();
    }
  });
}

/**
 * Smooth scroll for anchor links
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#') return;

      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

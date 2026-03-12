/**
 * MediCare Hospital - Main JavaScript
 * Handles smooth scroll, hero background slider, and general interactions
 */

document.addEventListener('DOMContentLoaded', function() {
  initSmoothScroll();
  initHeroBackgroundSlider();
  initNavbarScroll();
  initNavbarHamburger();
});

/**
 * Hero Background Slider - Crossfade with Ken Burns effect
 * Cycles through 3-4 medical images, 1.5s crossfade
 */
function initHeroBackgroundSlider() {
  var slides = document.querySelectorAll('.hero-bg-slide');
  if (!slides.length) return;

  var currentIndex = 0;
  var interval = 6000; // 6s per slide (4s visible + 1.5s crossfade overlap)

  function nextSlide() {
    slides[currentIndex].classList.remove('hero-bg-slide--active');
    currentIndex = (currentIndex + 1) % slides.length;
    slides[currentIndex].classList.add('hero-bg-slide--active');
  }

  setInterval(nextSlide, interval);
}

/**
 * Navbar scroll listener - shrink and intensify blur on scroll
 */
function initNavbarScroll() {
  var navbar = document.getElementById('mainNavbar');
  if (!navbar) return;

  function onScroll() {
    var scrolled = window.pageYOffset > 30;
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

  function openMenu() {
    collapse.classList.add('show');
    hamburger.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    collapse.classList.remove('show');
    hamburger.setAttribute('aria-expanded', 'false');
  }

  hamburger.addEventListener('click', function () {
    if (collapse.classList.contains('show')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close menu when clicking overlay area (dark background outside the nav panel)
  collapse.addEventListener('click', function (e) {
    if (collapse.classList.contains('show') && !e.target.closest('.navbar-nav-wrap')) {
      closeMenu();
    }
  });

  // Close on Escape for accessibility
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && collapse.classList.contains('show')) {
      closeMenu();
    }
  });
}

/**
 * Smooth scroll for anchor links
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

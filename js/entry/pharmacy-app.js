/**
 * @file Entry point for the MediCare Pharmacy inventory experience.
 * Connects the pharmacist-facing shell with the PharmacyDashboard controller.
 */

import pharmacyDashboard from '../features/pharmacy-dashboard.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the pharmacist dashboard controller (inventory, Add Medication modal, etc.).
  pharmacyDashboard.init();

  // Skip drawer init when using Universal Master Sidebar (loadSidebar injects and handles it).
  if (document.getElementById('sidebar-container')) return;

  // Initialize sidebar drawer for pharmacy shell (mobile/compact).
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('adminOverlay');
  const toggle = document.getElementById('adminSidebarToggle');

  const openDrawer = () => {
    if (!(sidebar instanceof HTMLElement) || !overlay) return;
    sidebar.classList.add('active');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    toggle?.setAttribute('aria-expanded', 'true');
    toggle?.querySelector('.drawer-icon-open')?.classList.add('hidden');
    toggle?.querySelector('.drawer-icon-close')?.classList.remove('hidden');
  };

  const closeDrawer = () => {
    if (!(sidebar instanceof HTMLElement) || !overlay) return;
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.querySelector('.drawer-icon-open')?.classList.remove('hidden');
    toggle?.querySelector('.drawer-icon-close')?.classList.add('hidden');
  };

  if (toggle instanceof HTMLElement) {
    toggle.addEventListener('click', () => {
      if (sidebar instanceof HTMLElement && sidebar.classList.contains('active')) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });
  }

  overlay?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar instanceof HTMLElement && sidebar.classList.contains('active')) {
      closeDrawer();
    }
  });
});


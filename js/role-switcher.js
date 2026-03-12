/**
 * Role Switcher - Front-end security
 * Hides/shows sections based on active role (Admin, Doctor, Pharmacist)
 * Uses display: none for hidden sections
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'hms_active_role';
  const NEAR_EXPIRY_DAYS = 30;

  function getRole() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored || 'admin';
  }

  function setRole(role) {
    localStorage.setItem(STORAGE_KEY, role);
  }

  function applyRoleVisibility(role) {
    const sections = document.querySelectorAll('.hms-role-section[data-roles]');
    sections.forEach((el) => {
      const roles = (el.dataset.roles || '').split(',').map((r) => r.trim());
      const visible = roles.includes(role);
      el.classList.toggle('visible', visible);
      el.style.display = visible ? '' : 'none';
    });
  }

  function init() {
    const select = document.getElementById('roleSwitcher');
    if (!select) return;

    const role = getRole();
    select.value = role;
    applyRoleVisibility(role);

    select.addEventListener('change', () => {
      const newRole = select.value;
      setRole(newRole);
      applyRoleVisibility(newRole);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

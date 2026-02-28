/**
 * EMR Patient Dashboard - Interactive Features
 * Enterprise-grade EMR interface with dropdowns, filters, and dynamic toggles
 * Icons: Font Awesome 6
 */

document.addEventListener('DOMContentLoaded', function() {
  initSidebar();
  initNotificationDropdown();
  initPatientActionsMenu();
  initGlobalSearchDropdown();
  initViewTrendsToggle();
  initTableFilters();
  initClickOutsideToClose();
  initEscapeKey();
});

/* ============================================
   SIDEBAR - Mobile drawer toggle
   ============================================ */
function initSidebar() {
  var sidebar = document.getElementById('dashSidebar');
  var overlay = document.getElementById('dashOverlay');
  var toggle = document.getElementById('dashSidebarToggle');

  function openDrawer() {
    sidebar.classList.add('dash-mobile-open');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    sidebar.classList.remove('dash-mobile-open');
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  toggle?.addEventListener('click', function() {
    sidebar.classList.contains('dash-mobile-open') ? closeDrawer() : openDrawer();
  });

  overlay?.addEventListener('click', closeDrawer);
}

/* ============================================
   HEADER DROPDOWNS - Mutual exclusivity helper
   Only one menu (notification or profile) open at a time
   ============================================ */
function closeOtherHeaderDropdown(exceptId) {
  var notifDropdown = document.getElementById('dashNotificationDropdown');
  var notifTrigger = document.getElementById('dashNotification');
  var profileMenu = document.getElementById('dashPatientActionsMenu');
  var profileTrigger = document.getElementById('dashPatientActions');

  if (exceptId !== 'dashNotificationDropdown' && notifDropdown?.classList.contains('is-open')) {
    notifDropdown.classList.remove('is-open');
    notifDropdown.setAttribute('aria-hidden', 'true');
    if (notifTrigger) notifTrigger.setAttribute('aria-expanded', 'false');
  }
  if (exceptId !== 'dashPatientActionsMenu' && profileMenu?.classList.contains('is-open')) {
    profileMenu.classList.remove('is-open');
    profileMenu.setAttribute('aria-hidden', 'true');
    if (profileTrigger) profileTrigger.setAttribute('aria-expanded', 'false');
  }
}

/* ============================================
   NOTIFICATION DROPDOWN - Unread / All tabs
   Same behavior as Profile Actions menu
   ============================================ */
function initNotificationDropdown() {
  var trigger = document.getElementById('dashNotification');
  var dropdown = document.getElementById('dashNotificationDropdown');
  var tabs = dropdown?.querySelectorAll('.dash-notification-tab');
  var tabContents = dropdown?.querySelectorAll('[data-tab-content]');

  if (!trigger || !dropdown) return;

  trigger.addEventListener('click', function(e) {
    e.stopPropagation();
    closeOtherHeaderDropdown('dashNotificationDropdown');
    var isOpen = dropdown.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', isOpen);
    dropdown.setAttribute('aria-hidden', !isOpen);
  });

  tabs?.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var tabName = this.getAttribute('data-tab');
      tabs.forEach(function(t) {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', t === tab);
      });
      tabContents?.forEach(function(content) {
        var show = content.getAttribute('data-tab-content') === tabName;
        content.classList.toggle('d-none', !show);
      });
    });
  });
}

/* ============================================
   PATIENT ACTIONS MENU - Edit, Export, Transfer
   ============================================ */
function initPatientActionsMenu() {
  var trigger = document.getElementById('dashPatientActions');
  var menu = document.getElementById('dashPatientActionsMenu');
  var menuItems = menu?.querySelectorAll('.dash-actions-menu-item');

  if (!trigger || !menu) return;

  trigger.addEventListener('click', function(e) {
    e.stopPropagation();
    closeOtherHeaderDropdown('dashPatientActionsMenu');
    var isOpen = menu.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', isOpen);
    menu.setAttribute('aria-hidden', !isOpen);
  });

  menuItems?.forEach(function(item) {
    item.addEventListener('click', function() {
      console.log('Action:', item.textContent.trim());
      menu.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
    });
  });
}

/* ============================================
   GLOBAL SEARCH - Recent Patients dropdown on focus
   ============================================ */
function initGlobalSearchDropdown() {
  var searchInput = document.getElementById('dashGlobalSearch');
  var dropdown = document.getElementById('dashRecentPatients');

  if (!searchInput || !dropdown) return;

  searchInput.addEventListener('focus', function() {
    dropdown.classList.add('is-open');
    searchInput.setAttribute('aria-expanded', 'true');
    dropdown.setAttribute('aria-hidden', 'false');
  });
}

/* ============================================
   VIEW TRENDS - Toggle chart area for vitals
   ============================================ */
function initViewTrendsToggle() {
  var btn = document.getElementById('dashViewTrendsBtn');
  var chart = document.getElementById('dashTrendsChart');

  if (!btn || !chart) return;

  btn.addEventListener('click', function() {
    var isVisible = chart.classList.toggle('is-visible');
    btn.setAttribute('aria-expanded', isVisible);
    chart.setAttribute('aria-hidden', !isVisible);
    btn.innerHTML = (isVisible ? '<i class="fas fa-chart-line" aria-hidden="true"></i> Hide Trends' : '<i class="fas fa-chart-line" aria-hidden="true"></i> View Trends');
  });
}

/* ============================================
   TABLE FILTERS - Real-time filter for Lab Results & Medications
   ============================================ */
function initTableFilters() {
  var labFilter = document.getElementById('dashLabFilter');
  var medFilter = document.getElementById('dashMedFilter');

  if (labFilter) {
    labFilter.addEventListener('input', function() {
      filterByText(this.value, '[data-filterable="lab"] tr', 'data-filter-text');
      filterByText(this.value, '[data-filterable="lab-cards"] .dash-lab-card', 'data-filter-text');
    });
  }

  if (medFilter) {
    medFilter.addEventListener('input', function() {
      filterByText(this.value, '[data-filterable="meds"] .dash-med-card', 'data-filter-text');
    });
  }
}

function filterByText(query, selector, attr) {
  var items = document.querySelectorAll(selector);
  var q = query.trim().toLowerCase();

  items.forEach(function(item) {
    var text = (item.getAttribute(attr) || '').toLowerCase();
    var match = !q || text.indexOf(q) !== -1;
    item.classList.toggle('dash-filter-hidden', !match);
  });
}

/* ============================================
   CLICK OUTSIDE - Close all dropdowns
   ============================================ */
function initClickOutsideToClose() {
  document.addEventListener('click', function(e) {
    var notifWrap = document.querySelector('.dash-notification-wrap');
    var userWrap = document.querySelector('.dash-user-wrap');
    var searchWrap = document.getElementById('dashSearchWrapper');

    if (notifWrap && !notifWrap.contains(e.target)) {
      closeDropdown('dashNotificationDropdown', 'dashNotification');
    }
    if (userWrap && !userWrap.contains(e.target)) {
      closeDropdown('dashPatientActionsMenu', 'dashPatientActions');
    }
    if (searchWrap && !searchWrap.contains(e.target)) {
      closeDropdown('dashRecentPatients', 'dashGlobalSearch');
    }
  });
}

function closeDropdown(dropdownId, triggerId) {
  var dropdown = document.getElementById(dropdownId);
  var trigger = document.getElementById(triggerId);
  if (dropdown?.classList.contains('is-open')) {
    dropdown.classList.remove('is-open');
    dropdown.setAttribute('aria-hidden', 'true');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }
}

/* ============================================
   ESCAPE KEY - Close dropdowns
   ============================================ */
function initEscapeKey() {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.dash-notification-dropdown, .dash-actions-menu, .dash-search-dropdown').forEach(function(el) {
        if (el.classList.contains('is-open')) {
          el.classList.remove('is-open');
          el.setAttribute('aria-hidden', 'true');
          var trigger = document.querySelector('[aria-controls="' + el.id + '"]');
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
        }
      });

      var sidebar = document.getElementById('dashSidebar');
      if (sidebar?.classList.contains('dash-mobile-open')) {
        sidebar.classList.remove('dash-mobile-open');
        document.getElementById('dashOverlay')?.classList.remove('active');
        document.body.style.overflow = '';
      }
    }
  });
}

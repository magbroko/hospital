/**
 * Expiry Reports - Drugs near expiry
 */
(function () {
  'use strict';
  const STORAGE_KEY = 'hms_drug_inventory';

  function getDrugs() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function daysUntilExpiry(dateStr) {
    const exp = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    exp.setHours(0, 0, 0, 0);
    return Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  }

  function render() {
    const tbody = document.getElementById('expiryBody');
    if (!tbody) return;

    const drugs = getDrugs();
    const nearExpiry = drugs
      .map(function (d) {
        const days = daysUntilExpiry(d.expiryDate || '');
        return { ...d, daysLeft: days };
      })
      .filter(function (d) {
        return d.daysLeft <= 30 && d.daysLeft >= 0;
      })
      .sort(function (a, b) {
        return a.daysLeft - b.daysLeft;
      });

    if (nearExpiry.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary py-4">No drugs expiring within 30 days.</td></tr>';
      return;
    }

    tbody.innerHTML = nearExpiry
      .map(function (d) {
        const status = d.daysLeft <= 7 ? 'Critical' : d.daysLeft <= 14 ? 'Warning' : 'Caution';
        const badgeClass = d.daysLeft <= 7 ? 'bg-danger' : d.daysLeft <= 14 ? 'bg-warning text-dark' : 'bg-info';
        return (
          '<tr>' +
          '<td>' + (d.name || '—') + '</td>' +
          '<td>' + (d.batch || d.id || '—') + '</td>' +
          '<td>' + (d.qty || 0) + '</td>' +
          '<td>' + (d.expiryDate || '—') + '</td>' +
          '<td>' + d.daysLeft + ' days</td>' +
          '<td><span class="badge ' + badgeClass + '">' + status + '</span></td>' +
          '</tr>'
        );
      })
      .join('');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();

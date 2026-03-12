/**
 * Dispense Logs - Medication dispensing history
 */
(function () {
  'use strict';
  const STORAGE_KEY = 'hms_dispense_logs';

  function getLogs() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function render() {
    const tbody = document.getElementById('dispenseBody');
    if (!tbody) return;

    const logs = getLogs();

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary py-4">No dispense records yet.</td></tr>';
      return;
    }

    tbody.innerHTML = logs
      .slice()
      .reverse()
      .map(function (log) {
        return (
          '<tr>' +
          '<td>' + (log.dateTime || '—') + '</td>' +
          '<td>' + (log.patient || '—') + '</td>' +
          '<td>' + (log.drug || '—') + '</td>' +
          '<td>' + (log.qty || 0) + '</td>' +
          '<td>' + (log.dispensedBy || '—') + '</td>' +
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

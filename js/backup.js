/**
 * @deprecated Backup is now in js/features/admin-dashboard.js (export from AppState). See js/legacy/README.md.
 * Backup / Export (legacy IIFE)
 */
(function() {
  'use strict';

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportJSON() {
    const drugs = window.HMSInventory?.getDrugs?.() || [];
    const notes = window.HMSCaseNotes?.getNotes?.() || [];
    const equipment = window.HMSEquipment?.getEquipment?.() || [];
    const expenses = window.HMSExpenses?.getExpenses?.() || {};
    const billing = window.HMSBilling?.getItems?.() || [];

    const data = {
      exportedAt: new Date().toISOString(),
      drugs,
      caseNotes: notes,
      equipment,
      expenses,
      billing,
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, 'medicare-hms-backup-' + new Date().toISOString().slice(0, 10) + '.json');
  }

  function exportCSV() {
    const drugs = window.HMSInventory?.getDrugs?.() || [];
    const headers = ['Drug Name', 'Qty', 'Expiry Date'];
    const rows = drugs.map((d) => [d.name, d.qty, d.expiryDate]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, 'medicare-drugs-' + new Date().toISOString().slice(0, 10) + '.csv');
  }

  function init() {
    const btn = document.getElementById('btnBackup');
    if (!btn) return;

    btn.addEventListener('click', () => {
      exportJSON();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

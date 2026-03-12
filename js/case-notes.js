/**
 * @deprecated Use js/services/case-notes-service.js and js/features/admin-dashboard.js. See js/legacy/README.md.
 * Patient Case Notes - Scrollable Timeline UI (legacy IIFE)
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'hms_case_notes';

  function getNotes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : getDefaultNotes();
    } catch {
      return getDefaultNotes();
    }
  }

  function getDefaultNotes() {
    return [
      { id: '1', date: '2025-01-15', text: 'Initial consultation. Patient presented with chest discomfort. ECG ordered.' },
      { id: '2', date: '2025-01-16', text: 'ECG results reviewed. No acute findings. Recommended stress test.' },
      { id: '3', date: '2025-01-20', text: 'Stress test completed. Normal exercise tolerance. Follow-up in 6 months.' },
    ];
  }

  function saveNotes(notes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }

  function addNote(text) {
    if (!text || !text.trim()) return;
    const notes = getNotes();
    const id = String(Date.now());
    const date = new Date().toISOString().slice(0, 10);
    notes.unshift({ id, date, text: text.trim() });
    saveNotes(notes);
    render();
  }

  function formatDate(str) {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function render() {
    const container = document.getElementById('caseNotesTimeline');
    if (!container) return;

    const notes = getNotes();
    container.innerHTML = notes.map((n) => `
      <div class="hms-timeline-item" data-id="${n.id}">
        <div class="hms-timeline-dot"></div>
        <div class="hms-timeline-date">${formatDate(n.date)}</div>
        <div class="hms-timeline-content">${escapeHtml(n.text)}</div>
      </div>
    `).join('');
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function handleAdd() {
    const input = document.getElementById('caseNoteInput');
    const text = input?.value?.trim();
    if (text) {
      addNote(text);
      input.value = '';
    }
  }

  function init() {
    render();
    document.getElementById('btnAddCaseNote')?.addEventListener('click', handleAdd);
    document.getElementById('caseNoteInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.HMSCaseNotes = { getNotes, addNote, render };
})();

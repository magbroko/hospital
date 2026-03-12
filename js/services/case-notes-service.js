/**
 * @file CaseNotesService - patient case notes timeline for Admin/Doctor HMS.
 * Uses AppState.caseNotes; no DOM.
 */

import AppState from '../core/app-state.js';

/** @typedef {{ id: string; date: string; text: string }} CaseNote */

const DEFAULT_NOTES = [
  { id: '1', date: '2025-01-15', text: 'Initial consultation. Patient presented with chest discomfort. ECG ordered.' },
  { id: '2', date: '2025-01-16', text: 'ECG results reviewed. No acute findings. Recommended stress test.' },
  { id: '3', date: '2025-01-20', text: 'Stress test completed. Normal exercise tolerance. Follow-up in 6 months.' },
];

class CaseNotesService {
  getAll() {
    const list = AppState.get('caseNotes');
    if (!Array.isArray(list) || list.length === 0) {
      AppState.commit('caseNotes', DEFAULT_NOTES);
      return AppState.get('caseNotes');
    }
    return list;
  }

  /**
   * @param {string} text
   * @returns {CaseNote}
   */
  addNote(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return null;
    const list = this.getAll().slice();
    const note = {
      id: String(Date.now()),
      date: new Date().toISOString().slice(0, 10),
      text: trimmed,
    };
    list.unshift(note);
    AppState.commit('caseNotes', list);
    return note;
  }
}

const caseNotesService = new CaseNotesService();
export { CaseNotesService };
export default caseNotesService;

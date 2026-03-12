/**
 * @file AppointmentService - appointments queue for Doctor dashboard.
 * Persists via AppState; no DOM.
 */

import AppState from '../core/app-state.js';

/**
 * @typedef {Object} Appointment
 * @property {string} id
 * @property {string} patientId
 * @property {string} patientName
 * @property {string} [department]
 * @property {string} date - ISO date string
 * @property {string} [time]
 * @property {'waiting'|'in-consultation'|'completed'|'rejected'} status
 * @property {string} [reason]
 * @property {string} [notes]
 */

/**
 * AppointmentService: read/update appointments in AppState.
 */
class AppointmentService {
  /**
   * @returns {Appointment[]}
   */
  getAll() {
    const list = AppState.get('appointments');
    if (!Array.isArray(list)) {
      this._seedDefault();
      return AppState.get('appointments');
    }
    if (list.length === 0) {
      this._seedDefault();
      return AppState.get('appointments');
    }
    return list;
  }

  /**
   * @param {string} id
   * @returns {Appointment | undefined}
   */
  getById(id) {
    return this.getAll().find((a) => a.id === id);
  }

  /**
   * @param {string} id
   * @param {'waiting'|'in-consultation'|'completed'|'rejected'} status
   * @returns {Appointment | null}
   */
  updateStatus(id, status) {
    const list = this.getAll().map((a) =>
      a.id === id ? { ...a, status } : a
    );
    AppState.commit('appointments', list);
    return this.getById(id) || null;
  }

  /**
   * Add a new appointment (e.g. from Patient booking). Doctors see it in the queue.
   *
   * @param {{ patientId: string; patientName: string; department?: string; date: string; time?: string; reason?: string }} data
   * @returns {Appointment}
   */
  add(data) {
    const list = this.getAll().slice();
    const apt = {
      id: `apt-${Date.now()}`,
      patientId: data.patientId || '',
      patientName: data.patientName || 'Patient',
      department: data.department || 'General',
      date: data.date || '',
      time: data.time || '09:00',
      status: 'waiting',
      reason: data.reason,
      notes: undefined,
    };
    list.push(apt);
    AppState.commit('appointments', list);
    return apt;
  }

  /**
   * @param {string} id
   * @param {{ notes?: string }} patch
   * @returns {Appointment | null}
   */
  updateNotes(id, patch) {
    const list = this.getAll().map((a) =>
      a.id === id ? { ...a, ...patch } : a
    );
    AppState.commit('appointments', list);
    return this.getById(id) || null;
  }

  /**
   * Seed default appointments if none exist.
   * @private
   * @returns {Appointment[]}
   */
  _seedDefault() {
    const today = new Date().toISOString().slice(0, 10);
    const defaults = [
      { id: 'apt1', patientId: 'P001', patientName: 'Robert Johnson', department: 'Cardiology', date: today, time: '09:00', status: 'waiting', reason: 'Follow-up' },
      { id: 'apt2', patientId: 'P002', patientName: 'Emily Rodriguez', department: 'General', date: today, time: '09:30', status: 'waiting', reason: 'Checkup' },
      { id: 'apt3', patientId: 'P003', patientName: 'David Chen', department: 'Orthopedics', date: today, time: '10:00', status: 'waiting', reason: 'Pain review' },
    ];
    AppState.commit('appointments', defaults);
    return defaults;
  }
}

const appointmentService = new AppointmentService();
export { AppointmentService };
export default appointmentService;

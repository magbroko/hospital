/**
 * @file EquipmentService - equipment ledger for Admin HMS.
 * Uses AppState.equipment; no DOM.
 */

import AppState from '../core/app-state.js';

/** @typedef {{ id: string; name: string; location: string; status: string }} EquipmentItem */

const DEFAULT_EQUIPMENT = [
  { id: 'EQ-001', name: 'MRI Scanner', location: 'Radiology', status: 'Operational' },
  { id: 'EQ-002', name: 'CT Scanner', location: 'Radiology', status: 'Operational' },
  { id: 'EQ-003', name: 'Ventilator Unit', location: 'ICU', status: 'In Use' },
  { id: 'EQ-004', name: 'ECG Monitor', location: 'Cardiology', status: 'Operational' },
  { id: 'EQ-005', name: 'Ultrasound Machine', location: 'Imaging', status: 'Maintenance' },
  { id: 'EQ-006', name: 'Defibrillator', location: 'ER', status: 'Operational' },
];

class EquipmentService {
  getAll() {
    const list = AppState.get('equipment');
    if (!Array.isArray(list) || list.length === 0) {
      AppState.commit('equipment', DEFAULT_EQUIPMENT);
      return AppState.get('equipment');
    }
    return list;
  }

  /**
   * @param {{ id: string; name: string; location: string; status?: string }} data
   * @returns {EquipmentItem}
   */
  add(data) {
    const list = this.getAll().slice();
    const item = {
      id: data.id || `EQ-${Date.now()}`,
      name: data.name || '',
      location: data.location || '',
      status: data.status || 'Operational',
    };
    list.push(item);
    AppState.commit('equipment', list);
    return item;
  }
}

const equipmentService = new EquipmentService();
export { EquipmentService };
export default equipmentService;

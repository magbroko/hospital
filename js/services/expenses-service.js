/**
 * @file ExpensesService - expense categories and amounts for Admin HMS.
 * Uses AppState.expenses (object keyed by category); no DOM.
 */

import AppState from '../core/app-state.js';

export const EXPENSE_CATEGORIES = ['Salaries', 'Electricity', 'Tax', 'Fuel', 'Supplies', 'Maintenance'];

class ExpensesService {
  getAll() {
    const raw = AppState.get('expenses');
    const obj = typeof raw === 'object' && raw !== null ? { ...raw } : {};
    EXPENSE_CATEGORIES.forEach((c) => {
      if (obj[c] === undefined) obj[c] = 0;
    });
    return obj;
  }

  addExpense(category, amount) {
    const obj = this.getAll();
    const num = parseFloat(String(amount)) || 0;
    obj[category] = (obj[category] || 0) + num;
    AppState.commit('expenses', obj);
  }
}

const expensesService = new ExpensesService();
export { ExpensesService };
export default expensesService;

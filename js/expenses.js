/**
 * @deprecated Use js/services/expenses-service.js and js/features/admin-dashboard.js. See js/legacy/README.md.
 * Expense Tracking (legacy IIFE)
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'hms_expenses';
  const CATEGORIES = ['Salaries', 'Electricity', 'Tax', 'Fuel', 'Supplies', 'Maintenance'];

  function getExpenses() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      CATEGORIES.forEach((c) => {
        if (parsed[c] === undefined) parsed[c] = 0;
      });
      return parsed;
    } catch {
      return Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
    }
  }

  function saveExpenses(expenses) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }

  function addExpense(category, amount) {
    const exp = getExpenses();
    exp[category] = (exp[category] || 0) + parseFloat(amount) || 0;
    saveExpenses(exp);
    render();
  }

  function formatMoney(n) {
    return '$' + (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function render() {
    const grid = document.getElementById('expenseGrid');
    if (!grid) return;

    const expenses = getExpenses();
    grid.innerHTML = CATEGORIES.map((cat) => `
      <div class="hms-expense-card">
        <div class="expense-label">${escapeHtml(cat)}</div>
        <div class="expense-value">${formatMoney(expenses[cat])}</div>
      </div>
    `).join('');
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function openAddModal() {
    const cat = prompt('Category: ' + CATEGORIES.join(', '));
    if (!cat || !CATEGORIES.includes(cat)) return;
    const amount = parseFloat(prompt('Amount ($):') || '0');
    if (isNaN(amount) || amount <= 0) return;
    addExpense(cat, amount);
  }

  function init() {
    render();
    document.getElementById('btnAddExpense')?.addEventListener('click', openAddModal);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.HMSExpenses = { getExpenses, addExpense, render };
})();

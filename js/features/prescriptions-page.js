/**
 * @file Prescriptions Page - role-based view using shared PrescriptionService.
 * Pharmacist: "Dispensing Queue" (pending only, with Dispense action).
 * Admin: "Clinical History" (all prescriptions with doctor notes).
 */

import AppState from '../core/app-state.js';
import prescriptionService from '../services/prescription-service.js';
import { PrescriptionManager } from '../app-core.js';
import { showToast } from '../core/ui-components.js';

function getRole() {
  try {
    const raw = sessionStorage.getItem('medicare_user');
    if (raw) {
      const data = JSON.parse(raw);
      return (data?.role || '').toLowerCase();
    }
  } catch (_) {}
  return 'pharmacist';
}

function isAdminView(role) {
  const r = (role || '').toLowerCase();
  return r === 'admin' || r === 'doctor' || r === 'staff';
}

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function initPrescriptionsPage() {
  if (typeof document === 'undefined') return;

  const role = getRole();
  const isPharmacist = !isAdminView(role) && (role === 'pharmacist' || role === 'pharmacy');

  const headerTitle = document.querySelector('.prescriptions-page-title');
  const headerSubtitle = document.querySelector('.prescriptions-page-subtitle');
  const region = document.getElementById('pendingPrescriptionsRegion');
  const tbody = document.getElementById('pendingPrescriptionsBody');
  const verifyCheckbox = document.getElementById('verifyDispenseCheckbox');

  if (headerTitle) {
    headerTitle.textContent = isPharmacist ? 'Dispensing Queue' : 'Clinical History';
  }
  if (headerSubtitle) {
    headerSubtitle.textContent = isPharmacist
      ? 'Live physician orders prioritized for safe, verified dispensing.'
      : 'Prescriptions issued with doctor notes and diagnosis.';
  }

  function render() {
    const all = prescriptionService.getAll();
    const list = isPharmacist
      ? all.filter((p) => p.status === 'pending').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      : all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="px-4 py-8 text-center text-slate-500">
            ${isPharmacist ? 'No pending prescriptions. New eRx from clinicians will appear here.' : 'No prescriptions on record.'}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map((rx) => {
      const mainLine = (rx.lines && rx.lines[0]) || null;
      const extra = (rx.lines || []).length - 1;
      const label = mainLine ? `${mainLine.medication} · ${mainLine.qty} units` : 'No lines';
      const urgency = (rx.diagnosis || '').toLowerCase().includes('stat') ? 'Stat' : (isPharmacist ? 'Routine' : '—');
      const urgencyClass = urgency === 'Stat' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-amber-50 text-amber-700 border border-amber-100';

      const dispenseBtn = isPharmacist
        ? `<button type="button" class="inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 transition dispense-btn" data-id="${escapeHtml(rx.id)}">
             <i class="fas fa-check text-[10px]"></i> Dispense
           </button>`
        : '';

      const notes = !isPharmacist && rx.clinicalNotes
        ? `<div class="mt-1 text-xs text-slate-500">Notes: ${escapeHtml(rx.clinicalNotes)}</div>`
        : '';

      return `
        <tr class="hover:bg-slate-50/80 transition-colors">
          <td class="px-4 py-3 align-top">
            <div class="text-sm font-semibold text-slate-900">${escapeHtml(rx.patientName || 'Unknown')}</div>
            <div class="text-xs text-slate-500">${escapeHtml(rx.patientId || '')}</div>
          </td>
          <td class="px-4 py-3 align-top">
            <div class="text-sm text-slate-800">${escapeHtml(label)}${extra > 0 ? ` +${extra} more` : ''}</div>
            <div class="mt-0.5 text-xs text-slate-500">${escapeHtml(rx.diagnosis || '—')}</div>
            ${notes}
          </td>
          <td class="px-4 py-3 align-top">
            <span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              ${(rx.lines || []).reduce((s, l) => s + (l.qty || 0), 0)} units
            </span>
          </td>
          <td class="px-4 py-3 align-top">
            ${isPharmacist ? `<span class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${urgencyClass}">${urgency}</span>` : formatDate(rx.createdAt)}
          </td>
          <td class="px-4 py-3 align-top text-right">${dispenseBtn}</td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.dispense-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (!id) return;
        const { prescription } = PrescriptionManager.dispense(id);
        if (prescription) {
          showToast({ message: `Dispensed for ${prescription.patientName}.`, type: 'success' });
          render();
        }
      });
    });
  }

  if (region && verifyCheckbox) {
    verifyCheckbox.addEventListener('change', () => {
      if (verifyCheckbox.checked) {
        region.classList.remove('pointer-events-none', 'opacity-50');
      } else {
        region.classList.add('pointer-events-none', 'opacity-50');
      }
    });
  }

  AppState.subscribe('prescriptions', render);
  render();
}

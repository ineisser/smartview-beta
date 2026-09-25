// ============================================================
// SettingsTable.js — Tablas de configuración (máquinas y motivos)
// ============================================================

import { createIcons, icons } from 'lucide';

const MACHINE_COUNT = 19;

/**
 * Popula la tabla de máquinas en settings.
 */
export function initMaquinasTable() {
  const tbody = document.getElementById('settings-maquinas-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  for (let i = 1; i <= MACHINE_COUNT; i++) {
    const num     = i.toString().padStart(2, '0');
    const isActiva = i !== 15 && i !== 18;

    const estadoHtml = isActiva
      ? `<span class="text-[#10b981] flex items-center gap-2"><i data-lucide="check-circle" class="w-4 h-4"></i>Activa</span>`
      : `<span class="opacity-40 flex items-center gap-2"><i data-lucide="minus-circle" class="w-4 h-4"></i>Inactiva</span>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><div class="font-bold">${num}</div></td>
      <td>Máquina ${num}</td>
      <td>${estadoHtml}</td>
      <td class="text-right">
        <button class="action-btn"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  createIcons({ icons });
}

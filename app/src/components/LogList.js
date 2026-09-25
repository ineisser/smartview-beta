// ============================================================
// LogList.js — Renderiza listas de logs según la vista activa
// ============================================================

import { renderItem } from './LogItem.js';
import { state } from '../state/store.js';
import { createIcons, icons } from 'lucide';

/**
 * Calcula el inicio del turno actual basado en la hora.
 */
function getShiftStart() {
  const now = new Date();
  const hour = now.getHours();
  let startHour = 23;
  if (hour >= 7  && hour < 15) startHour = 7;
  else if (hour >= 15 && hour < 23) startHour = 15;

  const shiftStart = new Date();
  shiftStart.setHours(startHour, 0, 0, 0);
  if (shiftStart.getTime() > Date.now()) {
    shiftStart.setDate(shiftStart.getDate() - 1);
  }
  return shiftStart;
}

/**
 * Renderiza la lista de logs dentro del contenedor indicado,
 * según la vista especificada.
 */
export function renderLogListFor(containerId, viewToRender) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const logs = JSON.parse(localStorage.getItem('machine_stop_logs') || '[]');
  const shiftStart = getShiftStart();
  const { stoppedMachines, recentlyRestarted } = state;
  const MACHINE_COUNT = 19;

  // ── Historia ──────────────────────────────────────────────
  if (viewToRender === 'history') {
    const sortedItems = [...logs].reverse();
    if (sortedItems.length === 0) {
      container.innerHTML = `
        <div class="opacity-40 text-center py-20">
          <i data-lucide="clipboard" class="w-10 h-10 mx-auto mb-2"></i>
          <p>Sin historial</p>
        </div>`;
    } else {
      container.innerHTML = sortedItems.map((item, index) =>
        renderItem(
          item,
          index === 0 && (Date.now() - item.id) < 1500,
          item.status === 'atendido' && (Date.now() - (item.resolvedAt || 0)) < 1500
        )
      ).join('');
    }
  }

  // ── Prioridad (paros en espera) ───────────────────────────
  else if (viewToRender === 'priority') {
    const machines = Array.from({ length: MACHINE_COUNT }, (_, i) => i + 1);
    const stopped = [];
    const active  = [];

    machines.forEach(id => {
      const stopData = stoppedMachines[id];
      if (stopData) stopped.push({ id, ...stopData });
      else active.push({ id });
    });

    stopped.sort((a, b) => a.id - b.id);
    active.sort((a, b) => a.id - b.id);

    let html = '<span class="section-label">En espera (Prioridad)</span>';
    html += stopped.map(m => renderItem(
      { machine: m.id, reason: m.reason, stopTime: m.time, status: 'detenido', startTime: m.startTime },
      (Date.now() - (m.startTime || 0)) < 1500
    )).join('');

    html += '<span class="section-label">Funcionando</span>';
    html += active.map(m => {
      let startT = recentlyRestarted[m.id] || shiftStart.getTime();
      startT = Math.max(startT, shiftStart.getTime());
      const startTimeStr = new Date(startT).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      return renderItem(
        { machine: m.id, reason: 'Operando', stopTime: startTimeStr, status: 'activo', startTime: startT },
        (Date.now() - (recentlyRestarted[m.id] || 0)) < 1500,
        false
      );
    }).join('');

    container.innerHTML = html;
  }

  // ── Actividad (activas primero) ───────────────────────────
  else if (viewToRender === 'activity') {
    const machines = Array.from({ length: MACHINE_COUNT }, (_, i) => i + 1);
    const stopped = [];
    const active  = [];

    machines.forEach(id => {
      const stopData = stoppedMachines[id];
      if (stopData) stopped.push({ id, ...stopData });
      else active.push({ id });
    });

    stopped.sort((a, b) => a.id - b.id);
    active.sort((a, b) => a.id - b.id);

    let html = '<span class="section-label">Activas</span>';
    html += active.map(m => {
      let startT = recentlyRestarted[m.id] || shiftStart.getTime();
      startT = Math.max(startT, shiftStart.getTime());
      const startTimeStr = new Date(startT).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      return renderItem(
        { machine: m.id, reason: 'Operando', stopTime: startTimeStr, status: 'activo', startTime: startT },
        (Date.now() - (recentlyRestarted[m.id] || 0)) < 1500,
        false
      );
    }).join('');

    html += '<span class="section-label" style="margin-top: 2rem">Detenidas</span>';
    html += stopped.map(m => renderItem(
      { machine: m.id, reason: m.reason, stopTime: m.time, status: 'detenido', startTime: m.startTime },
      (Date.now() - (m.startTime || 0)) < 1500
    )).join('');

    container.innerHTML = html;
  }

  // ── Eficiencia (tabla) ────────────────────────────────────
  else if (viewToRender === 'efficiency') {
    const machines = Array.from({ length: MACHINE_COUNT }, (_, i) => i + 1);
    const formatMin = (m) => {
      if (m < 60) return `${m} min`;
      const h = Math.floor(m / 60);
      return `${h}h ${m % 60}m`;
    };

    let tableRows = '';
    machines.forEach(id => {
      let unproductiveMin = 0;
      logs.forEach(l => {
        if (l.machine === id && l.status === 'atendido' && l.id > shiftStart.getTime()) {
          unproductiveMin += (l.duration || 0);
        }
      });

      if (stoppedMachines[id]?.startTime) {
        unproductiveMin += Math.floor((Date.now() - stoppedMachines[id].startTime) / 60000);
      }

      let elapsedShiftMin = Math.floor((Date.now() - shiftStart.getTime()) / 60000);
      if (elapsedShiftMin < 0) elapsedShiftMin = 0;

      const operationMin = Math.max(0, elapsedShiftMin - unproductiveMin);
      const effPercent   = elapsedShiftMin > 0 ? Math.round((operationMin / elapsedShiftMin) * 100) : 100;
      const inactPercent = elapsedShiftMin > 0 ? Math.round((unproductiveMin / elapsedShiftMin) * 100) : 0;

      const effColor = effPercent >= 90 ? 'text-[#10b981]' : (effPercent >= 70 ? 'text-[#fbbf24]' : 'text-[#ef4444]');
      const startTimeStr = new Date(shiftStart.getTime()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const isStopped = !!stoppedMachines[id];

      const stateIndicator = isStopped
        ? `<i data-lucide="square" class="w-3.5 h-3.5 text-[#ef4444]" style="stroke-width:2.5px;opacity:0.8;filter:drop-shadow(0 0 6px rgba(239,68,68,0.5));"></i>`
        : `<i data-lucide="circle" class="w-3.5 h-3.5 text-[#10b981]" style="stroke-width:2.5px;opacity:0.8;filter:drop-shadow(0 0 6px rgba(16,185,129,0.5));"></i>`;

      tableRows += `
        <tr>
          <td><div class="font-bold flex items-center gap-3">${stateIndicator} M-${id.toString().padStart(2,'0')}</div></td>
          <td><span class="opacity-60">${startTimeStr}</span></td>
          <td>
            <div class="log-capsule" style="width:fit-content;background:transparent;">
              <i data-lucide="activity" class="text-[#10b981]"></i>
              <span>${formatMin(operationMin)} <span class="opacity-40 text-xs font-normal">/ ${formatMin(elapsedShiftMin)}</span></span>
            </div>
          </td>
          <td>
            <div class="log-capsule" style="width:fit-content;background:transparent;">
              <i data-lucide="clock" class="text-[#ef4444]"></i>
              <span>${formatMin(unproductiveMin)}</span>
            </div>
          </td>
          <td class="font-bold ${effColor}">${effPercent}%</td>
          <td class="opacity-60">${inactPercent}%</td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="maquinas-container" style="grid-column: 1 / -1;">
        <div class="maquinas-container-table">
          <table class="data-table w-full">
            <thead>
              <tr>
                <th>Máquina</th>
                <th>Inicio</th>
                <th>Operación</th>
                <th>Improductivo</th>
                <th>Eficiencia (%)</th>
                <th>Inactividad (%)</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ── Resumen (móvil) ───────────────────────────────────────
  else if (viewToRender === 'summary') {
    const eff = document.getElementById('eficiencia-numero')?.textContent || '100';
    const timeRemaining = document.getElementById('remaining-time-val')?.textContent || '--';
    const stoppedCount = Object.keys(stoppedMachines).length;

    container.innerHTML = `
      <div class="flex flex-col items-center gap-6 py-6">
        <div class="text-center">
          <span class="text-xs opacity-50 uppercase tracking-widest">Estado Turno</span>
          <div class="text-4xl font-bold mt-1">${timeRemaining}</div>
          <span class="text-[0.6rem] opacity-30">TIEMPO RESTANTE</span>
        </div>

        <div class="w-full bg-white/5 p-4 rounded-2xl border border-white/5">
          <div class="flex justify-between items-end mb-2">
            <span class="text-xs font-bold">Eficiencia Global</span>
            <span class="text-xl font-bold text-green-500">${eff}%</span>
          </div>
          <div class="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div class="h-full bg-green-500" style="width: ${eff}%"></div>
          </div>
        </div>

        <div class="w-full">
          <span class="section-label" style="margin: 0 0 10px 0">Mapa de Planta</span>
          <div class="mini-machine-grid">
            ${Array.from({ length: MACHINE_COUNT }, (_, i) => {
              const id = i + 1;
              const isStopped = stoppedMachines[id];
              return `<div class="mini-machine-box ${isStopped ? 'stopped' : 'active'}">${id}</div>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // Reinicializar iconos de lucide tras renderizar
  createIcons({ icons });
}

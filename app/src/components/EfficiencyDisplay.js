// ============================================================
// EfficiencyDisplay.js — Actualiza el número y barra de eficiencia
// ============================================================

import { state } from '../state/store.js';

/**
 * Calcula y actualiza el display de eficiencia en el sidebar.
 */
export function updateEfficiencyDisplay() {
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

  const logs = JSON.parse(localStorage.getItem('machine_stop_logs') || '[]');
  const MACHINE_COUNT = 19;

  let totalDowntime = 0;
  for (let id = 1; id <= MACHINE_COUNT; id++) {
    logs.forEach(l => {
      if (l.machine === id && l.status === 'atendido' && l.id > shiftStart.getTime()) {
        totalDowntime += (l.duration || 0);
      }
    });
    if (state.stoppedMachines[id]?.startTime) {
      totalDowntime += Math.floor((Date.now() - state.stoppedMachines[id].startTime) / 60000);
    }
  }

  const elapsedMin = Math.max(0, Math.floor((Date.now() - shiftStart.getTime()) / 60000));
  const totalPossibleMin = MACHINE_COUNT * elapsedMin;
  const eff = totalPossibleMin > 0
    ? Math.max(0, Math.round(((totalPossibleMin - totalDowntime) / totalPossibleMin) * 100))
    : 100;

  const effEl  = document.getElementById('eficiencia-numero');
  const barEl  = document.getElementById('efficiency-bar-fill');
  const dtEl   = document.getElementById('eff-downtime-val');
  const totEl  = document.getElementById('eff-total-val');
  const incMain = document.getElementById('incident-main');
  const incSub  = document.getElementById('incident-sub');
  const parosEl = document.getElementById('paros-count-display');

  if (effEl) {
    effEl.textContent = eff;
    effEl.style.color = eff >= 90 ? '#10b981' : (eff >= 70 ? '#fbbf24' : '#ef4444');
  }

  if (barEl) {
    barEl.style.width = `${eff}%`;
    barEl.style.backgroundColor = eff >= 90 ? '#10b981' : (eff >= 70 ? '#fbbf24' : '#ef4444');
    barEl.style.boxShadow = eff >= 90
      ? '0 0 15px rgba(16, 185, 129, 0.4)'
      : (eff >= 70 ? '0 0 15px rgba(251, 191, 36, 0.4)' : '0 0 15px rgba(239, 68, 68, 0.4)');
  }

  const stoppedCount = Object.keys(state.stoppedMachines).length;
  const stoppedMachineIds = Object.keys(state.stoppedMachines);

  if (parosEl) parosEl.textContent = stoppedCount;

  if (incMain) {
    incMain.textContent = `${stoppedCount} paros en ${stoppedMachineIds.length} máquinas`;
  }
  if (incSub) {
    incSub.textContent = `${totalDowntime} min tiempo sin producción`;
  }

  // Formato de tiempo para downtime/total sidebar
  const formatMin = (m) => m < 60 ? `${m} min` : `${Math.floor(m/60)}h ${m%60}m`;
  if (dtEl) dtEl.textContent = formatMin(totalDowntime);
  if (totEl) totEl.textContent = formatMin(elapsedMin);
}

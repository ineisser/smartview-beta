// ============================================================
// timers.js — Intervalos del sistema (timers, eficiencia, reloj)
// ============================================================

import { state } from '../state/store.js';
import { updateEfficiencyDisplay } from '../components/EfficiencyDisplay.js';
import { updateClockDisplay, updateDigitalClock } from '../components/ShiftClock.js';

/**
 * Actualiza el timer de tiempo de paro en cada card de máquina.
 */
function updateAllStopTimers() {
  for (const id in state.stoppedMachines) {
    const data = state.stoppedMachines[id];
    if (!data.startTime) continue;

    const timerEl = document.getElementById(`timer-${id}`);
    if (!timerEl) continue;

    const elapsedMs    = Date.now() - data.startTime;
    const totalMinutes = Math.floor(elapsedMs / 60000);

    timerEl.textContent = totalMinutes < 60
      ? `${totalMinutes} min`
      : `${Math.floor(totalMinutes / 60)}:${(totalMinutes % 60).toString().padStart(2, '0')}`;
  }
}

/**
 * Inicia todos los intervalos de la app.
 */
export function startTimers() {
  // Reloj digital + turno: cada segundo
  updateDigitalClock();
  updateClockDisplay();
  setInterval(() => {
    updateDigitalClock();
    updateClockDisplay();
  }, 1000);

  // Timers de paro + eficiencia: cada segundo
  setInterval(() => {
    updateAllStopTimers();
    updateEfficiencyDisplay();
  }, 1000);
}

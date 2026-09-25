// ============================================================
// StatusBar.js — Barra de alerta superior
// ============================================================

import { state } from '../state/store.js';

const ALERT_DISPLAY_DURATION = 8000; // ms

/**
 * Dispara la animación de alerta en la barra superior.
 */
export function triggerAlertContent() {
  if (state.autoCloseTimer) clearTimeout(state.autoCloseTimer);

  const statusBar     = document.getElementById('status-bar-container');
  const cardAlert     = document.getElementById('card-alert');
  const maquinaDisplay  = document.getElementById('maquina-number-display');
  const reasonNameText  = document.getElementById('reason-name-text');
  const stopTimeDisplay = document.getElementById('stop-time-display');

  if (!statusBar || !cardAlert || !state.lastPendingParo) return;

  statusBar.classList.add('is-expanded');
  cardAlert.classList.add('visible');

  maquinaDisplay.textContent  = state.lastPendingParo.machine.toString().padStart(2, '0');
  reasonNameText.textContent  = state.lastPendingParo.reason;
  stopTimeDisplay.textContent = state.lastPendingParo.time;

  [maquinaDisplay, reasonNameText, stopTimeDisplay].forEach(el => {
    el.classList.remove('animate-entrance');
    void el.offsetWidth;
    el.classList.add('animate-entrance');
  });

  state.autoCloseTimer = setTimeout(() => {
    statusBar.classList.remove('is-expanded');
    cardAlert.classList.remove('visible');
    state.lastPendingParo = null;
  }, ALERT_DISPLAY_DURATION);
}

/**
 * Dispara la animación de pulso sobre una card de máquina.
 * @param {HTMLElement} card
 * @param {'red'|'green'} type
 */
export function startMachinePulse(card, type) {
  if (!card) return;

  if (type === 'red') {
    card.style.animation = 'pulse-glow-red 2.5s ease-in-out 2';
    setTimeout(() => { card.style.animation = 'none'; }, 5000);
  } else {
    card.style.animation = 'pulse-glow-green 2.5s ease-in-out 2, bg-transition-green 5s linear forwards';
    setTimeout(() => {
      card.style.animation = 'none';
      card.classList.remove('is-restarting');
    }, 5000);
  }
}

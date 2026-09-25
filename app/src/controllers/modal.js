// ============================================================
// modal.js — Gestión del modal de paro de máquinas
// ============================================================

import { state } from '../state/store.js';
import { motivosParo } from '../data/motivos-paro.js';
import { triggerAlertContent, startMachinePulse } from '../components/StatusBar.js';
import { updateEfficiencyDisplay } from '../components/EfficiencyDisplay.js';
import { renderLogListFor } from '../components/LogList.js';

// ─── Inicialización del dropdown de motivos ───────────────────

export function initMotivosDropdown() {
  const optionsList  = document.getElementById('reasons-options-list');
  const selectTrigger = document.getElementById('reasons-select-trigger');
  const selectWrapper = document.getElementById('reasons-select-container');

  if (!optionsList) return;

  // Poblar opciones
  motivosParo.forEach(m => {
    const item = document.createElement('div');
    item.className = 'option-item';
    item.textContent = `${m.id} - ${m.name}`;
    item.addEventListener('click', () => selectReason(m.name, item.textContent));
    optionsList.appendChild(item);
  });

  // Abrir/cerrar dropdown
  selectTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    selectWrapper.classList.toggle('is-open');
  });

  document.addEventListener('click', () => {
    selectWrapper?.classList.remove('is-open');
  });
}

// ─── Selección de motivo ──────────────────────────────────────

function selectReason(name, displayText) {
  state.currentSelectedReason = name;

  const selectedReasonText = document.getElementById('selected-reason-text');
  const selectWrapper      = document.getElementById('reasons-select-container');
  if (selectedReasonText) selectedReasonText.textContent = displayText;
  selectWrapper?.classList.remove('is-open');

  if (state.selectedMachine && state.stoppedMachines[state.selectedMachine]) {
    const primaryBtn = document.getElementById('modal-primary-button');
    if (!primaryBtn) return;

    if (state.currentSelectedReason !== state.initialReason) {
      primaryBtn.textContent = 'cambiar motivo';
      primaryBtn.onclick = confirmUpdateReason;
      primaryBtn.className = 'flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold transition-all text-white shadow-lg';
    } else {
      primaryBtn.textContent = 'reiniciar';
      primaryBtn.onclick = confirmRestart;
      primaryBtn.className = 'flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold transition-all text-white shadow-lg';
    }
  }
}

// ─── Abrir modal ──────────────────────────────────────────────

export function openStopModal(id) {
  state.selectedMachine = id;

  const modal       = document.getElementById('modal-overlay');
  const modalTitle  = document.querySelector('#modal-overlay h3');
  const modalMachineId = document.getElementById('modal-machine-id');
  const primaryBtn  = document.getElementById('modal-primary-button');
  const selectedReasonText = document.getElementById('selected-reason-text');
  const isAlreadyStopped = state.stoppedMachines[id];

  if (modalMachineId) modalMachineId.textContent = id.toString().padStart(2, '0');

  if (isAlreadyStopped) {
    state.initialReason          = isAlreadyStopped.reason;
    state.currentSelectedReason  = isAlreadyStopped.reason;
    if (modalTitle) modalTitle.firstChild.textContent = 'Gestionar máquina ';
    if (selectedReasonText) selectedReasonText.textContent = isAlreadyStopped.reason;
    if (primaryBtn) {
      primaryBtn.textContent = 'reiniciar';
      primaryBtn.onclick = confirmRestart;
      primaryBtn.className = 'flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold transition-all text-white shadow-lg';
    }
  } else {
    state.initialReason         = null;
    state.currentSelectedReason = '';
    if (modalTitle) modalTitle.firstChild.textContent = 'Detener máquina ';
    if (selectedReasonText) selectedReasonText.textContent = 'Seleccione motivo...';
    if (primaryBtn) {
      primaryBtn.textContent = 'confirmar paro';
      primaryBtn.onclick = confirmStop;
      primaryBtn.className = 'flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 font-bold transition-all text-white shadow-lg';
    }
  }

  modal?.classList.add('active');
}

// ─── Cerrar modal ─────────────────────────────────────────────

export function closeModal() {
  document.getElementById('modal-overlay')?.classList.remove('active');
}

// ─── Confirmar paro ───────────────────────────────────────────

export function confirmStop() {
  const now     = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const reason  = state.currentSelectedReason || 'Paro automático';

  state.lastPendingParo = {
    machine: state.selectedMachine,
    reason,
    time: timeStr,
  };

  const machineCard = document.getElementById(`machine-${state.selectedMachine}`);
  if (machineCard) {
    machineCard.classList.add('is-stopped');
    state.stoppedMachines[state.selectedMachine] = {
      reason,
      time: timeStr,
      startTime: Date.now(),
    };

    // Guardar en localStorage
    const logs = JSON.parse(localStorage.getItem('machine_stop_logs') || '[]');
    logs.push({
      id: Date.now(),
      machine: state.selectedMachine,
      reason,
      stopTime: timeStr,
      status: 'detenido',
      duration: 0,
    });
    localStorage.setItem('machine_stop_logs', JSON.stringify(logs));
  }

  closeModal();
  _refreshMobileListIfOpen(state.selectedMachine);

  if (state.mainCurrentView !== 'mapa') {
    renderLogListFor('main-log-container', state.mainCurrentView);
  }

  // Secuencia: 1s espera → loading bar → alerta
  const loadingBar = document.getElementById('main-loading-bar');
  setTimeout(() => {
    if (loadingBar) {
      loadingBar.style.animation = 'none';
      void loadingBar.offsetWidth;
      loadingBar.style.animation = 'load-progress-loop 2s linear forwards';
    }
    setTimeout(() => {
      triggerAlertContent();
      startMachinePulse(machineCard, 'red');
    }, 2000);
  }, 1000);
}

// ─── Confirmar reinicio ───────────────────────────────────────

export function confirmRestart() {
  const now     = new Date();
  const stopData = state.stoppedMachines[state.selectedMachine];

  if (stopData) {
    const durationMin = Math.floor((Date.now() - stopData.startTime) / 60000);

    // Actualizar registro existente
    const logs = JSON.parse(localStorage.getItem('machine_stop_logs') || '[]');
    const lastStopIdx = [...logs].reverse().findIndex(
      l => l.machine === state.selectedMachine && l.status === 'detenido'
    );

    if (lastStopIdx !== -1) {
      const actualIdx = (logs.length - 1) - lastStopIdx;
      logs[actualIdx].status     = 'atendido';
      logs[actualIdx].duration   = durationMin;
      logs[actualIdx].resolvedAt = Date.now();
    }
    localStorage.setItem('machine_stop_logs', JSON.stringify(logs));

    delete state.stoppedMachines[state.selectedMachine];
    state.recentlyRestarted[state.selectedMachine] = Date.now();

    const machineCard = document.getElementById(`machine-${state.selectedMachine}`);
    if (machineCard) {
      machineCard.classList.remove('is-stopped');
      machineCard.classList.add('is-restarting');
      startMachinePulse(machineCard, 'green');
    }

    updateEfficiencyDisplay();
    _refreshMobileListIfOpen(state.selectedMachine);

    if (state.mainCurrentView !== 'mapa') {
      renderLogListFor('main-log-container', state.mainCurrentView);
    }
  }

  closeModal();
}

// ─── Confirmar cambio de motivo ───────────────────────────────

function confirmUpdateReason() {
  if (state.selectedMachine && state.stoppedMachines[state.selectedMachine]) {
    state.stoppedMachines[state.selectedMachine].reason = state.currentSelectedReason;
    state.lastPendingParo = {
      machine: state.selectedMachine,
      reason:  state.currentSelectedReason,
      time:    state.stoppedMachines[state.selectedMachine].time,
    };
    triggerAlertContent();
  }
  closeModal();
}

// ─── Helper: refrescar lista móvil si está abierta ────────────

function _refreshMobileListIfOpen(machineId) {
  const mobileModal = document.getElementById('mobile-modal');
  if (!mobileModal?.classList.contains('active')) return;

  const itemToExit = document.querySelector(`#log-list-container [data-machine-id="${machineId}"]`);
  if (itemToExit) {
    const wrapper = itemToExit.closest('.item-insert-wrapper') || itemToExit;
    wrapper.classList.add(itemToExit.classList.contains('mini') ? 'mini-exit-active' : 'item-exit-active');
    setTimeout(() => renderLogListFor('log-list-container', state.currentView), 500);
  } else {
    renderLogListFor('log-list-container', state.currentView);
  }
}

// ============================================================
// STORE.JS — Estado global compartido entre módulos
// ============================================================

export const state = {
  selectedMachine: null,
  stoppedMachines: {},     // { [id]: { reason, time, startTime } }
  recentlyRestarted: {},   // { [id]: timestamp }
  lastPendingParo: null,
  autoCloseTimer: null,
  initialReason: null,
  currentSelectedReason: '',

  // Vistas
  currentView: 'priority',      // vista del panel móvil
  mainCurrentView: 'mapa',      // vista del col-main desktop
};

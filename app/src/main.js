// ============================================================
// main.js — Punto de entrada de la SPA SmartView
// ============================================================

// 1. Estilos
import './styles/index.css';

// 2. Lucide icons (tree-shaking: solo los íconos usados)
import { createIcons, icons } from 'lucide';

// 3. State
import { state } from './state/store.js';

// 4. Controllers
import { initTheme, toggleTheme } from './controllers/theme.js';
import { changeView, changeModalView, changeSettingsTab, toggleMobileModal, initTabIndicator } from './controllers/views.js';
import { openStopModal, closeModal, confirmStop, confirmRestart, initMotivosDropdown } from './controllers/modal.js';
import { startTimers } from './controllers/timers.js';

// 5. Components
import { initMachineGrid } from './components/MachineGrid.js';
import { drawClockMarks } from './components/ShiftClock.js';
import { updateEfficiencyDisplay } from './components/EfficiencyDisplay.js';
import { initMaquinasTable } from './components/SettingsTable.js';

// ─── Inicialización ───────────────────────────────────────────

function init() {
  // Limpiar historial al arrancar (comportamiento original)
  localStorage.removeItem('machine_stop_logs');

  // Tema
  initTheme();

  // Máquinas en el mapa
  initMachineGrid(19, (id) => openStopModal(id));

  // Dropdown de motivos de paro
  initMotivosDropdown();

  // Tabla de máquinas en settings
  initMaquinasTable();

  // Reloj SVG
  drawClockMarks();

  // Eficiencia inicial
  updateEfficiencyDisplay();

  // Iniciar todos los timers
  startTimers();

  // Inicializar íconos Lucide
  createIcons({ icons });

  // Indicador de tab inicial
  initTabIndicator();
}

// ─── Exponer funciones al HTML (onclick attributes) ───────────
// Necesario porque Vite no expone al scope global por defecto.

window.openStopModal      = openStopModal;
window.closeModal         = closeModal;
window.confirmStop        = confirmStop;
window.confirmRestart     = confirmRestart;
window.changeView         = changeView;
window.changeModalView    = changeModalView;
window.changeSettingsTab  = changeSettingsTab;
window.toggleMobileModal  = toggleMobileModal;
window.toggleTheme        = toggleTheme;

// ─── Arrancar ─────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);

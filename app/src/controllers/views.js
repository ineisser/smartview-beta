// ============================================================
// views.js — Controlador de vistas principal y modal móvil
// ============================================================

import { state } from '../state/store.js';
import { renderLogListFor } from '../components/LogList.js';
import { createIcons, icons } from 'lucide';

const VIEW_CONFIGS = {
  mapa:       { title: 'Mapa de sección',    icon: 'grip' },
  history:    { title: 'Historial completo', icon: 'history' },
  priority:   { title: 'Máquinas en paro',   icon: 'square' },
  activity:   { title: 'Máquinas operando',  icon: 'circle' },
  efficiency: { title: 'Eficiencia',         icon: 'percent' },
  settings:   { title: 'Configuración',      icon: 'settings' },
};

const MODAL_TITLES = {
  history:  'Historial de Paros',
  priority: 'Prioridad de Atención',
  activity: 'Estado de Máquinas',
  summary:  'Resumen de Turno',
};

const MODAL_ICONS = {
  history:  'history',
  priority: 'square',
  activity: 'circle',
  summary:  'layout',
};

// ─── Vista principal (desktop col-main) ──────────────────────

export function changeView(view) {
  state.mainCurrentView = view;

  const mapContainer      = document.getElementById('maquinas-container');
  const listContainer     = document.getElementById('main-log-container');
  const settingsContainer = document.getElementById('settings-container');

  // Mostrar/ocultar contenedores
  if (view === 'mapa') {
    mapContainer?.style.setProperty('display', 'grid');
    listContainer?.style.setProperty('display', 'none');
    settingsContainer?.style.setProperty('display', 'none');

  } else if (view === 'settings') {
    mapContainer?.style.setProperty('display', 'none');
    listContainer?.style.setProperty('display', 'none');
    if (settingsContainer) {
      settingsContainer.style.display = 'block';
      settingsContainer.classList.remove('view-animate');
      void settingsContainer.offsetWidth;
      settingsContainer.classList.add('view-animate');

      const activeTab = document.querySelector('.settings-tab.active') || document.querySelector('.settings-tab');
      if (activeTab) setTimeout(() => changeSettingsTab('general', activeTab), 50);
    }

  } else {
    mapContainer?.style.setProperty('display', 'none');
    settingsContainer?.style.setProperty('display', 'none');
    if (listContainer) {
      listContainer.style.display = 'grid';
      if (view === 'activity' || view === 'priority') {
        listContainer.classList.add('activity-grid-desktop');
      } else {
        listContainer.classList.remove('activity-grid-desktop');
      }
      listContainer.classList.remove('view-animate');
      void listContainer.offsetWidth;
      listContainer.classList.add('view-animate');
      renderLogListFor('main-log-container', view);
    }
  }

  // Actualizar título e icono principal con animación
  const config    = VIEW_CONFIGS[view] || VIEW_CONFIGS['mapa'];
  const titleCont = document.querySelector('.main-view-title-container');
  const titleEl   = document.getElementById('main-view-title');

  if (titleCont) {
    titleCont.style.opacity   = '0';
    titleCont.style.transform = 'translateX(-10px)';

    setTimeout(() => {
      if (titleEl) titleEl.textContent = config.title;

      const iconCont = document.getElementById('main-view-icon-container');
      if (iconCont) {
        iconCont.innerHTML = `<i data-lucide="${config.icon}" class="text-accent-green"></i>`;
      }

      createIcons({ icons });
      titleCont.style.opacity   = '1';
      titleCont.style.transform = 'translateX(0)';
    }, 150);
  }

  // Actualizar tab activo + indicador
  _updateTabIndicator(
    '.maquinas-container-tab-view .tab-item',
    'tab-indicator',
    view
  );

  // Forzar tamaño de iconos SVG en tabs
  createIcons({ icons });
  document.querySelectorAll('.maquinas-container-tab-view .tab-item svg').forEach(svg => {
    svg.setAttribute('width',  '16');
    svg.setAttribute('height', '16');
  });
}

// ─── Vista modal móvil ────────────────────────────────────────

export function changeModalView(view) {
  state.currentView = view;

  // Título
  const titleEl = document.querySelector('.mobile-modal-panel h3');
  if (titleEl && MODAL_TITLES[view]) titleEl.textContent = MODAL_TITLES[view];

  // Icono
  const iconEl = document.getElementById('mobile-modal-icon');
  if (iconEl && MODAL_ICONS[view]) {
    iconEl.setAttribute('data-lucide', MODAL_ICONS[view]);
    createIcons({ icons });
  }

  // Botones activos
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`btn-nav-${view}`);
  if (activeBtn) {
    activeBtn.classList.add('active');

    // Mover indicador pill
    const indicator = document.getElementById('nav-indicator');
    if (indicator) {
      indicator.style.left  = `${activeBtn.offsetLeft}px`;
      indicator.style.width = `${activeBtn.offsetWidth}px`;
    }
  }

  // Animación de contenedor
  const container = document.getElementById('log-list-container');
  if (container) {
    container.classList.remove('view-animate');
    void container.offsetWidth;
    container.classList.add('view-animate');
  }

  renderLogListFor('log-list-container', view);
}

// ─── Vista settings tabs ──────────────────────────────────────

export function changeSettingsTab(tabId, btn) {
  document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  const indicator = document.getElementById('settings-tab-indicator');
  if (indicator) {
    indicator.style.width   = `${btn.offsetWidth}px`;
    indicator.style.left    = `${btn.offsetLeft}px`;
    indicator.style.opacity = '1';
  }

  document.querySelectorAll('.settings-content').forEach(c => {
    c.style.display = 'none';
    c.classList.remove('view-animate');
  });

  const activeContent = document.getElementById(`settings-content-${tabId}`);
  if (activeContent) {
    activeContent.style.display = 'block';
    void activeContent.offsetWidth;
    activeContent.classList.add('view-animate');
  }
}

// ─── Toggle panel móvil ───────────────────────────────────────

export function toggleMobileModal() {
  const mobileModal = document.getElementById('mobile-modal');
  const isActive = mobileModal.classList.toggle('active');
  if (isActive) changeModalView('priority');
}

// ─── Helper interno: actualiza el indicador de tabs ───────────

function _updateTabIndicator(tabsSelector, indicatorId, view) {
  const tabs = document.querySelectorAll(tabsSelector);
  const indicator = document.getElementById(indicatorId);
  let hasActive = false;

  tabs.forEach(tab => {
    const span = tab.querySelector('span');
    const matches = span && (
      span.textContent.toLowerCase().includes(view.toLowerCase()) ||
      (view === 'history'    && span.textContent === 'Historial') ||
      (view === 'priority'   && span.textContent === 'Paros')     ||
      (view === 'activity'   && span.textContent === 'Activas')   ||
      (view === 'mapa'       && span.textContent === 'Mapa')      ||
      (view === 'efficiency' && span.textContent === 'Eficiencia')
    );

    if (matches) {
      tab.classList.add('active');
      hasActive = true;
      if (indicator) {
        indicator.style.width   = `${tab.offsetWidth}px`;
        indicator.style.left    = `${tab.offsetLeft}px`;
        indicator.style.opacity = '1';
      }
    } else {
      tab.classList.remove('active');
    }
  });

  if (!hasActive && indicator) indicator.style.opacity = '0';
}

// ─── Inicializar indicador de tab al cargar ───────────────────

export function initTabIndicator() {
  setTimeout(() => {
    const activeTab = document.querySelector('.tab-item.active');
    const indicator = document.getElementById('tab-indicator');
    if (activeTab && indicator) {
      indicator.style.width = `${activeTab.offsetWidth}px`;
      indicator.style.left  = `${activeTab.offsetLeft}px`;
    }
  }, 500);
}

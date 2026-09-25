// ============================================================
// MachineGrid.js — Genera las cards de máquinas en el mapa
// ============================================================

/**
 * Inicializa el grid de máquinas inyectando las cards en el DOM.
 * @param {number} count - Número de máquinas a generar
 * @param {Function} onCardClick - Callback al hacer click en una card
 */
export function initMachineGrid(count = 19, onCardClick) {
  const container = document.getElementById('maquinas-container');
  if (!container) return;

  container.innerHTML = '';

  for (let i = 1; i <= count; i++) {
    const card = document.createElement('div');
    card.className = 'card-maquina';
    card.id = `machine-${i}`;
    card.innerHTML = `
      <span class="maquina-id">${i.toString().padStart(2, '0')}</span>
      <span id="timer-${i}" class="stop-timer">0 min</span>
    `;
    card.addEventListener('click', () => onCardClick(i));
    container.appendChild(card);
  }
}

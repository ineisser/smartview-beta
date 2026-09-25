// ============================================================
// LogItem.js — Renderiza un item de historial de paros
// ============================================================

const formatDuration = (min) => {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
};

/**
 * Devuelve el HTML string de un log item.
 * @param {Object} item     - Datos del log
 * @param {boolean} isRecent - Si es un item recién insertado (animación)
 * @param {boolean} isRes    - Si acaba de ser resuelto (glow verde)
 */
export function renderItem(item, isRecent = false, isRes = false) {
  const isAtendido = item.status === 'atendido';
  const isActivo   = item.status === 'activo';

  const animationClass     = isRes    ? 'resolved-glow' : '';
  const insertWrapperClass = isRecent ? 'item-insert-wrapper' : '';
  const insertContentClass = isRecent ? 'item-insert-content' : '';

  let durationVal = item.duration || 0;
  if (isActivo || (!isAtendido && item.startTime)) {
    durationVal = Math.floor((Date.now() - item.startTime) / 60000);
  } else if (!isAtendido) {
    durationVal = Math.floor((Date.now() - item.id) / 60000);
  }

  const durationText   = formatDuration(durationVal);
  const durationIcon   = isAtendido ? 'check' : 'circle-gauge';
  const iconClass      = isAtendido ? 'text-[#10b981]' : (isActivo ? 'spinning-icon text-[#10b981]' : 'spinning-icon');
  const statusIconName = isAtendido || isActivo ? 'circle' : 'square';
  const reasonOpacity  = isActivo ? 'opacity: 0.6;' : '';

  const itemHtml = `
    <div class="log-item ${animationClass} ${insertContentClass}" data-machine-id="${item.machine}">
      <div class="log-col-1">${item.machine.toString().padStart(2, '0')}</div>
      <div class="log-col-2">
        <div class="log-item-reason" style="${reasonOpacity}">${item.reason || 'Paro manual'}</div>
        <div class="log-item-footer">
          <div class="log-time-data" style="gap: 1rem">
            <div class="log-capsule">
              <i data-lucide="${isActivo ? 'arrow-right-from-line' : 'clock'}" class="w-3.5 h-3.5 ${isActivo ? 'text-[#10b981]' : ''}"></i>
              <span>${item.stopTime}</span>
            </div>
            <div class="log-capsule">
              <i data-lucide="${durationIcon}" class="w-4 h-4 ${iconClass}"></i>
              <span class="${isAtendido || isActivo ? 'font-bold opacity-100' : ''}">${durationText}</span>
            </div>
          </div>
          <i data-lucide="${statusIconName}" class="status-icon-log ${item.status}"></i>
        </div>
      </div>
    </div>
  `;

  return isRecent
    ? `<div class="${insertWrapperClass}">${itemHtml}</div>`
    : itemHtml;
}

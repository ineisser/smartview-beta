// ============================================================
// ShiftClock.js — Reloj SVG de turno con arco de progreso
// ============================================================

const SHIFTS = [
  { start: 7,  end: 15, label: 'A' },
  { start: 15, end: 23, label: 'B' },
  { start: 23, end: 7,  label: 'C' },
];

function getCurrentShift() {
  const hour = new Date().getHours();
  if (hour >= 7  && hour < 15) return SHIFTS[0];
  if (hour >= 15 && hour < 23) return SHIFTS[1];
  return SHIFTS[2];
}

function timeToAngle(hour, minute = 0) {
  return ((hour % 12) + minute / 60) / 12 * 360;
}

/**
 * Dibuja las marcas de horas en el SVG del reloj.
 */
export function drawClockMarks() {
  const group = document.getElementById('clock-marks-group');
  if (!group) return;
  group.innerHTML = '';

  for (let h = 0; h < 12; h++) {
    const angle = (h / 12) * 2 * Math.PI - Math.PI / 2;
    const isMajor = h % 3 === 0;
    const r1 = isMajor ? 36 : 38;
    const r2 = 42;
    const x1 = 50 + r1 * Math.cos(angle);
    const y1 = 50 + r1 * Math.sin(angle);
    const x2 = 50 + r2 * Math.cos(angle);
    const y2 = 50 + r2 * Math.sin(angle);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('class', 'hour-mark');
    if (isMajor) line.setAttribute('stroke-width', '2.5');
    group.appendChild(line);
  }
}

/**
 * Actualiza el arco de progreso del reloj y el tiempo restante.
 */
export function updateClockDisplay() {
  const shift = getCurrentShift();
  const now   = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  // Calcular tiempo transcurrido y total en minutos
  let elapsedMin, totalMin;
  if (shift.end > shift.start) {
    // Turno no cruza medianoche
    elapsedMin = nowMin - shift.start * 60;
    totalMin   = (shift.end - shift.start) * 60;
  } else {
    // Turno cruza medianoche (C: 23–7)
    totalMin = (24 - shift.start + shift.end) * 60;
    if (nowMin >= shift.start * 60) {
      elapsedMin = nowMin - shift.start * 60;
    } else {
      elapsedMin = (24 - shift.start) * 60 + nowMin;
    }
  }

  elapsedMin = Math.max(0, Math.min(elapsedMin, totalMin));
  const remainingMin = totalMin - elapsedMin;
  const progress = elapsedMin / totalMin;

  // Circunferencia del arco (r=42)
  const R = 42;
  const circumference = 2 * Math.PI * R;

  // Calcular ángulo de inicio y longitud del arco del turno
  const startAngle = (shift.start % 12) / 12 * circumference;
  const trackLen   = (totalMin / (12 * 60)) * circumference;
  const progressLen = progress * trackLen;

  const trackArc    = document.getElementById('shift-track-arc');
  const progressArc = document.getElementById('shift-progress-arc');

  if (trackArc) {
    trackArc.style.strokeDasharray  = `${trackLen} ${circumference}`;
    trackArc.style.strokeDashoffset = `-${startAngle}`;
  }

  if (progressArc) {
    progressArc.style.strokeDasharray  = `${progressLen} ${circumference}`;
    progressArc.style.strokeDashoffset = `-${startAngle}`;
    // SVG elements require setAttribute — assigning .className directly breaks on SVGAnimatedString
    progressArc.setAttribute('class', `shift-progress ${progress > 0.85 ? 'efficiency-bad' : 'efficiency-good'}`);
  }

  // Tiempo restante en el centro
  const remainEl = document.getElementById('remaining-time-val');
  if (remainEl) {
    const h = Math.floor(remainingMin / 60);
    const m = Math.floor(remainingMin % 60);
    remainEl.textContent = `${h}:${m.toString().padStart(2, '0')}`;
  }

  // Turno en footer
  const shiftDisplay = document.getElementById('shift-display');
  if (shiftDisplay) shiftDisplay.textContent = shift.label;
}

/**
 * Actualiza el reloj digital de hora actual en el footer.
 */
export function updateDigitalClock() {
  const now = new Date();
  const hm = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const s  = ':' + now.getSeconds().toString().padStart(2, '0');

  const hmEl = document.getElementById('clock-hm');
  const sEl  = document.getElementById('clock-s');
  if (hmEl) hmEl.textContent = hm;
  if (sEl)  sEl.textContent  = s;
}

// ============================================================
// theme.js — Toggle de tema dark/light
// ============================================================

/**
 * Inicializa el tema según localStorage o preferencia del sistema.
 */
export function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
}

/**
 * Alterna entre dark y light.
 */
export function toggleTheme() {
  const body = document.getElementById('body-context');
  const isDark = body.classList.contains('dark');
  const next = isDark ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('theme', next);
}

function applyTheme(theme) {
  const body = document.getElementById('body-context');
  const icon = document.getElementById('theme-icon');
  body.classList.remove('dark', 'light');
  body.classList.add(theme);
  if (icon) {
    icon.setAttribute('data-lucide', theme === 'dark' ? 'moon' : 'sun');
    if (window.lucide) window.lucide.createIcons();
  }
}

const KEY = "smartview-pantalla";

const raiz = () => document.documentElement;

export const leerPantalla = () => localStorage.getItem(KEY) === "completa";

export const guardarPantalla = (completa) => {
  localStorage.setItem(KEY, completa ? "completa" : "ventana");
};

export const estaCompleta = () => Boolean(
  document.fullscreenElement || document.webkitFullscreenElement || document.webkitCurrentFullScreenElement,
);

export const entrarPantalla = async () => {
  const nodo = raiz();
  const pedir = nodo.requestFullscreen || nodo.webkitRequestFullscreen || nodo.webkitRequestFullScreen;
  if (!pedir || estaCompleta()) return;
  await pedir.call(nodo).catch(() => {});
};

export const salirPantalla = async () => {
  const salir = document.exitFullscreen || document.webkitExitFullscreen || document.webkitCancelFullScreen;
  if (!salir || !estaCompleta()) return;
  await salir.call(document).catch(() => {});
};

export const alternarPantalla = async () => {
  if (estaCompleta()) await salirPantalla();
  else await entrarPantalla();
};

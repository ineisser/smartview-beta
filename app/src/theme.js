const KEY = "smartview-theme";

export const leerTema = () => localStorage.getItem(KEY) || "system";

export const temaResuelto = (preferencia = leerTema()) => {
  if (preferencia === "dark" || preferencia === "light") return preferencia;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const aplicarTema = (preferencia) => {
  const modo = preferencia === "light" || preferencia === "dark" || preferencia === "system" ? preferencia : "system";
  const resuelto = temaResuelto(modo);
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(resuelto);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resuelto === "dark" ? "#050505" : "#e7edf4");
  document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.setAttribute("content", resuelto === "dark" ? "black" : "default");
  document.documentElement.dataset.theme = modo;
  localStorage.setItem(KEY, modo);
  return modo;
};

const KEY = "smartview-theme";

export const leerTema = () => localStorage.getItem(KEY) || "system";

export const temaResuelto = (preferencia = leerTema()) => {
  if (preferencia === "dark" || preferencia === "light") return preferencia;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const aplicarTema = (preferencia) => {
  const modo = preferencia === "light" || preferencia === "dark" || preferencia === "system" ? preferencia : "system";
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(temaResuelto(modo));
  document.documentElement.dataset.theme = modo;
  localStorage.setItem(KEY, modo);
  return modo;
};

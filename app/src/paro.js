export const VIA = {
  paroManual: 1,
  paroAuto: 2,
  arranqueManual: 3,
  arranqueAuto: 4,
};

export const esManual = (via) => via === VIA.paroManual || via === VIA.arranqueManual;

export const nombreDeVia = (via, nombre) => {
  if (!via) return nombre || "—";
  if (esManual(via)) return nombre || "—";
  return "Sistema";
};

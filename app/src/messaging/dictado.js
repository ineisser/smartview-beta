const palabras = (valor) => String(valor || "").replace(/\s+/g, " ").trim();

/** Une lo ya escrito con lo que acaba de oír el motor, sin repetir la cola. */
export const fusionarDictado = (base, extra) => {
  const a = palabras(base);
  const b = palabras(extra);
  if (!b) return a;
  if (!a || a === b || a.endsWith(` ${b}`)) return b && a ? a : b;
  if (b.startsWith(`${a} `)) return b;
  const palabrasA = a.split(" ");
  const palabrasB = b.split(" ");
  const tope = Math.min(palabrasA.length, palabrasB.length);
  for (let n = tope; n > 0; n -= 1) {
    if (palabrasA.slice(-n).join(" ") === palabrasB.slice(0, n).join(" ")) {
      return [...palabrasA, ...palabrasB.slice(n)].join(" ");
    }
  }
  return `${a} ${b}`;
};

/** Reconstruye la sesión completa. En tablet Chrome reenvía finales ya oídos. */
export const textoDeResultados = (results) => {
  let finales = "";
  let parcial = "";
  const lista = results || [];
  for (let i = 0; i < lista.length; i += 1) {
    const item = lista[i];
    const pieza = palabras(item?.[0]?.transcript || "");
    if (!pieza) continue;
    if (item.isFinal) finales = fusionarDictado(finales, pieza);
    else parcial = fusionarDictado(parcial, pieza);
  }
  return { finales, parcial };
};

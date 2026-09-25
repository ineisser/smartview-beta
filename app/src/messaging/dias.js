const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const BLOQUE_MS = 5 * 60 * 1000;

const inicioDelDia = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

const capital = (texto) => texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "";

/** Etiqueta de día para divisores del chat. */
export function etiquetaDia(marca, ahora = new Date()) {
  if (!marca) return "";
  const d = new Date(marca);
  if (Number.isNaN(d.getTime())) return "";
  const hoy = inicioDelDia(ahora);
  const dia = inicioDelDia(d);
  const diff = Math.round((hoy - dia) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";

  const dow = hoy.getDay();
  const lunesOffset = dow === 0 ? 6 : dow - 1;
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(hoy.getDate() - lunesOffset);
  if (dia >= inicioSemana && dia < hoy) return capital(DIAS[d.getDay()]);

  const mes = MESES[d.getMonth()];
  if (d.getFullYear() === hoy.getFullYear()) return `${d.getDate()} de ${mes}`;
  return `${d.getDate()} de ${mes} ${d.getFullYear()}`;
}

export function claveDia(marca) {
  if (!marca) return "";
  const d = new Date(marca);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const mismoBloque = (a, b) => (
  a && b
  && a.de === b.de
  && claveDia(a.en) === claveDia(b.en)
  && Math.abs((a.en || 0) - (b.en || 0)) <= BLOQUE_MS
);

const rolBloque = (lista, i) => {
  const item = lista[i];
  const unePrev = mismoBloque(lista[i - 1], item);
  const uneNext = mismoBloque(item, lista[i + 1]);
  if (!unePrev && !uneNext) return "solo";
  if (!unePrev && uneNext) return "inicio";
  if (unePrev && uneNext) return "medio";
  return "fin";
};

export function conDivisores(mensajes) {
  const lista = mensajes || [];
  const filas = [];
  let ultimo = "";
  lista.forEach((item, i) => {
    const clave = claveDia(item.en);
    if (clave && clave !== ultimo) {
      filas.push({ tipo: "dia", id: `dia-${clave}`, etiqueta: etiquetaDia(item.en) });
      ultimo = clave;
    }
    filas.push({ tipo: "msg", id: item.id, mensaje: item, bloque: rolBloque(lista, i) });
  });
  return filas;
}

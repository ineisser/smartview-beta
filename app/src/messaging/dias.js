const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

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

export function conDivisores(mensajes) {
  const filas = [];
  let ultimo = "";
  (mensajes || []).forEach((item) => {
    const clave = claveDia(item.en);
    if (clave && clave !== ultimo) {
      filas.push({ tipo: "dia", id: `dia-${clave}`, etiqueta: etiquetaDia(item.en) });
      ultimo = clave;
    }
    filas.push({ tipo: "msg", id: item.id, mensaje: item });
  });
  return filas;
}

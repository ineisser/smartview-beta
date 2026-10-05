export const UMBRAL_OEE = 90;

const BASE = [
  { letra: "A", inicio: "07:00", fin: "15:00" },
  { letra: "B", inicio: "15:00", fin: "23:00" },
  { letra: "C", inicio: "23:00", fin: "07:00" },
];

const minutosReloj = (valor) => {
  const [hora, minuto] = String(valor || "00:00").split(":").map(Number);
  return ((hora || 0) * 60) + (minuto || 0);
};

const letraDe = (turno, index) => {
  const nombre = String(turno?.nombre || turno?.letra || "").trim();
  if (nombre.length === 1) return nombre.toUpperCase();
  return BASE[index]?.letra || String.fromCharCode(65 + index);
};

export const turnosDe = (turnos) => {
  const lista = turnos?.length ? turnos : BASE;
  return lista.map((turno, index) => ({
    letra: letraDe(turno, index),
    inicio: minutosReloj(turno.inicio),
    fin: minutosReloj(turno.fin),
  }));
};

export const turnoEnCurso = (turnos, ahora) => {
  const minuto = ahora.getHours() * 60 + ahora.getMinutes();
  return turnos.find((turno) => {
    if (turno.inicio === turno.fin) return true;
    return turno.inicio < turno.fin
      ? minuto >= turno.inicio && minuto < turno.fin
      : minuto >= turno.inicio || minuto < turno.fin;
  }) || null;
};

export const inicioDeTurno = (turno, ahora) => {
  const marca = new Date(ahora);
  marca.setHours(Math.floor(turno.inicio / 60), turno.inicio % 60, 0, 0);
  if (marca.getTime() > ahora.getTime()) marca.setDate(marca.getDate() - 1);
  return marca;
};

const minutosSolapados = (desde, hasta, ventanaInicio, ventanaFin) => {
  const a = Math.max(Number(desde) || 0, ventanaInicio);
  const b = Math.min(Number(hasta) || 0, ventanaFin);
  return Math.max(0, Math.round((b - a) / 60000));
};

const leerLogs = () => {
  try { return JSON.parse(localStorage.getItem("machine_stop_logs") || "[]"); } catch { return []; }
};

const numeroDe = (machine, index) => String(machine?.numero || index + 1).padStart(2, "0");

/**
 * Avance del turno en curso.
 * (minutos-máquina transcurridos − minutos-máquina en paro) / minutos-máquina transcurridos.
 * Un paro que cruza el corte solo cuenta los minutos de este turno.
 */
export const avanceDeTurno = ({ turnos, ahora = new Date(), maquinas = [], paros = {}, salaCodigo, logs }) => {
  const agenda = turnosDe(turnos);
  const turno = turnoEnCurso(agenda, ahora);
  if (!turno) return { fuera: true, letra: "", avance: null, inicio: 0 };
  const inicio = inicioDeTurno(turno, ahora).getTime();
  const fin = ahora.getTime();
  const numeros = maquinas.map(numeroDe);
  const abiertos = new Set(numeros.filter((numero) => paros[numero]));
  let improductivo = 0;
  abiertos.forEach((numero) => {
    improductivo += minutosSolapados(paros[numero]?.inicio || inicio, fin, inicio, fin);
  });
  const historial = logs || leerLogs();
  historial.forEach((item) => {
    if (salaCodigo && item.sala && item.sala !== salaCodigo) return;
    const numero = String(item.machine || item.maquina).padStart(2, "0");
    if (abiertos.has(numero)) return;
    const cerrado = item.fin || item.status === "atendido" || item.estado === "atendido";
    if (!cerrado) return;
    const desde = Number(item.inicio || item.id || 0);
    const hasta = Number(item.fin) || (desde + (Number(item.duration) || 0) * 60000);
    improductivo += minutosSolapados(desde, hasta, inicio, fin);
  });
  const transcurridos = Math.max(0, Math.floor((fin - inicio) / 60000));
  const posibles = transcurridos * Math.max(numeros.length, 1);
  const avance = posibles > 0
    ? Math.max(0, Math.min(100, Math.round(((posibles - improductivo) / posibles) * 100)))
    : 100;
  return { fuera: false, letra: turno.letra, avance, inicio };
};

export const umbralDe = (sala, planta) => {
  const propio = Number(String(sala?.alertaOee ?? "").replace(",", "."));
  if (sala?.alertaOee !== "" && sala?.alertaOee != null && Number.isFinite(propio)) return propio;
  const org = Number(String(planta?.alertaOee ?? "").replace(",", "."));
  if (planta?.alertaOee != null && planta?.alertaOee !== "" && Number.isFinite(org)) return org;
  return UMBRAL_OEE;
};

export const alertaValida = (texto) => {
  if (String(texto ?? "").trim() === "") return null;
  const numero = Number(String(texto).replace(",", "."));
  if (!Number.isFinite(numero) || numero < 0 || numero > 100) return undefined;
  return Math.round(numero * 10) / 10;
};

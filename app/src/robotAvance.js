import { get, push, ref, update } from "firebase/database";
import { rtdb } from "./firebase";
import { leerCtrl, leanAParos } from "./salaControl";
import { fichaAviso, ALCANCE } from "./avisos";
import { avanceDeTurno, umbralDe } from "./turno";

export const FRECUENCIAS = [
  { id: "5m", label: "Cada 5 minutos", ms: 5 * 60 * 1000 },
  { id: "10m", label: "Cada 10 minutos", ms: 10 * 60 * 1000 },
  { id: "30m", label: "Cada 30 minutos", ms: 30 * 60 * 1000 },
  { id: "2h", label: "Cada 2 horas", ms: 2 * 60 * 60 * 1000 },
  { id: "6h", label: "Cada 6 horas", ms: 6 * 60 * 60 * 1000 },
  { id: "8h", label: "Cada 8 horas", ms: 8 * 60 * 60 * 1000 },
  { id: "semana", label: "Un día por semana", ms: 0 },
];

export const DIAS = [
  { id: 1, label: "Lunes" },
  { id: 2, label: "Martes" },
  { id: 3, label: "Miércoles" },
  { id: 4, label: "Jueves" },
  { id: 5, label: "Viernes" },
  { id: 6, label: "Sábado" },
  { id: 0, label: "Domingo" },
];

export const avisoAvancePorDefecto = () => ({
  cada: "5m",
  dia: 1,
  hora: "08:00",
  ultimo: 0,
});

export const eficienciaDe = ({ maquinas = [], paros = {}, turnos, logs = [], ahora = new Date(), salaCodigo }) => {
  const avance = avanceDeTurno({ turnos, ahora, maquinas, paros, salaCodigo, logs });
  return avance.fuera ? 100 : (avance.avance ?? 100);
};

export const tocaInforme = (config, ahora = new Date()) => {
  const plan = { ...avisoAvancePorDefecto(), ...config };
  const ultimo = Number(plan.ultimo) || 0;
  if (plan.cada === "semana") {
    const [hora, minuto] = String(plan.hora || "08:00").split(":").map(Number);
    const mismoDia = ahora.getDay() === Number(plan.dia);
    const mismaHora = ahora.getHours() === hora && ahora.getMinutes() >= minuto && ahora.getMinutes() < minuto + 2;
    const yaHoy = ultimo && new Date(ultimo).toDateString() === ahora.toDateString();
    return mismoDia && mismaHora && !yaHoy;
  }
  const freq = FRECUENCIAS.find((item) => item.id === plan.cada) || FRECUENCIAS[0];
  return Date.now() - ultimo >= freq.ms;
};

export const etiquetaFrecuencia = (config) => {
  const plan = { ...avisoAvancePorDefecto(), ...config };
  const freq = FRECUENCIAS.find((item) => item.id === plan.cada);
  if (plan.cada !== "semana") return freq?.label || "Cada 5 minutos";
  const dia = DIAS.find((item) => item.id === Number(plan.dia));
  return `${dia?.label || "Lunes"} a las ${plan.hora || "08:00"}`;
};

export const emitirInformeAvance = async (org, planta, config) => {
  if (!org) return [];
  const remoto = await leerAvisoAvance(org);
  const plan = { ...avisoAvancePorDefecto(), ...config, ...remoto };
  if (!tocaInforme(plan)) return [];
  const avisosSnap = await get(ref(rtdb, `organizaciones/${org}/avisos`));
  const recientes = Object.values(avisosSnap.val() || {}).filter((item) => item?.tipo === "avance");
  const ultimoAvance = recientes.reduce((max, item) => Math.max(max, Number(item.en) || 0), 0);
  if (ultimoAvance && Date.now() - ultimoAvance < 90 * 1000) return [];
  const ahora = Date.now();
  await update(ref(rtdb, `organizaciones/${org}`), { "avisosAvance/ultimo": ahora });
  const salas = (planta?.salas || []).filter((sala) => sala?.codigo && (sala.maquinas || []).length);
  const histSnap = await get(ref(rtdb, `organizaciones/${org}/paros`));
  const historial = Object.values(histSnap.val() || {});
  const informes = [];
  for (const sala of salas) {
    const lean = await leerCtrl(org, sala.codigo).catch(() => null);
    const paros = leanAParos(lean, sala.motivos || []);
    const logs = historial.filter((item) => !item.sala || item.sala === sala.codigo);
    const eficiencia = eficienciaDe({ maquinas: sala.maquinas || [], paros, turnos: sala.turnos, logs, salaCodigo: sala.codigo });
    const aviso = fichaAviso({
      de: "sistema",
      deNombre: "Sistema",
      deRol: "owner",
      alcance: ALCANCE.todos,
      para: "planta",
      sala: sala.codigo,
      texto: `${sala.nombre || sala.codigo}: el avance de eficiencia va en ${eficiencia}%.`,
      urgente: eficiencia < umbralDe(sala, planta),
      en: ahora,
    });
    const nodo = await push(ref(rtdb, `organizaciones/${org}/avisos`), {
      ...aviso,
      tipo: "avance",
      eficiencia,
      salaNombre: sala.nombre || sala.codigo,
    });
    informes.push({ id: nodo.key, eficiencia, sala: sala.codigo });
  }
  return informes;
};

export const leerAvisoAvance = async (org) => {
  const snap = await get(ref(rtdb, `organizaciones/${org}/avisosAvance`));
  return snap.exists() ? snap.val() : null;
};

import { get, push, ref, update } from "firebase/database";
import { rtdb } from "./firebase";

const pad = (valor) => String(valor || "").padStart(2, "0");
const inicioDe = (item) => Number(item?.inicio || item?.id || 0);

export const claveParo = (item) => `${item.sala || ""}:${pad(item.maquina || item.machine)}:${item.inicio || item.id || ""}`;

const mismaMaquina = (a, b) => pad(a?.maquina || a?.machine) === pad(b?.maquina || b?.machine);

export const mismoParo = (a, b) => (
  (a?.sala || "") === (b?.sala || "")
  && mismaMaquina(a, b)
  && Math.abs(inicioDe(a) - inicioDe(b)) <= 2
);

const atendido = (item) => item?.estado === "atendido" || item?.status === "atendido" || Boolean(item?.fin);

const claveCercana = (mapa, item) => {
  const exacta = claveParo(item);
  if (mapa.has(exacta)) return exacta;
  for (const [clave, actual] of mapa) {
    if (mismoParo(actual, item)) return clave;
  }
  return exacta;
};

export const fusionarParos = (remotos = []) => {
  const mapa = new Map();
  remotos.forEach((item) => {
    const clave = claveCercana(mapa, item);
    const actual = mapa.get(clave) || {};
    const cerrado = atendido(item) || actual.status === "atendido";
    const detuvo = !atendido(item);
    mapa.set(clave, {
      ...actual,
      id: actual.id || item.id || clave,
      sala: item.sala || actual.sala,
      machine: pad(item.maquina || item.machine || actual.machine),
      motivo: item.motivo || actual.motivo,
      reason: item.nombre || item.reason || actual.reason,
      inicio: Math.min(inicioDe(item) || Infinity, inicioDe(actual) || Infinity) || item.inicio || actual.inicio,
      fin: cerrado ? (item.fin || actual.fin || null) : actual.fin || null,
      status: cerrado ? "atendido" : "detenido",
      duration: item.duration || actual.duration,
      via: detuvo ? (item.via || actual.via) : (actual.via || item.via),
      autor: detuvo ? (item.autor || actual.autor) : (actual.autor || item.autor),
      autorNombre: item.autorNombre || actual.autorNombre,
      arranqueVia: atendido(item) ? (item.arranqueVia || item.via || actual.arranqueVia) : actual.arranqueVia,
      arranqueAutor: atendido(item) ? (item.arranqueAutor || item.autor || actual.arranqueAutor) : actual.arranqueAutor,
      arranqueNombre: item.arranqueNombre || actual.arranqueNombre,
    });
  });
  return [...mapa.values()];
};

const aRemoto = (item) => ({
  sala: item.sala || "",
  maquina: pad(item.machine || item.maquina),
  motivo: item.motivo || "",
  nombre: item.reason || item.nombre || "",
  inicio: item.inicio || item.id || Date.now(),
  fin: item.fin || null,
  estado: atendido(item) ? "atendido" : "detenido",
  duration: item.duration || 0,
  via: item.via || 1,
  autor: item.autor || "",
  arranqueVia: item.arranqueVia || null,
  arranqueAutor: item.arranqueAutor || "",
});

export const idParoRemoto = (remotos = [], item) => {
  const hallado = remotos.find((remoto) => mismoParo(remoto, item));
  return hallado?.id || null;
};

export const cerrarParoRemoto = async (org, item) => {
  if (!org || !item) return;
  const snap = await get(ref(rtdb, `organizaciones/${org}/paros`));
  const lista = Object.entries(snap.val() || {}).map(([id, remoto]) => ({ id, ...remoto }));
  const id = idParoRemoto(lista, item);
  const payload = {
    sala: item.sala || "",
    maquina: pad(item.maquina || item.machine),
    motivo: item.motivo || "",
    nombre: item.nombre || item.reason || "",
    inicio: item.inicio,
    fin: item.fin,
    estado: "atendido",
    duration: item.duration || 0,
    via: item.via || item.arranqueVia || null,
    autor: item.autor || item.arranqueAutor || "",
  };
  if (id) {
    await update(ref(rtdb, `organizaciones/${org}/paros/${id}`), payload);
    return;
  }
  await push(ref(rtdb, `organizaciones/${org}/paros`), payload);
};

export const subirLocales = async (org, locales = [], remotos = []) => {
  if (!org) return 0;
  let subidos = 0;
  for (const item of locales) {
    if (remotos.some((remoto) => mismoParo(remoto, item))) continue;
    remotos = [...remotos, item];
    await push(ref(rtdb, `organizaciones/${org}/paros`), aRemoto(item));
    subidos += 1;
  }
  return subidos;
};

export const borrarHistorialSala = async (org, salaCodigo) => {
  if (!org) return;
  const snap = await get(ref(rtdb, `organizaciones/${org}/paros`));
  const patch = {};
  Object.entries(snap.val() || {}).forEach(([id, item]) => {
    if (!item?.sala || item.sala === salaCodigo) patch[id] = null;
  });
  if (Object.keys(patch).length) await update(ref(rtdb, `organizaciones/${org}/paros`), patch);
};

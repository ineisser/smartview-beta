import { get, onValue, ref, update } from "firebase/database";
import { rtdb } from "./firebase";

/** Solo máquinas detenidas. Activa = ausente del mapa. */
const ctrlPath = (org, sala) => `organizaciones/${org}/salas/${sala}/ctrl`;
const ctrlRef = (org, sala) => ref(rtdb, ctrlPath(org, sala));

const pad = (n) => String(n).padStart(2, "0");

/** localStorage → mapa UI { "01": { motivo, nombre, inicio } } */
export const claveParosLocal = (uid, sala) => `smartview-paros:${uid}:${sala}`;

export const leerParosLocal = (uid, sala) => {
  try {
    return JSON.parse(localStorage.getItem(claveParosLocal(uid, sala)) || "{}");
  } catch {
    return {};
  }
};

export const guardarParosLocal = (uid, sala, mapa) => {
  try {
    localStorage.setItem(claveParosLocal(uid, sala), JSON.stringify(mapa));
  } catch {
    /* cuota / privado */
  }
};

/** RTDB lean → mapa UI. motivos: [{ codigo|id, corta|nombre }] */
export const leanAParos = (lean, motivos = []) => {
  const mapa = {};
  const maquinas = lean?.m || {};
  Object.entries(maquinas).forEach(([numero, item]) => {
    if (!item || !item.c) return;
    const codigo = String(item.c);
    const encontrado = motivos.find((m) => String(m.codigo || m.id) === codigo);
    mapa[pad(numero)] = {
      motivo: codigo,
      nombre: encontrado?.corta || encontrado?.nombre || encontrado?.name || codigo,
      inicio: Number(item.d) || Date.now(),
    };
  });
  return mapa;
};

/** Mapa UI → lean { u, m } */
export const parosALean = (paros) => {
  const m = {};
  Object.entries(paros || {}).forEach(([numero, item]) => {
    if (!item?.motivo) return;
    m[pad(numero)] = { c: String(item.motivo), d: Number(item.inicio) || Date.now() };
  });
  return { u: Date.now(), m };
};

export const leerCtrl = async (org, sala) => {
  const snap = await get(ctrlRef(org, sala));
  return snap.exists() ? snap.val() : null;
};

/**
 * Escucha el control de la sala. onCambio recibe el lean crudo.
 * Devuelve unsubscribe.
 */
export const escucharCtrl = (org, sala, onCambio) => {
  if (!org || !sala) return () => {};
  return onValue(ctrlRef(org, sala), (snap) => {
    onCambio(snap.exists() ? snap.val() : { u: 0, m: {} });
  });
};

/** Detener o cambiar motivo: un nodo + marca de tiempo. */
export const escribirParo = async (org, sala, numero, { motivo, inicio }) => {
  const ahora = Date.now();
  await update(ctrlRef(org, sala), {
    u: ahora,
    [`m/${pad(numero)}`]: { c: String(motivo), d: Number(inicio) || ahora },
  });
  return ahora;
};

/** Reiniciar: borra la máquina del mapa (vuelve a activa). */
export const borrarParo = async (org, sala, numero) => {
  const ahora = Date.now();
  await update(ctrlRef(org, sala), {
    u: ahora,
    [`m/${pad(numero)}`]: null,
  });
  return ahora;
};

/** Sube el mapa completo (migración / reconciliación). */
export const escribirMapa = async (org, sala, paros) => {
  const lean = parosALean(paros);
  await update(ctrlRef(org, sala), lean);
  return lean.u;
};

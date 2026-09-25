import { esOwner } from "./access";

/** Escalera de la planta. El aviso sube; no baja solo. */
export const RANGO = {
  operario: 1,
  jefe: 2,
  admin: 3,
  owner: 4,
};

export const ALCANCE = {
  persona: "persona",
  sala: "sala",
  nivel: "nivel",
  escalar: "escalar",
  todos: "todos",
};

const rolDe = (item) => (esOwner(item?.rol) ? "owner" : item?.rol || "");
const rangoDe = (rol) => RANGO[esOwner(rol) ? "owner" : rol] || 0;

const salasDe = (item) => new Set(item?.salas || item?.salasAsignadas || []);

const comparteSala = (a, b) => {
  const una = salasDe(a);
  const otra = salasDe(b);
  if (!una.size || !otra.size) return true;
  return [...una].some((sala) => otra.has(sala));
};

const activos = (miembros) => (miembros || []).filter((item) => item && item.estado !== "inactivo" && item.estado !== "revocada");

const delRol = (miembros, rol) => activos(miembros).filter((item) => rolDe(item) === rol);

/**
 * De abajo hacia arriba, y el jefe también baja a sus operarios.
 * Admin y owner escriben a quien quieran.
 */
export const destinosPermitidos = (rol) => {
  if (rol === "operario") return [ALCANCE.persona, ALCANCE.escalar];
  if (rol === "jefe") return [ALCANCE.persona, ALCANCE.sala, ALCANCE.escalar];
  if (rol === "admin" || esOwner(rol)) return [ALCANCE.persona, ALCANCE.sala, ALCANCE.nivel, ALCANCE.todos];
  return [];
};

const puedePersona = (emisor, destino) => {
  const yo = rolDe(emisor);
  const el = rolDe(destino);
  if (!el) return false;
  if (yo === "admin" || esOwner(yo)) return true;
  if (yo === "jefe") {
    if (el === "operario" && comparteSala(emisor, destino)) return true;
    return rangoDe(el) > rangoDe(yo);
  }
  if (yo === "operario") {
    if (rangoDe(el) <= rangoDe(yo)) return false;
    if (el === "jefe" && !comparteSala(emisor, destino)) return false;
    return true;
  }
  return false;
};

const siguienteNivel = (rol) => {
  if (rol === "operario") return ["jefe", "admin", "owner"];
  if (rol === "jefe") return ["admin", "owner"];
  if (rol === "admin") return ["owner"];
  return [];
};

const enSala = (item, sala) => {
  if (!sala) return true;
  const suyas = salasDe(item);
  if (!suyas.size && (rolDe(item) === "admin" || rolDe(item) === "owner")) return true;
  return suyas.has(sala);
};

/** Primer escalón con gente. Si no hay jefe en la sala, pasa a admin; si no, al owner. */
const escalarDesde = (emisor, miembros, sala) => {
  const candidatos = activos(miembros).filter((item) => item.uid !== emisor.uid && item.id !== emisor.id);
  for (const rol of siguienteNivel(rolDe(emisor))) {
    const grupo = candidatos.filter((item) => rolDe(item) === rol);
    const filtrados = rol === "jefe"
      ? grupo.filter((item) => (sala ? enSala(item, sala) : comparteSala(emisor, item)))
      : grupo;
    if (filtrados.length) return filtrados;
  }
  return [];
};

/**
 * Quién recibe el aviso.
 * alcance: persona | sala | nivel | escalar | todos
 * para: uid, código de sala, o rol, según el alcance
 * sala: sala del suceso (paro, pedido, etc.)
 */
export const destinatarios = ({ emisor, miembros, alcance, para, sala }) => {
  const lista = activos(miembros);
  const yo = emisor?.uid || emisor?.id;
  const otros = lista.filter((item) => (item.uid || item.id) !== yo);
  const permitido = destinosPermitidos(rolDe(emisor));
  if (!permitido.includes(alcance)) return [];

  if (alcance === ALCANCE.escalar) return escalarDesde(emisor, lista, sala || (emisor.salas || [])[0]);

  if (alcance === ALCANCE.persona) {
    const destino = otros.find((item) => item.uid === para || item.id === para);
    if (!destino || !puedePersona(emisor, destino)) return [];
    return [destino];
  }

  if (alcance === ALCANCE.sala) {
    const codigo = para || sala;
    const enLaSala = otros.filter((item) => enSala(item, codigo));
    if (rolDe(emisor) === "jefe") return enLaSala.filter((item) => rolDe(item) === "operario");
    return enLaSala;
  }

  if (alcance === ALCANCE.nivel) return delRol(otros, esOwner(para) ? "owner" : para);

  if (alcance === ALCANCE.todos) return otros;
  return [];
};

export const puedeAvisar = (emisor, destino, miembros, sala) => (
  destinatarios({ emisor, miembros, alcance: ALCANCE.persona, para: destino.uid || destino.id, sala }).length > 0
    || destinosPermitidos(rolDe(emisor)).includes(ALCANCE.escalar)
);

/** Personas a las que este perfil puede abrir un buzón. */
export const buzonesDe = (emisor, miembros) => {
  const yo = emisor?.uid || emisor?.id;
  return activos(miembros).filter((item) => {
    const id = item.uid || item.id;
    if (!id || id === yo || !item.uid) return false;
    return puedePersona(emisor, item);
  });
};

/** Avería, automático o corte: urgente. Limpieza, cambio o preventivo: no. */
export const esUrgenteParo = (item) => {
  const texto = [item?.motivo, item?.nombre, item?.tipo, item?.oee].filter(Boolean).join(" ").toLowerCase();
  return /falla|aver[ií]a|autom[aá]tico|corte el[eé]ctrico|falta aire|t[eé]rmico/.test(texto);
};

/** Verde si hay avisos nuevos. Rojo si alguno es urgente. */
export const tonoCampana = (avisos) => {
  if (!avisos?.length) return "";
  if (avisos.some((item) => item.urgente)) return "urgente";
  return "ok";
};

export const fichaAviso = ({ de, deNombre, deRol, alcance, para, sala, texto, urgente, en, corto, largo, cuerpo, progreso, estado }) => ({
  de: de || "",
  deNombre: deNombre || "",
  deRol: deRol || "",
  alcance: alcance || ALCANCE.escalar,
  para: para || "",
  sala: sala || "",
  texto: String(texto || "").trim(),
  corto: corto || "",
  largo: largo || "",
  cuerpo: cuerpo || "",
  ...(Number.isFinite(Number(progreso)) ? { progreso: Number(progreso) } : {}),
  estado: estado || "",
  urgente: Boolean(urgente),
  en: en || Date.now(),
});

export const rangoDeRol = rangoDe;

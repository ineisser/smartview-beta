export const ANA_EMAIL = "ana@planta.com";
export const ANA_NOMBRE = "Ana Pérez";

const HORA = 60 * 60 * 1000;
const TOPE = 0.75;

export const metaDeHora = (indice) => [7, 18, 7][indice] ?? 6;

export const esMecanica = (motivo) => /mec[aá]n/i.test(`${motivo?.tipo || ""} ${motivo?.corta || ""} ${motivo?.nombre || ""}`);

export const duracionDe = (motivo, azar = Math.random) => {
  if (esMecanica(motivo)) return 60 + Math.floor(azar() * 61);
  return [5, 10, 15][Math.floor(azar() * 3)];
};

export const operariaAna = (miembros) => {
  const hallado = Object.entries(miembros || {}).find(([, item]) => String(item?.email || "").toLowerCase() === ANA_EMAIL);
  if (!hallado) return { clave: "", uid: "", nombre: ANA_NOMBRE, email: ANA_EMAIL, rol: "operario", salas: [] };
  const [clave, item] = hallado;
  return {
    clave,
    uid: item.uid || "",
    nombre: item.nombre || ANA_NOMBRE,
    email: ANA_EMAIL,
    rol: item.rol || "operario",
    salas: item.salas || [],
    telefono: item.telefono || "",
    estado: item.estado || "",
  };
};

export const salasTelares = (salas = []) => {
  const conMaquinas = salas.filter((sala) => (sala.maquinas || []).length && (sala.motivos || []).length);
  const telares = conMaquinas.filter((sala) => /telar|tejed/i.test(sala.nombre || ""));
  return telares.length ? telares : conMaquinas;
};

const pad = (numero) => String(numero).padStart(2, "0");

export const etiquetaTelar = (maquina, numero, salaNombre) => {
  const n = pad(numero);
  const nombre = String(maquina?.nombre || "").trim();
  if (!nombre || /^m[aá]quina\b/i.test(nombre) || /telar|tejed/i.test(salaNombre || "")) return `Telar ${n}`;
  return `${nombre} ${n}`;
};

/** Minutos de paro ya comprometidos en esta hora de simulación. */
export const cabeEnEficiencia = (telares, usados, extra) => {
  const n = Math.max(telares, 1);
  const presupuesto = n * 60 * (1 - TOPE);
  return usados + extra <= presupuesto;
};

export const elegirTelar = (maquinas, ocupados, enfriar, ahora, azar = Math.random) => {
  const libres = maquinas.filter((maquina, index) => {
    const numero = pad(maquina.numero || index + 1);
    if (ocupados.has(numero)) return false;
    const hasta = enfriar.get(numero) || 0;
    return ahora >= hasta;
  });
  if (!libres.length) return null;
  return libres[Math.floor(azar() * libres.length)];
};

export const elegirMotivo = (motivos, azar = Math.random) => {
  const lista = (motivos || []).filter((item) => item.codigo || item.corta || item.nombre);
  if (!lista.length) return null;
  return lista[Math.floor(azar() * lista.length)];
};

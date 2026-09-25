const UNIDADES = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
const DIEZ = ["diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve"];
const VEINTI = ["veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const DECENAS = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];

const CLAVE_ALTAVOZ = "smartview-altavoz";
const CLAVE_VOLUMEN = "smartview-volumen";
export const ALTAVOZ = "smartview-altavoz-cambio";
export const VOLUMEN = "smartview-volumen-cambio";
export const REPETICIONES_VOZ = 2;
export const PAROS_VOZ = ["ninguna", "auto", "todas"];
export const VOLUMEN_DEFECTO = 100;

export const parosVozDe = (valor) => (PAROS_VOZ.includes(valor) ? valor : "todas");
let vecesActivas = REPETICIONES_VOZ;

export const fijarRepeticiones = (valor) => {
  vecesActivas = repeticionesValidas(valor) || REPETICIONES_VOZ;
};

export const repeticionesActuales = () => vecesActivas;

let audio = null;
let master = null;

export const altavozActivo = () => {
  try { return localStorage.getItem(CLAVE_ALTAVOZ) !== "0"; } catch { return true; }
};

export const fijarAltavoz = (activo) => {
  try { localStorage.setItem(CLAVE_ALTAVOZ, activo ? "1" : "0"); } catch { /* este equipo no guarda */ }
  if (!activo) callarVoz();
  window.dispatchEvent(new Event(ALTAVOZ));
};

export const volumenValido = (valor) => {
  const numero = Number(String(valor ?? "").replace(",", "."));
  if (!Number.isFinite(numero)) return undefined;
  return Math.max(0, Math.min(100, Math.round(numero)));
};

/** 0–1. Solo para este dispositivo / pestaña. */
export const volumenActual = () => {
  try {
    const guardado = volumenValido(localStorage.getItem(CLAVE_VOLUMEN));
    return (guardado ?? VOLUMEN_DEFECTO) / 100;
  } catch {
    return VOLUMEN_DEFECTO / 100;
  }
};

export const volumenPorcentaje = () => Math.round(volumenActual() * 100);

export const fijarVolumen = (valor) => {
  const pct = volumenValido(valor) ?? VOLUMEN_DEFECTO;
  try { localStorage.setItem(CLAVE_VOLUMEN, String(pct)); } catch { /* este equipo no guarda */ }
  if (master) master.gain.value = pct / 100;
  window.dispatchEvent(new CustomEvent(VOLUMEN, { detail: pct }));
  return pct;
};

export const repeticionesValidas = (texto) => {
  const numero = Number(String(texto ?? "").replace(",", "."));
  if (!Number.isFinite(numero) || numero < 1 || numero > 10) return undefined;
  return Math.round(numero);
};

const contexto = () => {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!audio) audio = new Ctor();
  if (audio.state === "suspended") audio.resume().catch(() => {});
  if (!master) {
    master = audio.createGain();
    master.gain.value = volumenActual();
    master.connect(audio.destination);
  }
  return audio;
};

const salida = (ctx) => {
  if (!master) {
    master = ctx.createGain();
    master.gain.value = volumenActual();
    master.connect(ctx.destination);
  }
  return master;
};

export const desbloquearAudio = () => contexto();

const golpe = (ctx, cuando, { grave, fuerza }) => {
  const osc = ctx.createOscillator();
  const click = ctx.createOscillator();
  const filtro = ctx.createBiquadFilter();
  const ganancia = ctx.createGain();
  const acento = ctx.createGain();
  const t = cuando;
  const largo = grave ? 0.2 : 0.13;
  const dest = salida(ctx);
  osc.type = "sine";
  osc.frequency.setValueAtTime(grave ? 86 : 148, t);
  osc.frequency.exponentialRampToValueAtTime(grave ? 42 : 78, t + largo);
  click.type = "triangle";
  click.frequency.setValueAtTime(grave ? 220 : 280, t);
  click.frequency.exponentialRampToValueAtTime(90, t + 0.04);
  filtro.type = "lowpass";
  filtro.frequency.setValueAtTime(grave ? 380 : 620, t);
  ganancia.gain.setValueAtTime(fuerza, t);
  ganancia.gain.exponentialRampToValueAtTime(0.001, t + largo);
  acento.gain.setValueAtTime(fuerza * 0.35, t);
  acento.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
  osc.connect(filtro);
  filtro.connect(ganancia);
  ganancia.connect(dest);
  click.connect(acento);
  acento.connect(dest);
  osc.start(t);
  click.start(t);
  osc.stop(t + largo + 0.02);
  click.stop(t + 0.05);
};

/** Pum, tum, tum, tum. */
export const tocarLlegada = (forzar = false) => {
  if (!forzar && !altavozActivo()) return;
  const ctx = contexto();
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  golpe(ctx, t, { grave: true, fuerza: 0.62 });
  golpe(ctx, t + 0.22, { grave: false, fuerza: 0.4 });
  golpe(ctx, t + 0.38, { grave: false, fuerza: 0.36 });
  golpe(ctx, t + 0.54, { grave: false, fuerza: 0.32 });
};

export const enPalabras = (valor) => {
  const n = Math.max(0, Math.min(100, Math.round(Number(valor) || 0)));
  if (n === 100) return "cien";
  if (n < 10) return UNIDADES[n];
  if (n < 20) return DIEZ[n - 10];
  if (n < 30) return VEINTI[n - 20];
  const decena = Math.floor(n / 10);
  const resto = n % 10;
  return resto ? `${DECENAS[decena]} y ${UNIDADES[resto]}` : DECENAS[decena];
};

const tituloSala = (valor) => {
  const texto = String(valor || "Sala").trim();
  if (!texto) return "Sala";
  if (texto === texto.toUpperCase()) return texto.charAt(0) + texto.slice(1).toLowerCase();
  return texto;
};

const vozEspanol = () => {
  const voces = window.speechSynthesis?.getVoices?.() || [];
  return voces.find((voz) => /^es(-|$)/i.test(voz.lang) && /female|mujer|paulina|sabina|helena|lucia|elena/i.test(voz.name))
    || voces.find((voz) => /^es-PE/i.test(voz.lang))
    || voces.find((voz) => /^es-MX/i.test(voz.lang))
    || voces.find((voz) => /^es/i.test(voz.lang))
    || null;
};

const colaVoz = [];

export const fraseEficiencia = (sala, porcentaje) => (
  `${tituloSala(sala)}, ${enPalabras(porcentaje)} por ciento de eficiencia.`
);

export const etiquetaMaquina = (nombre, numero, salaNombre = "") => {
  const n = String(numero ?? "").padStart(2, "0");
  const texto = String(nombre || "").trim();
  const generico = !texto || /^m[aá]quina\b/i.test(texto);
  if (generico && /telar|tejed/i.test(salaNombre)) return `Telar ${n}`;
  if (generico) return `Máquina ${n}`;
  if (new RegExp(`(^|\\D)${Number(n)}(\\D|$)`).test(texto) || texto.endsWith(n)) return texto;
  return `${texto} ${n}`;
};

export const fraseParo = (maquina, motivo) => {
  const razon = String(motivo || "paro").trim().toLocaleLowerCase("es");
  return `${maquina}, ${razon || "paro"}.`;
};

const utteranceDe = (frase) => {
  const habla = new SpeechSynthesisUtterance(frase);
  habla.lang = "es-PE";
  habla.rate = 0.95;
  habla.pitch = 1;
  habla.volume = volumenActual();
  const voz = vozEspanol();
  if (voz) habla.voice = voz;
  colaVoz.push(habla);
  habla.addEventListener("end", () => {
    const i = colaVoz.indexOf(habla);
    if (i >= 0) colaVoz.splice(i, 1);
  });
  return habla;
};

export const callarVoz = () => {
  colaVoz.length = 0;
  window.speechSynthesis?.cancel?.();
};

/** La voz la pone el navegador. La frase la arma esta rutina, sin traducción ni red. */
export const decirFrases = (frases, veces = REPETICIONES_VOZ, forzar = false) => {
  if (!window.speechSynthesis || (!forzar && !altavozActivo())) return;
  const lista = (frases || []).map((item) => String(item || "").trim()).filter(Boolean);
  if (!lista.length) return;
  const hablar = () => {
    callarVoz();
    const tope = repeticionesValidas(veces) || REPETICIONES_VOZ;
    lista.forEach((frase) => {
      for (let i = 0; i < tope; i += 1) window.speechSynthesis.speak(utteranceDe(frase));
    });
  };
  if (window.speechSynthesis.getVoices().length) {
    hablar();
    return;
  }
  const listo = () => {
    window.speechSynthesis.removeEventListener("voiceschanged", listo);
    hablar();
  };
  window.speechSynthesis.addEventListener("voiceschanged", listo);
};

export const decirEficiencia = (sala, porcentaje, veces = REPETICIONES_VOZ, forzar = false) => {
  decirFrases([fraseEficiencia(sala, porcentaje)], veces, forzar);
};

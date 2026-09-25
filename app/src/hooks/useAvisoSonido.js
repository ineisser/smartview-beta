import { useEffect, useRef } from "react";
import { ALTAVOZ, REPETICIONES_VOZ, altavozActivo, callarVoz, decirEficiencia, decirFrases, desbloquearAudio, fijarRepeticiones, fraseEficiencia, parosVozDe, repeticionesActuales, tocarLlegada } from "../sonido";

const pctDe = (item) => {
  if (Number.isFinite(Number(item?.eficiencia))) return Number(item.eficiencia);
  const texto = `${item?.corto || ""} ${item?.largo || ""}`;
  const hallado = texto.match(/(\d+(?:[.,]\d+)?)\s*%/);
  return hallado ? Number(hallado[1].replace(",", ".")) : null;
};

const salaDe = (item) => item?.salaNombre || item?.sala || String(item?.corto || "").split("·")[0] || "Sala";

export const esNotaAvance = (item) => (
  item?.tipo === "avance"
  || item?.accion?.tipo === "avance"
  || Number.isFinite(Number(item?.eficiencia))
);

export const reproducirNota = (item) => {
  desbloquearAudio();
  if (!esNotaAvance(item)) {
    if (item?.frase) decirFrases([item.frase], repeticionesActuales(), true);
    else tocarLlegada(true);
    return;
  }
  const porcentaje = pctDe(item);
  if (porcentaje == null) return;
  decirEficiencia(salaDe(item), porcentaje, repeticionesActuales(), true);
};

const claveDe = (org) => `smartview-voz:${org || "x"}`;

const leerDichos = (org) => {
  try { return new Set(JSON.parse(sessionStorage.getItem(claveDe(org)) || "[]")); } catch { return new Set(); }
};

const guardarDichos = (org, ids) => {
  sessionStorage.setItem(claveDe(org), JSON.stringify([...ids]));
};

const anunciaParo = (item, modo) => {
  if (!item?.frase) return false;
  if (modo === "ninguna") return false;
  if (modo === "auto" && !item.automatico) return false;
  return true;
};

export default function useAvisoSonido(notas = [], { listo = false, org, veces = REPETICIONES_VOZ, planta = true, paros = "todas" } = {}) {
  const conocidos = useRef(null);
  const orgRef = useRef(org);
  const notasRef = useRef(notas);
  const vecesRef = useRef(veces);
  const plantaRef = useRef(planta);
  const parosRef = useRef(paros);
  orgRef.current = org;
  notasRef.current = notas;
  vecesRef.current = veces;
  plantaRef.current = planta !== false;
  parosRef.current = parosVozDe(paros);
  fijarRepeticiones(veces);
  const firma = (notas || []).map((item) => item?.id).filter(Boolean).join("|");

  useEffect(() => {
    const abrir = () => desbloquearAudio();
    document.addEventListener("pointerdown", abrir);
    document.addEventListener("keydown", abrir);
    window.speechSynthesis?.getVoices?.();
    return () => {
      document.removeEventListener("pointerdown", abrir);
      document.removeEventListener("keydown", abrir);
    };
  }, []);

  useEffect(() => {
    conocidos.current = null;
  }, [org]);

  useEffect(() => {
    if (!listo) return;
    const lista = (notasRef.current || []).filter((item) => item?.id);
    const ids = lista.map((item) => item.id);
    if (conocidos.current === null) {
      conocidos.current = new Set([...leerDichos(orgRef.current), ...ids]);
      guardarDichos(orgRef.current, conocidos.current);
      return;
    }
    const nuevos = lista.filter((item) => !conocidos.current.has(item.id));
    if (!nuevos.length) return;
    nuevos.forEach((item) => conocidos.current.add(item.id));
    guardarDichos(orgRef.current, conocidos.current);
    if (!plantaRef.current || !altavozActivo()) return;
    desbloquearAudio();
    const avances = nuevos.filter((item) => esNotaAvance(item) && !String(item.id).startsWith("oee:"));
    const deParo = nuevos
      .filter((item) => !esNotaAvance(item) && anunciaParo(item, parosRef.current))
      .sort((a, b) => (a.en || 0) - (b.en || 0));
    const frases = deParo.map((item) => item.frase);
    const ultimo = avances[0];
    const porcentaje = ultimo ? pctDe(ultimo) : null;
    if (porcentaje != null) frases.push(fraseEficiencia(salaDe(ultimo), porcentaje));
    if (frases.length) decirFrases(frases, vecesRef.current);
  }, [listo, firma, planta]);

  useEffect(() => {
    const callar = () => { if (!altavozActivo()) callarVoz(); };
    window.addEventListener(ALTAVOZ, callar);
    return () => window.removeEventListener(ALTAVOZ, callar);
  }, []);

  useEffect(() => {
    if (planta === false) callarVoz();
  }, [planta]);

  useEffect(() => () => callarVoz(), []);
}

import { useCallback, useEffect, useRef, useState } from "react";
import { VIA } from "../paro";
import {
  borrarParo,
  escucharCtrl,
  escribirParo,
  guardarParosLocal,
  leanAParos,
  leerCtrl,
  leerParosLocal,
  parosALean,
} from "../salaControl";

/** Retraso al aplicar cambios remotos (evita parpadeo / sobrecarga). */
const RETRASO_REMOTO_MS = 1400;

const firmaDe = (leanOMapa) => {
  if (!leanOMapa) return "{}";
  const m = leanOMapa.m || leanOMapa;
  const claves = Object.keys(m).sort();
  return JSON.stringify(Object.fromEntries(claves.map((k) => {
    const item = m[k];
    if (!item) return [k, null];
    if (item.c !== undefined) return [k, { c: item.c, d: item.d }];
    return [k, { c: item.motivo, d: item.inicio }];
  })));
};

/**
 * Estado vivo de paros de una sala, sincronizado por RTDB.
 * Escrituras locales: inmediatas (optimistas).
 * Lecturas remotas: se aplican tras ~1.4 s sin nuevos eventos.
 */
export default function useSalaControl({ org, sala, uid, motivos }) {
  const [paros, setParos] = useState({});
  const contexto = `${org}:${uid}:${sala}`;
  const [contextoActual, setContextoActual] = useState(null);
  const [listo, setListo] = useState(false);
  const firma = useRef("");
  const remotoPendiente = useRef(null);
  const timer = useRef(0);
  const motivosRef = useRef(motivos);
  motivosRef.current = motivos;

  const pintar = useCallback((mapa, leanFirma) => {
    setParos(mapa);
    if (leanFirma !== undefined) firma.current = leanFirma;
    else firma.current = firmaDe(mapa);
    if (uid && sala) guardarParosLocal(org, uid, sala, mapa);
  }, [org, uid, sala]);

  const aplicarLean = useCallback((lean) => {
    const next = firmaDe(lean);
    if (next === firma.current) return;
    const mapa = leanAParos(lean, motivosRef.current);
    setParos((prev) => {
      Object.keys(mapa).forEach((clave) => {
        if (prev[clave]?.comentario) mapa[clave].comentario = prev[clave].comentario;
      if (prev[clave]?.via && Number(prev[clave].inicio) === Number(mapa[clave].inicio)) mapa[clave].via = prev[clave].via;
      });
      return mapa;
    });
    firma.current = next;
    if (uid && sala) guardarParosLocal(org, uid, sala, mapa);
  }, [org, uid, sala]);

  useEffect(() => {
    if (!org || !sala || !uid) {
      setParos({});
      setListo(false);
      return undefined;
    }

    let vivo = true;
    setContextoActual(contexto);
    setListo(false);
    firma.current = "";
    window.clearTimeout(timer.current);
    remotoPendiente.current = null;

    const cache = leerParosLocal(org, uid, sala);
    pintar(cache);

    (async () => {
      try {
        const remoto = await leerCtrl(org, sala);
        if (!vivo) return;
        aplicarLean(remoto);
      } catch {
        /* sin red: queda el cache */
      } finally {
        if (vivo) setListo(true);
      }
    })();

    const off = escucharCtrl(org, sala, (lean) => {
      remotoPendiente.current = lean;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (!vivo || !remotoPendiente.current) return;
        const pendiente = remotoPendiente.current;
        remotoPendiente.current = null;
        aplicarLean(pendiente);
      }, RETRASO_REMOTO_MS);
    });

    return () => {
      vivo = false;
      window.clearTimeout(timer.current);
      off();
    };
  }, [org, sala, uid, pintar, aplicarLean]);

  const detener = useCallback(async (numero, { motivo, nombre, inicio, via }) => {
    const clave = String(numero).padStart(2, "0");
    const desde = Number(inicio) || Date.now();
    setParos((prev) => {
      const origen = via ?? prev[clave]?.via ?? VIA.paroManual;
      const siguiente = { ...prev, [clave]: { motivo, nombre, inicio: desde, via: origen } };
      firma.current = firmaDe(siguiente);
      if (uid && sala) guardarParosLocal(org, uid, sala, siguiente);
      return siguiente;
    });
    if (!org || !sala) return;
    try {
      await escribirParo(org, sala, numero, { motivo, inicio: desde });
    } catch {
      /* queda optimista + local */
    }
  }, [org, sala, uid]);

  const reiniciar = useCallback(async (numero) => {
    const clave = String(numero).padStart(2, "0");
    setParos((prev) => {
      const siguiente = { ...prev };
      delete siguiente[clave];
      firma.current = firmaDe(siguiente);
      if (uid && sala) guardarParosLocal(org, uid, sala, siguiente);
      return siguiente;
    });
    if (!org || !sala) return;
    try {
      await borrarParo(org, sala, numero);
    } catch {
      /* queda optimista + local */
    }
  }, [org, sala, uid]);

  const comentar = useCallback((numero, comentario) => {
    const clave = String(numero).padStart(2, "0");
    setParos((prev) => {
      if (!prev[clave]) return prev;
      const siguiente = { ...prev, [clave]: { ...prev[clave], comentario } };
      if (uid && sala) guardarParosLocal(org, uid, sala, siguiente);
      return siguiente;
    });
  }, [org, uid, sala]);

  return { paros: contextoActual === contexto ? paros : {}, listo: contextoActual === contexto && listo, detener, reiniciar, comentar, leanActual: () => parosALean(contextoActual === contexto ? paros : {}) };
}

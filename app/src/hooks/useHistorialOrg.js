import { useEffect, useMemo, useRef, useState } from "react";
import { onValue, ref } from "firebase/database";
import { rtdb } from "../firebase";
import { fusionarParos, subirLocales } from "../historial";

const leerLogs = () => {
  try { return JSON.parse(localStorage.getItem("machine_stop_logs") || "[]"); } catch { return []; }
};

export default function useHistorialOrg(org, conEstado = false, activo = true) {
  const [remotos, setRemotos] = useState([]);
  const [listo, setListo] = useState(false);
  const sync = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!org || !activo) {
      setRemotos([]);
      setListo(true);
      return undefined;
    }
    setListo(false);
    setRemotos([]); setError(null); sync.current = false;
    return onValue(ref(rtdb, `organizaciones/${org}/paros`), (snap) => {
      const data = snap.val() || {};
      setRemotos(Object.entries(data).map(([id, item]) => ({ id, ...item })));
      setListo(true); setError(null);
    }, () => { setError("No se pudo cargar el historial de Firebase."); setListo(true); });
  }, [org, activo]);

  useEffect(() => {
    if (!org || !activo || !listo || error || sync.current) return;
    const locales = leerLogs();
    if (!locales.length) {
      sync.current = true;
      return;
    }
    sync.current = true;
    subirLocales(org, locales, remotos).catch(() => { sync.current = false; });
  }, [org, activo, listo, remotos, error]);

  const historial = useMemo(() => {
    // Antes de que Firebase responda conservamos el estado optimista local.
    // Una vez cargado el historial remoto, Firebase es la fuente de verdad
    // incluso cuando no existen paros. Esto evita que distintos navegadores
    // reconstruyan estados diferentes desde su propio localStorage.
    if (!listo) return leerLogs();
    return fusionarParos(remotos);
  }, [listo, remotos]);
  return conEstado ? { historial: listo && !error ? historial : [], cargando: !listo, error } : historial;
}

import { useEffect, useMemo, useRef, useState } from "react";
import { onValue, ref } from "firebase/database";
import { rtdb } from "../firebase";
import { fusionarParos, subirLocales } from "../historial";

const leerLogs = () => {
  try { return JSON.parse(localStorage.getItem("machine_stop_logs") || "[]"); } catch { return []; }
};

export default function useHistorialOrg(org) {
  const [remotos, setRemotos] = useState([]);
  const [listo, setListo] = useState(false);
  const sync = useRef(false);

  useEffect(() => {
    if (!org) {
      setRemotos([]);
      setListo(true);
      return undefined;
    }
    setListo(false);
    return onValue(ref(rtdb, `organizaciones/${org}/paros`), (snap) => {
      const data = snap.val() || {};
      setRemotos(Object.entries(data).map(([id, item]) => ({ id, ...item })));
      setListo(true);
    });
  }, [org]);

  useEffect(() => {
    if (!org || !listo || sync.current) return;
    const locales = leerLogs();
    if (!locales.length) {
      sync.current = true;
      return;
    }
    sync.current = true;
    subirLocales(org, locales, remotos).catch(() => { sync.current = false; });
  }, [org, listo, remotos]);

  return useMemo(() => {
    if (remotos.length) return fusionarParos(remotos);
    return leerLogs();
  }, [remotos]);
}

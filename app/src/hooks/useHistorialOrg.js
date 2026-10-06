import { useEffect, useMemo, useState } from "react";
import { onValue, ref } from "firebase/database";
import { rtdb } from "../firebase";
import { fusionarParos } from "../historial";

export default function useHistorialOrg(org, conEstado = false, activo = true) {
  const [datos, setDatos] = useState({ org: null, remotos: [], listo: false, error: null });
  useEffect(() => {
    setDatos({ org, remotos: [], listo: !org || !activo, error: null });
    if (!org || !activo) return undefined;
    let vigente = true;
    const off = onValue(ref(rtdb, `organizaciones/${org}/paros`), snap => {
      if (vigente) setDatos({ org, remotos: Object.entries(snap.val() || {}).map(([id, item]) => ({ ...item, id })), listo: true, error: null });
    }, () => {
      if (vigente) setDatos({ org, remotos: [], listo: true, error: "No se pudo cargar el historial de Firebase." });
    });
    return () => { vigente = false; off(); };
  }, [org, activo]);
  const historial = useMemo(() => datos.org === org && activo && datos.listo && !datos.error ? fusionarParos(datos.remotos) : [], [datos, org, activo]);
  return conEstado ? { historial, cargando: Boolean(org && activo && (datos.org !== org || !datos.listo)), error: datos.org === org ? datos.error : null } : historial;
}

import { useCallback, useEffect, useRef, useState } from "react";

const INTERVALO = 60_000;
const local = () => (typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev");

async function leerRemota() {
  const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.v ? String(data.v) : null;
}

/** Avisa cuando el build desplegado ya no es el que tiene abierta la pestaña. */
export default function useAppVersion() {
  const [hay, setHay] = useState(false);
  const mia = useRef(local());

  const comprobar = useCallback(async () => {
    try {
      const remota = await leerRemota();
      if (!remota) return;
      if (!mia.current) mia.current = remota;
      setHay(remota !== mia.current);
    } catch {
      /* sin red no molesta */
    }
  }, []);

  useEffect(() => {
    comprobar();
    const id = window.setInterval(comprobar, INTERVALO);
    const alVolver = () => {
      if (document.visibilityState === "visible") comprobar();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", comprobar);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", comprobar);
    };
  }, [comprobar]);

  const actualizar = useCallback(() => {
    window.location.reload();
  }, []);

  return { hayActualizacion: hay, actualizar };
}

import { useEffect, useRef, useState } from "react";
import { onValue, ref } from "firebase/database";
import { rtdb } from "../firebase";
import { emitirInformeAvance, tocaInforme } from "../robotAvance";

const TICTAC = 20 * 1000;

export default function useRobotAvance({ org, planta, config, activo }) {
  const [informes, setInformes] = useState([]);
  const [listo, setListo] = useState(false);
  const ocupado = useRef(false);
  const ultimoLocal = useRef(0);
  const plantaRef = useRef(planta);
  const configRef = useRef(config);
  plantaRef.current = planta;
  configRef.current = config;

  useEffect(() => {
    if (!org) {
      setInformes([]);
      setListo(true);
      return undefined;
    }
    setListo(false);
    const off = onValue(ref(rtdb, `organizaciones/${org}/avisos`), (snap) => {
      const data = snap.val() || {};
      setInformes(Object.entries(data).map(([id, item]) => ({ id, ...item })).sort((a, b) => (b.en || 0) - (a.en || 0)));
      setListo(true);
    });
    return () => off();
  }, [org]);

  useEffect(() => {
    if (!org || !activo) return undefined;
    const tick = async () => {
      if (ocupado.current || !plantaRef.current?.salas?.length || !tocaInforme(configRef.current)) return;
      if (Date.now() - ultimoLocal.current < 90 * 1000) return;
      ocupado.current = true;
      try {
        const hechos = await emitirInformeAvance(org, plantaRef.current, configRef.current);
        if (hechos?.length) ultimoLocal.current = Date.now();
      } catch {
        /* el siguiente ciclo reintenta */
      } finally {
        ocupado.current = false;
      }
    };
    tick();
    const id = window.setInterval(tick, TICTAC);
    return () => window.clearInterval(id);
  }, [org, activo]);

  return { informes, listo };
}

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const GAP = 8;
const MARGEN = 8;
const VIDA = 4000;
const SALIDA = 800;

export default function Tooltip({ label, tone = "dark", wrap = false, children }) {
  const anchor = useRef(null);
  const tip = useRef(null);
  const vidaTimer = useRef(0);
  const salidaTimer = useRef(0);
  const vivo = useRef(false);
  const [visible, setVisible] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [puesto, setPuesto] = useState(null);

  const limpiarTimers = () => {
    window.clearTimeout(vidaTimer.current);
    window.clearTimeout(salidaTimer.current);
  };

  const ocultar = () => {
    if (!vivo.current) return;
    vivo.current = false;
    window.clearTimeout(vidaTimer.current);
    setVisible(false);
    setSaliendo(true);
    salidaTimer.current = window.setTimeout(() => {
      setSaliendo(false);
      setPuesto(null);
    }, SALIDA);
  };

  const mostrar = () => {
    limpiarTimers();
    vivo.current = true;
    setSaliendo(false);
    setVisible(true);
    vidaTimer.current = window.setTimeout(ocultar, VIDA);
  };

  useEffect(() => () => {
    vivo.current = false;
    limpiarTimers();
  }, []);

  useLayoutEffect(() => {
    if ((!visible && !saliendo) || !anchor.current || !tip.current) return undefined;
    const rect = anchor.current.getBoundingClientRect();
    const caja = tip.current.getBoundingClientRect();
    const cabeAbajo = rect.bottom + GAP + caja.height <= window.innerHeight - MARGEN;
    const top = cabeAbajo ? rect.bottom + GAP : Math.max(MARGEN, rect.top - caja.height - GAP);
    const centrado = rect.left + rect.width / 2 - caja.width / 2;
    const left = Math.min(Math.max(MARGEN, centrado), window.innerWidth - caja.width - MARGEN);
    setPuesto({ top, left, origin: cabeAbajo ? "center top" : "center bottom" });
    return undefined;
  }, [visible, saliendo, label]);

  if (!label) return children;

  const montado = visible || saliendo;

  return (
    <span
      className="tip-anchor"
      ref={anchor}
      onMouseEnter={mostrar}
      onMouseLeave={ocultar}
      onFocus={mostrar}
      onBlur={ocultar}
    >
      {children}
      {montado ? createPortal(
        <span
          className={`tooltip${tone === "light" ? " is-light" : ""}${wrap ? " is-wrap" : ""}${saliendo ? " is-out" : ""}`}
          ref={tip}
          role="tooltip"
          style={puesto ? { top: puesto.top, left: puesto.left, transformOrigin: puesto.origin } : { top: -9999, left: -9999 }}
        >
          {label}
        </span>,
        document.body
      ) : null}
    </span>
  );
}

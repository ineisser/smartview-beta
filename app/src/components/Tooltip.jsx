import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const GAP = 8;
const MARGEN = 8;
const VIDA = 4000;
const SALIDA = 800;

export default function Tooltip({ label, tone = "dark", wrap = false, placement = 'bottom', children }) {
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
    const place = () => {
    const rect = (anchor.current.querySelector('button') || anchor.current).getBoundingClientRect();
    const caja = tip.current.getBoundingClientRect();
    const cabeAbajo = rect.bottom + GAP + caja.height <= window.innerHeight - MARGEN;
    const top = placement==='right' ? Math.max(MARGEN,Math.min(rect.top+(rect.height-caja.height)/2,window.innerHeight-caja.height-MARGEN)) : cabeAbajo ? rect.bottom + GAP : Math.max(MARGEN, rect.top - caja.height - GAP);
    const centrado = rect.left + rect.width / 2 - caja.width / 2;
    const left = Math.max(MARGEN,Math.min(placement==='right'?rect.right+6:Math.max(MARGEN, centrado), window.innerWidth - caja.width - MARGEN));
    setPuesto({ top, left, origin: placement==='right'?'left center':cabeAbajo ? "center top" : "center bottom" });
    };
    place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
    const observer=new ResizeObserver(place);observer.observe(anchor.current);
    return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);observer.disconnect();};
  }, [visible, saliendo, label, placement]);

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
          className={`tooltip${placement==='right'?' is-right':''}${tone === "light" ? " is-light" : ""}${wrap ? " is-wrap" : ""}${saliendo ? " is-out" : ""}`}
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

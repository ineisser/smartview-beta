import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const GAP = 8;
const MARGEN = 8;

export default function Tooltip({ label, tone = "dark", wrap = false, children }) {
  const anchor = useRef(null);
  const tip = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [puesto, setPuesto] = useState(null);

  useLayoutEffect(() => {
    if (!abierto || !anchor.current || !tip.current) return undefined;
    const rect = anchor.current.getBoundingClientRect();
    const caja = tip.current.getBoundingClientRect();
    const cabeAbajo = rect.bottom + GAP + caja.height <= window.innerHeight - MARGEN;
    const top = cabeAbajo ? rect.bottom + GAP : Math.max(MARGEN, rect.top - caja.height - GAP);
    const centrado = rect.left + rect.width / 2 - caja.width / 2;
    const left = Math.min(Math.max(MARGEN, centrado), window.innerWidth - caja.width - MARGEN);
    setPuesto({ top, left, origin: cabeAbajo ? "center top" : "center bottom" });
    return undefined;
  }, [abierto, label]);

  if (!label) return children;

  return (
    <span
      className="tip-anchor"
      ref={anchor}
      onMouseEnter={() => setAbierto(true)}
      onMouseLeave={() => { setAbierto(false); setPuesto(null); }}
      onFocus={() => setAbierto(true)}
      onBlur={() => { setAbierto(false); setPuesto(null); }}
    >
      {children}
      {abierto ? createPortal(
        <span
          className={`tooltip${tone === "light" ? " is-light" : ""}${wrap ? " is-wrap" : ""}`}
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

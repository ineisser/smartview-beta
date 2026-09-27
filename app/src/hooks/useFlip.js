import { useLayoutEffect, useRef } from "react";

const CURVA = "cubic-bezier(0.22, 1, 0.36, 1)";

const cajaDe = (nodo, raiz) => {
  let x = 0;
  let y = 0;
  let actual = nodo;
  while (actual && actual !== raiz) {
    x += actual.offsetLeft;
    y += actual.offsetTop;
    actual = actual.offsetParent;
  }
  return { x, y, w: nodo.offsetWidth, h: nodo.offsetHeight };
};

export default function useFlip(contenedor) {
  const antes = useRef(new Map());
  useLayoutEffect(() => {
    const raiz = contenedor.current;
    if (!raiz) return;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ahora = new Map();
    raiz.querySelectorAll("[data-machine-id], [data-flip]").forEach((nodo) => {
      const clave = nodo.dataset.machineId ?? nodo.dataset.flip;
      const caja = cajaDe(nodo, raiz);
      ahora.set(clave, caja);
      const previa = antes.current.get(clave);
      if (quieto || !previa) return;
      const dx = previa.x + previa.w / 2 - (caja.x + caja.w / 2);
      const dy = previa.y + previa.h / 2 - (caja.y + caja.h / 2);
      const cambia = Math.abs(previa.w - caja.w) > 1 || Math.abs(previa.h - caja.h) > 1;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && !cambia) return;
      nodo.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)${cambia ? " scale(0.8)" : ""}`, opacity: cambia ? 0 : 1 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 800, easing: CURVA },
      );
    });
    antes.current = ahora;
  });
}

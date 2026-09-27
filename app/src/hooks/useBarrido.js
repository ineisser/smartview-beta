import { useEffect } from "react";

export const PASO_BARRIDO = 800;

export default function useBarrido(contenedor, activo, selector = ".card-maquina") {
  useEffect(() => {
    if (!activo || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let indice = 0;
    let actual = null;
    const avanzar = () => {
      const nodos = contenedor.current?.querySelectorAll(selector);
      actual?.classList.remove("is-barrido");
      actual = null;
      if (!nodos?.length) return;
      indice %= nodos.length;
      actual = nodos[indice];
      indice += 1;
      actual.classList.add("is-barrido");
    };
    avanzar();
    const reloj = window.setInterval(avanzar, PASO_BARRIDO);
    return () => {
      window.clearInterval(reloj);
      actual?.classList.remove("is-barrido");
    };
  }, [contenedor, activo, selector]);
}

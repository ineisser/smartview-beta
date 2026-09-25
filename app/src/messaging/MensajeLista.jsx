import { useEffect, useRef, useState } from "react";
import { ChevronsDown } from "lucide-react";
import MensajeBurbuja from "./MensajeBurbuja";
import { conDivisores } from "./dias";

const CERCA = 80;

export default function MensajeLista({ mensajes, uid }) {
  const caja = useRef(null);
  const [bajar, setBajar] = useState(false);
  const anclar = useRef(true);
  const filas = conDivisores(mensajes);

  const cercaDelFondo = () => {
    const nodo = caja.current;
    if (!nodo) return true;
    return nodo.scrollHeight - nodo.scrollTop - nodo.clientHeight < CERCA;
  };

  const irAlFinal = (suave = true) => {
    const nodo = caja.current;
    if (!nodo) return;
    nodo.scrollTo({ top: nodo.scrollHeight, behavior: suave ? "smooth" : "auto" });
    anclar.current = true;
    setBajar(false);
  };

  useEffect(() => {
    if (!anclar.current) {
      setBajar(!cercaDelFondo());
      return;
    }
    irAlFinal(mensajes.length > 1);
  }, [mensajes.length, mensajes[mensajes.length - 1]?.id]);

  useEffect(() => {
    anclar.current = true;
    irAlFinal(false);
  }, [uid]);

  return (
    <div className="msg-list-wrap">
      <div
        className="msg-list"
        ref={caja}
        onScroll={() => {
          const cerca = cercaDelFondo();
          anclar.current = cerca;
          setBajar(!cerca);
        }}
      >
        {filas.map((fila) => (
          fila.tipo === "dia" ? (
            <div key={fila.id} className="msg-dia" role="separator">
              <span>{fila.etiqueta}</span>
            </div>
          ) : (
            <MensajeBurbuja key={fila.id} mensaje={fila.mensaje} mio={fila.mensaje.de === uid} bloque={fila.bloque} />
          )
        ))}
      </div>
      <button
        type="button"
        className={`msg-bajar${bajar ? " is-on" : ""}`}
        aria-label="Ir al último mensaje"
        aria-hidden={!bajar}
        tabIndex={bajar ? 0 : -1}
        onClick={() => irAlFinal(true)}
      >
        <ChevronsDown size={18} />
      </button>
    </div>
  );
}

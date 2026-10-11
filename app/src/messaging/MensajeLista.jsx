import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronsDown } from "lucide-react";
import MensajeBurbuja from "./MensajeBurbuja";
import { conDivisores } from "./dias";

const CERCA = 80;

export default function MensajeLista({ mensajes, uid, mas, cargando, error, onAnteriores }) {
  const caja = useRef(null);
  const [bajar, setBajar] = useState(false);
  const anclar = useRef(true);
  const posicion = useRef(null);
  const filas = conDivisores(mensajes);
  const anteriores = () => {
    if (cargando || !onAnteriores) return;
    const nodo = caja.current;
    posicion.current = { altura: nodo.scrollHeight, top: nodo.scrollTop };
    anclar.current = false;
    onAnteriores();
  };
  useLayoutEffect(() => {
    if (!posicion.current || cargando) return;
    const nodo = caja.current;
    nodo.scrollTop = posicion.current.top + nodo.scrollHeight - posicion.current.altura;
    posicion.current = null;
  }, [mensajes, cargando]);

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
    if (posicion.current || !anclar.current) {
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
          if (caja.current.scrollTop < 40 && mas && !cargando && !error) anteriores();
        }}
      >
        {(mas || error) && <button className="chat-anteriores" type="button" disabled={cargando} onClick={anteriores}>{cargando ? 'Cargando mensajes anteriores…' : error ? 'Reintentar' : 'Ver mensajes anteriores'}</button>}
        {error && <p role="alert">{error}</p>}
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

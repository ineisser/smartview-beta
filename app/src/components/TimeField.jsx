import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

const pad = (n) => String(n).padStart(2, "0");
const horas = Array.from({ length: 24 }, (_, i) => pad(i));
const minutos = Array.from({ length: 60 }, (_, i) => pad(i));

const partir = (value) => {
  const [hora, minuto] = String(value || "00:00").split(":");
  return [horas.includes(hora) ? hora : "00", minutos.includes(minuto) ? minuto : "00"];
};

function Columna({ opciones, valor, onPick, lista }) {
  return (
    <ul className="time-col" ref={lista}>
      {opciones.map((opcion) => (
        <li key={opcion}>
          <button
            type="button"
            className={opcion === valor ? "is-on" : ""}
            onClick={() => onPick(opcion)}
          >
            {opcion}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function TimeField({ value, onChange }) {
  const [abierto, setAbierto] = useState(false);
  const [caja, setCaja] = useState(null);
  const raiz = useRef(null);
  const panel = useRef(null);
  const listaHora = useRef(null);
  const listaMinuto = useRef(null);
  const [hora, minuto] = partir(value);

  const colocar = () => {
    const rect = raiz.current?.getBoundingClientRect();
    if (!rect) return;
    setCaja({ top: rect.bottom + 6, left: rect.left, width: rect.width });
  };

  useEffect(() => {
    if (!abierto) return undefined;
    colocar();
    const elegido = (lista) => lista.current?.querySelector(".is-on");
    elegido(listaHora)?.scrollIntoView({ block: "center" });
    elegido(listaMinuto)?.scrollIntoView({ block: "center" });
    const cerrar = (event) => {
      if (raiz.current?.contains(event.target) || panel.current?.contains(event.target)) return;
      setAbierto(false);
    };
    window.addEventListener("pointerdown", cerrar);
    window.addEventListener("resize", colocar);
    return () => {
      window.removeEventListener("pointerdown", cerrar);
      window.removeEventListener("resize", colocar);
    };
  }, [abierto]);

  const elegir = (siguienteHora, siguienteMinuto) => {
    onChange?.(`${siguienteHora}:${siguienteMinuto}`);
  };

  return (
    <div className={`time-field${abierto ? " open" : ""}`} ref={raiz}>
      <button type="button" className="time-trigger" onClick={() => setAbierto((actual) => !actual)}>
        <span>{hora}:{minuto}</span>
        <Clock size={18} />
      </button>
      {abierto && caja ? (
        <div className="time-panel" ref={panel} style={{ top: caja.top, left: caja.left, width: caja.width }}>
          <Columna opciones={horas} valor={hora} lista={listaHora} onPick={(siguiente) => elegir(siguiente, minuto)} />
          <Columna opciones={minutos} valor={minuto} lista={listaMinuto} onPick={(siguiente) => elegir(hora, siguiente)} />
        </div>
      ) : null}
    </div>
  );
}

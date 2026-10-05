import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeOff } from "lucide-react";
import { ALTAVOZ, VOLUMEN, altavozActivo, fijarAltavoz, fijarVolumen, volumenPorcentaje } from "../sonido";

export default function VolumenControl({ compacto = false, mostrarPorcentaje = !compacto, titulo = "Volumen de notificaciones" }) {
  const [activo, setActivo] = useState(altavozActivo);
  const [volumen, setVolumen] = useState(volumenPorcentaje);
  const [arrastrando, setArrastrando] = useState(false);
  const previo = useRef(Number(localStorage.getItem("smartview-volumen-previo")) || volumenPorcentaje() || 100);

  useEffect(() => {
    const sync = () => { setActivo(altavozActivo()); setVolumen(volumenPorcentaje()); };
    window.addEventListener(ALTAVOZ, sync);
    window.addEventListener(VOLUMEN, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(ALTAVOZ, sync); window.removeEventListener(VOLUMEN, sync); window.removeEventListener("storage", sync); };
  }, []);

  const cambiar = (valor) => {
    const pct = fijarVolumen(valor);
    const on = pct > 0;
    if (on) {
      previo.current = pct;
      localStorage.setItem("smartview-volumen-previo", String(pct));
    }
    fijarAltavoz(on);
    setActivo(on);
    setVolumen(pct);
  };
  const alternar = () => {
    if (activo && volumen > 0) {
      previo.current = volumen;
      localStorage.setItem("smartview-volumen-previo", String(volumen));
      cambiar(0);
    } else cambiar(previo.current || 100);
  };
  const valor = activo ? volumen : 0;

  return (
    <div className={`volumen-control${compacto ? " is-compacto" : ""}${arrastrando ? " is-arrastre" : ""}`}>
      {!compacto ? <span className="volumen-control-titulo">{titulo}</span> : null}
      <div className="volumen-control-fila volumen-fila">
        <button type="button" className="menu-volumen-icono" aria-label={valor ? "Silenciar" : "Activar sonido"} onClick={alternar}>
          {valor ? <Volume2 size={18} /> : <VolumeOff size={18} />}
        </button>
        <input type="range" min="0" max="100" step="1" aria-label="Volumen" value={valor} style={{ "--vol": `${valor}%` }}
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setArrastrando(true); }}
          onPointerUp={() => setArrastrando(false)}
          onPointerCancel={() => setArrastrando(false)}
          onBlur={() => setArrastrando(false)}
          onChange={(event) => cambiar(event.target.value)}
        />
        {mostrarPorcentaje ? <span className="volumen-pct">{valor}%</span> : null}
      </div>
    </div>
  );
}

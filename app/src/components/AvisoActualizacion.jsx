import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RefreshCw, X } from "lucide-react";

export default function AvisoActualizacion({ visible, onActualizar, compacto }) {
  if (!visible) return null;
  return (
    <button
      type="button"
      className={`saiba-update${compacto ? " is-compact" : ""}`}
      onClick={onActualizar}
      aria-label="Hay una nueva versión. Actualizar la aplicación"
    >
      <RefreshCw size={16} className="saiba-update-ico" aria-hidden="true" />
      <span className="saiba-update-copy">
        <strong>Actualizaciones</strong>
        <small>Hay una nueva versión. Pulsa para actualizar.</small>
      </span>
    </button>
  );
}

export function AvisoActualizacionMovil({ visible, onActualizar }) {
  const [cerrado, setCerrado] = useState(false);
  const [montado, setMontado] = useState(false);
  const [dentro, setDentro] = useState(false);
  const mostrar = visible && !cerrado;

  useEffect(() => {
    if (mostrar) {
      setMontado(true);
      let segundo = 0;
      const primero = window.requestAnimationFrame(() => {
        segundo = window.requestAnimationFrame(() => setDentro(true));
      });
      return () => {
        window.cancelAnimationFrame(primero);
        window.cancelAnimationFrame(segundo);
      };
    }
    setDentro(false);
    const id = window.setTimeout(() => setMontado(false), 800);
    return () => window.clearTimeout(id);
  }, [mostrar]);

  if (!montado) return null;
  return createPortal(
    <div className={`aviso-version${dentro ? " is-on" : ""}`} role="status">
      <button type="button" className="aviso-version-accion" onClick={onActualizar}>
        <RefreshCw size={18} aria-hidden="true" />
        <span>
          <strong>Nueva versión disponible</strong>
          <small>Toca para actualizar</small>
        </span>
      </button>
      <button type="button" className="aviso-version-cerrar" aria-label="Cerrar aviso" onClick={() => setCerrado(true)}>
        <X size={18} />
      </button>
    </div>,
    document.body,
  );
}

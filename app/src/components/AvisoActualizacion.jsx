import { RefreshCw } from "lucide-react";

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

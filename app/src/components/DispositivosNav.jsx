import { Wifi } from "lucide-react";

export default function DispositivosNav({ conectados = 0, activo = false, demostracion = false, onClick }) {
  const etiqueta = `Dispositivos: ${conectados} conectados${demostracion ? ' (demostración)' : ''}`;
  return (
    <button className={`icon-btn dispositivos-nav${activo ? " is-on" : ""}`} type="button"
      aria-label={etiqueta} title={etiqueta} aria-current={activo ? "page" : undefined} onClick={onClick}>
      <Wifi size={18} aria-hidden="true" />
      <i className="dispositivos-badge" aria-hidden="true">{conectados > 99 ? "99+" : conectados}</i>
    </button>
  );
}

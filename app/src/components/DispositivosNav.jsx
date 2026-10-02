import { Wifi } from "lucide-react";

export default function DispositivosNav({ conectados = 0, activo = false, onClick }) {
  return (
    <button className={`icon-btn dispositivos-nav${activo ? " is-on" : ""}`} type="button" aria-label={activo ? "Actualizar dispositivos" : "Dispositivos conectados"} onClick={onClick}>
      <Wifi size={18} />
      {conectados > 0 ? <i className="dispositivos-badge">{conectados > 99 ? "99+" : conectados}</i> : null}
    </button>
  );
}

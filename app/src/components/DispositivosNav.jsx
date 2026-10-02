import { useState } from "react";
import { Check, Copy, Wifi } from "lucide-react";

export default function DispositivosNav({ conectados = 0, activo = false, demostracion = false, mac = "", onClick }) {
  const etiqueta = `Dispositivos: ${conectados} conectados${demostracion ? ' (demostración)' : ''}`;
  const [copiado, setCopiado] = useState(false);
  const copiarMac = async () => {
    if (!mac) return;
    try {
      await navigator.clipboard.writeText(mac);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1200);
    } catch {}
  };
  return (
    <div className="dispositivos-nav-wrap">
      {activo && mac ? (
        <div className="machine-mac">
          <span className="machine-mac-copy"><small>MAC</small><strong>{mac}</strong>
            <button className="icon-btn machine-mac-copy-btn" type="button" aria-label="Copiar MAC de la máquina" title="Copiar MAC" onClick={copiarMac}>
              {copiado ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </span>
          <span className="devices-nav-separator" aria-hidden="true" />
        </div>
      ) : null}
      <button className={`icon-btn dispositivos-nav${activo ? " is-on" : ""}`} type="button"
        aria-label={etiqueta} title={etiqueta} aria-current={activo ? "page" : undefined} onClick={onClick}>
        <Wifi size={18} aria-hidden="true" />
        <i className="dispositivos-badge" aria-hidden="true">{conectados > 99 ? "99+" : conectados}</i>
      </button>
    </div>
  );
}

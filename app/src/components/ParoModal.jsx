import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import "../styles/components/modal.css";

export default function ParoModal({ numero, motivos, paroActual, onClose, onConfirm, onReiniciar, puedeCargar = true, onComentar, onEnterado }) {
  const [visible, setVisible] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState(paroActual?.motivo || "");
  const [texto, setTexto] = useState(paroActual ? `${paroActual.motivo} - ${paroActual.nombre}` : "Seleccione motivo...");
  const [comentario, setComentario] = useState(paroActual?.comentario || "");
  const enParo = Boolean(paroActual);
  const cambio = enParo && motivo && motivo !== paroActual.motivo;

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setVisible(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  const cerrar = () => {
    setAbierto(false);
    setVisible(false);
    window.setTimeout(onClose, 600);
  };

  const conteo = motivos.reduce((mapa, item) => ({ ...mapa, [item.id]: 0 }), {});
  try {
    JSON.parse(localStorage.getItem("machine_stop_logs") || "[]").forEach((item) => {
      if (item.status !== "detenido") return;
      const id = item.motivo || motivos.find((motivoItem) => motivoItem.name === item.reason)?.id;
      if (id && conteo[id] !== undefined) conteo[id] += 1;
    });
  } catch { /* el historial vacío no ordena */ }
  const frecuentes = motivos.filter((item) => conteo[item.id] > 0).sort((a, b) => conteo[b.id] - conteo[a.id]);
  const resto = motivos.filter((item) => conteo[item.id] === 0);
  const fila = (item) => (
    <div
      key={item.id}
      className="option-item"
      onClick={() => { setMotivo(item.id); setTexto(`${item.id} - ${item.name}`); setAbierto(false); }}
    >
      {item.id} - {item.name}
    </div>
  );

  const confirmar = () => {
    if (!motivo) return;
    const elegido = motivos.find((item) => item.id === motivo);
    onConfirm({ motivo, nombre: elegido?.name || paroActual?.nombre || motivo });
    cerrar();
  };

  return createPortal(
    <div id="modal-overlay" className={visible ? "active" : ""} onClick={(event) => { if (event.target.id === "modal-overlay") cerrar(); }}>
      <div className="modal-glass" role="dialog" aria-labelledby="modal-machine-id">
        <button className="modal-close" type="button" aria-label="Cerrar" onClick={cerrar}><X size={18} /></button>
        <h3>{enParo ? "Gestionar máquina " : "Detener máquina "}<span id="modal-machine-id">{numero}</span></h3>
        <p>{enParo ? "la máquina está en este paro. puedes reiniciarla o cambiar el motivo." : "seleccione el motivo de detención para procesar"}</p>
        {puedeCargar ? (
          <div className={`select-wrapper${abierto ? " is-open" : ""}`} onClick={(event) => event.stopPropagation()}>
            <button id="reasons-select-trigger" className="theme-select-trigger" type="button" onClick={() => setAbierto((value) => !value)}>
              <span>{texto}</span>
            </button>
            <ChevronDown className="select-chevron" size={20} />
            <div id="reasons-options-list">
              {frecuentes.map(fila)}
              {frecuentes.length && resto.length ? <hr className="option-split" /> : null}
              {resto.map(fila)}
            </div>
          </div>
        ) : <p>{paroActual ? `${paroActual.motivo || ""} ${paroActual.nombre || ""}`.trim() : "Sin paro en esta máquina."}</p>}
        <label className="field">
          <span>Comentario</span>
          <input value={comentario} onChange={(event) => setComentario(event.target.value)} />
        </label>
        <div className="modal-actions">
          <button className="btn theme-cancel-btn" type="button" onClick={cerrar}>cancelar</button>
          {onEnterado && paroActual ? <button className="btn theme-cancel-btn" type="button" onClick={() => { onEnterado(); cerrar(); }}>Me enteré</button> : null}
          {comentario.trim() ? <button className="btn theme-cancel-btn" type="button" onClick={() => { onComentar?.(comentario.trim()); cerrar(); }}>Comentar</button> : null}
          {puedeCargar && enParo && !cambio ? (
            <button className="btn confirm-start" type="button" onClick={() => { onReiniciar(); cerrar(); }}>reiniciar</button>
          ) : null}
          {puedeCargar && (!enParo || cambio) ? (
            <button className="btn confirm-stop" type="button" disabled={!motivo} onClick={confirmar}>{cambio ? "cambiar motivo" : "confirmar paro"}</button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

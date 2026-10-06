import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import "../styles/components/modal.css";

export default function ParoModal({ numero, motivos, paroActual, onClose, onConfirm, onReiniciar, puedeCargar = true, onComentar, onEnterado, logs = [] }) {
  const [visible, setVisible] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState(paroActual?.motivo || "");
  const [texto, setTexto] = useState(paroActual ? `${paroActual.motivo} - ${paroActual.nombre}` : "Seleccione motivo...");
  const [comentario, setComentario] = useState(paroActual?.comentario || "");
  const enParo = Boolean(paroActual);
  const cambio = enParo && motivo && motivo !== paroActual.motivo;

  const [teclado, setTeclado] = useState(0);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setVisible(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const vista = window.visualViewport;
    if (!vista) return undefined;
    const medir = () => setTeclado(Math.max(0, Math.round(window.innerHeight - vista.height - vista.offsetTop)));
    medir();
    vista.addEventListener("resize", medir);
    vista.addEventListener("scroll", medir);
    return () => {
      vista.removeEventListener("resize", medir);
      vista.removeEventListener("scroll", medir);
    };
  }, []);

  const cerrar = () => {
    setAbierto(false);
    setVisible(false);
    window.setTimeout(onClose, 600);
  };

  const conteo = motivos.reduce((mapa, item) => ({ ...mapa, [item.id]: 0 }), {});
  try {
    logs.forEach((item) => {
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
    <div
      id="modal-overlay"
      className={`is-paro${visible ? " active" : ""}`}
      style={{ "--teclado": `${teclado}px` }}
      onClick={(event) => { if (event.target.id === "modal-overlay") cerrar(); }}
    >
      <div className="modal-glass modal-paro" role="dialog" aria-labelledby="paro-titulo">
        <button className="modal-close" type="button" aria-label="Cerrar" onClick={cerrar}><X size={18} /></button>
        <h3 id="paro-titulo" className="paro-titulo" aria-label={`${enParo ? "Gestionar" : "Detener"} máquina ${numero}`}>
          <span id="modal-machine-id">{numero}</span>
          <small>Máquina</small>
        </h3>
        <p className="paro-texto">{enParo ? "La máquina está en este paro. Puedes reiniciarla o cambiar el motivo." : "Selecciona el motivo de detención para procesar."}</p>
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
        <div className="modal-actions paro-acciones">
          {puedeCargar && (!enParo || cambio) ? (
            <button className="btn confirm-stop" type="button" disabled={!motivo} onClick={confirmar}>{cambio ? "Cambiar motivo" : "Confirmar paro"}</button>
          ) : null}
          {puedeCargar && enParo && !cambio ? (
            <button className="btn confirm-start" type="button" onClick={() => { onReiniciar(); cerrar(); }}>Reiniciar</button>
          ) : null}
          {comentario.trim() ? <button className="btn theme-cancel-btn" type="button" onClick={() => { onComentar?.(comentario.trim()); cerrar(); }}>Comentar</button> : null}
          {onEnterado && paroActual ? <button className="btn theme-cancel-btn" type="button" onClick={() => { onEnterado(); cerrar(); }}>Me enteré</button> : null}
          <button className="btn theme-cancel-btn" type="button" onClick={cerrar}>Cancelar</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

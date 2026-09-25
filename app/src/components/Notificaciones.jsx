import { createPortal } from "react-dom";
import { useEffect, useState, useRef } from "react";
import { ArrowUpRight, Minimize2, PanelRight, Volume2, VolumeX, X } from "lucide-react";
import Button from "./Button";
import Tooltip from "./Tooltip";
import { esNotaAvance, reproducirNota } from "../hooks/useAvisoSonido";
import { ALTAVOZ, altavozActivo, fijarAltavoz } from "../sonido";

const TOPE = 7;

export const notaDe = (item) => {
  const progreso = Number.isFinite(Number(item.progreso)) ? Math.max(0, Math.min(100, Number(item.progreso))) : null;
  const procesando = item.estado === "procesando" || (progreso !== null && progreso < 100 && item.estado !== "listo");
  const listo = item.estado === "listo" || progreso === 100;
  return {
    id: item.id,
    en: Number(item.en) || 0,
    corto: item.corto || item.texto || "Aviso",
    largo: item.largo || item.texto || item.corto || "Aviso",
    cuerpo: item.cuerpo || "",
    urgente: Boolean(item.urgente),
    progreso,
    procesando,
    listo,
    accion: item.accion || null,
    tipo: item.tipo || item.accion?.tipo || "",
    eficiencia: item.eficiencia,
    sala: item.sala || "",
    salaNombre: item.salaNombre || "",
    automatico: Boolean(item.automatico),
    frase: item.frase || "",
  };
};

const tituloParo = (item, numero) => {
  const dicha = String(item.frase || "").replace(/\.\s*$/, "");
  if (dicha) return dicha;
  const n = String(numero).padStart(2, "0");
  const motivo = String(item.nombre || "paro").trim().toLocaleLowerCase("es") || "paro";
  return `Telar ${n}, ${motivo}`;
};

export function notasDeSala({ informes, paros, salaCodigo, salaNombre }) {
  const deParos = Object.entries(paros || {}).map(([numero, item]) => {
    const titulo = tituloParo(item, numero);
    return notaDe({
      id: `${salaCodigo || ""}:${numero}:${item.inicio || ""}`,
      en: Number(item.inicio) || 0,
      corto: titulo,
      largo: titulo,
      cuerpo: item.comentario || "",
      urgente: item.urgente,
      automatico: item.automatico,
      frase: item.frase || `${titulo}.`,
      tipo: "paro",
      accion: { tipo: "paro", numero },
    });
  });
  const deAvisos = (informes || [])
    .filter((item) => item.tipo !== "paro")
    .map((item) => notaDe({
      ...item,
      corto: item.corto || `${item.salaNombre || item.sala || salaNombre || "Sala"} · ${item.eficiencia ?? "—"}%`,
      largo: item.largo || item.texto || `Avance de ${item.salaNombre || item.sala || "la sala"}.`,
      accion: item.accion || (item.sala ? { tipo: "avance", sala: item.sala } : null),
    }));
  return [...deParos, ...deAvisos].sort((a, b) => b.en - a.en);
}

const mismoDia = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function textoCuando(en, ahora = Date.now()) {
  if (!en) return "";
  const fecha = new Date(en);
  const minutos = Math.max(0, Math.floor((ahora - en) / 60000));
  if (minutos < 1) return "hace un momento";
  if (minutos === 1) return "hace un minuto";
  if (minutos < 60) return `hace ${minutos} minutos`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas < 6) {
    if (!resto) return `hace ${horas} h`;
    return `hace ${horas} h y ${resto} ${resto === 1 ? "minuto" : "minutos"}`;
  }
  const hoy = new Date(ahora);
  if (mismoDia(fecha, hoy)) {
    if (horas < 8) return "hace más de 6 horas";
    const hora = fecha.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false });
    return `hoy a las ${hora}`;
  }
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  if (mismoDia(fecha, ayer)) return "ayer";
  return fecha.toLocaleDateString("es", { day: "numeric", month: "short" });
}

const fechaCompleta = (en) => new Date(en).toLocaleString("es", { dateStyle: "full", timeStyle: "short" });

function Progreso({ nota }) {
  if (nota.procesando && nota.progreso !== null) {
    return (
      <div className="nota-progreso">
        <b><i style={{ width: `${nota.progreso}%` }} /></b>
        <span>{nota.progreso}%</span>
      </div>
    );
  }
  if (nota.listo) return <span className="nota-listo">Terminado</span>;
  return null;
}

function BotonReplay({ nota }) {
  if (!esNotaAvance(nota) && !nota?.frase) return null;
  return (
    <Button
      variant="ghost"
      className="aviso-replay"
      aria-label="Reproducir este aviso"
      onClick={(event) => {
        event.stopPropagation();
        reproducirNota(nota);
      }}
    >
      <Volume2 size={16} />
    </Button>
  );
}

function BotonAltavoz() {
  const [activo, setActivo] = useState(altavozActivo);
  useEffect(() => {
    const sync = () => setActivo(altavozActivo());
    window.addEventListener(ALTAVOZ, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ALTAVOZ, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return (
    <Button
      variant="ghost"
      className="aviso-icono"
      aria-label={activo ? "Silenciar el altavoz de este equipo" : "Activar el altavoz de este equipo"}
      aria-pressed={activo}
      onClick={() => fijarAltavoz(!activo)}
    >
      {activo ? <Volume2 size={16} /> : <VolumeX size={16} />}
    </Button>
  );
}

function Ficha({ nota, amplia }) {
  const titulo = amplia ? nota.largo : nota.corto;
  return (
    <article className="nota-ficha">
      <div className="nota-top">
        <Tooltip label={titulo} wrap>
          <span className="nota-titulo">{titulo}</span>
        </Tooltip>
        {nota.en ? (
          <Tooltip label={fechaCompleta(nota.en)} wrap>
            <time className="nota-cuando" dateTime={new Date(nota.en).toISOString()}>{textoCuando(nota.en)}</time>
          </Tooltip>
        ) : null}
      </div>
      {amplia || nota.largo === nota.corto ? null : <p>{nota.largo}</p>}
      {nota.cuerpo ? <p>{nota.cuerpo}</p> : null}
      <Progreso nota={nota} />
    </article>
  );
}

function Detalle({ nota, onCerrar }) {
  if (!nota) return null;
  return createPortal(
    <div className="nota-modal" onClick={onCerrar}>
      <article className="nota-dialogo glass" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" aria-label="Cerrar" onClick={onCerrar}><X size={18} /></button>
        {nota.en ? <time className="nota-cuando">{fechaCompleta(nota.en)}</time> : null}
        <h2>{nota.largo}</h2>
        {nota.cuerpo ? <p>{nota.cuerpo}</p> : <p>{nota.corto}</p>}
        <Progreso nota={nota} />
      </article>
    </div>,
    document.body,
  );
}

function useDetalle(onLeer) {
  const [nota, setNota] = useState(null);
  const abrir = (item) => {
    setNota(item);
    onLeer?.(item);
  };
  return { nota, abrir, cerrar: () => setNota(null) };
}

export function Campana({ abierto, ancla, notas, onCerrar, onExpandir, onLeer }) {
  const ref = useRef(null);
  const { nota, abrir, cerrar } = useDetalle(onLeer);
  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (event) => {
      if (ref.current?.contains(event.target) || ancla?.contains(event.target) || event.target.closest?.(".nota-modal")) return;
      onCerrar();
    };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [abierto, ancla, onCerrar]);
  if (!abierto || !ancla) return null;
  const rect = ancla.getBoundingClientRect();
  const recientes = notas.slice(0, TOPE);
  return createPortal(
    <>
      <div ref={ref} className="aviso-pop glass-pop" style={{ top: rect.bottom + 8, right: Math.max(12, window.innerWidth - rect.right) }}>
        <header className="aviso-head">
          <strong>Notificaciones</strong>
          <BotonAltavoz />
          <Button variant="ghost" className="aviso-icono" aria-label="Abrir el panel" onClick={onExpandir}>
            <PanelRight size={16} />
          </Button>
        </header>
        <ul>
          {recientes.length ? recientes.map((item) => (
            <li key={item.id}>
              <button className="aviso-fila" type="button" onClick={() => abrir(item)}>
                <span>{item.corto}</span>
                {item.en ? <time>{textoCuando(item.en)}</time> : null}
              </button>
              <BotonReplay nota={item} />
            </li>
          )) : <li><span>Sin notificaciones</span></li>}
        </ul>
        <hr className="linea-moderna" />
        <footer className="aviso-foot">
          <Button variant="ghost" className="aviso-mas" onClick={onExpandir}>Ver más</Button>
        </footer>
      </div>
      <Detalle nota={nota} onCerrar={cerrar} />
    </>,
    document.body,
  );
}

export function CentroAvisos({ notas, pendientes, onCerrar, onContraer, onAbrirPagina, onLeer }) {
  const { nota, abrir, cerrar } = useDetalle(onLeer);
  const texto = pendientes === 1 ? "1 pendiente de leer" : `${pendientes} pendientes de leer`;
  return (
    <div className="drawer-layer aviso-capa">
      <button className="drawer-back" type="button" aria-label="Cerrar" onClick={onCerrar} />
      <aside className="drawer aviso-centro">
        <header>
          <h2>Notificaciones</h2>
          <BotonAltavoz />
          <Button variant="ghost" className="aviso-icono" aria-label="Volver al menú" onClick={onContraer}>
            <Minimize2 size={16} />
          </Button>
          <Button variant="ghost" className="aviso-icono" aria-label="Abrir la página de notificaciones" onClick={onAbrirPagina}>
            <ArrowUpRight size={16} />
          </Button>
          <Button variant="ghost" className="aviso-icono" aria-label="Cerrar" onClick={onCerrar}>
            <X size={16} />
          </Button>
        </header>
        <hr className="linea-moderna" />
        <div className="aviso-lista">
          {notas.length ? notas.map((item) => (
            <div key={item.id} className="nota-card">
              <button type="button" className="nota-hit" onClick={() => abrir(item)}>
                <Ficha nota={item} />
              </button>
              <BotonReplay nota={item} />
            </div>
          )) : <p className="nota-vacio">Sin notificaciones</p>}
        </div>
        <footer className="aviso-foot">{texto}</footer>
      </aside>
      <Detalle nota={nota} onCerrar={cerrar} />
    </div>
  );
}

export function PaginaAvisos({ notas, onLeer }) {
  const { nota, abrir, cerrar } = useDetalle(onLeer);
  return (
    <section className="aviso-pagina">
      <div className="aviso-pagina-tools">
        <BotonAltavoz />
      </div>
      <div className="aviso-lista is-pagina">
        {notas.length ? notas.map((item) => (
          <div key={item.id} className="nota-card">
            <button type="button" className="nota-hit" onClick={() => abrir(item)}>
              <Ficha nota={item} amplia />
            </button>
            <BotonReplay nota={item} />
          </div>
        )) : <p className="nota-vacio">Sin notificaciones</p>}
      </div>
      <Detalle nota={nota} onCerrar={cerrar} />
    </section>
  );
}

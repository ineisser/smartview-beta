import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Circle, Grip, History, Percent, Square, X } from "lucide-react";
import "../styles/components/hoja-sala.css";

export const VISTA_INICIO = "mapa";
export const VISTA_EFICIENCIA = "eficiencia";

export const VISTAS_HOJA = [
  { id: VISTA_INICIO, label: "Sala", titulo: "Mapa de sección", Icon: Grip },
  { id: "priority", label: "Paros", titulo: "Prioridad de Atención", Icon: Square },
  { id: "activity", label: "Activas", titulo: "Activas", Icon: Circle },
  { id: "history", label: "Historial", titulo: "Historial de Paros", Icon: History },
];

const CONFIG_HOJA = [...VISTAS_HOJA, { id: VISTA_EFICIENCIA, titulo: "Eficiencia", Icon: Percent }];

const CIERRE_ARRASTRE = 96;

// Muesca del botón central: círculo de radio R con su centro Y px sobre el borde de la barra,
// unido al borde recto por dos curvas de radio CURVA tangentes a ambos.
const MUESCA = (() => {
  const r = 37;
  const y = -4;
  const curva = 12;
  const n = (valor) => Number(valor.toFixed(3));
  const ancho = 2 * Math.sqrt((r + curva) ** 2 - (curva - y) ** 2);
  const k = r / (r + curva);
  const tx = n((ancho / 2) * (1 - k));
  const ty = n(y + k * (curva - y));
  const alto = Math.ceil(y + r + 1);
  const contorno = `M0 0A${curva} ${curva} 0 0 1 ${tx} ${ty}A${r} ${r} 0 0 0 ${n(ancho - tx)} ${ty}A${curva} ${curva} 0 0 1 ${n(ancho)} 0`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${n(ancho)}" height="${alto}" viewBox="0 0 ${n(ancho)} ${alto}"><path d="${contorno}Z" fill="#000"/></svg>`;
  return {
    ancho: n(ancho),
    alto,
    contorno,
    estilo: {
      "--muesca-mascara": `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
      "--muesca-ancho": `${n(ancho)}px`,
      "--muesca-alto": `${alto}px`,
    },
  };
})();

export default function HojaSala({ vista, onCerrar, children }) {
  const [montada, setMontada] = useState(Boolean(vista));
  const [visible, setVisible] = useState(false);
  const [mostrada, setMostrada] = useState(vista);
  const [dy, setDy] = useState(0);
  const drag = useRef(null);
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;

  useEffect(() => {
    if (vista) {
      setMostrada(vista);
      setMontada(true);
      let segundo = 0;
      const primero = window.requestAnimationFrame(() => {
        segundo = window.requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        window.cancelAnimationFrame(primero);
        window.cancelAnimationFrame(segundo);
      };
    }
    setVisible(false);
    const id = window.setTimeout(() => setMontada(false), 800);
    return () => window.clearTimeout(id);
  }, [vista]);

  useEffect(() => {
    if (!vista) return undefined;
    const tecla = (event) => { if (event.key === "Escape") cerrar.current(); };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [vista]);

  if (!montada) return null;

  const config = CONFIG_HOJA.find((item) => item.id === mostrada) || VISTAS_HOJA[1];
  const Icono = config.Icon;

  const empezar = (event) => {
    if (event.target.closest("button:not(.hoja-tirador)")) return;
    drag.current = { y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const mover = (event) => {
    if (!drag.current) return;
    setDy(Math.max(0, event.clientY - drag.current.y));
  };
  const soltar = () => {
    if (!drag.current) return;
    drag.current = null;
    if (dy > CIERRE_ARRASTRE) onCerrar();
    setDy(0);
  };

  return createPortal(
    <>
      <button type="button" className={`hoja-velo${visible ? " is-on" : ""}`} aria-label="Cerrar panel" onClick={onCerrar} />
      <section
        className={`hoja${visible ? " is-on" : ""}${dy ? " is-drag" : ""}`}
        style={dy ? { transform: `translateY(${dy}px)` } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hoja-titulo"
      >
        <div className="hoja-agarre" onPointerDown={empezar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}>
          <button type="button" className="hoja-tirador" aria-label="Cerrar panel" onClick={onCerrar} />
          <header className="hoja-head">
            <h3 id="hoja-titulo" key={mostrada} className="hoja-titulo">
              <Icono aria-hidden="true" />
              {config.titulo}
            </h3>
            <button type="button" className="hoja-cerrar" aria-label="Cerrar" onClick={onCerrar}>
              <X size={20} />
            </button>
          </header>
        </div>
        <div className="hoja-cuerpo">
          <div key={mostrada} className="hoja-vista">
            {children(mostrada)}
          </div>
        </div>
      </section>
    </>,
    document.body,
  );
}

export function NavHoja({ vista, onVista, insignias = {}, eficiencia = null }) {
  const [salto, setSalto] = useState(false);
  const actual = vista || VISTA_INICIO;
  const centro = Boolean(eficiencia);
  const enEficiencia = centro && actual === VISTA_EFICIENCIA;
  const indice = Math.max(0, VISTAS_HOJA.findIndex((item) => item.id === actual));
  const mitad = VISTAS_HOJA.length / 2;
  const casilla = centro && indice >= mitad ? indice + 1 : indice;
  const total = VISTAS_HOJA.length + (centro ? 1 : 0);
  const valor = eficiencia?.valor;
  const nivel = valor == null ? 0 : Math.max(0, Math.min(100, valor));
  return createPortal(
    <>
      <i className="hoja-nav-sombra" aria-hidden="true" />
      <nav
        className={`hoja-nav btn-slide${centro ? " has-centro" : ""}`}
        style={centro ? MUESCA.estilo : undefined}
        role="tablist"
        aria-label="Vistas de la sala"
      >
        <i className="hoja-nav-vidrio" aria-hidden="true" />
        {centro ? (
          <svg className="hoja-nav-muesca" width={MUESCA.ancho} height={MUESCA.alto} viewBox={`0 0 ${MUESCA.ancho} ${MUESCA.alto}`} aria-hidden="true">
            <path d={MUESCA.contorno} />
          </svg>
        ) : null}
        <i
          className={`hoja-nav-marca${enEficiencia ? "" : " is-on"}`}
          style={{ left: `calc(5px + (100% - 10px) * ${casilla} / ${total})`, width: `calc((100% - 10px) / ${total})` }}
          aria-hidden="true"
        />
        {VISTAS_HOJA.map(({ id, label, Icon }, index) => {
          const cuenta = Number(insignias[id]) || 0;
          return [
            centro && index === mitad ? <span key="hueco" className="hoja-nav-hueco" aria-hidden="true" /> : null,
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={actual === id}
              aria-label={cuenta ? `${label}, ${cuenta}` : undefined}
              className={actual === id ? "is-on" : ""}
              onClick={() => onVista(id === VISTA_INICIO || id === vista ? null : id)}
            >
              <span className="hoja-nav-ico">
                <Icon aria-hidden="true" />
                {cuenta ? <i key={cuenta} className="hoja-nav-badge" aria-hidden="true">{cuenta > 99 ? "99+" : cuenta}</i> : null}
              </span>
              <span>{label}</span>
            </button>,
          ];
        })}
      </nav>
      {centro && valor != null ? (
        <i className={`nav-eficiencia-laser${eficiencia.buena ? "" : " is-bajo"}`} aria-hidden="true" />
      ) : null}
      {centro ? (
        <button
          type="button"
          className={`nav-eficiencia${valor == null ? " is-fuera" : eficiencia.buena ? "" : " is-bajo"}${enEficiencia ? " is-on" : ""}${salto ? " is-salto" : ""}`}
          style={{ "--nivel": `${nivel}%` }}
          aria-label={valor == null ? "Eficiencia, fuera de turno" : `Eficiencia ${valor}%`}
          aria-pressed={enEficiencia}
          onClick={() => {
            setSalto(true);
            onVista(enEficiencia ? null : VISTA_EFICIENCIA);
          }}
          onAnimationEnd={(event) => { if (event.animationName === "burbuja-salto") setSalto(false); }}
        >
          <i className="nav-eficiencia-liquido" aria-hidden="true" />
          <span className="nav-eficiencia-valor">{valor == null ? "—" : `${valor}%`}</span>
        </button>
      ) : null}
    </>,
    document.body,
  );
}

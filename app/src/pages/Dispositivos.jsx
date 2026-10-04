import { useEffect, useRef, useState } from "react";
import { Check, Copy, Cpu, Ellipsis, Laptop, Monitor, RefreshCw, Smartphone, Tablet, X } from "lucide-react";
import { contarConectados } from "../hooks/useDispositivosOrg";
import useMedia, { MOVIL } from "../hooks/useMedia";
import "../styles/components/dispositivos.css";

const tipos = [
  ['desktop', 'Desktop', Monitor], ['movil', 'Móvil', Smartphone],
  ['tablet', 'Tablet', Tablet], ['laptop', 'Laptop', Laptop], ['iot', 'IoT', Cpu],
];
const iconoDe = (tipo) => tipos.find(([id]) => id === tipo)?.[2] || Cpu;
const relativo = (marca, ahora) => {
  const minutos = Math.max(0, Math.floor((ahora - marca) / 60000));
  if (!minutos) return 'Ahora';
  if (minutos < 60) return `Hace ${minutos} min`;
  if (minutos < 1440) return `Hace ${Math.floor(minutos / 60)} h`;
  return `Hace ${Math.floor(minutos / 1440)} días`;
};
const exacto = (marca) => new Date(marca).toLocaleString('es-PE', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});

function DetalleDispositivo({ dispositivo, ahora, volverA, onCerrar }) {
  const dialogo = useRef(null);
  const [limite, setLimite] = useState(5);
  const [copia, setCopia] = useState('');
  const Icono = iconoDe(dispositivo.tipo);
  const historial = dispositivo.historial || [];
  useEffect(() => {
    const anterior = volverA || document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const elemento = dialogo.current;
    elemento.showModal();
    return () => {
      elemento.close();
      document.body.style.overflow = overflow;
      anterior?.focus();
    };
  }, []);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(dispositivo.mac || dispositivo.id);
      setCopia('Copiado');
    } catch {
      setCopia('No se pudo copiar. Selecciona el identificador para copiarlo.');
    }
  };
  return <dialog ref={dialogo} className="device-sheet device-dialog" aria-labelledby="device-title"
    onCancel={(event) => { event.preventDefault(); onCerrar(); }}
    onClick={(event) => { if (event.target === event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onCerrar();
    } }}>
    <header>
      <div className="device-sheet-identidad"><span><Icono size={28} aria-hidden="true" />
        <i className={dispositivo.estado === 'Conectado' ? 'is-on' : 'is-off'} aria-hidden="true" /></span>
        <div><small>Usuario / dispositivo</small><strong id="device-title">{dispositivo.usuario || dispositivo.nombre}</strong></div>
      </div>
      <button className="icon-btn" type="button" aria-label="Cerrar detalle" onClick={onCerrar}><X size={18} /></button>
    </header>
    <div className="device-sheet-body">
      <p className="device-description">{dispositivo.nombre} · {dispositivo.estado}</p>
      <div className="device-last-access"><small>Último acceso</small><time dateTime={new Date(dispositivo.ultima).toISOString()}>{exacto(dispositivo.ultima)}</time></div>
      <div className="device-mac"><div><small>{dispositivo.mac ? 'MAC' : 'Identificador'}</small><strong>{dispositivo.mac || dispositivo.id}</strong></div>
        <button type="button" aria-label="Copiar identificador" onClick={copiar}>{copia === 'Copiado' ? <Check size={18} /> : <Copy size={18} />}</button>
      </div>
      <p className="device-copy-status" role="status">{copia}</p>
      <div className="device-history-head"><strong>Historial</strong><span>Últimos registros</span></div>
      <div className="device-history">{historial.slice(0, limite).map((marca) => <div key={marca}><span>{relativo(marca, ahora)}</span><time dateTime={new Date(marca).toISOString()}>{exacto(marca)}</time></div>)}</div>
      {!historial.length && <p className="device-description">Sin registros disponibles.</p>}
      {limite < historial.length && <button className="device-more" type="button" onClick={() => setLimite((valor) => valor + 5)}>Ver más</button>}
    </div>
  </dialog>;
}

// La página recibe un listado; la fuente de datos se decide fuera de la UI.
export default function Dispositivos({ dispositivos = [] }) {
  const movil = useMedia(MOVIL);
  const [filtro, setFiltro] = useState('todos');
  const origen = useRef(null);
  const [seleccion, setSeleccion] = useState(null);
  const [menu, setMenu] = useState(null);
  const [ahora, setAhora] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setAhora(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!menu) return;
    const cerrar = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'pointerdown' && event.target.closest('.device-actions')) return;
      setMenu(null);
    };
    document.addEventListener('pointerdown', cerrar);
    document.addEventListener('keydown', cerrar);
    return () => { document.removeEventListener('pointerdown', cerrar); document.removeEventListener('keydown', cerrar); };
  }, [menu]);
  const detalle = dispositivos.find((item) => item.id === seleccion);
  const visibles = dispositivos.filter((item) => filtro === 'todos' || item.tipo === filtro);
  const conectados = contarConectados(dispositivos);
  const actualizar = () => setAhora(Date.now());
  return <section className={`dispositivos-page devices-view${movil ? " is-mobile" : " is-desktop"}`} aria-label="Dispositivos">
    {demostracion && <p className="devices-demo">Datos de demostración · La presencia en tiempo real aún no está disponible.</p>}
    <div className="dispositivos-filtros">
      <div className="dispositivos-tipos" role="group" aria-label="Filtrar por tipo de dispositivo">
        <button className={`device-filter device-all ${filtro === 'todos' ? 'is-on' : ''}`} aria-pressed={filtro === 'todos'} onClick={() => setFiltro('todos')} type="button">
          <span>Todos</span><i aria-hidden="true">{dispositivos.length}</i>
        </button>
        {tipos.map(([id, nombre, Icono]) => {
          const cantidad = dispositivos.filter((item) => item.tipo === id).length;
          return <button key={id} type="button" title={`${nombre}: ${cantidad}`} aria-label={`${nombre}: ${cantidad} dispositivos`}
            aria-pressed={filtro === id} className={`device-filter ${filtro === id ? 'is-on' : ''}`} onClick={() => setFiltro(id)}>
            <Icono size={18} aria-hidden="true" /><span>{nombre}</span><i aria-hidden="true">{cantidad}</i>
          </button>;
        })}
        <span className="devices-filter-separator" aria-hidden="true" />
        <button className="icon-btn devices-refresh" type="button" aria-label="Actualizar dispositivos" title="Actualizar" onClick={actualizar}><RefreshCw size={18} /></button>
      </div>
    </div>
    {movil ? <div className="dispositivos-lista">
      {visibles.map((item) => {
        const Icono = iconoDe(item.tipo);
        return <article className="dispositivo-card device-row" key={item.id}>
          <span className="dispositivo-tipo"><Icono size={26} aria-hidden="true" /><i className={item.estado === 'Conectado' ? 'is-on' : 'is-off'} aria-hidden="true" /></span>
          <span className="device-row-text"><strong>{item.usuario || item.nombre}</strong><span>{item.nombre}</span><span>{item.mac || item.id}</span></span>
          <div className="device-actions">
            <button className="icon-btn" type="button" aria-label={`Opciones de ${item.nombre}`} onClick={(event) => { origen.current = event.currentTarget; setSeleccion(item.id); }}><Ellipsis size={20} /></button>
            <time dateTime={new Date(item.ultima).toISOString()} title={exacto(item.ultima)}>{relativo(item.ultima, ahora)}</time>
          </div>
        </article>;
      })}
      {!visibles.length && <p className="devices-empty" role="status">No hay dispositivos para este filtro.</p>}
    </div> : <div className="sheet is-small">
      <table>
        <thead><tr><th>Dispositivo</th><th>MAC / Identificador</th><th>Usuario</th><th>Estado</th></tr></thead>
        <tbody>{visibles.map((item) => {
          const Icono = iconoDe(item.tipo);
          const conectado = item.estado === 'Conectado';
          return <tr key={item.id} className={conectado ? '' : 'is-off'} tabIndex="0"
            onClick={(event) => { origen.current = event.currentTarget; setSeleccion(item.id); }}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); origen.current = event.currentTarget; setSeleccion(item.id); } }}>
            <td><span className="estado-fila"><Icono size={18} aria-hidden="true" />{item.nombre}</span></td>
            <td className="col-correo">{item.mac || item.id}</td>
            <td>{item.usuario || '—'}</td>
            <td><span className="estado-fila">{item.estado}<i className={`estado-punto ${conectado ? 'is-connected' : 'is-disconnected'}`} aria-hidden="true" /></span></td>
          </tr>;
        })}</tbody>
      </table>
      {!visibles.length && <p className="devices-empty" role="status">No hay dispositivos para este filtro.</p>}
    </div>}
    <footer className="devices-footer"><span><strong>{conectados}</strong> dispositivos conectados</span></footer>
    {detalle && <DetalleDispositivo key={detalle.id} dispositivo={detalle} ahora={ahora} volverA={origen.current} onCerrar={() => setSeleccion(null)} />}
  </section>;
}

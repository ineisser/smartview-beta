import { useMemo, useState } from "react";
import { Check, Copy, Cpu, Ellipsis, Laptop, Monitor, RefreshCw, Smartphone, Tablet, X } from "lucide-react";
import useMedia, { MOVIL } from "../hooks/useMedia";

const base = [
  { id: 1, tipo: "movil", nombre: "Este dispositivo", mac: "A4:7B:9D:21:4F:10", usuario: "", estado: "Conectado", ultima: Date.now() - 8 * 60000 },
  { id: 2, tipo: "tablet", nombre: "Tablet Planta", mac: "7C:2A:31:88:B0:42", usuario: "Jefe de planta", estado: "Conectado", ultima: Date.now() - 36 * 60000 },
  { id: 3, tipo: "laptop", nombre: "Laptop Administración", mac: "18:65:90:3C:77:AD", usuario: "Administrador", estado: "Conectado", ultima: Date.now() - 3 * 3600000 },
  { id: 4, tipo: "pc", nombre: "PC Sala de Control", mac: "D0:11:E5:62:09:BC", usuario: "Owner", estado: "Desconectado", ultima: Date.now() - 36 * 86400000 },
  { id: 5, tipo: "iot", nombre: "ESP32 Telar 01", mac: "24:6F:28:AA:10:01", usuario: "Sistema", estado: "Conectado", ultima: Date.now() - 180 * 86400000 },
];
const iconos = { movil: Smartphone, tablet: Tablet, laptop: Laptop, pc: Monitor, iot: Cpu };
const filtros = [["todos", Monitor], ["movil", Smartphone], ["tablet", Tablet], ["computador", Laptop], ["iot", Cpu]];
const tipoFiltro = (tipo) => ["laptop", "pc"].includes(tipo) ? "computador" : tipo;
const relativo = (marca) => {
  const min = Math.max(0, Math.floor((Date.now() - marca) / 60000));
  if (min < 60) return `${min} min`;
  if (min < 1440) return `${Math.floor(min / 60)} h`;
  return `${Math.floor(min / 1440)} días`;
};
const exacto = (marca) => {
  const fecha = new Date(marca), hoy = new Date(), ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  const misma = (a,b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  const hora = fecha.toLocaleTimeString("es-PE", { hour:"2-digit", minute:"2-digit", hour12:false });
  if (misma(fecha,hoy)) return `Hoy · ${hora}`;
  if (misma(fecha,ayer)) return `Ayer · ${hora}`;
  const dias = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  if ((hoy-fecha) < 7*86400000) return `${dias[fecha.getDay()]} · ${hora}`;
  return `${fecha.getDate()} ${fecha.toLocaleDateString("es-PE",{month:"long"})} · ${hora}`;
};

export const dispositivosConectados = () => base.filter((item) => item.estado === "Conectado").length;

export default function Dispositivos({ usuarioActual = "Usuario" }) {
  const movil = useMedia(MOVIL);
  const [filtro,setFiltro] = useState("todos");
  const [detalle,setDetalle] = useState(null);
  const [copiado,setCopiado] = useState(false);
  const [limite,setLimite] = useState(5);
  const [girando,setGirando] = useState(false);
  const dispositivos = useMemo(() => base.map((item) => item.id === 1 ? {...item, usuario: usuarioActual} : item), [usuarioActual]);
  const conectados = dispositivos.filter((item)=>item.estado==="Conectado").length;
  const visibles = filtro === "todos" ? dispositivos : dispositivos.filter((item)=>tipoFiltro(item.tipo)===filtro);
  const actualizar = () => { setGirando(true); window.setTimeout(()=>setGirando(false),500); };
  const copiar = async (mac) => {
    try { await navigator.clipboard.writeText(mac); } catch { /* navegador sin clipboard */ }
    setCopiado(true); window.setTimeout(()=>setCopiado(false),1200);
  };
  const historial = detalle ? Array.from({length:45},(_,i)=>detalle.ultima - i * (i+2) * 60000) : [];

  if (movil) return (
    <section className="dispositivos-movil">
      <div className="dispositivos-filtros">
        <strong>{conectados} conectados</strong>
        <div className="dispositivos-tipos">
          {filtros.map(([id,Icon]) => {
            const cuenta = id==="todos" ? conectados : dispositivos.filter((d)=>d.estado==="Conectado" && tipoFiltro(d.tipo)===id).length;
            return <button key={id} type="button" className={filtro===id?"is-on":""} aria-label={id==="todos"?"Todos":id} onClick={()=>setFiltro(id)}><Icon size={18}/>{cuenta ? <i>{cuenta}</i>:null}</button>;
          })}
        </div>
        <button className={`icon-btn${girando?" is-spin":""}`} type="button" aria-label="Actualizar dispositivos" onClick={actualizar}><RefreshCw size={18}/></button>
      </div>
      <div className="dispositivos-lista">
        {visibles.map((item)=>{
          const Icon=iconos[item.tipo]||Cpu, conectado=item.estado==="Conectado";
          return <article className="dispositivo-card" key={item.id}>
            <div className="dispositivo-tipo"><Icon size={26}/><i className={conectado?"is-on":"is-off"}/></div>
            <div className="dispositivo-datos">
              <strong>{item.usuario}{item.id===1 ? <em>Este dispositivo</em>:null}</strong>
              <button type="button" aria-label="Ver detalle" onClick={()=>{setDetalle(item);setLimite(5);}}><Ellipsis size={20}/></button>
              <span>{item.mac}</span><time>{relativo(item.ultima)}</time>
            </div>
          </article>;
        })}
      </div>
      {detalle ? <div className="device-sheet-layer" onClick={(e)=>{if(e.target===e.currentTarget)setDetalle(null);}}>
        <section className="device-sheet" role="dialog" aria-modal="true">
          <header>
            <div className="device-sheet-identidad">{(()=>{const Icon=iconos[detalle.tipo]||Cpu;return <span><Icon size={28}/><i className={detalle.estado==="Conectado"?"is-on":"is-off"}/></span>})()}<div><small>Usuario</small><strong>{detalle.usuario}</strong></div></div>
            <div className="device-sheet-acceso"><small>Último acceso</small><strong>{exacto(detalle.ultima)}</strong></div>
            <button className="icon-btn" type="button" aria-label="Cerrar" onClick={()=>setDetalle(null)}><X size={18}/></button>
          </header>
          <div className="device-sheet-body">
            <div className="device-mac"><div><small>MAC</small><strong>{detalle.mac}</strong></div><button className={copiado?"is-copiado":""} type="button" onClick={()=>copiar(detalle.mac)}>{copiado?<Check size={18}/>:<Copy size={18}/>}</button></div>
            <hr className="linea-moderna"/>
            <div className="device-history-head"><strong>Historial</strong><span>Últimos registros</span></div>
            <div className="device-history">{historial.slice(0,limite).map((marca,i)=><div key={marca}><span>Hace {relativo(marca)}</span><time>{exacto(marca)}</time></div>)}</div>
            {limite<historial.length?<button className="device-more" type="button" onClick={()=>setLimite((n)=>Math.min(n+20,historial.length))}>Ver más</button>:null}
          </div>
        </section>
      </div>:null}
    </section>
  );

  return (
    <section className="config-section dispositivos-page">
      <div className="config-section-head"><h2>Dispositivos</h2><span className="section-count">{conectados}</span></div>
      <div className="sheet is-small"><table><thead><tr><th>Dispositivo</th><th>MAC</th><th>Usuario</th><th>Estado</th></tr></thead>
        <tbody>{dispositivos.map((item)=>{const Icon=iconos[item.tipo]||Cpu, conectado=item.estado==="Conectado";return <tr key={item.id} className={conectado?"":"is-off"}>
          <td><span className="estado-fila"><Icon size={18}/>{item.nombre}{item.id===1?<em className="este-dispositivo">Este dispositivo</em>:null}</span></td>
          <td className="col-correo">{item.mac}</td><td>{item.usuario}</td>
          <td><span className="estado-fila">{item.estado}<i className={`estado-punto ${conectado?"is-connected":"is-disconnected"}`} aria-hidden="true"/></span></td>
        </tr>})}</tbody></table></div>
    </section>
  );
}

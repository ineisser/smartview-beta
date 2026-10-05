import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CircleCheck, Timer, RefreshCw, ArrowDownUp } from 'lucide-react';
import TabSwitch from '../components/TabSwitch';
import AnalysisTable from '../components/AnalysisTable';
import FloatingSelect from '../components/FloatingSelect';
import TablePagination from '../components/TablePagination';
import DateRangeCalendar from '../components/DateRangeCalendar';
import Tooltip from '../components/Tooltip';
import useHistorialPagina from '../hooks/useHistorialPagina';
import AnalysisDashboard, { duracionAnalisis as duracion, porcentajeAnalisis as porcentaje } from '../components/AnalysisDashboard';
import { cerrado, inicio, fin, motivo, numero, letraTurno, fechasPeriodo, limitesPeriodo, fechaLocal, ordenarFilas } from '../data/analisis';
import '../styles/components/analisis.css';

const VISTAS=[{id:'dashboard',label:'Dashboard'},{id:'maquinas',label:'Máquinas'},{id:'motivos',label:'Motivos'},{id:'historial',label:'Historial'}];
const PERIODOS=[{id:'hoy',label:'Hoy'},{id:'ayer',label:'Ayer'},{id:'semana',label:'Semana'},{id:'semanaAnterior',label:'Semana anterior'},{id:'mes',label:'Mes'},{id:'mesAnterior',label:'Mes anterior'},{id:'personalizado',label:'Personalizado'}];
const ORDENES={historial:{columna:'fecha',direccion:'desc'},maquinas:{columna:'paros',direccion:'desc'},motivos:{columna:'paros',direccion:'desc'}};
const fecha=n=>n?new Date(n).toLocaleDateString('es-PE'):'—';
const hora=n=>n?new Date(n).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit',hour12:false}):'—';
const fechaPeriodo=(value,larga=false)=>{const d=new Date(`${value}T00:00:00`);if(larga)return d.toLocaleDateString('es-PE',{day:'numeric',month:'long'});const mes=d.toLocaleDateString('es-PE',{month:'short'}).replace('.','').slice(0,3);return `${String(d.getDate()).padStart(2,'0')} ${mes.charAt(0).toUpperCase()+mes.slice(1)}`;};
function Selector({label,value,onChange,opciones,limpiar}) {const todas={Salas:'Todas las salas',Máquinas:'Todas las máquinas',Motivos:'Todos los motivos'};return <FloatingSelect label={label} value={value} onChange={onChange} opciones={[{value:'',label:todas[label]||label,triggerLabel:label},...opciones]} onClear={limpiar}/>;}
function DetalleParo({item,salas,ahora,onCerrar}) {
  const dialog=useRef(null);
  useEffect(()=>{const el=dialog.current,previo=document.activeElement;el.showModal();return()=>{el.close();previo?.focus();};},[]);
  const campos=[['Sala',salas.find(s=>s.codigo===item.sala)?.nombre||item.sala],['Máquina',numero(item.machine||item.maquina)],['Inicio',`${fecha(inicio(item))} ${hora(inicio(item))}`],['Término',cerrado(item)?`${fecha(fin(item,ahora))} ${hora(fin(item,ahora))}`:'Pendiente'],['Turno',letraTurno(item,salas)],['Motivo',motivo(item)],['Duración total',duracion(fin(item,ahora)-inicio(item))],['Estado',cerrado(item)?'Atendido':'Detenido'],['Detuvo',item.autorNombre||item.autor||'—'],['Reinició',item.arranqueNombre||item.arranqueAutor||'—'],['Comentario',item.comentario||item.comment||'—']];
  return <dialog ref={dialog} className="analysis-detail-panel" aria-labelledby="analysis-detail-title" onCancel={e=>{e.preventDefault();onCerrar();}}><header><h2 id="analysis-detail-title">Detalle del paro</h2><button type="button" className="icon-btn" aria-label="Cerrar detalle" onClick={onCerrar}><X size={20}/></button></header><dl>{campos.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></dialog>;
}
export default function Analisis({salas=[],planta,org,vista='dashboard',onVista:setVista,navbar}) {
  const [salaSeleccionada,setSala]=useState(''),[maquina,setMaquina]=useState(''),[razon,setRazon]=useState(''),[estado,setEstado]=useState('');
  const [periodo,setPeriodo]=useState('hoy'),[personalizado,setPersonalizado]=useState(()=>fechasPeriodo('hoy'));
  const [ahora,setAhora]=useState(Date.now),[detalle,setDetalle]=useState(null),[ordenes,setOrdenes]=useState(ORDENES);
  const [anchos,setAnchos]=useState({historial:{},maquinas:{},motivos:{}}),[offset,setOffset]=useState(0),[revision,setRevision]=useState(0);
  const sala=salas.length===1?salas[0].codigo:(salas.some(s=>s.codigo===salaSeleccionada)?salaSeleccionada:'');
  const mostrarSala=salas.length>1&&!sala;
  useEffect(()=>{if(!mostrarSala)setOrdenes(prev=>Object.values(prev).some(o=>o.columna==='sala')?Object.fromEntries(Object.entries(prev).map(([k,o])=>[k,o.columna==='sala'?ORDENES[k]:o])):prev);},[mostrarSala]);
  useEffect(()=>{const timer=setInterval(()=>setAhora(Date.now()),30000);return()=>clearInterval(timer);},[]);
  const fechas=periodo==='personalizado'?personalizado:fechasPeriodo(periodo,ahora);
  const {desde:a,hasta:b,invalido}=limitesPeriodo(fechas.desde,fechas.hasta,ahora);
  useEffect(()=>setOffset(0),[vista,sala,maquina,razon,estado,fechas.desde,fechas.hasta,ordenes]);
  const remoto=useHistorialPagina({activo:!invalido,org,desde:a,hasta:+new Date(`${fechas.hasta}T00:00:00`)+86400000,sala,maquina,razon,estado,orden:ordenes[vista]||ORDENES.historial,offset:vista==='historial'?offset:0,vista,periodo,revision});
  const {datos,grafica,cargando:procesando,error:fallo}=remoto;
  const opcionesMaquinas=useMemo(()=>{
    const marcas=new Map();
    for(const s of salas.filter(s=>!sala||s.codigo===sala))for(const [i,m] of (s.maquinas||[]).entries()){
      const n=numero(m.numero||i+1),marca=String(m.marca||'').trim();
      if(!marcas.has(n))marcas.set(n,new Set());
      if(marca)marcas.get(n).add(marca);
    }
    return [...marcas].sort(([a],[b])=>a.localeCompare(b,'es',{numeric:true})).map(([n,lista])=>({value:n,label:[n,[...lista].join(' / ')].filter(Boolean).join(' ')}));
  },[salas,sala]);
  const razones=useMemo(()=>[...new Set([...salas.filter(s=>!sala||s.codigo===sala).flatMap(s=>(s.motivos||[]).map(m=>m.nombre).filter(Boolean)),...(datos?.motivos||[]).map(x=>x.key)])].sort((x,y)=>x.localeCompare(y,'es')),[salas,sala,datos]);
  const columnas=useMemo(()=>{
    const tiempo={asc:'Menor tiempo',desc:'Mayor tiempo'},cantidad={asc:'Menos frecuente',desc:'Más frecuente'};
    const salaCol={id:'sala',label:'Sala',valor:x=>vista==='maquinas'?x.sala:salas.find(s=>s.codigo===x.sala)?.nombre||x.sala,ancho:160};
    const machineCol={id:'maquina',label:'Máquina',valor:x=>numero(x.machine||x.maquina),ancho:110,orden:{asc:'Máquina',desc:'Máquina ↓'}};
    let cols;
    if(vista==='maquinas')cols=[salaCol,machineCol,{id:'paros',label:'Paros',valor:x=>x.paros,ancho:110,orden:cantidad},{id:'duracion',label:'Tiempo parado',valor:x=>x.duracion,render:x=>duracion(x.duracion),ancho:180,orden:tiempo},{id:'disponibilidad',label:'Disponibilidad (%)',valor:x=>x.disponibilidad,render:x=>porcentaje(x.disponibilidad),ancho:190,orden:{asc:'Menor disponibilidad',desc:'Mayor disponibilidad'}}];
    else if(vista==='motivos')cols=[{id:'motivo',label:'Motivo',valor:x=>x.key,ancho:270,orden:{asc:'Motivo A–Z',desc:'Motivo Z–A'}},{id:'paros',label:'Paros',valor:x=>x.paros,ancho:120,orden:cantidad},{id:'duracion',label:'Tiempo parado',valor:x=>x.duracion,render:x=>duracion(x.duracion),ancho:180,orden:tiempo},{id:'perdida',label:'Pérdida (pp)',tip:'Pérdida de disponibilidad en puntos porcentuales',valor:x=>x.perdida,render:x=>porcentaje(x.perdida),ancho:160,orden:{asc:'Menor PP',desc:'Mayor PP'}}];
    else cols=[salaCol,machineCol,{id:'fecha',label:'Fecha',valor:inicio,render:x=>fecha(inicio(x)),ancho:140,orden:{asc:'Más antiguos',desc:'Más recientes'}},{id:'turno',label:'Turno',valor:x=>letraTurno(x,salas),ancho:90},{id:'motivo',label:'Motivo',valor:motivo,render:x=><span className={`analysis-reason${cerrado(x)?'':' is-stopped'}`}>{motivo(x)}</span>,ancho:220},{id:'inicio',label:'Inicio',valor:inicio,render:x=>hora(inicio(x)),ancho:110},{id:'fin',label:'Término',valor:x=>cerrado(x)?fin(x,ahora):null,render:x=>cerrado(x)?hora(fin(x,ahora)):'—',titulo:x=>cerrado(x)?fecha(fin(x,ahora)):undefined,ancho:110},{id:'duracion',label:'Duración',valor:x=>Math.max(0,Math.min(fin(x,ahora),b)-Math.max(inicio(x),a)),render:x=><span className="analysis-duration">{!cerrado(x)&&<Timer size={14} aria-label="Paro en curso"/>}{duracion(Math.min(fin(x,ahora),b)-Math.max(inicio(x),a))}</span>,tip:'Duración del paro dentro del período seleccionado',ancho:160,orden:tiempo},{id:'estado',label:'Estado',valor:x=>cerrado(x)?'Atendido':'Detenido',clase:x=>cerrado(x)?'analysis-attended':'historial-celda-detenido',render:x=><span className="analysis-duration">{cerrado(x)&&<CircleCheck size={14} aria-hidden="true"/>}{cerrado(x)?'Atendido':'Detenido'}</span>,ancho:140}];
    return cols.filter(c=>c.id!=='sala'||mostrarSala);
  },[vista,salas,mostrarSala,ahora,a,b]);
  const elegirPeriodo=value=>{if(value==='personalizado')setPersonalizado(fechas);setPeriodo(value);};
  const cambiarFecha=(campo,value)=>{setPersonalizado(prev=>{const actual=periodo==='personalizado'?prev:fechas;return {...actual,[campo]:value,...(campo==='desde'&&value>actual.hasta?{hasta:value}:campo==='hasta'&&value<actual.desde?{desde:value}:{})};});setPeriodo('personalizado');};
  const filas=vista==='historial'?remoto.filas:vista==='maquinas'?datos?.maquinas||[]:datos?.motivos||[];
  const ordenadas=vista==='dashboard'||vista==='historial'?filas:ordenarFilas(filas,columnas,ordenes[vista]);
  const bloque=vista==='historial'?filas:ordenadas.slice(offset,offset+100);
  const opcionesOrden=columnas.flatMap(c=>['asc','desc'].map(d=>({value:`${c.id}:${d}`,label:c.orden?.[d]||`${c.label} ${d==='asc'?'↑':'↓'}`})));
  const opcionesPeriodo=PERIODOS.map(p=>{const f=p.id==='personalizado'?personalizado:fechasPeriodo(p.id,ahora);const descripcion=['hoy','ayer'].includes(p.id)?fechaPeriodo(f.desde,true):`${fechaPeriodo(f.desde)} – ${fechaPeriodo(f.hasta)}`;return {value:p.id,keepOpen:p.id==='personalizado',triggerLabel:p.id==='personalizado'?<span className="analysis-period-label"><span>Período del</span><small>{descripcion}</small></span>:undefined,label:<span className="analysis-period-label"><span>{p.label}</span><small>{descripcion}</small></span>};});
  const total=vista==='historial'?remoto.total:filas.length,paginaOffset=vista==='historial'?remoto.offset:offset;
  const rango=`${total?paginaOffset+1:0}–${Math.min(paginaOffset+100,total)} de ${total.toLocaleString('es-PE')} registros`;
  const tabs=<TabSwitch items={VISTAS} value={vista} onChange={setVista} size="small"/>;
  return <section className="analysis-page config-section" aria-label="Análisis">
    {navbar?createPortal(tabs,navbar):<div className="analysis-view-bar">{tabs}</div>}
    <div className="analysis-controls analysis-fixed-filters"><div className="analysis-filter-left">
      {salas.length===1?<span className="analysis-single-room" aria-label="Sala">{salas[0].nombre}</span>:<Selector label="Salas" value={sala} onChange={setSala} limpiar={()=>setSala('')} opciones={salas.map(s=>({value:s.codigo,label:s.nombre}))}/>}
      <FloatingSelect label="Período" value={periodo} onChange={elegirPeriodo} opciones={opcionesPeriodo} width={periodo==='personalizado'?660:380} panelDirecto={periodo==='personalizado'}>{periodo==='personalizado'&&<DateRangeCalendar desde={fechas.desde} hasta={fechas.hasta} max={fechaLocal(ahora)} onChange={cambiarFecha}/>}</FloatingSelect>
      <Selector label="Máquinas" value={maquina} onChange={setMaquina} limpiar={()=>setMaquina('')} opciones={[...opcionesMaquinas,...(maquina&&!opcionesMaquinas.some(m=>m.value===maquina)?[{value:maquina,label:maquina}]:[])]}/>
      <Selector label="Motivos" value={razon} onChange={setRazon} limpiar={()=>setRazon('')} opciones={[...new Set([...razones,...(razon?[razon]:[])])].map(n=>({value:n,label:n}))}/>
    </div><div className="analysis-filter-right">{vista!=='dashboard'&&<FloatingSelect label="Orden" icon={ArrowDownUp} value={`${ordenes[vista].columna}:${ordenes[vista].direccion}`} opciones={opcionesOrden} onChange={value=>{const [columna,direccion]=value.split(':');setOrdenes(prev=>({...prev,[vista]:{columna,direccion}}));}}/>}</div></div>
    <div className="analysis-status-row">
      {vista==='historial'&&<Selector label="Estado" value={estado} onChange={setEstado} limpiar={()=>setEstado('')} opciones={[{value:'detenido',label:'Detenido'},{value:'atendido',label:'Atendido'}]}/>}
      <div className="analysis-pagination-right">{vista!=='dashboard'&&<TablePagination total={total} offset={paginaOffset} onOffset={setOffset} cargando={procesando}/>}<Tooltip label="Actualizar"><button className="icon-btn analysis-refresh" type="button" aria-label="Actualizar" disabled={procesando} onClick={()=>setRevision(v=>v+1)}><RefreshCw size={16} className={procesando?'analysis-spinning':''}/></button></Tooltip></div>
    </div>
    {invalido?<p role="alert">Elige fechas válidas: el inicio debe ser anterior o igual al término.</p>:vista==='dashboard'?<div className="analysis-dashboard-scroll">{procesando?<div className="analysis-dashboard-placeholder" role="status">Procesando datos…</div>:fallo?<p role="alert">{fallo}</p>:datos&&grafica?<AnalysisDashboard datos={datos} evolucion={grafica} salas={salas} planta={planta} sala={sala} onVista={setVista}/>:null}</div>:<AnalysisTable key={vista} titulo={VISTAS.find(v=>v.id===vista).label} columnas={columnas} filas={bloque} cargando={procesando} error={fallo} orden={ordenes[vista]} onOrden={o=>setOrdenes(prev=>({...prev,[vista]:o}))} anchos={anchos[vista]} onAnchos={update=>setAnchos(prev=>({...prev,[vista]:update(prev[vista])}))} onFila={vista==='historial'?setDetalle:undefined} rowKey={x=>x.key||`${x.sala}:${x.id}:${x.machine||x.maquina}:${inicio(x)}`}/>}
    <footer className="analysis-footer" aria-label="Resumen de la vista"><span>{procesando?'Procesando…':fallo?'Datos no disponibles':vista==='dashboard'?`${datos?.resumen.paros||0} registros`:rango}</span>{!procesando&&!fallo&&<><span>Total de paros <strong>{(remoto.totales?.paros||0).toLocaleString('es-PE')}</strong></span><span>Tiempo parado <strong>{duracion(remoto.totales?.tiempoParado||0)}</strong></span></>}</footer>
    {detalle&&<DetalleParo item={remoto.filas.find(x=>x.id===detalle.id&&x.sala===detalle.sala)||detalle} salas={salas} ahora={ahora} onCerrar={()=>setDetalle(null)}/>}
  </section>;
}

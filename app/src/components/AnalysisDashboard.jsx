import { ArrowUpRight } from 'lucide-react';
import { umbralDe } from '../turno';
import { turnosDe, turnoEnCurso, inicioDeTurno } from '../turno';
import { RelojTurno } from './EficienciaPanel';
export const duracionAnalisis = ms => {
  const minutos=Math.floor(Math.max(0,ms||0)/60000);
  return `${Math.floor(minutos/60)} h ${minutos%60} min`;
};
export const porcentajeAnalisis = n => n==null?'—':n.toLocaleString('es-PE',{maximumFractionDigits:1});

function Ranking({titulo,filas,etiqueta,onVer}) {
  const maximo=Math.max(1,...filas.map(x=>x.paros));
  return <article className="analysis-card analysis-ranking">
    <header><h2>{titulo}</h2><button type="button" className="icon-btn" aria-label={`Ver tabla de ${titulo.toLowerCase()}`} onClick={onVer}><ArrowUpRight size={18} /></button></header>
    {filas.length?<ol>{filas.map(x=><li key={x.key}>
      <div className="analysis-ranking-label"><span title={etiqueta(x)}>{etiqueta(x)}</span><strong>{x.paros} <small>{x.paros===1?'paro':'paros'}</small></strong></div>
      <div className="analysis-ranking-track" aria-hidden="true"><i style={{width:`${x.paros/maximo*100}%`}} /></div>
    </li>)}</ol>:<p className="analysis-empty">Sin paros en el período seleccionado.</p>}
  </article>;
}
export default function AnalysisDashboard({datos,evolucion,salas,planta,sala,onVista,turno='',periodo,mostrarGrupos=false,onGrupo,ahora=Date.now()}) {
  const {resumen}=datos;
  const umbral=umbralDe(salas.find(s=>s.codigo===sala),planta);
  const alerta=resumen.disponibilidad!=null&&resumen.disponibilidad<umbral;
  const motivos=[...datos.motivos].sort((a,b)=>b.paros-a.paros||b.duracion-a.duracion).slice(0,5);
  const maquinas=datos.maquinas.filter(x=>x.paros>0).sort((a,b)=>b.paros-a.paros||b.duracion-a.duracion).slice(0,5);
  const titulo=evolucion.tipo==='turnos'?'Disponibilidad por turno':evolucion.tipo==='semanas'?'Disponibilidad por semana':'Disponibilidad por día';
  const room=salas.find(s=>s.codigo===sala),agenda=turnosDe(room?.turnos),seleccion=agenda.find(t=>t.letra===turno),actual=turnoEnCurso(agenda,new Date(ahora));
  const enCurso=periodo==='hoy'&&seleccion&&actual?.letra===turno;
  const inicioSeleccion=seleccion?+inicioDeTurno(seleccion,new Date(ahora)):0;
  return <div className="analysis-dashboard">
    <article className={`analysis-card analysis-summary${alerta?' is-alert':''}`}>
      <header><h2>Resumen del período</h2></header>
      <dl className="analysis-summary-values">
        <div><dt>Paros</dt><dd>{resumen.paros.toLocaleString('es-PE')}</dd></div>
        <div><dt>Tiempo operativo</dt><dd>{duracionAnalisis(resumen.operativo)}</dd></div>
        <div><dt>Tiempo perdido</dt><dd>{duracionAnalisis(resumen.perdido)}</dd></div>
        <div><dt>Pérdida</dt><dd>{porcentajeAnalisis(resumen.perdida)}<small>{resumen.perdida==null?'':' %'}</small></dd></div>
      </dl>
      <div className="analysis-availability-label"><span>Disponibilidad</span><strong>{porcentajeAnalisis(resumen.disponibilidad)}{resumen.disponibilidad==null?'':' %'}</strong></div>
      <div className="analysis-availability-track" role={resumen.disponibilidad==null?undefined:'meter'} aria-label="Disponibilidad del período" aria-valuenow={resumen.disponibilidad??undefined} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${resumen.disponibilidad??0}%`}} /></div>
      <p className="analysis-note">Tiempo acumulado de las máquinas dentro de su horario programado.</p>
    </article>
    <article className="analysis-card analysis-evolution">
      <header><h2>{titulo}</h2><span className="analysis-note">{evolucion.tipo==='turnos'?evolucion.grupos.map(g=>g.label).join(' · '):evolucion.tipo==='semanas'?'Inicio de semana · DD-MM':'Días del período'}</span></header>
      <div className={`analysis-chart-layout${evolucion.tipo==='turnos'?' has-legend':''}`}>
        <div className="analysis-chart-scroll" tabIndex="0" role="region" aria-label={titulo}>
          <div className="analysis-chart" style={{gridTemplateColumns:`repeat(${evolucion.grupos.length},minmax(${evolucion.grupos.length>3?32:42}px,1fr))`}}>
            {evolucion.grupos.map(g=>{
              const falta=g.disponibilidad==null;
              const baja=!falta&&g.disponibilidad<umbral;
              const descripcion=`${g.label}: ${falta?'sin tiempo programado transcurrido':`${porcentajeAnalisis(g.disponibilidad)} % de disponibilidad; ${duracionAnalisis(g.perdido)} de tiempo perdido`}`;
              return <div key={`${g.desde}:${g.label}`} className={`analysis-chart-column${baja?' is-alert':''}${falta?' is-empty':''}`}>
                <div className="analysis-chart-bar-area" tabIndex="0" role="img" aria-label={descripcion} title={descripcion}>
                  <div className="analysis-chart-bar" style={{height:`${g.disponibilidad??0}%`}} />
                  <strong className="analysis-chart-value" style={{bottom:`${g.disponibilidad??0}%`}}>{porcentajeAnalisis(g.disponibilidad)}{falta?'':<small>%</small>}</strong>
                </div>
                <span className="analysis-chart-label">{g.label}</span>
              </div>;
            })}
          </div>
        </div>
        {evolucion.tipo==='turnos'&&<dl className="analysis-shift-legend"><dt>Tiempo perdido</dt>{evolucion.grupos.map(g=><div key={g.label}><dt><i className={g.disponibilidad!=null&&g.disponibilidad<umbral?'is-alert':''} aria-hidden="true" />{g.label}</dt><dd>{g.disponibilidad==null?'—':duracionAnalisis(g.perdido)}</dd></div>)}</dl>}
      </div>
      <p className="analysis-note">{evolucion.tipo==='semanas'?'Incluye las semanas parciales del período. ':''}Los intervalos en curso usan el tiempo transcurrido; — indica que aún no hay base programada.</p>
    </article>
    <Ranking titulo="Motivos más frecuentes" filas={motivos} etiqueta={x=>x.key} onVer={()=>onVista('motivos')} />
    <Ranking titulo="Máquinas con más paros" filas={maquinas} etiqueta={x=>`${x.sala} · ${x.maquina}`} onVer={()=>onVista('maquinas')} />
    {mostrarGrupos&&<article className="analysis-card analysis-ranking"><header><h2>Análisis por grupo</h2></header><ol>{(datos.grupos||[]).map(g=><li key={g.key}><button type="button" className="analysis-group-hit" onClick={()=>onGrupo(g.value)}><span>{g.label}</span><strong>{g.paros} <small>paros</small></strong><span>Disponibilidad <strong>{porcentajeAnalisis(g.disponibilidad)}{g.disponibilidad!=null&&<small> %</small>}</strong></span></button><div className="analysis-ranking-track" aria-hidden="true"><i style={{width:`${g.paros/Math.max(1,...datos.grupos.map(x=>x.paros))*100}%`}}/></div></li>)}</ol></article>}
    {periodo==='hoy'&&seleccion&&<article className="analysis-card analysis-selected-shift"><header><h2>Turno seleccionado</h2></header><strong className="analysis-shift-letter">{turno}</strong><p>{room.nombre} · {Math.floor(seleccion.inicio/60).toString().padStart(2,'0')}:{String(seleccion.inicio%60).padStart(2,'0')} – {Math.floor(seleccion.fin/60).toString().padStart(2,'0')}:{String(seleccion.fin%60).padStart(2,'0')}</p><p className="analysis-note">{enCurso?`En curso · ${duracionAnalisis(ahora-inicioSeleccion)} transcurridos`:new Date(ahora).getHours()*60+new Date(ahora).getMinutes()<seleccion.inicio?'Pendiente de inicio':'Finalizado'}</p></article>}
    {enCurso&&<RelojTurno turnos={room.turnos} buena={!alerta} className="analysis-card analysis-shift-clock" titulo="Avance del turno" descripcion={`Tiempo restante del turno ${turno} en ${room.nombre}.`}/>}
  </div>;
}

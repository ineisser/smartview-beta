import { ArrowUpRight } from 'lucide-react';
import { umbralDe } from '../turno';
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
export default function AnalysisDashboard({datos,evolucion,salas,planta,sala,onVista}) {
  const {resumen}=datos;
  const umbral=umbralDe(salas.find(s=>s.codigo===sala),planta);
  const alerta=resumen.disponibilidad!=null&&resumen.disponibilidad<umbral;
  const motivos=[...datos.motivos].sort((a,b)=>b.paros-a.paros||b.duracion-a.duracion).slice(0,5);
  const maquinas=datos.maquinas.filter(x=>x.paros>0).sort((a,b)=>b.paros-a.paros||b.duracion-a.duracion).slice(0,5);
  const titulo=evolucion.tipo==='turnos'?'Disponibilidad por turno':evolucion.tipo==='semanas'?'Disponibilidad por semana':'Disponibilidad por día';
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
      <header><h2>{titulo}</h2><span className="analysis-note">{evolucion.tipo==='turnos'?'A · B · C':evolucion.tipo==='semanas'?'Inicio de semana · DD-MM':'Días del período'}</span></header>
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
  </div>;
}

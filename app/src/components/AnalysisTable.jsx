import { MoveDown, MoveUp, ArrowDownUp } from 'lucide-react';

/** Tabla compartida: orden numérico antes de paginar y ancho por columna. */
export default function AnalysisTable({ columnas, filas, orden, onOrden, onFila, rowKey, titulo, anchos, onAnchos, cargando=false, error=null }) {
  const setAnchos=onAnchos;
  const ordenar=onOrden;
  const total=columnas.reduce((n,c)=>n+(anchos[c.id]||c.ancho||140),0);
  function comenzar(e,c) {
    if (e.button!==0) return;
    e.preventDefault();e.stopPropagation();
    const ancho=e.currentTarget.parentElement.getBoundingClientRect().width;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.dataset.inicio=String(e.clientX);
    e.currentTarget.dataset.ancho=String(ancho);
  }
  function mover(e,c) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const ancho=Number(e.currentTarget.dataset.ancho)+e.clientX-Number(e.currentTarget.dataset.inicio);
    setAnchos(prev=>({...prev,[c.id]:Math.max(c.minimo||88,Math.round(ancho))}));
  }
  return <>
    <div className="sheet is-small analysis-table" tabIndex="0" role="region" aria-label={`Tabla ${titulo}`} aria-busy={cargando}>
      <table style={{width:total,minWidth:'100%'}}>
        <colgroup>{columnas.map(c=><col key={c.id} style={{width:anchos[c.id]||c.ancho||140}} />)}</colgroup>
        <thead><tr>{columnas.map(c=>{
          const activa=orden.columna===c.id;
          const Icon=activa?(orden.direccion==='asc'?MoveUp:MoveDown):ArrowDownUp;
          return <th key={c.id} scope="col" aria-sort={activa?(orden.direccion==='asc'?'ascending':'descending'):'none'} title={c.tip}>
            <button type="button" className="analysis-column-sort btn-slide" onClick={()=>ordenar({columna:c.id,direccion:activa&&orden.direccion==='asc'?'desc':'asc'})} aria-label={`Ordenar por ${c.label}`}><span>{c.label}</span><Icon size={14} aria-hidden="true" /></button>
            <span role="separator" tabIndex="0" aria-orientation="vertical" aria-label={`Ancho de ${c.label}`} aria-valuenow={anchos[c.id]||c.ancho||140} aria-valuemin={c.minimo||88} className="analysis-column-resize" onPointerDown={e=>comenzar(e,c)} onPointerMove={e=>mover(e,c)} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onKeyDown={e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();setAnchos(prev=>({...prev,[c.id]:Math.max(c.minimo||88,(prev[c.id]||c.ancho||140)+(e.key==='ArrowRight'?16:-16))}));}}} />
          </th>;
        })}</tr></thead>
        <tbody>{cargando&&Array.from({length:12},(_,i)=><tr key={`skeleton-${i}`} aria-hidden="true">{columnas.map((c,j)=><td key={c.id}><span className="analysis-skeleton" style={{width:`${50+(i+j)%4*10}%`}} /></td>)}</tr>)}{!cargando&&!error&&filas.map(x=><tr key={rowKey(x)} tabIndex={onFila?0:undefined} aria-label={onFila?`Detalle del paro de máquina ${x.machine||x.maquina}`:undefined} onClick={onFila?()=>onFila(x):undefined} onKeyDown={onFila?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onFila(x);}}:undefined}>{columnas.map(c=><td key={c.id} className={c.clase?.(x)} title={c.titulo?.(x)}>{c.render?c.render(x):c.valor(x)}</td>)}</tr>)}</tbody>
      </table>
      {cargando?<div className="analysis-processing" role="status">Procesando datos…</div>:error?<p className="analysis-empty" role="alert">{error}</p>:!filas.length&&<p className="analysis-empty">No hay registros para estos filtros. Prueba otro período o borra una selección.</p>}
    </div>
  </>;
}

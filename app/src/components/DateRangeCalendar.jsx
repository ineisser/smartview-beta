import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fechaLocal } from '../data/analisis';

const fecha=value=>new Date(`${value}T00:00:00`);
const titulo=d=>{const t=d.toLocaleDateString('es-PE',{month:'long',year:'numeric'});return t.charAt(0).toUpperCase()+t.slice(1);};
const completa=d=>d.toLocaleDateString('es-PE',{day:'numeric',month:'long',year:'numeric'});

export default function DateRangeCalendar({desde,hasta,max,onChange}) {
  const raiz=useRef(null);
  useEffect(()=>{raiz.current?.querySelector('button')?.focus();},[]);
  const [campo,setCampo]=useState('desde');
  const [mes,setMes]=useState(()=>new Date(fecha(desde).getFullYear(),fecha(desde).getMonth(),1));
  const primero=new Date(mes.getFullYear(),mes.getMonth(),1);
  const inicio=new Date(primero); inicio.setDate(1-(primero.getDay()+6)%7);
  const dias=Array.from({length:42},(_,i)=>{const d=new Date(inicio);d.setDate(d.getDate()+i);return d;});
  const mover=n=>setMes(new Date(mes.getFullYear(),mes.getMonth()+n,1));
  const elegirCampo=c=>{setCampo(c);const d=fecha(c==='desde'?desde:hasta);setMes(new Date(d.getFullYear(),d.getMonth(),1));};
  const elegir=d=>{onChange(campo,fechaLocal(d));if(campo==='desde')setCampo('hasta');};
  return <div ref={raiz} className="analysis-calendar" aria-label="Calendario del período">
    <div className="analysis-calendar-fields">{[['desde','Desde',desde],['hasta','Hasta',hasta]].map(([c,label,v])=><button key={c} type="button" aria-pressed={campo===c} onClick={()=>elegirCampo(c)}><span>{label}</span><strong>{fecha(v).toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric'})}</strong></button>)}</div>
    <div className="analysis-calendar-heading"><button className="icon-btn" type="button" aria-label="Mes anterior del calendario" onClick={()=>mover(-1)}><ChevronLeft size={16}/></button><strong aria-live="polite">{titulo(mes)}</strong><button className="icon-btn" type="button" aria-label="Mes siguiente del calendario" disabled={fechaLocal(new Date(mes.getFullYear(),mes.getMonth()+1,1))>max} onClick={()=>mover(1)}><ChevronRight size={16}/></button></div>
    <div className="analysis-calendar-grid"><div className="analysis-calendar-week">{['Lu','Ma','Mi','Ju','Vi','Sá','Do'].map(d=><span key={d}>{d}</span>)}</div><div className="analysis-calendar-days">{dias.map(d=>{const v=fechaLocal(d);return <button key={v} type="button" aria-label={completa(d)} aria-pressed={v===desde||v===hasta} disabled={v>max} className={`${d.getMonth()!==mes.getMonth()?'is-outside ':''}${v>=desde&&v<=hasta?'is-range ':''}${v===desde||v===hasta?'is-endpoint':''}`} onClick={()=>elegir(d)}>{d.getDate()}</button>;})}</div></div>
    <p className="analysis-calendar-help" role="status">Selecciona la fecha de {campo==='desde'?'inicio':'término'}.</p>
  </div>;
}

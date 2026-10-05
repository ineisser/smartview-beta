import { ChevronLeft, ChevronRight } from 'lucide-react';
export default function TablePagination({total,offset=0,tamano=100,onOffset,cargando=false,children}) {
  const first=total?offset+1:0,last=Math.min(offset+tamano,total);
  return <div className="table-pagination" aria-label="Paginación de registros">
    <span role="status">{first.toLocaleString('es-PE')}–{last.toLocaleString('es-PE')} de {total.toLocaleString('es-PE')} registros</span>
    <div className="table-pagination-arrows"><button type="button" className="icon-btn" aria-label="Bloque anterior" disabled={cargando||offset===0} onClick={()=>onOffset(Math.max(0,offset-tamano))}><ChevronLeft size={18} /></button><button type="button" className="icon-btn" aria-label="Bloque siguiente" disabled={cargando||offset+tamano>=total} onClick={()=>onOffset(offset+tamano)}><ChevronRight size={18} /></button></div>
    {children}
  </div>;
}

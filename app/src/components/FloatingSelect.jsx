import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown, X } from 'lucide-react';

export default function FloatingSelect({label,value,opciones,onChange,onClear,children,prefix,width:menuWidth=280,icon:Icon=ChevronsUpDown,panelDirecto=false,iconOnly=false,acciones=false,disabled=false}) {
  const [abierto,setAbierto]=useState(false),[posicion,setPosicion]=useState({});
  const [verOpciones,setVerOpciones]=useState(false);
  const ancla=useRef(null),menu=useRef(null);
  const elegido=opciones.find(o=>o.value===value);
  useLayoutEffect(()=>{
    if(!abierto)return;
    const ubicar=()=>{
      const box=ancla.current.getBoundingClientRect(),viewport=window.visualViewport;
      const x=viewport?.offsetLeft||0,y=viewport?.offsetTop||0;
      const vw=viewport?.width||window.innerWidth,vh=viewport?.height||window.innerHeight;
      const width=Math.min(menuWidth,Math.max(0,vw-16));
      const abajo=Math.max(0,y+vh-box.bottom-14),arriba=Math.max(0,box.top-y-14);
      const altura=(menu.current?.scrollHeight||0)+2;
      const subir=altura>abajo&&arriba>abajo;
      const maxHeight=Math.min(Math.max(arriba,abajo),vh-16);
      const top=Math.max(y+8,Math.min(subir?box.top-6-Math.min(altura,maxHeight):box.bottom+6,y+vh-Math.min(altura,maxHeight)-8));
      const siguiente={left:Math.max(x+8,Math.min(box.left,x+vw-width-8)),top,width,maxHeight};
      setPosicion(prev=>Object.keys(siguiente).every(k=>prev[k]===siguiente[k])?prev:siguiente);
    };
    ubicar();
    const cerrar=e=>{if(!ancla.current?.contains(e.target)&&!menu.current?.contains(e.target))setAbierto(false);};
    const escape=e=>{if(e.key==='Escape'){setAbierto(false);ancla.current?.focus();}};
    const observer=new ResizeObserver(ubicar); if(menu.current)observer.observe(menu.current);
    document.addEventListener('pointerdown',cerrar);document.addEventListener('focusin',cerrar);document.addEventListener('keydown',escape);window.addEventListener('resize',ubicar);window.addEventListener('scroll',ubicar,true);window.visualViewport?.addEventListener('resize',ubicar);window.visualViewport?.addEventListener('scroll',ubicar);
    return()=>{observer.disconnect();document.removeEventListener('pointerdown',cerrar);document.removeEventListener('focusin',cerrar);document.removeEventListener('keydown',escape);window.removeEventListener('resize',ubicar);window.removeEventListener('scroll',ubicar,true);window.visualViewport?.removeEventListener('resize',ubicar);window.visualViewport?.removeEventListener('scroll',ubicar);};
  },[abierto,menuWidth]);
  useLayoutEffect(()=>{if(abierto)setVerOpciones(false);},[abierto,panelDirecto]);
  const abrir=e=>{if(e.key==='ArrowDown'){e.preventDefault();setAbierto(true);requestAnimationFrame(()=>menu.current?.querySelector('button')?.focus());}};
  return <div className="analysis-filter floating-select">
    <button ref={ancla} type="button" disabled={disabled} className={iconOnly?'icon-btn':'analysis-select-trigger btn-slide'} aria-label={label} aria-haspopup="menu" aria-expanded={abierto} onClick={()=>setAbierto(!abierto)} onKeyDown={abrir}>{!iconOnly&&<>{prefix&&<span className="analysis-select-caption">{prefix}</span>}<span>{elegido?.triggerLabel||elegido?.label||label}</span></>}<Icon size={iconOnly?18:14} aria-hidden="true" /></button>
    {value&&onClear&&<button type="button" className="analysis-filter-clear" aria-label={`Borrar filtro de ${label.toLowerCase()}`} onClick={onClear}><X size={12} /></button>}
    {abierto&&createPortal(<div ref={menu} className={`analysis-floating-menu glass-pop${panelDirecto?' has-calendar':''}${verOpciones?' show-period-options':''}`} style={posicion}>
      {panelDirecto&&<button type="button" className="analysis-calendar-switch" onClick={()=>setVerOpciones(v=>!v)}>{verOpciones?'Ver calendario':'Cambiar período'}</button>}
      <div className="analysis-floating-options" role="menu" aria-label={label} onKeyDown={e=>{const botones=[...e.currentTarget.querySelectorAll('[role^=menuitem]')];const actual=botones.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?botones.length-1:(actual+(e.key==='ArrowDown'?1:-1)+botones.length)%botones.length;botones[next]?.focus();}}}>
        {opciones.map(o=><button key={o.value} type="button" role={acciones?'menuitem':'menuitemradio'} aria-checked={acciones?undefined:value===o.value} onClick={()=>{onChange(o.value);setAbierto(!!o.keepOpen);if(!o.keepOpen)ancla.current?.focus();}}><span>{o.label}</span>{!acciones&&value===o.value&&<Check size={16} aria-hidden="true" />}</button>)}
      </div>
      {children&&<div className="analysis-menu-extra">{children}</div>}
    </div>,document.body)}
  </div>;
}

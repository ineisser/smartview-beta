import { historyPage } from './history-core.js';
import { crearProyeccion, resumenDia, combinarDias, diasEntre, diaInicio } from './projection.js';
import { inicio, fin, cerrado, evolucion, fechaLocal } from './shared/analysis.js';

// Caché acotada a la instancia, nunca compartida entre organizaciones o permisos.
const cache=new Map(),preparaciones=new Map();let cacheBytes=0;
const memo=async(key,read)=>{
  const hit=cache.get(key);if(hit&&hit.until>Date.now())return hit.value;
  const value=await read(),bytes=Buffer.byteLength(JSON.stringify(value||null));
  if(cache.has(key)){cacheBytes-=cache.get(key).bytes;cache.delete(key);}
  if(bytes<=16*1024*1024){cache.set(key,{value,bytes,until:Date.now()+60000});cacheBytes+=bytes;}
  while(cache.size>120||cacheBytes>16*1024*1024){const oldest=cache.keys().next().value;cacheBytes-=cache.get(oldest).bytes;cache.delete(oldest);}
  return value;
};
export function clearAnalysisCache(){cache.clear();cacheBytes=0;}
export async function consultarAnalisis(io,org,rooms,allRooms,input,now=Date.now()) {
  const root=`organizaciones/${org}/analisis`,desde=Number(input.desde),hasta=Math.min(Number(input.hasta),now);
  if(!Number.isFinite(desde)||!Number.isFinite(hasta)||desde>=hasta)throw new Error('Período inválido.');
  const days=diasEntre(desde,hasta);if(days.length>3660)throw new Error('Selecciona un período de hasta diez años.');
  let meta=await io.read(`${root}/meta`);
  if(!meta?.ready||meta.version!==3||meta.config!==JSON.stringify(allRooms)||(io.allowRebuild&&input.reconstruir)) {
    // Primera preparación; las siguientes consultas usan exclusivamente la proyección.
    if(!preparaciones.has(org))preparaciones.set(org,(async()=>{
      if(io.acquire&&!await io.acquire()) {
        for(let i=0;i<60;i++){await new Promise(resolve=>setTimeout(resolve,250));const ready=await io.read(`${root}/meta`);if(ready?.ready&&ready.version===3)return ready;}
        throw new Error('Se está preparando el índice. Inténtalo de nuevo en unos segundos.');
      }
      try {
        for(let attempt=0;attempt<3;attempt++) {
          const revision=await io.read(`organizaciones/${org}/analisisFuenteRevision`);
          const raw=await io.read(`organizaciones/${org}/paros`);
          const projection=crearProyeccion(raw,allRooms,Date.now());await io.write(root,{...projection,meta:{...projection.meta,ready:false}});
          const latest=await io.read(`organizaciones/${org}/analisisFuenteRevision`);
          if(latest===revision){await io.write(`${root}/meta`,projection.meta);if(await io.read(`organizaciones/${org}/analisisFuenteRevision`)===revision)return projection.meta;}
        }
        await io.write(`${root}/meta/ready`,false);
        throw new Error('El historial cambió durante la preparación. Actualiza para reintentar.');
      }finally{await io.release?.();}
    })().finally(()=>preparaciones.delete(org)));
    meta=await preparaciones.get(org);clearAnalysisCache();
  }
  const namespace=`${org}:${meta.revision}`,read=(path,query)=>memo(`${namespace}:${path}:${JSON.stringify(query||{})}`,()=>io.read(`${root}/${path}`,query));
  const [abiertos,summaries]=await Promise.all([read('abiertos'),read('resumenes',{desde:days[0],hasta:days.at(-1)})]);
  const opens=Object.values(abiertos||{}).filter(x=>rooms.some(s=>s.codigo===x.sala)&&inicio(x)<hasta&&fin(x,now)>desde);
  const dayRows=d=>read(`dias/${d}/eventos`);
  const getBlock=async(d,a,b)=>{
    const relevant=opens.filter(x=>inicio(x)<b&&fin(x,now)>a);
    if(a===diaInicio(d)&&b===a+86400000&&!relevant.length)return summaries?.[d]||resumenDia({},rooms,d);
    const closed=await dayRows(d)||{};
    return resumenDia({...closed,...Object.fromEntries(relevant.map(x=>[x.id,x]))},rooms,d,a,b);
  };
  const daily=await Promise.all(days.map(async d=>({d,block:await getBlock(d,Math.max(desde,diaInicio(d)),Math.min(hasta,diaInicio(d)+86400000))})));
  const datos=combinarDias(daily.map(x=>x.block),rooms,input);
  const tiempoParado=datos.maquinas.reduce((n,m)=>n+m.duracion,0);
  const totales={paros:datos.resumen.paros,tiempoParado};
  if(input.vista==='historial') {
    const raw=Object.assign({},...await Promise.all(days.map(dayRows)),abiertos||{});
    const pag=historyPage(raw,rooms,{...input,cursor:input.cursor?.revision===meta.revision?input.cursor:null},now);
    // El cursor identifica el último evento de la página bajo el mismo orden y revisión.
    // El offset se conserva para mostrar rangos y permitir volver a bloques anteriores.
    if(input.cursor&&input.offset>0&&input.cursor.revision!==meta.revision)pag.cambioRevision=true;
    return {...pag,totales:pag.totales,revision:meta.revision,cursor:pag.filas.length?{id:pag.filas.at(-1).id,revision:meta.revision}:null};
  }
  let grafica=null;
  if(input.vista==='dashboard') {
    grafica=evolucion({periodo:input.periodo,desdeFecha:fechaLocal(desde),hastaFecha:fechaLocal(hasta-1),salas:rooms,historial:[],...input,desde,hasta,ahora:now});
    for(const g of grafica.grupos) {
      const slices=daily.filter(({d})=>diaInicio(d)<Math.min(g.hasta,hasta)&&diaInicio(d)+86400000>g.desde).map(({block})=>grafica.tipo==='turnos'?block.turnos[g.label]:block);
      Object.assign(g,combinarDias(slices,rooms,input).resumen);
      if(!slices.length)g.disponibilidad=null;
    }
  }
  return {datos,grafica,totales,revision:meta.revision};
}

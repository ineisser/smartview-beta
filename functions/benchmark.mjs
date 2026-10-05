import { performance } from 'node:perf_hooks';
import { crearProyeccion } from './projection.js';
import { consultarAnalisis,clearAnalysisCache } from './analysis-service.js';
const rooms=[{codigo:'S',nombre:'Sala',maquinas:[{numero:'01'}]}],start=+new Date('2026-09-01T00:00:00-05:00');
const results=[];
for(const n of [100,500,10000]) {
  const raw=Object.fromEntries(Array.from({length:n},(_,i)=>[String(i),{sala:'S',maquina:'01',inicio:start+i*60000,fin:start+i*60000+30000,nombre:i%2?'Trama':'Orillos',estado:'atendido'}]));
  const until=Math.ceil((start+n*60000-start)/86400000)*86400000+start,now=until+86400000;
  const before=performance.now(),projection=crearProyeccion(raw,rooms,now),preparacion=performance.now()-before;
  let bytes=0,reads=0;const io={read:async(path,range)=>{reads++;let value=path.endsWith('/meta')?projection.meta:path.split('/').slice(3).reduce((o,k)=>o?.[k],projection);if(range)value=Object.fromEntries(Object.entries(value||{}).filter(([k])=>k>=range.desde&&k<=range.hasta));bytes+=Buffer.byteLength(JSON.stringify(value||null));return structuredClone(value)||null;},write:async()=>{throw new Error('El benchmark no escribe Firebase.');}};
  const input={desde:start,hasta:until,vista:'motivos'};clearAnalysisCache();let t=performance.now();const summary=await consultarAnalisis(io,'BENCH',rooms,rooms,input,now),resumenMs=performance.now()-t,summaryBytes=bytes;
  t=performance.now();await consultarAnalisis(io,'BENCH',rooms,rooms,{...input,vista:'historial',offset:0},now);const historyMs=performance.now()-t,firstReads=reads;
  t=performance.now();await consultarAnalisis(io,'BENCH',rooms,rooms,{...input,vista:'historial',offset:100},now);const nextMs=performance.now()-t;
  if(summary.datos.resumen.paros!==n)throw new Error('Conteo incorrecto.');
  results.push({registros:n,preparacionMs:+preparacion.toFixed(1),resumenMs:+resumenMs.toFixed(1),lecturaResumenBytes:summaryBytes,historialMs:+historyMs.toFixed(1),siguienteMs:+nextMs.toFixed(1),lecturasDetalleSiguiente:reads-firstReads-1});
}
console.log(JSON.stringify({nota:'Medición local de cálculo y lectura con adaptador en memoria; excluye red y arranque de Cloud Functions.',results},null,2));

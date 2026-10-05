import test from 'node:test';
import assert from 'node:assert/strict';
import { consultarAnalisis, clearAnalysisCache } from './analysis-service.js';
import { crearProyeccion } from './projection.js';
import { calcular } from './shared/analysis.js';
const rooms=[{codigo:'S1',nombre:'Sala 1',maquinas:[{numero:'01'},{numero:'02'}]},{codigo:'S2',nombre:'Sala 2',maquinas:[{numero:'01'}]}];
const time=s=>+new Date(s+'-05:00');
function memory(projection,raw={}){const calls=[];const root={organizaciones:{TEST:{paros:raw,analisis:projection}}};return {calls,read:async(path,range)=>{calls.push(path);let v=path.split('/').reduce((o,k)=>o?.[k],root);if(range)v=Object.fromEntries(Object.entries(v||{}).filter(([k])=>k>=range.desde&&k<=range.hasta));return structuredClone(v)||null;},write:async(path,v)=>{const keys=path.split('/'),last=keys.pop();const obj=keys.reduce((o,k)=>o[k]??={},root);obj[last]=structuredClone(v);}};}
const raw={a:{sala:'S1',maquina:'01',inicio:time('2026-10-01T23:00:00'),fin:time('2026-10-03T02:00:00'),nombre:'Trama',estado:'atendido'},b:{sala:'S1',maquina:'01',inicio:time('2026-10-02T01:00:00'),fin:time('2026-10-02T03:00:00'),nombre:'Orillos',estado:'atendido'},c:{sala:'S1',maquina:'02',inicio:time('2026-10-02T10:00:00'),nombre:'Trama',estado:'detenido'},d:{sala:'S2',maquina:'01',inicio:time('2026-10-02T07:00:00'),fin:time('2026-10-02T08:00:00'),nombre:'Orillos',estado:'atendido'}};
const now=time('2026-10-04T12:00:00'),projection=crearProyeccion(raw,rooms,now);
test('resúmenes y filtros coinciden con los cálculos originales en cruces y solapamientos',async()=>{
 for(const filters of [{},{razon:'Orillos'},{maquina:'01'},{sala:'S1',razon:'Trama'}]){
  clearAnalysisCache();const io=memory(projection);const input={desde:time('2026-10-01T00:00:00'),hasta:time('2026-10-04T00:00:00'),vista:'motivos',...filters};
  const result=await consultarAnalisis(io,'TEST',rooms,rooms,input,now);
  const expected=calcular({salas:rooms,historial:Object.values(projection.eventos),...input,ahora:now});
  assert.deepEqual(result.datos.resumen,expected.resumen);
  assert.deepEqual(result.datos.maquinas.map(x=>[x.key,x.paros,x.duracion,x.perdido]),expected.maquinas.map(x=>[x.key,x.paros,x.duracion,x.perdido]));
  assert.equal(io.calls.some(x=>x.endsWith('/paros')),false);
 }
});
test('proyección aislada por permisos y resúmenes cerrados sin leer detalles',async()=>{
 clearAnalysisCache();const p=crearProyeccion({d:raw.d},rooms,now),io=memory(p);
 const result=await consultarAnalisis(io,'TEST',[rooms[0]],rooms,{desde:time('2026-10-02T00:00:00'),hasta:time('2026-10-03T00:00:00'),vista:'maquinas'},now);
 assert.equal(result.datos.resumen.paros,0);assert.equal(result.datos.maquinas.some(x=>x.salaCodigo==='S2'),false);
 assert.equal(io.calls.some(x=>x.includes('/dias/')),false);
});
test('segunda página reutiliza lectura del período y conserva un cursor estable',async()=>{
 clearAnalysisCache();const logs=Object.fromEntries(Array.from({length:250},(_,i)=>[String(i),{sala:'S1',maquina:'01',inicio:time('2026-10-02T00:00:00')+i*60000,fin:time('2026-10-02T00:00:00')+i*60000+30000,nombre:'Trama',estado:'atendido'}]));
 const io=memory(crearProyeccion(logs,rooms,now));const input={desde:time('2026-10-02T00:00:00'),hasta:time('2026-10-03T00:00:00'),vista:'historial',orden:{columna:'fecha',direccion:'asc'}};
 const first=await consultarAnalisis(io,'TEST',rooms,rooms,input,now),reads=io.calls.filter(x=>x.includes('/dias/')).length;
 const second=await consultarAnalisis(io,'TEST',rooms,rooms,{...input,offset:100,cursor:first.cursor},now);
 assert.equal(first.filas.length,100);assert.equal(second.filas.length,100);assert.equal(second.offset,100);assert.equal(second.total,250);
 assert.equal(io.calls.filter(x=>x.includes('/dias/')).length,reads);
 assert.equal(new Set([...first.filas,...second.filas].map(x=>x.id)).size,200);
});
test('dashboard calcula tres turnos y no promedia porcentajes diarios',async()=>{
 clearAnalysisCache();const io=memory(projection);const result=await consultarAnalisis(io,'TEST',rooms,rooms,{desde:time('2026-10-02T00:00:00'),hasta:time('2026-10-03T00:00:00'),vista:'dashboard',periodo:'personalizado',razon:'Trama'},now);
 assert.equal(result.grafica.tipo,'turnos');assert.deepEqual(result.grafica.grupos.map(g=>g.label),['A','B','C']);
 assert.equal(result.grafica.grupos.reduce((n,g)=>n+g.perdido,0),result.datos.resumen.perdido);
});

test('preparación inicial se guarda una sola vez y las consultas siguientes no releen la fuente',async()=>{
 clearAnalysisCache();const io=memory(null,raw);const input={desde:time('2026-10-01T00:00:00'),hasta:time('2026-10-04T00:00:00'),vista:'maquinas'};
 const first=await consultarAnalisis(io,'TEST',rooms,rooms,input,now);
 const next=await consultarAnalisis(io,'TEST',rooms,rooms,input,now);
 assert.deepEqual(first.datos.resumen,next.datos.resumen);
 assert.equal(io.calls.filter(x=>x.endsWith('/paros')).length,1);
});

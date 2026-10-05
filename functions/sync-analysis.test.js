import test from 'node:test';
import assert from 'node:assert/strict';
import { sincronizarEvento } from './sync-analysis.js';
import { crearProyeccion,idEvento } from './projection.js';
const rooms=[{codigo:'S',nombre:'Sala',maquinas:[{numero:'01'}]}];
const start=+new Date('2026-10-01T23:00:00-05:00');
function database(initial) {
  const data=structuredClone(initial),read=p=>p.split('/').reduce((o,k)=>o?.[k],data)||null;
  const put=(p,v)=>{const keys=p.split('/'),last=keys.pop(),root=keys.reduce((o,k)=>o[k]??={},data);if(v===null)delete root[last];else root[last]=structuredClone(v);};
  const snapshot=v=>({exists:()=>v!==null,val:()=>structuredClone(v)});
  return {data,ref(path) {let min=-Infinity,max=Infinity;return {orderByChild(){return this;},startAt(v){min=v;return this;},endAt(v){max=v;return this;},get:async()=>{let v=read(path);if(min!==-Infinity||max!==Infinity)v=Object.fromEntries(Object.entries(v||{}).filter(([,x])=>x.inicio>=min&&x.inicio<=max));return snapshot(v);},update:async patch=>{for(const [k,v] of Object.entries(patch))put(`${path}/${k}`,v);},set:async v=>put(path,v?.['.sv']?.increment?(read(path)||0)+v['.sv'].increment:v),transaction:async cb=>{const next=cb(structuredClone(read(path)));if(next!==undefined)put(path,next);return {committed:next!==undefined,snapshot:snapshot(read(path))};}};}};
}
test('insertar, cerrar y borrar actualiza abiertos, días y resúmenes sin duplicar reintentos',async()=>{
 const open={sala:'S',maquina:'01',inicio:start,nombre:'Trama',estado:'detenido'};
 const db=database({organizaciones:{ORG:{planta:{salas:rooms},paros:{a:open},analisis:crearProyeccion({},rooms)}}});
 await sincronizarEvento(db,'ORG',null,open);
 assert.equal(Object.keys(db.data.organizaciones.ORG.analisis.abiertos).length,1);
 const close={...open,fin:start+2*3600000,estado:'atendido'};db.data.organizaciones.ORG.paros.a=close;
 await sincronizarEvento(db,'ORG',open,close);await sincronizarEvento(db,'ORG',open,close);
 const p=db.data.organizaciones.ORG.analisis;
 assert.equal(Object.keys(p.abiertos).length,0);assert.equal(Object.keys(p.eventos).length,1);
 assert.equal(Object.keys(p.dias).length,2);
 assert.ok(Object.values(p.resumenes).every(d=>Object.values(d.maquinas)[0].paros===1));
 delete db.data.organizaciones.ORG.paros.a;await sincronizarEvento(db,'ORG',close,null);
 assert.equal(Object.keys(p.eventos).length,0);assert.ok(Object.values(p.resumenes).every(d=>Object.values(d.maquinas)[0].paros===0));
});
test('cambiar fecha y motivo retira el evento anterior del índice',async()=>{
 const before={sala:'S',maquina:'01',inicio:start,fin:start+3600000,nombre:'Trama',estado:'atendido'};
 const db=database({organizaciones:{ORG:{planta:{salas:rooms},paros:{a:before},analisis:crearProyeccion({a:before},rooms)}}});
 const after={...before,inicio:start+86400000,fin:start+90000000,nombre:'Orillos'};db.data.organizaciones.ORG.paros.a=after;
 await sincronizarEvento(db,'ORG',before,after);
 const p=db.data.organizaciones.ORG.analisis;assert.equal(p.eventos[idEvento(before)],undefined);assert.equal(p.eventos[idEvento(after)].reason,'Orillos');
 assert.equal(Object.keys(p.dias['2026-10-01'].eventos).length,0);
});

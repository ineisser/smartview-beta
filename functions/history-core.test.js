import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedRooms, historyPage } from './history-core.js';
const base=Date.parse('2026-10-01T12:00:00Z');
const rooms=[{codigo:'S1',nombre:'Sala 1'},{codigo:'S2',nombre:'Sala 2'}];
const raw=Object.fromEntries(Array.from({length:251},(_,i)=>[`id${i}`,{sala:'S1',maquina:'01',inicio:base+i*60000,fin:base+i*60000+30000,estado:'atendido',nombre:i%2?'Orillos':'Trama'}]));
const input={desde:base,hasta:base+86400000,orden:{columna:'fecha',direccion:'asc'}};
test('devuelve bloques de 100 con total exacto sin huecos ni duplicados',()=>{
 const pages=[0,100,200].map(offset=>historyPage(raw,rooms,{...input,offset},base+86400000));
 assert.deepEqual(pages.map(p=>p.filas.length),[100,100,51]);
 assert.ok(pages.every(p=>p.total===251));
 assert.equal(new Set(pages.flatMap(p=>p.filas.map(x=>x.id))).size,251);
 assert.equal(pages[1].filas[0].id,'id100');
});
test('filtra y ordena antes de cortar la página; total corresponde a los filtros',()=>{
 const p=historyPage(raw,rooms,{...input,razon:'Trama',orden:{columna:'fecha',direccion:'desc'}},base+86400000);
 assert.equal(p.total,126);assert.equal(p.filas.length,100);assert.equal(p.filas[0].id,'id250');
 assert.ok(p.filas.every(x=>x.reason==='Trama'));
});
test('une eventos antiguos de inicio y cierre incluso con diferencia de 2ms',()=>{
 const p=historyPage({a:{sala:'S1',maquina:'01',inicio:base,nombre:'Trama'},b:{sala:'S1',maquina:'01',inicio:base+2,fin:base+60000,estado:'atendido'}},rooms,input,base+86400000);
 assert.equal(p.total,1);assert.equal(p.filas[0].status,'atendido');assert.equal(p.filas[0].fin,base+60000);
});
test('no devuelve registros de salas fuera de acceso ni totales de otras salas',()=>{
 assert.equal(historyPage(raw,[rooms[1]],input,base+86400000).total,0);
 assert.deepEqual(allowedRooms({rolTenant:'jefe',salasAsignadas:['S2']},rooms,{},'u'),[rooms[1]]);
 assert.deepEqual(allowedRooms({rolTenant:'operario'},rooms,{},'u'),[]);
 assert.deepEqual(allowedRooms({rolTenant:'admin'},rooms,{},'u'),rooms);
 assert.deepEqual(allowedRooms({rolTenant:'admin'},rooms,{u:{estado:'inactivo'}},'u'),[]);
});
test('miembro vigente limita el perfil previo, incluso si está asociado por correo',()=>{
 assert.deepEqual(allowedRooms({rolTenant:'owner',email:'user@example.com'},rooms,{token:{email:'USER@example.com',rol:'jefe',salas:['S2']}},'u'),[rooms[1]]);
});
test('rechaza páginas y ordenamientos inválidos y ajusta la última página al borrar registros',()=>{
 assert.throws(()=>historyPage(raw,rooms,{...input,offset:-100}),/Página/);
 assert.throws(()=>historyPage(raw,rooms,{...input,orden:{columna:'foo',direccion:'asc'}}),/Orden/);
 assert.equal(historyPage(raw,rooms,{...input,offset:900},base+86400000).offset,200);
});

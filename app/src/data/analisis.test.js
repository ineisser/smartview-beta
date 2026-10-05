import test from 'node:test';
import assert from 'node:assert/strict';
import { calcular, horario, tiempo, letraTurno, fechasPeriodo, limitesPeriodo, evolucion, ordenarFilas } from './analisis.js';
const date = h => +new Date(`2026-10-05T${h}:00`);
const salas=[{codigo:'S1',nombre:'Sala 1',maquinas:[{numero:1},{numero:2}],turnos:[{inicio:'07:00',fin:'15:00',nombre:'Turno 1'}]}];
const log=(inicio,fin,motivo='Trama')=>({id:inicio,sala:'S1',machine:'01',inicio:date(inicio),fin:date(fin),reason:motivo,status:'atendido'});
const run=historial=>calcular({salas,historial,desde:date('07:00'),hasta:date('11:00'),ahora:date('11:00')});
test('incluye máquinas sin paros y calcula disponibilidad/pérdida con la misma base',()=>{
 const r=run([log('08:00','09:00')]);
 assert.equal(r.maquinas[0].disponibilidad,75);
 assert.equal(r.maquinas[1].disponibilidad,100);
 assert.equal(r.motivos[0].perdida,12.5);
});
test('recorta cruces del período y paros abiertos',()=>{
 const r=run([log('06:00','08:00'),{sala:'S1',machine:'02',inicio:date('10:00'),status:'detenido'}]);
 assert.equal(r.maquinas[0].duracion,3600000); assert.equal(r.maquinas[1].duracion,3600000);
});
test('no duplica pérdida por solapamientos',()=>{
 const r=run([log('08:00','10:00'),log('09:00','11:00','Orillos')]);
 assert.equal(r.maquinas[0].disponibilidad,25);
 assert.equal(r.motivos.reduce((n,x)=>n+x.perdida,0),37.5);
});
test('respeta salas autorizadas y filtros',()=>{
 const r=run([{...log('08:00','09:00'),sala:'OTRA'}]);assert.equal(r.registros.length,0);
});
test('turno nocturno y letra A',()=>{
 assert.equal(tiempo(horario({turnos:[{inicio:'23:00',fin:'07:00'}]},date('00:00'),date('08:00'))),7*3600000);
 assert.equal(letraTurno(log('08:00','09:00'),salas),'A');
});

test('resumen ponderado por tiempo-máquina y filtro por motivo sin duplicar pérdidas',()=>{
 const opciones={salas,historial:[log('08:00','10:00'),log('09:00','11:00','Orillos')],desde:date('07:00'),hasta:date('11:00'),ahora:date('11:00')};
 const total=calcular(opciones).resumen;
 assert.equal(total.programado,8*3600000);
 assert.equal(total.perdido,3*3600000);
 assert.equal(total.operativo,5*3600000);
 assert.equal(total.disponibilidad,62.5);
 const filtrado=calcular({...opciones,razon:'Orillos'});
 assert.equal(filtrado.registros.length,1);
 assert.equal(filtrado.resumen.programado,total.programado);
 assert.equal(filtrado.resumen.perdido,3600000);
 assert.equal(filtrado.motivos[0].perdida,12.5);
});
test('presets locales: lunes a hoy, primero de mes a hoy y ayer al cruzar mes',()=>{
 const ahora=+new Date('2026-10-07T01:30:00');
 assert.deepEqual(fechasPeriodo('semana',ahora),{desde:'2026-10-05',hasta:'2026-10-07'});
 assert.deepEqual(fechasPeriodo('mes',ahora),{desde:'2026-10-01',hasta:'2026-10-07'});
 assert.deepEqual(fechasPeriodo('ayer',+new Date('2026-10-01T01:00:00')),{desde:'2026-09-30',hasta:'2026-09-30'});
 assert.equal(limitesPeriodo('2026-10-07','2026-10-07',ahora).hasta,ahora);
 assert.equal(limitesPeriodo('2026-10-08','2026-10-07',ahora).invalido,true);
});

test('períodos anteriores: semana de lunes a domingo y mes completo al cruzar año',()=>{
 const ahora=+new Date('2026-10-05T12:00:00');
 assert.deepEqual(fechasPeriodo('semanaAnterior',ahora),{desde:'2026-09-28',hasta:'2026-10-04'});
 assert.deepEqual(fechasPeriodo('mesAnterior',+new Date('2026-01-05T12:00:00')),{desde:'2025-12-01',hasta:'2025-12-31'});
 assert.deepEqual(fechasPeriodo('mesAnterior',+new Date('2024-03-01T12:00:00')),{desde:'2024-02-01',hasta:'2024-02-29'});
 const f=fechasPeriodo('mesAnterior',ahora);
 const r=evolucion({periodo:'mesAnterior',desdeFecha:f.desde,hastaFecha:f.hasta,salas,historial:[],...limitesPeriodo(f.desde,f.hasta,ahora),ahora});
 assert.equal(r.tipo,'semanas');
 assert.equal(r.grupos.at(-1).hasta,+new Date('2026-10-01T00:00:00'));
});
test('semana completa con días futuros sin porcentaje y corte del día actual',()=>{
 const ahora=+new Date('2026-10-07T11:00:00');
 const fechas=fechasPeriodo('semana',ahora);
 const r=evolucion({periodo:'semana',desdeFecha:fechas.desde,hastaFecha:fechas.hasta,salas,historial:[],...limitesPeriodo(fechas.desde,fechas.hasta,ahora),ahora});
 assert.deepEqual(r.grupos.map(g=>g.label),['Lu','Ma','Mi','Ju','Vi','Sá','Do']);
 assert.equal(r.grupos[2].programado,8*3600000);
 assert.equal(r.grupos[2].disponibilidad,100);
 assert.ok(r.grupos.slice(3).every(g=>g.disponibilidad===null));
});
test('mes cubre todas las semanas parciales sin perder días',()=>{
 const ahora=+new Date('2026-10-31T23:59:00');
 const fechas=fechasPeriodo('mes',ahora);
 const r=evolucion({periodo:'mes',desdeFecha:fechas.desde,hastaFecha:fechas.hasta,salas,historial:[],...limitesPeriodo(fechas.desde,fechas.hasta,ahora),ahora});
 assert.deepEqual(r.grupos.map(g=>g.label),['01-10','05-10','12-10','19-10','26-10']);
 for(let i=1;i<r.grupos.length;i++)assert.equal(r.grupos[i-1].hasta,r.grupos[i].desde);
 assert.equal(r.grupos.at(-1).hasta,+new Date('2026-11-01T00:00:00'));
});
test('turnos A B C suman el día civil y respetan el horario nocturno',()=>{
 const s=[{...salas[0],turnos:undefined}];
 const ahora=+new Date('2026-10-06T00:00:00');
 const r=evolucion({periodo:'ayer',desdeFecha:'2026-10-05',hastaFecha:'2026-10-05',salas:s,historial:[log('02:00','03:00')],...limitesPeriodo('2026-10-05','2026-10-05',ahora),ahora});
 assert.deepEqual(r.grupos.map(g=>g.label),['A','B','C']);
 assert.equal(r.grupos.reduce((n,g)=>n+g.programado,0),48*3600000);
 assert.equal(r.grupos[2].perdido,3600000);
 assert.equal(r.grupos[2].disponibilidad,93.75);
});
test('no cuenta paros terminados antes del período ni duplica los abiertos',()=>{
 const r=run([log('06:00','07:00'),log('07:00','07:00'),{sala:'S1',machine:'02',inicio:date('10:00')}]);
 assert.equal(r.resumen.paros,2);
 assert.equal(r.resumen.perdido,3600000);
});
test('ordenamiento compara números y deja valores ausentes al final en ambas direcciones',()=>{
 const columnas=[{id:'n',valor:x=>x.n}];
 const filas=[{n:100},{n:null},{n:2},{n:10}];
 assert.deepEqual(ordenarFilas(filas,columnas,{columna:'n',direccion:'asc'}).map(x=>x.n),[2,10,100,null]);
 assert.deepEqual(ordenarFilas(filas,columnas,{columna:'n',direccion:'desc'}).map(x=>x.n),[100,10,2,null]);
 assert.deepEqual(filas.map(x=>x.n),[100,null,2,10]);
});

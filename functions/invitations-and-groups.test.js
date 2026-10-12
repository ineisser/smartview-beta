import test from 'node:test';
import assert from 'node:assert/strict';
import { invitationEmail,sendEmail } from './email-service.js';
import { opcionesGrupos,grupoMaquina } from './shared/analysis-groups.js';
import { calcular } from './shared/analysis.js';
import { resumenDia,combinarDias } from './projection.js';
import { historyPage } from './history-core.js';
const room={codigo:'TE01',nombre:'Telares',disposicion:{modo:'grupos',grupos:[{cantidad:1},{cantidad:1}]},maquinas:[{numero:10},{numero:20}]};
const at=time=>+new Date(`2026-10-12T${time}:00-05:00`);
const event={id:'one',sala:'TE01',machine:'10',inicio:at('14:30'),fin:at('15:30'),nombre:'Falla',estado:'atendido'};
test('configured groups retain machine numbers and restrict rows and totals',()=>{
 assert.equal(grupoMaquina(room,'20'),2);assert.equal(opcionesGrupos([room]).length,2);
 const block=resumenDia({one:event},[room],'2026-10-12');
 const first=combinarDias([block],[room],{grupo:'TE01:1'}),second=combinarDias([block],[room],{grupo:'TE01:2'});
 assert.equal(first.resumen.paros,1);assert.equal(second.resumen.paros,0);assert.deepEqual(second.maquinas.map(m=>m.maquina),['20']);
 assert.equal(historyPage({one:event},[room],{desde:at('07:00'),hasta:at('23:00'),grupo:'TE01:2'},at('23:00')).total,0);
});
test('a stop crossing shifts contributes only overlapping time in each shift',()=>{
 for(const turno of ['A','B']){const data=calcular({salas:[room],historial:[event],desde:at('07:00'),hasta:at('23:00'),ahora:at('23:00'),turno});assert.equal(data.resumen.paros,1);assert.equal(data.maquinas.find(m=>m.maquina==='10').duracion,30*60000);}
 const input={desde:at('07:00'),hasta:at('23:00'),turno:'B'};assert.equal(historyPage({one:event},[room],input,at('23:00')).totales.tiempoParado,30*60000);
 const block=resumenDia({one:event},[room],'2026-10-12');assert.equal(combinarDias([block],[room],{turno:'B'}).maquinas.find(m=>m.maquina==='10').duracion,30*60000);
});
test('an overnight shift clips stops across midnight and excludes other shifts',()=>{
 const data=calcular({salas:[room],historial:[{...event,inicio:at('06:30'),fin:at('07:30')}],desde:at('00:00'),hasta:at('23:00'),ahora:at('23:00'),turno:'C'});assert.equal(data.maquinas.find(m=>m.maquina==='10').duracion,30*60000);
});
test('corporate email escapes untrusted content and uses only the configured sender',async()=>{
 const mail=invitationEmail({token:'safe',nombre:'<script>x</script>',orgNombre:'Creditex',rol:'operario',salas:['TE01'],expira:at('23:00')});assert.ok(mail.html.includes('&lt;script&gt;'));assert.ok(!mail.html.includes('<script>'));assert.ok(mail.html.includes('/invitar/safe'));
 let payload;const id=await sendEmail('private',{to:'test@example.com',...mail},'invite-safe',async(_url,options)=>{payload=options;return {ok:true,json:async()=>({id:'sent'})};});assert.equal(id,'sent');assert.equal(JSON.parse(payload.body).from,'SmartView <invitaciones@isagi.cloud>');assert.equal(payload.headers['Idempotency-Key'],'invite-safe');
 await assert.rejects(sendEmail('private',{to:'test@example.com',...mail},'invite-safe',async()=>({ok:false,status:429})));await assert.rejects(sendEmail('private',{to:'test@example.com',...mail},'invite-safe',async()=>({ok:true,json:async()=>({})})));
});

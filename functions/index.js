import { initializeApp } from 'firebase-admin/app';

import { getDatabase, ServerValue } from 'firebase-admin/database';

import { onCall, HttpsError } from 'firebase-functions/v2/https';

import { allowedRooms } from './history-core.js';

import { consultarAnalisis } from './analysis-service.js';

import { sincronizarEvento } from './sync-analysis.js';

import { onValueWritten } from 'firebase-functions/v2/database';

initializeApp({databaseURL:'https://smart-view.firebaseio.com'});

const database=getDatabase();

export const historialPagina=onCall({region:'us-central1',maxInstances:4,timeoutSeconds:60},async request=>{
  if(!request.auth)throw new HttpsError('unauthenticated','Inicia sesión.');
  const input=request.data||{},uid=request.auth.uid;
  if(!/^[A-Za-z0-9_-]{1,100}$/.test(input.org||''))throw new HttpsError('invalid-argument','Organización inválida.');
  const profile=(await database.ref(`usuarios/${uid}`).get()).val();
  if(!profile||(profile.tenantId!==input.org&&!['superusuario','soporte'].includes(profile.rolPlataforma)))throw new HttpsError('permission-denied','Sin acceso a esta organización.');
  const [rooms,members]=await Promise.all([database.ref(`organizaciones/${input.org}/planta/salas`).get(),database.ref(`organizaciones/${input.org}/miembros`).get()]);
  const permitted=allowedRooms(profile,rooms.val()||[],members.val()||{},uid);
  if(!permitted.length)throw new HttpsError('permission-denied','Sin acceso al análisis.');
  const io={read:async(path,range)=>{let q=database.ref(path);if(range)q=q.orderByKey().startAt(range.desde).endAt(range.hasta);return (await q.get()).val();},write:(path,value)=>database.ref(path).set(value),acquire:async()=>{const result=await database.ref(`organizaciones/${input.org}/analisisPreparando`).transaction(v=>v&&v>Date.now()?undefined:Date.now()+120000);return result.committed;},release:()=>database.ref(`organizaciones/${input.org}/analisisPreparando`).remove()};
  try{return await consultarAnalisis(io,input.org,permitted,rooms.val()||[],input);}catch(error){throw new HttpsError('invalid-argument',error.message);}

});


export const indexarParo=onValueWritten({ref:'/organizaciones/{org}/paros/{id}',instance:'smart-view',region:'us-central1',retry:true},async event=>{await database.ref(`organizaciones/${event.params.org}/analisisFuenteRevision`).set(ServerValue.increment(1));await sincronizarEvento(database,event.params.org,event.data.before.val(),event.data.after.val());});

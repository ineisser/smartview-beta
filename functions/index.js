import { initializeApp } from 'firebase-admin/app';

import { getDatabase, ServerValue } from 'firebase-admin/database';

import { onCall, HttpsError } from 'firebase-functions/v2/https';

import { allowedRooms } from './history-core.js';

import { consultarAnalisis } from './analysis-service.js';

import { sincronizarEvento } from './sync-analysis.js';

import { onValueWritten } from 'firebase-functions/v2/database';
import { manageAccess, active, platform } from './access-service.js';

initializeApp({databaseURL:'https://smart-view.firebaseio.com'});

const database=getDatabase();
export const gestionarAcceso=onCall({region:'us-central1',maxInstances:4,timeoutSeconds:60},request=>manageAccess(database,request));
export const crearPlanta=onCall({region:'us-central1',maxInstances:4,timeoutSeconds:60},async request=>{
  if(!request.auth)throw new HttpsError('unauthenticated','Inicia sesión.');
  const uid=request.auth.uid, org=`SV${uid.replace(/[^a-zA-Z0-9]/g,'').slice(0,16).toUpperCase()}`;
  const node=database.ref(`organizaciones/${org}`);
  const result=await node.transaction(value=>value?undefined:{codigo:org,nombre:String(request.data?.nombre||'').slice(0,200),prueba:true,miembros:{[uid]:{uid,email:String(request.auth.token.email||'').toLowerCase(),nombre:String(request.data?.usuarioNombre||''),rol:'owner',estado:'activo',salas:[],creadoEn:Date.now()}}});
  const member=result.snapshot.val()?.miembros?.[uid];
  if(!member||member.estado!=='activo'||member.rol!=='owner')throw new HttpsError('permission-denied','No puedes crear esta planta.');
  await database.ref(`accesos/${uid}/${org}`).set({nombre:result.snapshot.val().nombre||org,rol:'owner',estado:'activo',salas:[]});
  return {codigo:org};
});

export const historialPagina=onCall({region:'us-central1',maxInstances:4,timeoutSeconds:60},async request=>{
  if(!request.auth)throw new HttpsError('unauthenticated','Inicia sesión.');
  const input=request.data||{},uid=request.auth.uid;
  if(!/^[A-Za-z0-9_-]{1,100}$/.test(input.org||''))throw new HttpsError('invalid-argument','Organización inválida.');
  const profile=(await database.ref(`usuarios/${uid}`).get()).val();
  const member=(await database.ref(`organizaciones/${input.org}/miembros/${uid}`).get()).val();
  if(!profile||(!active(member)&&!platform(profile)))throw new HttpsError('permission-denied','Sin acceso a esta organización.');
  const [rooms,members]=await Promise.all([database.ref(`organizaciones/${input.org}/planta/salas`).get(),database.ref(`organizaciones/${input.org}/miembros`).get()]);
  const permitted=allowedRooms(profile,rooms.val()||[],members.val()||{},uid);
  if(!permitted.length)throw new HttpsError('permission-denied','Sin acceso al análisis.');
  const io={read:async(path,range)=>{let q=database.ref(path);if(range)q=q.orderByKey().startAt(range.desde).endAt(range.hasta);return (await q.get()).val();},write:(path,value)=>database.ref(path).set(value),acquire:async()=>{const result=await database.ref(`organizaciones/${input.org}/analisisPreparando`).transaction(v=>v&&v>Date.now()?undefined:Date.now()+120000);return result.committed;},release:()=>database.ref(`organizaciones/${input.org}/analisisPreparando`).remove()};
  try{return await consultarAnalisis(io,input.org,permitted,rooms.val()||[],input);}catch(error){throw new HttpsError('invalid-argument',error.message);}

});


export const indexarParo=onValueWritten({ref:'/organizaciones/{org}/paros/{id}',instance:'smart-view',region:'us-central1',retry:true},async event=>{await database.ref(`organizaciones/${event.params.org}/analisisFuenteRevision`).set(ServerValue.increment(1));await sincronizarEvento(database,event.params.org,event.data.before.val(),event.data.after.val());});

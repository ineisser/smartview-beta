import { idEvento, diasEntre, resumenDia } from './projection.js';
import { normalizeEvents } from './history-core.js';
import { inicio, fin, cerrado } from './shared/analysis.js';
import { ServerValue } from 'firebase-admin/database';

export async function sincronizarEvento(db,org,before,after) {
  const root=`organizaciones/${org}/analisis`;
  if(!(await db.ref(`${root}/meta/ready`).get()).val())return;
  const rooms=(await db.ref(`organizaciones/${org}/planta/salas`).get()).val()||[];
  const previous=new Map(),replacement=new Map();
  for(const item of [before,after].filter(Boolean)) {
    const t=inicio(item);if(!t)continue;
    const keys=Array.from({length:5},(_,i)=>idEvento({...item,inicio:t+i-2}));
    const snapshots=await Promise.all(keys.map(k=>db.ref(`${root}/eventos/${k}`).get()));
    snapshots.forEach((s,i)=>{if(s.exists())previous.set(keys[i],s.val());});
    const matching=(await db.ref(`organizaciones/${org}/paros`).orderByChild('inicio').startAt(t-2).endAt(t+2).get()).val()||{};
    for(const x of normalizeEvents(matching,rooms).values())if(x.sala===item.sala&&String(x.machine)===String(item.machine||item.maquina).padStart(2,'0'))replacement.set(idEvento(x),x);
  }
  const updates={};const affected=new Map();
  for(const [key,item] of previous){updates[`eventos/${key}`]=null;updates[`abiertos/${key}`]=null;if(cerrado(item))for(const d of diasEntre(inicio(item),Math.max(inicio(item)+1,fin(item,Date.now())))){if(!affected.has(d))affected.set(d,{});affected.get(d)[key]=null;}}
  for(const [key,item] of replacement){updates[`eventos/${key}`]=item;updates[`abiertos/${key}`]=cerrado(item)?null:item;if(cerrado(item))for(const d of diasEntre(inicio(item),Math.max(inicio(item)+1,fin(item,Date.now())))){if(!affected.has(d))affected.set(d,{});affected.get(d)[key]=item;}}
  await db.ref(root).update(updates);
  for(const [day,changes] of affected) {
    const result=await db.ref(`${root}/dias/${day}`).transaction(current=>{
      const data=current||{eventos:{},seq:0};data.eventos||={};
      for(const [k,v] of Object.entries(changes)){if(v)data.eventos[k]=v;else delete data.eventos[k];}
      data.seq=(data.seq||0)+1;return data;
    });
    const data=result.snapshot.val(),summary={...resumenDia(data.eventos,rooms,day),seq:data.seq};
    await db.ref(`${root}/resumenes/${day}`).transaction(current=>(current?.seq||0)>summary.seq?undefined:summary);
  }
  await db.ref(`${root}/meta/revision`).set(ServerValue.increment(1));
}

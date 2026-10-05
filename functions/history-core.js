const number = value => String(value ?? '').padStart(2, '0');
const start = x => Number(x.inicio || x.id) || 0;
const closed = x => Boolean(x.fin) || x.estado === 'atendido' || x.status === 'atendido';
const end = (x, now) => closed(x) ? Number(x.fin) || start(x)+(Number(x.duration)||0)*60000 : now;
const reason = x => x.nombre || x.reason || x.motivo || 'Paro manual';
const collator = new Intl.Collator('es',{numeric:true,sensitivity:'base'});

export function allowedRooms(profile, rooms, members = {}, uid) {
  const member = members[uid] || Object.values(members).find(x=>x.uid===uid || (profile.email && String(x.email||'').toLowerCase()===String(profile.email).toLowerCase()));
  if (member && ['inactivo','revocada'].includes(member.estado)) return [];
  const role = member?.rol || profile.rolTenant;
  const platform = ['superusuario','soporte'].includes(profile.rolPlataforma);
  if (!platform && (!role || role==='operario')) return [];
  const assigned = member?.salas || profile.salasAsignadas || [];
  if (platform || ['owner','superusuario'].includes(role) || (role==='admin'&&!assigned.length)) return rooms;
  return rooms.filter(x=>assigned.includes(x.codigo));
}

function shift(item, room) {
  const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(start(item)));
  const minute=Number(parts.find(x=>x.type==='hour').value)*60+Number(parts.find(x=>x.type==='minute').value);
  const minutes = value => {const [h,m]=String(value||'00:00').split(':').map(Number);return h*60+m;};
  const shifts=room?.turnos?.length?room.turnos:[{inicio:'07:00',fin:'15:00'},{inicio:'15:00',fin:'23:00'},{inicio:'23:00',fin:'07:00'}];
  const i=shifts.findIndex(t=>{const a=minutes(t.inicio),b=minutes(t.fin);return a===b|| (a<b?minute>=a&&minute<b:minute>=a||minute<b);});
  const name=String(shifts[i]?.letra||shifts[i]?.nombre||'').toUpperCase();
  return i<0?'—':(['A','B','C'].includes(name)?name:['A','B','C'][i]||'—');
}

export function normalizeEvents(raw, rooms, input={}) {
  const roomMap=new Map(rooms.filter(s=>!input.sala||s.codigo===input.sala).map(s=>[s.codigo,s]));
  // Une inicio y cierre de un mismo evento, incluso en clientes antiguos (+/-2ms).
  const events=new Map();
  for (const [id,item] of Object.entries(raw||{})) {
    if (!roomMap.has(item.sala)) continue;
    const a=start({...item,id}), machine=number(item.maquina||item.machine);
    if (!Number.isFinite(a) || a<=0 || (input.maquina&&machine!==input.maquina)) continue;
    const prefix=`${item.sala}:${machine}:`;
    const key=[0,-1,1,-2,2].map(delta=>prefix+(a+delta)).find(k=>events.has(k))||prefix+a;
    const previous=events.get(key)||{};
    const done=closed(item)||closed(previous);
    events.set(key,{...previous,...item,id:previous.id||id,machine,inicio:Math.min(a,previous.inicio||a),reason:item.nombre||item.reason||previous.reason||reason(item),fin:item.fin||previous.fin||null,status:done?'atendido':'detenido'});
  }
  return events;
}

export function historyPage(raw, rooms, input, now = Date.now()) {
  const from=Number(input.desde), to=Math.min(Number(input.hasta),now);
  if (!Number.isFinite(from)||!Number.isFinite(to)||from>to) throw new Error('Período inválido.');
  const offset=Number(input.offset||0);
  if (!Number.isInteger(offset)||offset<0||offset>10000000) throw new Error('Página inválida.');
  const roomMap=new Map(rooms.filter(s=>!input.sala||s.codigo===input.sala).map(s=>[s.codigo,s]));
  const events=normalizeEvents(raw,rooms,input);
  let rows=[...events.values()].filter(x=>start(x)<to&&(end(x,now)>from||(start(x)>=from&&end(x,now)===start(x)))&&(!input.razon||x.reason===input.razon)&&(!input.estado||x.status===input.estado));
  const values={sala:x=>roomMap.get(x.sala)?.nombre||x.sala,maquina:x=>x.machine,fecha:start,inicio:start,motivo:x=>x.reason,fin:x=>closed(x)?end(x,now):null,duracion:x=>Math.max(0,Math.min(end(x,now),to)-Math.max(start(x),from)),estado:x=>x.status,turno:x=>shift(x,roomMap.get(x.sala))};
  const order=input.orden||{columna:'fecha',direccion:'desc'};
  const value=values[order.columna];
  if (!value||!['asc','desc'].includes(order.direccion)) throw new Error('Orden inválido.');
  rows.sort((a,b)=>{
    const x=value(a),y=value(b);
    if(x==null||y==null)return x==null?(y==null?0:1):-1;
    const compare=typeof x==='number'&&typeof y==='number'?x-y:collator.compare(String(x),String(y));
    return (order.direccion==='desc'?-compare:compare)||collator.compare(a.id,b.id);
  });
  const total=rows.length;
  const groups=new Map();
  for(const x of rows){const k=`${x.sala}:${x.machine}`;if(!groups.has(k))groups.set(k,[]);groups.get(k).push([Math.max(start(x),from),Math.min(end(x,now),to)]);}
  let tiempoParado=0;
  for(const intervals of groups.values()){let last=null;for(const [a,b] of intervals.sort((x,y)=>x[0]-y[0])){if(b<=a)continue;if(last&&a<=last[1]){tiempoParado+=Math.max(0,b-last[1]);last[1]=Math.max(last[1],b);}else{tiempoParado+=b-a;last=[a,b];}}}
  const cursorIndex=input.cursor?.id?rows.findIndex(x=>x.id===input.cursor.id)+1:0;
  const safeOffset=cursorIndex>0?cursorIndex:total?Math.min(offset,Math.floor((total-1)/100)*100):0;
  return {filas:rows.slice(safeOffset,safeOffset+100),total,offset:safeOffset,tamano:100,totales:{paros:total,tiempoParado}};
}

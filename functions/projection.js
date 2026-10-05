import { createHash } from 'node:crypto';

import { normalizeEvents } from './history-core.js';

import { calcular, inicio, fin, cerrado, motivo, numero, fechaLocal } from './shared/analysis.js';



// El horario y los cortes civiles de la planta se interpretan en Perú.

process.env.TZ='America/Lima';

export const idEvento=x=>createHash('sha256').update(`${x.sala}:${numero(x.machine||x.maquina)}:${inicio(x)}`).digest('hex');

export const diaInicio=dia=>+new Date(`${dia}T00:00:00-05:00`);

export function diasEntre(a,b) {

  const dias=[];for(let t=diaInicio(fechaLocal(a));t<b;t+=86400000)dias.push(fechaLocal(t));return dias;

}

export function resumenDia(eventos,salas,dia,from=diaInicio(dia),to=from+86400000,turno='') {

  const desde=from,hasta=to,ahora=hasta;

  const historial=Object.values(eventos||{});

  const maquinas={};

  for(const s of salas) {

    const ns=new Set([...(s.maquinas||[]).map((m,i)=>numero(m.numero||i+1)),...historial.filter(x=>x.sala===s.codigo).map(x=>numero(x.machine||x.maquina))]);

    for(const n of ns) {

      const options={salas:[s],historial,maquina:n,desde,hasta,ahora,turno};

      const data=calcular(options),m=data.maquinas[0];if(!m)continue;

      const limites=logs=>({entrantes:logs.filter(x=>inicio(x)<desde).map(idEvento),salientes:logs.filter(x=>!cerrado(x)||fin(x,ahora)>hasta).map(idEvento)});
      const motivos=data.motivos.map(r=>({...r,...limites(data.registros.filter(x=>motivo(x)===r.key)),duracionUnion:calcular({...options,razon:r.key}).maquinas[0]?.duracion||0}));

      maquinas[idEvento({sala:s.codigo,machine:n,inicio:1})]={...m,...limites(data.registros),motivos};

    }

  }

  return {maquinas,version:3,...(!turno?{turnos:Object.fromEntries(['A','B','C'].map(t=>[t,resumenDia(eventos,salas,dia,from,to,t)]))}:{})};

}

export function crearProyeccion(raw,salas,now=Date.now()) {

  const eventos=Object.fromEntries([...normalizeEvents(raw,salas).values()].map(x=>[idEvento(x),x]));

  const dias={},abiertos={};

  for(const [key,x] of Object.entries(eventos)) {

    if(!cerrado(x)){abiertos[key]=x;continue;}

    const a=inicio(x),b=Math.max(a+1,fin(x,now));

    for(const d of diasEntre(a,b)) (dias[d]??={})[key]=x;

  }

  const resumenes=Object.fromEntries(Object.entries(dias).map(([d,rows])=>[d,resumenDia(rows,salas,d)]));

  return {eventos,dias:Object.fromEntries(Object.entries(dias).map(([d,eventos])=>[d,{eventos,seq:1}])),abiertos,resumenes,meta:{version:3,ready:true,revision:now,config:JSON.stringify(salas)}};

}



function acumularCuenta(target,part) {
  const duplicados=(part.entrantes||[]).filter(id=>target.vistos.has(id)).length;
  target.paros+=part.paros-duplicados;
  [...part.entrantes||[],...part.salientes||[]].forEach(id=>target.vistos.add(id));
}
export function combinarDias(bloques,salas,input) {
  const machines=new Map(),reasons=new Map();let programado=0,perdido=0;
  for(const bloque of bloques)for(const m of Object.values(bloque?.maquinas||{})) {
    if(!salas.some(s=>s.codigo===m.salaCodigo)||input.sala&&input.sala!==m.salaCodigo||input.maquina&&input.maquina!==m.maquina)continue;
    const selected=(m.motivos||[]).filter(r=>!input.razon||input.razon===r.key);
    const part=input.razon?{paros:selected.reduce((n,r)=>n+r.paros,0),entrantes:selected.flatMap(r=>r.entrantes||[]),salientes:selected.flatMap(r=>r.salientes||[])}:m;
    const loss=input.razon?selected.reduce((n,r)=>n+r.perdido,0):m.perdido;
    programado+=m.programado;perdido+=loss;
    const previous=machines.get(m.key)||{...m,paros:0,duracion:0,programado:0,perdido:0,vistos:new Set()};
    acumularCuenta(previous,part);previous.programado+=m.programado;previous.perdido+=loss;previous.duracion+=input.razon?selected.reduce((n,r)=>n+r.duracionUnion,0):m.duracion;machines.set(m.key,previous);
    for(const r of selected){const group=reasons.get(r.key)||{key:r.key,paros:0,duracion:0,perdido:0,vistos:new Set()};acumularCuenta(group,r);group.duracion+=r.duracion;group.perdido+=r.perdido;reasons.set(r.key,group);}
  }
  const paros=[...machines.values()].reduce((n,m)=>n+m.paros,0);
  return {registros:[],maquinas:[...machines.values()].map(({vistos,motivos,turnos,entrantes,salientes,...m})=>({...m,disponibilidad:m.programado?100*(1-m.perdido/m.programado):null})),motivos:[...reasons.values()].map(({vistos,...r})=>({...r,perdida:programado?100*r.perdido/programado:null})),resumen:{paros,programado,perdido,operativo:Math.max(0,programado-perdido),disponibilidad:programado?100*(1-perdido/programado):null,perdida:programado?100*perdido/programado:null}};
}

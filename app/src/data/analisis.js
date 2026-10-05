import { turnosDe, turnoEnCurso } from '../turno.js';
export const numero = value => String(value ?? '').padStart(2, '0');
export const cerrado = x => Boolean(x.fin) || x.status === 'atendido' || x.estado === 'atendido';
export const inicio = x => Number(x.inicio || x.id) || 0;
export const fin = (x, ahora) => cerrado(x) ? Number(x.fin) || inicio(x) + (Number(x.duration) || 0) * 60000 : ahora;
export const motivo = x => x.reason || x.nombre || x.motivo || 'Paro manual';
export function unir(intervalos) {
  const unidos = [];
  for (const [a,b] of intervalos.filter(([a,b]) => b > a).sort((x,y) => x[0]-y[0])) {
    const ultimo = unidos.at(-1);
    if (ultimo && a <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], b);
    else unidos.push([a,b]);
  }
  return unidos;
}
// Inserción ordenada: evita ordenar todos los intervalos tras cada paro.
export function agregarIntervalos(unidos,nuevas) {
  let aporte=0;
  for(const [a,b] of nuevas) {
    if(b<=a)continue;
    let lo=0,hi=unidos.length;
    while(lo<hi){const mid=(lo+hi)>>1;if(unidos[mid][1]<a)lo=mid+1;else hi=mid;}
    const primero=lo;let x=a,y=b,antes=0;
    while(lo<unidos.length&&unidos[lo][0]<=y){x=Math.min(x,unidos[lo][0]);y=Math.max(y,unidos[lo][1]);antes+=unidos[lo][1]-unidos[lo][0];lo++;}
    unidos.splice(primero,lo-primero,[x,y]);aporte+=y-x-antes;
  }
  return aporte;
}
export const tiempo = ventanas => unir(ventanas).reduce((n,[a,b]) => n+b-a,0);
export function horario(sala, desde, hasta, letra = '') {
  const ventanas = [];
  const dia = new Date(desde); dia.setHours(0,0,0,0); dia.setDate(dia.getDate()-1);
  while (+dia < hasta) {
    for (const t of turnosDe(sala.turnos)) {
      if (letra && t.letra !== letra) continue;
      const a = new Date(dia), b = new Date(dia);
      a.setMinutes(t.inicio); b.setMinutes(t.fin);
      if (t.fin <= t.inicio) b.setDate(b.getDate()+1);
      ventanas.push([Math.max(+a,desde), Math.min(+b,hasta)]);
    }
    dia.setDate(dia.getDate()+1);
  }
  return unir(ventanas);
}
export const interseccion = (a,b,ventanas) => ventanas.map(([x,y]) => [Math.max(a,x),Math.min(b,y)]).filter(([x,y])=>y>x);
export function calcular({ salas, historial, sala = '', maquina = '', razon = '', desde, hasta, ahora, turno = '' }) {
  const permitidas = salas.filter(s => !sala || s.codigo === sala);
  const mapa = new Map(permitidas.map(s => [s.codigo,s]));
  const todos = historial.filter(x => mapa.has(x.sala) && (!maquina || numero(x.machine || x.maquina) === maquina) && inicio(x) > 0 && inicio(x) < hasta && (fin(x,ahora)>desde||(inicio(x)>=desde&&fin(x,ahora)===inicio(x)))).sort((a,b)=>inicio(b)-inicio(a));
  const registros = todos.filter(x => !razon || motivo(x) === razon);
  const maquinas = [];
  const motivos = new Map();
  let programado = 0;
  for (const s of permitidas) {
    const ventanas = horario(s,desde,hasta,turno);
    const catalogo = new Set((s.maquinas || []).map((m,i)=>numero(m.numero || i+1)));
    const numeros = new Set([...catalogo,...registros.filter(x=>x.sala===s.codigo).map(x=>numero(x.machine || x.maquina))]);
    for (const n of numeros) {
      if (maquina && n!==maquina) continue;
      const logs = todos.filter(x=>x.sala===s.codigo && numero(x.machine || x.maquina)===n);
      const elegidos = logs.filter(x => !razon || motivo(x) === razon);
      const base = catalogo.has(n) ? tiempo(ventanas) : 0;
      const clips = elegidos.map(x=>[Math.max(inicio(x),desde),Math.min(fin(x,ahora),hasta)]);
      let perdido = 0;
      programado += base;
      // Asignar solapamientos una sola vez, al primer paro registrado.
      const ocupadas = [];
      for (const x of [...logs].sort((a,b)=>inicio(a)-inicio(b))) {
        const key = motivo(x);
        const nuevas=interseccion(inicio(x),fin(x,ahora),ventanas);
        const incorporado=agregarIntervalos(ocupadas,nuevas);
        const aporte = base > 0 ? incorporado : 0;
        if (!razon || key === razon) {
          if (!motivos.has(key)) motivos.set(key,{key,paros:0,duracion:0,perdido:0});
          const grupo=motivos.get(key); grupo.paros++;
          grupo.duracion+=Math.max(0,Math.min(fin(x,ahora),hasta)-Math.max(inicio(x),desde));
          grupo.perdido+=aporte;
          perdido+=aporte;
        }
      }
      maquinas.push({ key:`${s.codigo}:${n}`, sala:s.nombre, salaCodigo:s.codigo, maquina:n, paros:elegidos.length, duracion:tiempo(clips), programado:base, perdido, disponibilidad:base>0?100*(1-perdido/base):null });
    }
  }
  const perdido = maquinas.reduce((n,x) => n+x.perdido,0);
  return { registros, maquinas, motivos:[...motivos.values()].map(x=>({...x,perdida:programado>0?100*x.perdido/programado:null})), resumen:{paros:registros.length, programado, perdido, operativo:Math.max(0,programado-perdido), disponibilidad:programado>0?100*(1-perdido/programado):null, perdida:programado>0?100*perdido/programado:null} };
}
export function letraTurno(x, salas) {
  if (!inicio(x)) return '—';
  const letra=turnoEnCurso(turnosDe(salas.find(s=>s.codigo===x.sala)?.turnos),new Date(inicio(x)))?.letra;
  return ['A','B','C'].includes(letra)?letra:'—';
}

// Fechas locales: ISO UTC desplazaría el día en Perú durante la madrugada.
export function fechaLocal(valor) {
  const d = new Date(valor);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function fechasPeriodo(periodo, ahora = Date.now()) {
  const hasta = new Date(ahora), desde = new Date(ahora);
  if (periodo === 'ayer') { hasta.setDate(hasta.getDate()-1); desde.setDate(desde.getDate()-1); }
  if (periodo === 'semana') desde.setDate(desde.getDate()-((desde.getDay()+6)%7));
  if (periodo === 'mes') desde.setDate(1);
  if (periodo === 'semanaAnterior') {
    desde.setDate(desde.getDate()-((desde.getDay()+6)%7)-7);
    hasta.setTime(+desde); hasta.setDate(hasta.getDate()+6);
  }
  if (periodo === 'mesAnterior') {
    desde.setDate(1); desde.setMonth(desde.getMonth()-1);
    hasta.setDate(0);
  }
  return { desde:fechaLocal(desde), hasta:fechaLocal(hasta) };
}
export function limitesPeriodo(desde, hasta, ahora) {
  const a = +new Date(`${desde}T00:00:00`), final = new Date(`${hasta}T00:00:00`);
  final.setDate(final.getDate()+1);
  return {desde:a, hasta:Math.min(+final,ahora), invalido:!Number.isFinite(a)||!Number.isFinite(+final)||desde>hasta||a>ahora};
}
const diaMes = d => `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}`;
export function evolucion({periodo,desdeFecha,hastaFecha,...opciones}) {
  const desde = new Date(`${desdeFecha}T00:00:00`);
  const final = new Date(`${hastaFecha}T00:00:00`); final.setDate(final.getDate()+1);
  // El eje muestra la semana/mes completos aunque el corte de datos sea hoy.
  if (periodo === 'semana') { final.setTime(+desde); final.setDate(final.getDate()+7); }
  if (periodo === 'mes') { final.setTime(+desde); final.setMonth(final.getMonth()+1,1); }
  const porTurno = desdeFecha === hastaFecha && !['semana','mes'].includes(periodo);
  const porSemana = ['mes','mesAnterior'].includes(periodo) || (+final- +desde)>31*86400000;
  const grupos=[];
  const agregar=(label,a,b,turno='')=>{
    const corte = Math.min(b,opciones.hasta,opciones.ahora);
    const resumen = corte>a ? calcular({...opciones,desde:a,hasta:corte,turno}).resumen : null;
    grupos.push({label,desde:a,hasta:b,...resumen,disponibilidad:resumen?.disponibilidad??null});
  };
  if (porTurno) {
    for (const letra of ['A','B','C']) agregar(letra,+desde,+final,letra);
  } else {
    for (const d=new Date(desde);+d<+final;) {
      const siguiente = new Date(d);
      siguiente.setDate(siguiente.getDate()+(porSemana ? (7-(siguiente.getDay()+6)%7) : 1));
      agregar(['semana','semanaAnterior'].includes(periodo)?['Do','Lu','Ma','Mi','Ju','Vi','Sá'][d.getDay()]:diaMes(d),+d,Math.min(+siguiente,+final));
      d.setTime(+siguiente);
    }
  }
  return {tipo:porTurno?'turnos':porSemana?'semanas':'dias',grupos};
}

const comparador = new Intl.Collator('es',{numeric:true,sensitivity:'base'});
export function ordenarFilas(filas, columnas, orden) {
  const columna = columnas.find(c=>c.id===orden.columna);
  if (!columna) return filas;
  return [...filas].sort((a,b)=>{
    const x=columna.valor(a), y=columna.valor(b);
    if (x==null || y==null) return x==null?(y==null?0:1):-1;
    const resultado=typeof x==='number'&&typeof y==='number'?x-y:comparador.compare(String(x),String(y));
    return orden.direccion==='desc'?-resultado:resultado;
  });
}

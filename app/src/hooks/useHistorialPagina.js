import { useEffect, useRef, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, {auth,rtdb} from '../firebase';
import { onValue, ref } from 'firebase/database';
const consultar=httpsCallable(getFunctions(app,'us-central1'),'historialPagina');
export default function useHistorialPagina({activo,org,desde,hasta,sala,maquina,razon,estado,orden,offset,revision=0,vista='historial',periodo='hoy'}) {
  const [datos,setDatos]=useState({org:null,filas:[],total:0,offset:0,cargando:false,error:null});
  const [version,setVersion]=useState(0),[tick,setTick]=useState(0);
  const cursors=useRef({}),fingerprint=useRef(''),manual=useRef(revision);
  useEffect(()=>{if(!activo||!org)return;return onValue(ref(rtdb,`organizaciones/${org}/analisis/meta/revision`),s=>setVersion(s.val()||0),()=>{});},[activo,org]);
  useEffect(()=>{if(!activo||hasta<Date.now())return;const timer=setInterval(()=>setTick(v=>v+1),60000);return()=>clearInterval(timer);},[activo,hasta]);
  useEffect(()=>{
    if(!activo||!org)return;
    let vigente=true;
    const abort=new AbortController();
    setDatos({org,filas:[],total:0,offset:0,cargando:true,error:null});
    const key=JSON.stringify({org,desde,hasta,sala,maquina,razon,estado,orden,vista,periodo,version,revision,tick});if(fingerprint.current!==key){fingerprint.current=key;cursors.current={};}
    const reconstruir=import.meta.env.DEV&&manual.current!==revision;manual.current=revision;
    const input={org,desde,hasta,sala,maquina,razon,estado,orden,offset,vista,periodo,cursor:cursors.current[offset]||null,reconstruir};
    (async()=>{
      try {
        let result;
        if(import.meta.env.DEV){
          const token=await auth.currentUser?.getIdToken();
          const response=await fetch('/api/analisis/historial',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(input),signal:abort.signal});
          result=await response.json();if(!response.ok)throw new Error(result.error);
        }else result=(await consultar(input)).data;
        if(vigente){if(result.cursor)cursors.current[result.offset+result.tamano]=result.cursor;setDatos({...result,org,filas:result.filas||[],total:result.total||0,cargando:false,error:null});}
      }catch(error){if(vigente)setDatos({org,filas:[],total:0,offset:0,cargando:false,error:import.meta.env.DEV?error.message:'No se pudo cargar este bloque. Comprueba que la función historialPagina esté desplegada.'});}
    })();
    return()=>{vigente=false;abort.abort();};
  },[activo,org,desde,hasta,sala,maquina,razon,estado,orden.columna,orden.direccion,offset,revision,vista,periodo,version,tick]);
  return activo && org && datos.org === org ? datos : {filas:[],total:0,offset:0,cargando:Boolean(activo && org),error:null};
}

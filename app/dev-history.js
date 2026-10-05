import { allowedRooms } from '../functions/history-core.js';
import { consultarAnalisis } from '../functions/analysis-service.js';
const sesiones=new Map();
const base='https://smart-view.firebaseio.com';
const apiKey='AIzaSyBbqb3PTi-ICWczxR4yKQ6k5bTW9s6_q0Y';
export default function historyApi() {
  return {name:'history-pagination-api',configureServer(server) {
    server.middlewares.use('/api/analisis/historial',async(req,res)=>{
      res.setHeader('Content-Type','application/json'); res.setHeader('Cache-Control','no-store');
      try {
        if(req.method!=='POST') {res.statusCode=405;res.end(JSON.stringify({error:'Método no permitido.'}));return;}
        const token=req.headers.authorization?.replace(/^Bearer /,'');
        if(!token)throw new Error('Inicia sesión para consultar el historial.');
        let body='';for await(const chunk of req){body+=chunk;if(body.length>16384)throw new Error('Solicitud demasiado grande.');}
        const input=JSON.parse(body);
        if(!/^[A-Za-z0-9_-]{1,100}$/.test(input.org||''))throw new Error('Organización inválida.');
        let uid=sesiones.get(token)?.until>Date.now()?sesiones.get(token).uid:null;
        if(!uid){const identity=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token}),signal:AbortSignal.timeout(15000)});
        uid=(await identity.json()).users?.[0]?.localId;
        if(uid){sesiones.set(token,{uid,until:Date.now()+60000});while(sesiones.size>100)sesiones.delete(sesiones.keys().next().value);}}
        if(!uid)throw new Error('La sesión expiró. Vuelve a entrar.');
        const read=async(path,range)=>{const query=range?`&orderBy=${encodeURIComponent(JSON.stringify("$key"))}&startAt=${encodeURIComponent(JSON.stringify(range.desde))}&endAt=${encodeURIComponent(JSON.stringify(range.hasta))}`:"";const response=await fetch(`${base}/${path}.json?auth=${encodeURIComponent(token)}${query}`,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('No se pudo consultar Firebase.');return response.json();};
        const profile=await read(`usuarios/${uid}`);
        if(profile?.tenantId!==input.org&&!['superusuario','soporte'].includes(profile?.rolPlataforma))throw new Error('Sin acceso a esta organización.');
        const [rooms,members]=await Promise.all([read(`organizaciones/${input.org}/planta/salas`),read(`organizaciones/${input.org}/miembros`)]);
        const permitted=allowedRooms(profile,rooms||[],members||{},uid);
        if(!permitted.length)throw new Error('Sin acceso al análisis de salas.');
        const write=async(path,value)=>{const response=await fetch(`${base}/${path}.json?auth=${encodeURIComponent(token)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(value),signal:AbortSignal.timeout(60000)});if(!response.ok)throw new Error('No se pudo preparar el índice de análisis.');};
        res.end(JSON.stringify(await consultarAnalisis({read,write,allowRebuild:true},input.org,permitted,rooms||[],input)));
      } catch(error) {res.statusCode=400;res.end(JSON.stringify({error:error.message||'No se pudo cargar el historial.'}));}
    });
  }};
}

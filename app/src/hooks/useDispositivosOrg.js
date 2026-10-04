import { useEffect, useMemo, useState } from "react";
import { onValue, ref, set, update } from "firebase/database";
import { rtdb } from "../firebase";
const KEY="smartview-device-id", ONLINE=150000;
function localId(){let id=localStorage.getItem(KEY);if(!id){id=(globalThis.crypto?.randomUUID?.()||("web-"+Date.now()+"-"+Math.random().toString(36).slice(2))).replace(/[.#$\[\]\/]/g,"-");localStorage.setItem(KEY,id)}return id}
function deviceType(){const ua=navigator.userAgent||"";if(/iPad|Tablet|Android(?!.*Mobile)/i.test(ua))return"tablet";if(/Mobi|iPhone|Android/i.test(ua))return"movil";return"desktop"}
function deviceName(t){return t==="movil"?"Móvil":t==="tablet"?"Tablet":"Computadora"}
export const contarConectados=(items=[])=>items.filter(x=>x.estado==="Conectado").length;
export default function useDispositivosOrg(org,user,profile){
 const [data,setData]=useState({});
 useEffect(()=>{if(!org)return;return onValue(ref(rtdb,"organizaciones/"+org+"/dispositivos"),s=>setData(s.val()||{}))},[org]);
 useEffect(()=>{if(!org||!user?.uid)return;const id=localId(),t=deviceType(),base=ref(rtdb,"organizaciones/"+org+"/dispositivos/"+id);
  const ping=async()=>{const now=Date.now();await update(base,{id,tipo:t,nombre:deviceName(t),usuario:profile?.nombre||user.displayName||user.email||"",uid:user.uid,ultima:now});await set(ref(rtdb,"organizaciones/"+org+"/dispositivos/"+id+"/historial/"+now),now)};
  ping().catch(()=>{});const timer=setInterval(()=>ping().catch(()=>{}),60000);const visible=()=>{if(document.visibilityState==="visible")ping().catch(()=>{})};document.addEventListener("visibilitychange",visible);return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",visible)}
 },[org,user?.uid,profile?.nombre,user?.displayName,user?.email]);
 return useMemo(()=>Object.entries(data).map(([id,x])=>{const ultima=Number(x.ultima||0);return {...x,id:x.id||id,ultima,historial:Object.values(x.historial||{}).map(Number).filter(Boolean).sort((a,b)=>b-a),estado:Date.now()-ultima<=ONLINE?"Conectado":"Desconectado"}}).sort((a,b)=>b.ultima-a.ultima),[data]);
}
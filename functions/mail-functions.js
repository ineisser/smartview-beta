import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getDatabase } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';
import { createHash, randomUUID } from 'node:crypto';
import { APP_URL, invitationEmail, emailTemplate, sendEmail } from './email-service.js';
const key=defineSecret('RESEND_API_KEY');
const read=async path=>(await getDatabase().ref(path).get()).val();
async function invitation(token) {
  if(!/^[a-zA-Z0-9_-]{1,128}$/.test(token||''))throw new HttpsError('invalid-argument','Código de invitación inválido.');
  const data=await read(`invitaciones/${token}`);
  if(!data||data.estado==='revocada'||data.expira<=Date.now())throw new HttpsError('failed-precondition','La invitación no existe, venció o fue revocada.');
  return {...data,token};
}
export const consultarInvitacion=onCall({region:'us-central1',maxInstances:4},async request=>{
  const data=await invitation(request.data?.token);
  let existing=false;
  try { await getAuth().getUserByEmail(data.email);existing=true; } catch(error) { if(error.code!=='auth/user-not-found')throw error; }
  return {...data,cuentaExistente:existing};
});
export const enviarInvitacion=onCall({region:'us-central1',maxInstances:4,secrets:[key]},async request=>{
  if(!request.auth)throw new HttpsError('unauthenticated','Inicia sesión.');
  const invite=await invitation(request.data?.token);
  if(invite.estado!=='pendiente')throw new HttpsError('failed-precondition','La invitación ya fue aceptada.');
  const [actor,profile]=await Promise.all([read(`organizaciones/${invite.orgCodigo}/miembros/${request.auth.uid}`),read(`usuarios/${request.auth.uid}`)]);
  if(profile?.rolPlataforma!=='superusuario'&&!(actor?.estado==='activo'&&['owner','admin','superusuario'].includes(actor.rol)))throw new HttpsError('permission-denied','No administras esta planta.');
  if(invite.correo?.id)return {id:invite.correo.id,estado:'enviado'};
  const lock=getDatabase().ref(`correoLocks/${invite.token}`),nonce=randomUUID();
  if(!(await lock.transaction(v=>v?.expires>Date.now()?undefined:{nonce,expires:Date.now()+60000})).committed)throw new HttpsError('aborted','El correo se está enviando. Espera y reintenta.');
  try {
    const id=await sendEmail(key.value(),{to:invite.email,...invitationEmail(invite)},`smartview-invitation-${invite.token}`);
    const correo={id,estado:'enviado',proveedor:'resend',enviadoEn:Date.now()};
    const updates={[`invitaciones/${invite.token}/correo`]:correo};
    if(invite.orgCodigo)updates[`organizaciones/${invite.orgCodigo}/invitaciones/${invite.token}/correo`]=correo;
    await getDatabase().ref().update(updates);
    return {id,estado:'enviado'};
  } catch { throw new HttpsError('unavailable','No se pudo enviar el correo. La invitación sigue lista para copiar o reintentar.'); }
  finally { await lock.transaction(v=>v?.nonce===nonce?null:undefined); }
});
export const solicitarRecuperacion=onCall({region:'us-central1',maxInstances:4,secrets:[key]},async request=>{
  const email=String(request.data?.email||'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new HttpsError('invalid-argument','Correo inválido.');
  const hash=value=>createHash('sha256').update(value).digest('hex');
  const ip=request.rawRequest?.ip||'unknown';
  const rate=getDatabase().ref(`correoRate/${hash(ip)}/${Math.floor(Date.now()/3600000)}`);
  if(!(await rate.transaction(v=>(Number(v)||0)>=10?undefined:(Number(v)||0)+1)).committed)throw new HttpsError('resource-exhausted','Demasiadas solicitudes. Intenta más tarde.');
  const lease=getDatabase().ref(`correoRecuperacion/${hash(email)}`);
  if(!(await lease.transaction(v=>v>Date.now()-60000?undefined:Date.now())).committed)return {ok:true};
  try {
    const generated=await getAuth().generatePasswordResetLink(email);
    const code=new URL(generated).searchParams.get('oobCode');
    const link=`${APP_URL}/restablecer-contrasena?oobCode=${encodeURIComponent(code)}`;
    await sendEmail(key.value(),{to:email,subject:'Restablece tu contraseña de SmartView',text:`Restablece tu contraseña: ${link}. Si no lo solicitaste, ignora este correo.`,html:emailTemplate({title:'Restablece tu contraseña',greeting:'Hola.',text:'Recibimos una solicitud para cambiar tu contraseña de SmartView. Este cambio afecta a tu cuenta, que puedes utilizar en todas tus plantas.',link,button:'Crear nueva contraseña'})},`smartview-reset-${hash(code)}`);
  } catch(error) { if(error.code!=='auth/user-not-found')throw new HttpsError('unavailable','No se pudo procesar la solicitud. Intenta más tarde.'); }
  return {ok:true};
});
export const solicitarAccesoCorreo=onCall({region:'us-central1',maxInstances:4,secrets:[key]},async request=>{
  const email=String(request.data?.email||'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new HttpsError('invalid-argument','Correo inválido.');
  const hash=value=>createHash('sha256').update(value).digest('hex');
  const rate=getDatabase().ref(`correoRate/${hash(request.rawRequest?.ip||'unknown')}/${Math.floor(Date.now()/3600000)}`);
  if(!(await rate.transaction(v=>(Number(v)||0)>=10?undefined:(Number(v)||0)+1)).committed)throw new HttpsError('resource-exhausted','Demasiadas solicitudes. Intenta más tarde.');
  const lease=getDatabase().ref(`correoAcceso/${hash(email)}`);
  if(!(await lease.transaction(v=>v>Date.now()-60000?undefined:Date.now())).committed)return {ok:true};
  try {
    await getAuth().getUserByEmail(email);
    const link=await getAuth().generateSignInWithEmailLink(email,{url:`${APP_URL}/acceso-correo`,handleCodeInApp:true});
    await sendEmail(key.value(),{to:email,subject:'Tu enlace de acceso a SmartView',text:`Entra a SmartView: ${link}. Si no lo solicitaste, ignora este correo.`,html:emailTemplate({title:'Entra a SmartView',greeting:'Hola.',text:'Solicitaste un enlace para entrar a tu cuenta. Tus credenciales y accesos a las plantas se conservarán.',link,button:'Entrar a SmartView'})},`smartview-login-${hash(link)}`);
  } catch(error) { if(error.code!=='auth/user-not-found')throw new HttpsError('unavailable','No se pudo procesar la solicitud. Intenta más tarde.'); }
  return {ok:true};
});

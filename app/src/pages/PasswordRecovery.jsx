import { useEffect,useState } from 'react';
import { Link,useSearchParams } from 'react-router-dom';
import { getFunctions,httpsCallable } from 'firebase/functions';
import { verifyPasswordResetCode,confirmPasswordReset } from 'firebase/auth';
import { auth } from '../firebase';
import Screen from '../components/Screen';
import PasswordField from '../components/PasswordField';
export default function PasswordRecovery(){
  const [params]=useSearchParams(),code=params.get('oobCode');
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[repeat,setRepeat]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[valid,setValid]=useState(false);
  useEffect(()=>{if(!code)return;let live=true;verifyPasswordResetCode(auth,code).then(email=>{if(live){setEmail(email);setValid(true);}}).catch(()=>{if(live)setError('Este enlace venció o ya se utilizó. Solicita otro.');});return()=>{live=false;};},[code]);
  const submit=async e=>{e.preventDefault();setError('');if(code&&password!==repeat){setError('Las contraseñas no coinciden.');return;}setBusy(true);try{if(code)await confirmPasswordReset(auth,code,password);else await httpsCallable(getFunctions(auth.app,'us-central1'),'solicitarRecuperacion')({email});setDone(true);}catch{setError('No se pudo completar la solicitud. Revisa los datos e intenta más tarde.');}finally{setBusy(false);}};
  return <Screen title={code?'Crea tu nueva contraseña':'Recuperar contraseña'} lede={code?'La contraseña de tu cuenta sirve para todas tus plantas.':'Recibirás un correo personalizado de SmartView si esta dirección tiene una cuenta.'}>{done?<div className="stack"><p role="status">{code?'Tu contraseña se actualizó. Ya puedes iniciar sesión.':'Si el correo tiene una cuenta, enviamos las instrucciones. Revisa también Spam.'}</p><Link className="btn btn-primary" to="/login">Volver a Entrar</Link></div>:<form className="stack" onSubmit={submit}>{code?<><p>{email}</p><PasswordField label="Nueva contraseña" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/><PasswordField label="Confirmar contraseña" autoComplete="new-password" value={repeat} onChange={e=>setRepeat(e.target.value)}/></>:<label className="field"><span>Correo</span><input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>}{error&&<p role="alert" className="error">{error}</p>}<button className="btn btn-primary" disabled={busy||(code&&!valid)}>{busy?'Procesando…':code?'Guardar contraseña':'Enviar instrucciones'}</button><Link to="/login">Volver a Entrar</Link></form>}</Screen>;
}

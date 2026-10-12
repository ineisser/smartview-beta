import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Screen from '../components/Screen';
export default function InvitationCode(){
  const [code,setCode]=useState(''),[error,setError]=useState('');const navigate=useNavigate();
  return <Screen title="Aceptar invitación" lede="Pega el código que te compartió el administrador de la planta."><form className="stack" onSubmit={e=>{e.preventDefault();const token=code.trim();if(!/^[a-zA-Z0-9_-]{1,128}$/.test(token)){setError('Revisa el código e inténtalo de nuevo.');return;}navigate(`/invitar/${token}`);}}><label className="field"><span>Código de invitación</span><input required autoComplete="off" spellCheck={false} value={code} onChange={e=>setCode(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<button className="btn btn-primary">Continuar</button><Link to="/login">Volver a Entrar</Link></form></Screen>;
}

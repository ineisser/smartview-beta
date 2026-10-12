import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '../firebase';
import Screen from '../components/Screen';

export default function EmailLinkLogin() {
  const [email, setEmail] = useState(''), [repeat, setRepeat] = useState(''), [error, setError] = useState(''), [sent, setSent] = useState(false), [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const finishing = isSignInWithEmailLink(auth, window.location.href);
  const submit = async event => {
    event.preventDefault(); setError('');
    if (finishing && email.trim().toLowerCase() !== repeat.trim().toLowerCase()) { setError('Los correos no coinciden.'); return; }
    setBusy(true);
    try {
      if (finishing) { await signInWithEmailLink(auth, email.trim().toLowerCase(), window.location.href); navigate('/continuar', { replace: true }); }
      else { await httpsCallable(getFunctions(auth.app,'us-central1'),'solicitarAccesoCorreo')({email}); setSent(true); }
    } catch { setError('No se pudo completar el acceso por correo. Revisa el enlace o utiliza tu método habitual para entrar.'); }
    finally { setBusy(false); }
  };
  return <Screen title={finishing ? 'Confirma tu correo' : 'Entrar con un enlace'} lede={finishing ? 'Escribe el correo que recibió el enlace para entrar.' : 'Te enviaremos un enlace para entrar sin contraseña.'}><form className="stack" onSubmit={submit}><label className="field"><span>Correo</span><input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>{finishing && <label className="field"><span>Confirma tu correo</span><input type="email" required value={repeat} onChange={e => setRepeat(e.target.value)} /></label>}{error && <p role="alert" className="error">{error}</p>}{sent && <p role="status">Si el correo tiene una cuenta, enviamos un enlace de acceso. Revisa tu correo y abre el enlace para entrar.</p>}<button className="btn btn-primary" disabled={busy || sent}>{busy ? 'Procesando…' : finishing ? 'Confirmar y entrar' : 'Enviar enlace de acceso'}</button><Link to="/login">Volver a Entrar</Link></form></Screen>;
}

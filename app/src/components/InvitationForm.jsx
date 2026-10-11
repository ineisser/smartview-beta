import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { correoValido, PERFILES_INVITACION } from '../access';
import Button from './Button';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { auth } from '../firebase';

// Both entry points share validation, room assignment and invitation results.
export default function InvitationForm({ orgCodigo, orgNombre, salas = [], enviarCorreo = true }) {
  const { crearInvitacion } = useAuth();
  const blank = () => ({ id: crypto.randomUUID(), nombre: '', email: '', rol: 'operario', salas: [], enlace: '', enviado: false, error: '' });
  const [rows, setRows] = useState(() => [blank()]);
  const [busy, setBusy] = useState(false);
  const patch = (id, value) => setRows(list => list.map(row => row.id === id ? { ...row, ...value } : row));
  const submit = async event => {
    event.preventDefault(); setBusy(true);
    try {
      for (const row of rows.filter(r => !r.enlace || (enviarCorreo && !r.enviado))) {
        if (row.nombre.trim().length < 2 || !correoValido(row.email) || !row.salas.length) { patch(row.id, { error: 'Completa el nombre, un correo válido y al menos una sala.' }); continue; }
        try {
          const enlace = row.enlace || `${window.location.origin}/invitar/${(await crearInvitacion({ ...row, orgCodigo, orgNombre, tipo: 'tenant' })).token}`;
          patch(row.id, { enlace, error: '' });
          if (enviarCorreo) {
            try {
              await sendSignInLinkToEmail(auth, row.email.trim().toLowerCase(), { url: enlace, handleCodeInApp: true });
              patch(row.id, { enviado: true });
            } catch (mailError) {
              patch(row.id, { error: mailError.code === 'auth/operation-not-allowed' ? 'La invitación se creó, pero Firebase no tiene habilitado el acceso por enlace de correo. Comparte el enlace o habilita ese método para enviarlo.' : 'La invitación se creó, pero no se pudo enviar el correo. Puedes reintentar el envío o compartir el enlace.' });
            }
          }
        } catch (error) { patch(row.id, { error: error.message || 'No se pudo generar la invitación.' }); }
      }
    } finally { setBusy(false); }
  };
  return <form className="invitaciones-form" onSubmit={submit}>
    {rows.map((row, index) => <div key={row.id} className="invitacion-colaborador"><fieldset disabled={busy || Boolean(row.enlace)}>
      <legend>Colaborador {index + 1}</legend>
      <div className="invitaciones-campos">
        <label>Nombre<input required value={row.nombre} onChange={e => patch(row.id, { nombre: e.target.value })} /></label>
        <label>Correo<input required type="email" value={row.email} onChange={e => patch(row.id, { email: e.target.value })} /></label>
        <label>Perfil<select value={row.rol} onChange={e => patch(row.id, { rol: e.target.value })}>{PERFILES_INVITACION.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
      </div>
      <div className="invitaciones-salas" role="group" aria-label="Salas asignadas"><span className="invitaciones-salas-titulo">Salas asignadas</span><span className="invitaciones-ayuda">Selecciona las salas a las que tendrá acceso.</span>{salas.map(sala => <label key={sala.codigo}><input type="checkbox" checked={row.salas.includes(sala.codigo)} onChange={e => patch(row.id, { salas: e.target.checked ? [...row.salas, sala.codigo] : row.salas.filter(s => s !== sala.codigo) })} /><span>{sala.nombre}</span></label>)}</div>
      {row.error && <p role="alert">{row.error}</p>}
    </fieldset>
      {row.enlace && <div className="invitacion-resultado" role="status"><strong>{row.enviado ? `Invitaste a ${row.nombre}` : `Invitación creada para ${row.nombre}`}</strong><p>{row.enviado ? `Firebase aceptó el envío del enlace a ${row.email}. Podrá abrirlo para confirmar su correo y entrar a ${orgNombre}.` : 'El enlace está listo para compartir con este colaborador.'}</p><a href={row.enlace}>Abrir enlace de invitación</a><Button variant="ghost" disabled={false} onClick={() => navigator.clipboard.writeText(row.enlace).then(() => patch(row.id, { copiado: true })).catch(() => patch(row.id, { error: 'No se pudo copiar. Abre el enlace y cópialo desde el navegador.' }))}>{row.copiado ? 'Enlace copiado' : 'Copiar enlace'}</Button></div>}
    </div>)}
    <div className="invitaciones-acciones"><Button variant="ghost" disabled={busy} onClick={() => setRows(list => [...list, blank()])}>Agregar otro colaborador</Button><Button type="submit" disabled={busy || rows.every(r => enviarCorreo ? r.enviado : r.enlace)}>{busy ? 'Enviando…' : rows.some(r => r.enlace && !r.enviado) ? 'Reintentar envío' : rows.filter(r => !r.enlace).length > 1 ? 'Agregar colaboradores' : 'Agregar colaborador'}</Button></div>
    <p className="nota-vacio">Las invitaciones caducan en 7 días. El acceso se activa cuando el colaborador acepta.</p>
  </form>;
}

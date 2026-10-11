import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { correoValido, PERFILES_INVITACION } from '../access';
import Button from './Button';

// Both entry points share validation, room assignment and invitation results.
export default function InvitationForm({ orgCodigo, orgNombre, salas = [] }) {
  const { crearInvitacion } = useAuth();
  const blank = () => ({ id: crypto.randomUUID(), nombre: '', email: '', rol: 'operario', salas: [], enlace: '', error: '' });
  const [rows, setRows] = useState(() => [blank()]);
  const [busy, setBusy] = useState(false);
  const patch = (id, value) => setRows(list => list.map(row => row.id === id ? { ...row, ...value } : row));
  const submit = async event => {
    event.preventDefault(); setBusy(true);
    try {
      for (const row of rows.filter(r => !r.enlace)) {
        if (row.nombre.trim().length < 2 || !correoValido(row.email) || !row.salas.length) { patch(row.id, { error: 'Completa el nombre, un correo válido y al menos una sala.' }); continue; }
        try {
          const invitation = await crearInvitacion({ ...row, orgCodigo, orgNombre, tipo: 'tenant' });
          patch(row.id, { enlace: `${window.location.origin}/invitar/${invitation.token}`, error: '' });
        } catch (error) { patch(row.id, { error: error.message || 'No se pudo generar la invitación.' }); }
      }
    } finally { setBusy(false); }
  };
  return <form className="invitaciones-form" onSubmit={submit}>
    {rows.map((row, index) => <fieldset key={row.id} disabled={busy || Boolean(row.enlace)}>
      <legend>Colaborador {index + 1}</legend>
      <div className="invitaciones-campos">
        <label>Nombre<input required value={row.nombre} onChange={e => patch(row.id, { nombre: e.target.value })} /></label>
        <label>Correo<input required type="email" value={row.email} onChange={e => patch(row.id, { email: e.target.value })} /></label>
        <label>Perfil<select value={row.rol} onChange={e => patch(row.id, { rol: e.target.value })}>{PERFILES_INVITACION.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
      </div>
      <div className="invitaciones-salas" aria-label="Salas asignadas">{salas.map(sala => <label key={sala.codigo}><input type="checkbox" checked={row.salas.includes(sala.codigo)} onChange={e => patch(row.id, { salas: e.target.checked ? [...row.salas, sala.codigo] : row.salas.filter(s => s !== sala.codigo) })} />{sala.nombre}</label>)}</div>
      {row.error && <p role="alert">{row.error}</p>}
      {row.enlace && <p role="status">Invitación lista: <a href={row.enlace}>{row.enlace}</a></p>}
    </fieldset>)}
    <div className="invitaciones-acciones"><Button variant="ghost" disabled={busy} onClick={() => setRows(list => [...list, blank()])}>Agregar otro colaborador</Button><Button type="submit" disabled={busy || rows.every(r => r.enlace)}>{busy ? 'Generando…' : 'Generar invitaciones'}</Button></div>
    <p className="nota-vacio">Comparte cada enlace con su destinatario. Caduca en 7 días.</p>
  </form>;
}

import { randomUUID } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';

const fail = (code, message) => { throw new HttpsError(code, message); };
export const active = member => member?.estado === 'activo';
export const platform = profile => ['superusuario', 'soporte'].includes(profile?.rolPlataforma);
const read = async (db, path) => (await db.ref(path).get()).val();
const validKey = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
export async function manageAccess(db, request) {
  if (!request.auth) fail('unauthenticated', 'Inicia sesión.');
  const { uid, token: identity } = request.auth;
  const input = request.data || {};
  const profile = await read(db, `usuarios/${uid}`) || {};
  let invite;
  if (['aceptar', 'revocar'].includes(input.action)) {
    if (!validKey(input.token)) fail('invalid-argument', 'Invitación inválida.');
    invite = await read(db, `invitaciones/${input.token}`);
    if (!invite) fail('not-found', 'Esta invitación no existe.');
    input.orgCodigo = invite.tipo === 'plataforma' ? '__plataforma' : invite.orgCodigo;
  }
  const org = input.tipo === 'plataforma' ? '__plataforma' : input.orgCodigo;
  if (!validKey(org)) fail('invalid-argument', 'Planta inválida.');
  // Serialize administrative edits and acceptance without transacting the plant's history.
  const lock = db.ref(`accesosLocks/${org}`), nonce = randomUUID();
  const acquired = await lock.transaction(value => value?.expires > Date.now() ? undefined : { nonce, expires: Date.now() + 120000 });
  if (!acquired.committed) fail('aborted', 'La planta está guardando otro cambio. Inténtalo de nuevo.');
  try {
    const members = await read(db, `organizaciones/${org}/miembros`) || {};
    const actor = members[uid];
    const authorized = profile.rolPlataforma === 'superusuario' || (active(actor) && ['owner', 'admin', 'superusuario'].includes(actor.rol));
    const updates = {};
    const entry = member => ({ nombre: input.orgNombre || '', rol: member.rol, estado: member.estado, salas: member.salas || [] });
    if (org === '__plataforma') {
      if (input.action === 'crear') {
        if (profile.rolPlataforma !== 'superusuario' || input.rol !== 'soporte') fail('permission-denied', 'Solo el superusuario invita soporte.');
        const email = String(input.email || '').trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('invalid-argument', 'Correo inválido.');
        const token = randomUUID().replaceAll('-', ''), data = { token, email, rol: 'soporte', tipo: 'plataforma', estado: 'pendiente', creadoPor: uid, creadoEn: Date.now(), expira: Date.now() + 7 * 86400000 };
        await db.ref(`invitaciones/${token}`).update(data); return data;
      }
      if (input.action === 'aceptar') {
        invite = await read(db, `invitaciones/${input.token}`);
        if (String(identity.email || '').toLowerCase() !== invite.email) fail('permission-denied', 'Entra con el correo de la invitación.');
        if (invite.estado === 'usada' && invite.usadaPor === uid) return invite;
        if (invite.estado !== 'pendiente' || invite.expira <= Date.now()) fail('failed-precondition', 'La invitación ya no está vigente.');
        const inviter = await read(db, `usuarios/${invite.creadoPor}`);
        if (inviter?.rolPlataforma !== 'superusuario' || profile.rolPlataforma || invite.rol !== 'soporte') fail('permission-denied', 'No se puede aceptar este acceso de plataforma.');
        await db.ref().update({ [`usuarios/${uid}/rolPlataforma`]: 'soporte', [`invitaciones/${input.token}/estado`]: 'usada', [`invitaciones/${input.token}/usadaPor`]: uid }); return invite;
      }
      if (input.action === 'revocar' && profile.rolPlataforma === 'superusuario') { await db.ref(`invitaciones/${input.token}`).update({ estado: 'revocada' }); return { estado: 'revocada' }; }
      fail('permission-denied', 'Operación de plataforma no autorizada.');
    }
    if (input.action === 'aceptar') {
      invite = await read(db, `invitaciones/${input.token}`);
      if (String(identity.email || '').toLowerCase() !== invite.email) fail('permission-denied', 'Entra con el correo de la invitación.');
      if (invite.estado === 'usada' && invite.usadaPor === uid) return invite;
      if (invite.estado !== 'pendiente' || invite.expira <= Date.now()) fail('failed-precondition', 'La invitación venció, fue revocada o ya se utilizó.');
      const inviterProfile = await read(db, `usuarios/${invite.creadoPor}`);
      const inviter = members[invite.creadoPor];
      if (inviterProfile?.rolPlataforma !== 'superusuario' && !(active(inviter) && ['owner', 'admin', 'superusuario'].includes(inviter.rol))) fail('permission-denied', 'El invitador ya no administra esta planta.');
      if (active(actor)) fail('already-exists', 'Ya tienes acceso a esta planta. Sus cambios se gestionan en Usuarios y accesos.');
      if (actor?.rol === 'owner' || actor?.rol === 'superusuario') fail('failed-precondition', 'No se puede reemplazar al propietario con una invitación.');
      const member = { uid, nombre: invite.nombre || profile.nombre || '', email: invite.email, rol: invite.rol, salas: invite.salas || [], estado: 'activo', creadoEn: Date.now() };
      updates[`organizaciones/${org}/miembros/${uid}`] = member;
      updates[`organizaciones/${org}/miembros/${input.token}`] = null;
      updates[`accesos/${uid}/${org}`] = { ...entry(member), nombre: invite.orgNombre || org };
      updates[`invitaciones/${input.token}/estado`] = 'usada';
      updates[`invitaciones/${input.token}/usadaPor`] = uid;
      updates[`organizaciones/${org}/invitaciones/${input.token}`] = { ...invite, estado: 'usada', usadaPor: uid };
      updates[`usuarios/${uid}/onboardingCompleto`] = true;
      await db.ref().update(updates);
      return invite;
    }
    if (!authorized) fail('permission-denied', 'No administras esta planta.');
    if (input.action === 'crear') {
      const email = String(input.email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['admin', 'jefe', 'operario'].includes(input.rol)) fail('invalid-argument', 'Correo o perfil inválido.');
      if (Object.values(members).some(m => active(m) && m.email === email)) fail('already-exists', 'Este usuario ya tiene acceso a la planta.');
      const rooms = await read(db, `organizaciones/${org}/planta/salas`) || [];
      const salas = Array.isArray(input.salas) ? [...new Set(input.salas)] : [];
      if (salas.some(code => !Object.values(rooms).some(r => r.codigo === code))) fail('invalid-argument', 'Sala inválida.');
      const token = randomUUID().replaceAll('-', '');
      const data = { token, email, nombre: String(input.nombre || '').trim(), rol: input.rol, tipo: 'tenant', orgCodigo: org, orgNombre: await read(db, `organizaciones/${org}/nombre`) || org, salas, estado: 'pendiente', creadoPor: uid, creadoPorNombre: actor?.nombre || profile.nombre || 'El administrador de la planta', creadoEn: Date.now(), expira: Date.now() + 7 * 86400000 };
      updates[`invitaciones/${token}`] = data;
      updates[`organizaciones/${org}/invitaciones/${token}`] = data;
      updates[`organizaciones/${org}/miembros/${token}`] = { ...data, uid: '', estado: 'espera' };
      await db.ref().update(updates);
      return data;
    }
    if (input.action === 'revocar') {
      if (invite.estado === 'usada') fail('failed-precondition', 'Revoca el acceso desde Usuarios y accesos.');
      await db.ref().update({ [`invitaciones/${input.token}/estado`]: 'revocada', [`organizaciones/${org}/invitaciones/${input.token}/estado`]: 'revocada', [`organizaciones/${org}/miembros/${input.token}`]: null });
      return { estado: 'revocada' };
    }
    if (input.action === 'editar') {
      const key = input.clave;
      if (!validKey(key) || !members[key]) fail('not-found', 'Usuario no encontrado.');
      const before = members[key];
      if (['owner', 'superusuario'].includes(before.rol) && (input.estado && input.estado !== 'activo' || input.rol && input.rol !== before.rol)) fail('failed-precondition', 'El propietario debe conservar su acceso.');
      if (input.rol && !['owner', 'admin', 'jefe', 'operario'].includes(input.rol)) fail('invalid-argument', 'Perfil inválido.');
      if (input.rol === 'owner' && before.rol !== 'owner') fail('permission-denied', 'No se transfiere propiedad mediante este formulario.');
      if (input.estado && !['activo', 'inactivo'].includes(input.estado)) fail('invalid-argument', 'Estado inválido.');
      const rooms = await read(db, `organizaciones/${org}/planta/salas`) || [];
      if (input.salas && (!Array.isArray(input.salas) || input.salas.some(code => !Object.values(rooms).some(r => r.codigo === code)))) fail('invalid-argument', 'Sala inválida.');
      const after = { ...before };
      for (const field of ['nombre', 'telefono', 'rol', 'salas', 'estado']) if (input[field] !== undefined) after[field] = input[field];
      updates[`organizaciones/${org}/miembros/${key}`] = after;
      if (after.uid) updates[`accesos/${after.uid}/${org}`] = { ...entry(after), nombre: await read(db, `organizaciones/${org}/nombre`) || org };
      await db.ref().update(updates);
      return after;
    }
    fail('invalid-argument', 'Operación inválida.');
  } finally {
    await lock.transaction(value => value?.nonce === nonce ? null : undefined);
  }
}

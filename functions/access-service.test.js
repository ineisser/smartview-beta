import test from 'node:test';
import assert from 'node:assert/strict';
import { manageAccess } from './access-service.js';

function fixture() {
  const data = { usuarios: { owner: { tenantId: 'Creditex', rolTenant: 'owner' }, guest: { tenantId: 'Creditex', rolTenant: 'owner', nombre: 'Víctor' } }, organizaciones: { Creditex: { miembros: { guest: { uid: 'guest', rol: 'owner', estado: 'activo' } } }, Other: { nombre: 'Otra planta', miembros: { owner: { uid: 'owner', rol: 'owner', estado: 'activo' } }, planta: { salas: [{ codigo: 'TE01' }] } } } };
  const value = path => path.split('/').filter(Boolean).reduce((node, key) => node?.[key], data) ?? null;
  const put = (path, item) => { const keys = path.split('/').filter(Boolean); const key = keys.pop(); let node = data; for (const part of keys) node = node[part] ||= {}; if (item === null) delete node[key]; else node[key] = structuredClone(item); };
  const db = { ref: (path = '') => ({ get: async () => ({ val: () => structuredClone(value(path)) }), transaction: async fn => { const next = fn(value(path)); if (next === undefined) return { committed: false }; put(path, next); return { committed: true }; }, update: async changes => { for (const [key, item] of Object.entries(changes)) put(path ? `${path}/${key}` : key, item); } }) };
  const call = (uid, input, email = 'victor@example.com') => manageAccess(db, { auth: { uid, token: { email } }, data: input });
  const invite = () => call('owner', { action: 'crear', orgCodigo: 'Other', email: 'victor@example.com', nombre: 'Víctor', rol: 'jefe', salas: ['TE01'] });
  return { data, call, invite };
}
test('acceptance preserves ownership, adds scoped access and is idempotent', async () => {
  const { data, call, invite } = fixture(); const invitation = await invite();
  await call('guest', { action: 'aceptar', token: invitation.token });
  assert.equal(data.usuarios.guest.tenantId, 'Creditex');
  assert.equal(data.usuarios.guest.rolTenant, 'owner');
  assert.equal(data.organizaciones.Creditex.miembros.guest.rol, 'owner');
  assert.equal(data.organizaciones.Other.miembros.guest.rol, 'jefe');
  assert.deepEqual(data.accesos.guest.Other.salas, ['TE01']);
  await call('guest', { action: 'aceptar', token: invitation.token });
  assert.equal(Object.keys(data.organizaciones.Other.miembros).length, 2);
});
test('wrong email, expired, revoked and unauthorized inviter are rejected', async () => {
  for (const scenario of ['email', 'expired', 'revoked', 'inviter']) {
    const { data, call, invite } = fixture(); const invitation = await invite();
    if (scenario === 'expired') data.invitaciones[invitation.token].expira = 0;
    if (scenario === 'revoked') data.invitaciones[invitation.token].estado = 'revocada';
    if (scenario === 'inviter') data.organizaciones.Other.miembros.owner.estado = 'inactivo';
    await assert.rejects(call('guest', { action: 'aceptar', token: invitation.token }, scenario === 'email' ? 'wrong@example.com' : 'victor@example.com'));
    assert.equal(data.organizaciones.Other.miembros.guest, undefined);
    assert.equal(data.accesosLocks?.Other, undefined);
  }
});
test('deactivation and role changes affect only the requested organization', async () => {
  const { data, call, invite } = fixture(); const invitation = await invite();
  await call('guest', { action: 'aceptar', token: invitation.token });
  await call('owner', { action: 'editar', orgCodigo: 'Other', clave: 'guest', estado: 'inactivo', rol: 'operario' });
  assert.equal(data.organizaciones.Creditex.miembros.guest.estado, 'activo');
  assert.equal(data.usuarios.guest.activo, undefined);
  assert.equal(data.accesos.guest.Other.estado, 'inactivo');
  await assert.rejects(call('guest', { action: 'crear', orgCodigo: 'Other', email: 'a@example.com', rol: 'jefe' }));
  await assert.rejects(call('owner', { action: 'editar', orgCodigo: 'Other', clave: 'owner', estado: 'inactivo' }));
});
test('an invitation cannot silently alter an already active membership', async () => {
  const { data, call, invite } = fixture(); const invitation = await invite();
  data.organizaciones.Other.miembros.guest = { uid: 'guest', estado: 'activo', rol: 'admin' };
  await assert.rejects(call('guest', { action: 'aceptar', token: invitation.token }));
  assert.equal(data.organizaciones.Other.miembros.guest.rol, 'admin');
});

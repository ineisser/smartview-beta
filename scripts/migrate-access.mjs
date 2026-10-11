import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
if (!process.argv.includes('--dry-run') && !process.argv.includes('--apply')) throw new Error('Choose --dry-run (read only) or --apply.');

// Firebase CLI uses its signed-in administrator; never copy credentials to the app.
const cli = args => {
  const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['--yes', 'firebase-tools', ...args, '--project', 'isagismartview', '--instance', 'smart-view', '--non-interactive'], { encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || 'Firebase CLI failed.');
  return JSON.parse(result.stdout);
};
const users = cli(['database:get', '/usuarios']);
const organizations = cli(['database:get', '/organizaciones', '--shallow']);
const existing = cli(['database:get', '/accesos']) || {};
const updates = {};
const backup = {};
let memberships = 0;
for (const org of Object.keys(organizations || {})) {
  if (!/^[A-Za-z0-9_-]+$/.test(org)) throw new Error('Invalid organization key.');
  const members = cli(['database:get', `/organizaciones/${org}/miembros`]) || {};
  backup[`organizaciones/${org}/miembros`] = members;
  const name = cli(['database:get', `/organizaciones/${org}/nombre`]) || org;
  const canonical = {};
  for (const [key, member] of Object.entries(members)) {
    const uid = member.uid && users?.[member.uid] ? member.uid : users?.[key] ? key : Object.keys(users || {}).find(id => users[id].tenantId === org && users[id].email?.toLowerCase() === member.email?.toLowerCase());
    if (!uid || !['activo', 'inactivo', 'revocada'].includes(member.estado)) continue;
    const normalized = { ...member, uid, rol: member.rol === 'superusuario' ? 'owner' : member.rol };
    // An existing canonical membership always wins over a legacy duplicate.
    canonical[uid] = members[uid] ? { ...members[uid], uid, rol: members[uid].rol === 'superusuario' ? 'owner' : members[uid].rol } : normalized;
    if (key !== uid) updates[`organizaciones/${org}/miembros/${key}`] = null;
  }
  for (const [uid, user] of Object.entries(users || {})) {
    if (user.tenantId !== org || canonical[uid] || existing[uid]?.[org] || !user.rolTenant) continue;
    // Do not revive a pending/revoked membership from stale legacy identity fields.
    if (Object.values(members).some(m => m.uid === uid || m.email?.toLowerCase() === user.email?.toLowerCase())) continue;
    canonical[uid] = { uid, nombre: user.nombre || '', email: user.email || '', telefono: user.telefono || '', rol: user.rolTenant === 'superusuario' ? 'owner' : user.rolTenant, salas: user.salasAsignadas || [], estado: user.activo === false ? 'inactivo' : 'activo', creadoEn: Date.now() };
  }
  for (const [uid, member] of Object.entries(canonical)) {
    updates[`organizaciones/${org}/miembros/${uid}`] = member;
    updates[`accesos/${uid}/${org}`] = { nombre: name, rol: member.rol, salas: member.salas || [], estado: member.estado };
    memberships++;
  }
}
console.log(`Prepared ${memberships} memberships in ${Object.keys(organizations || {}).length} plants. Legacy identity fields are preserved.`);
if (Object.keys(updates).some(path => !/^(accesos\/[^/]+\/[^/]+|organizaciones\/[^/]+\/miembros\/[^/]+)$/.test(path))) throw new Error('Migration exceeds membership scope.');
if (process.argv.includes('--apply')) {
  mkdirSync('.cache', { recursive: true });
  backup.accesos = existing;
  writeFileSync(`.cache/access-backup-${Date.now()}.json`, JSON.stringify(backup));
  const directory = mkdtempSync(join(tmpdir(), 'smartview-access-'));
  try {
    const path = join(directory, 'updates.json'); writeFileSync(path, JSON.stringify(updates));
    const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['--yes', 'firebase-tools', 'database:update', '/', path, '--force', '--project', 'isagismartview', '--instance', 'smart-view', '--non-interactive'], { encoding: 'utf8', shell: process.platform === 'win32' });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout);
    console.log('Migration applied.');
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { claveHistorialLocal, claveControlLocal, leerHistorialLocal, guardarHistorialLocal } from './historial-local.js';

const storage = () => {
  const datos = new Map();
  return { getItem: key => datos.get(key) ?? null, setItem: (key, value) => datos.set(key, value) };
};

test('Creditex empieza vacío aunque el navegador tenga históricos antiguos y de otra empresa', () => {
  const local = storage();
  local.setItem('machine_stop_logs', JSON.stringify([{ sala: 'TE01', machine: '01', reason: 'Ajeno' }]));
  guardarHistorialLocal('ISAGI', [{ sala: 'TE01', machine: '01', reason: 'Ajeno' }], local);
  assert.deepEqual(leerHistorialLocal('CREDITEX', local), []);
  assert.equal(leerHistorialLocal('ISAGI', local)[0].reason, 'Ajeno');
  assert.ok(local.getItem('machine_stop_logs')); // El original queda conservado para revisión.
});

test('solo admite registros identificados con la empresa de la caché', () => {
  const local = storage();
  guardarHistorialLocal('CREDITEX', [{ id: 1 }, { id: 2, org: 'ISAGI' }], local);
  assert.deepEqual(leerHistorialLocal('CREDITEX', local), [{ id: 1, org: 'CREDITEX' }]);
  local.setItem(claveHistorialLocal('CREDITEX'), JSON.stringify({ org: 'ISAGI', registros: [{ org: 'ISAGI' }] }));
  assert.deepEqual(leerHistorialLocal('CREDITEX', local), []);
});

test('el control distingue empresas aunque el usuario y la sala sean iguales', () => {
  assert.notEqual(claveControlLocal('ISAGI', 'USER', 'TE01'), claveControlLocal('CREDITEX', 'USER', 'TE01'));
  assert.notEqual(claveControlLocal('CREDITEX', 'USER', 'TE01'), 'smartview-paros:USER:TE01');
  assert.equal(claveControlLocal('', 'USER', 'TE01'), null);
  assert.equal(claveHistorialLocal(''), null);
});

test('sin empresa no lee ni guarda históricos', () => {
  const local = storage();
  guardarHistorialLocal('', [{ id: 1 }], local);
  assert.deepEqual(leerHistorialLocal('', local), []);
  assert.equal(local.getItem(null), null);
});

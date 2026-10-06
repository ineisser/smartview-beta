import test from 'node:test';
import assert from 'node:assert/strict';
import { nombresMotivosDeSalas } from './catalogos-paro.js';

const salas = [
  { codigo: 'TE01', motivos: [{ corta: 'Rotura Trama' }, { nombre: 'Paro manual' }, { corta: 'Rotura Trama' }, {}] },
  { codigo: 'TE02', motivos: [{ corta: 'Falta Cono Trama', nombre: 'Nombre anterior' }] },
  { codigo: 'TE03' },
];

test('ofrece motivos importados y antiguos aunque no haya historial', () => {
  assert.deepEqual(nombresMotivosDeSalas(salas), ['Rotura Trama', 'Paro manual', 'Falta Cono Trama']);
});

test('limita los motivos al catálogo de la sala seleccionada', () => {
  assert.deepEqual(nombresMotivosDeSalas(salas, 'TE02'), ['Falta Cono Trama']);
  assert.deepEqual(nombresMotivosDeSalas(salas, 'TE03'), []);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { agruparMaquinas, numeroMaquina, disposicionValida, crearGrupos, errorDisposicion } from './disposicion-maquinas.js';

const maquinas = n => Array.from({length:n}, (_, index) => ({numero:index+1}));
const bloques50 = {modo:'grupos',filas:10,columnas:5};

test('250 telares forman cinco grupos de 50 sin repetir ni omitir máquinas', () => {
  const lista = maquinas(250), grupos = agruparMaquinas(lista, bloques50);
  assert.equal(grupos.length, 5);
  assert.ok(grupos.every(grupo => grupo.maquinas.length === 50));
  assert.deepEqual(grupos.flatMap(grupo => grupo.maquinas), lista);
  assert.deepEqual(grupos.map(grupo => grupo.inicio), [0,50,100,150,200]);
});

test('500 telares y grupos de cien usan 4 filas por 25 columnas', () => {
  assert.equal(agruparMaquinas(maquinas(500), {modo:'grupos',filas:4,columnas:25}).length, 5);
  assert.equal(agruparMaquinas(maquinas(500), bloques50).length, 10);
});

test('el último grupo conserva el resto y la numeración global', () => {
  const lista = Array.from({length:112}, () => ({})), grupos = agruparMaquinas(lista, bloques50);
  assert.deepEqual(grupos.map(grupo => grupo.maquinas.length), [50,50,12]);
  assert.equal(numeroMaquina(grupos[2].maquinas[0], grupos[2].inicio), '101');
  assert.equal(numeroMaquina({numero:250}, 0), '250');
  assert.equal(agruparMaquinas(maquinas(40), bloques50).length, 1);
  assert.deepEqual(agruparMaquinas([], bloques50), []);
});

test('rechaza cuadrículas inválidas y mantiene el mapa automático sin configuración', () => {
  for (const filas of [0,-1,1.5,51,'']) assert.equal(disposicionValida({...bloques50,filas}), false);
  assert.deepEqual(agruparMaquinas(maquinas(12), undefined), []);
  assert.equal(disposicionValida({...bloques50,modo:'auto'}), false);
});

test('cinco grupos configurados de forma individual cubren 250 máquinas', () => {
  const disposicion = {modo:'grupos',grupos:crearGrupos(5,250)};
  assert.equal(errorDisposicion(disposicion,250),null);
  assert.deepEqual(disposicion.grupos.map(g=>[g.cantidad,g.filas,g.columnas]),Array.from({length:5},()=>[50,10,5]));
  assert.deepEqual(agruparMaquinas(maquinas(250),disposicion).flatMap(g=>g.maquinas),maquinas(250));
});

test('grupos con cantidades y cuadrículas distintas conservan el orden global', () => {
  const disposicion={modo:'grupos',grupos:[{cantidad:100,filas:4,columnas:25},{cantidad:50,filas:10,columnas:5},{cantidad:100,filas:10,columnas:10}]};
  const grupos=agruparMaquinas(maquinas(250),disposicion);
  assert.deepEqual(grupos.map(g=>g.inicio),[0,100,150]);
  assert.deepEqual(grupos.map(g=>g.maquinas.length),[100,50,100]);
  assert.equal(grupos.at(-1).maquinas.at(-1).numero,250);
});

test('no permite guardar grupos incompletos, sobrantes o sin espacio', () => {
  assert.match(errorDisposicion({modo:'grupos',grupos:[{cantidad:50,filas:5,columnas:5}]},50),/no tiene espacio/);
  assert.match(errorDisposicion({modo:'grupos',grupos:[{cantidad:40,filas:10,columnas:5}]},50),/40 de 50/);
  assert.match(errorDisposicion({modo:'grupos',grupos:[{cantidad:60,filas:10,columnas:6}]},50),/60 de 50/);
  assert.match(errorDisposicion({modo:'grupos',grupos:[]},50),/al menos/);
});

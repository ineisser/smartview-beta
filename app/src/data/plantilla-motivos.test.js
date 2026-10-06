import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { normalizarMotivosFilas, leerPlantillaMotivos, combinarMotivos, catalogoParaSala } from './plantilla-motivos.js';

test('lee CSV con comas en las descripciones y encabezados acentuados', async () => {
  const bytes = Buffer.from('Código,Descripción Corta,Motivo / Causa Detallada\nMP-001,"Rotura, trama",Hilo roto\n');
  const [motivo] = await leerPlantillaMotivos({ name: 'motivos.csv', arrayBuffer: async () => bytes });
  assert.equal(motivo.codigo, 'MP001');
  assert.equal(motivo.corta, 'Rotura, trama');
  assert.equal(motivo.causa, 'Hilo roto');
});

test('prefiere la hoja Motivos a otras hojas de Excel', async () => {
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet([{ máquina: '01' }]), 'Máquinas');
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet([{ codigo: 'P01', nombre: 'Rotura' }]), 'Motivos');
  const bytes = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' });
  const [motivo] = await leerPlantillaMotivos({ name: 'plantilla.xlsx', arrayBuffer: async () => bytes });
  assert.equal(motivo.corta, 'Rotura');
});

test('rechaza listas vacías y códigos repetidos antes de guardar', () => {
  assert.throws(() => normalizarMotivosFilas([{}]), /no contiene motivos/);
  assert.throws(() => normalizarMotivosFilas([{ codigo: 'P-01', corta: 'Uno' }, { codigo: 'P01', corta: 'Dos' }]), /repetidos/);
});

test('actualiza por código y conserva los otros motivos sin modificar la entrada', () => {
  const actuales = [{ codigo: 'P01', corta: 'Anterior', extra: true }, { codigo: 'P02', corta: 'Conservar' }];
  const resultado = combinarMotivos(actuales, [{ codigo: 'P01', corta: 'Nuevo' }, { codigo: 'P03', corta: 'Añadir' }]);
  assert.equal(resultado.length, 3);
  assert.equal(resultado[0].corta, 'Nuevo');
  assert.equal(resultado[0].extra, true);
  assert.equal(resultado[1].corta, 'Conservar');
  assert.equal(actuales[0].corta, 'Anterior');
});

test('usa el proceso del onboarding para una sala sin nombre de industria', () => {
  assert.equal(catalogoParaSala({ nombre: 'Sala 1' }, ['Tejeduría']).id, 'tejeduria');
  assert.equal(catalogoParaSala({ nombre: 'Sala 1' }, ['Tejeduría', 'Otros']), null);
});

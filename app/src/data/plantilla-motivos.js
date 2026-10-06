import { COLUMNAS_PARO, codigoParo, estandarDeSala } from './catalogos-paro.js';

const clave = texto => String(texto).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/_/g, ' ');

export function normalizarMotivosFilas(filas) {
  const motivos = filas.map((fila, index) => {
    const campos = Object.fromEntries(Object.entries(fila).map(([k, v]) => [clave(k), String(v ?? '').trim()]));
    const item = Object.fromEntries(COLUMNAS_PARO.map(col => [col.key, campos[clave(col.titulo)] || campos[clave(col.key)] || '']));
    item.corta ||= campos.nombre || campos.motivo || campos['descripcion corta'] || '';
    item.codigo = codigoParo(item.codigo) || `MP${String(index + 1).padStart(3, '0')}`;
    return item;
  }).filter(item => item.corta || item.causa);
  if (!motivos.length) throw new Error('La plantilla no contiene motivos. Agrega al menos una descripción corta.');
  if (new Set(motivos.map(item => item.codigo)).size !== motivos.length) throw new Error('La plantilla contiene códigos repetidos. Usa un código distinto para cada motivo.');
  return motivos;
}

export async function leerPlantillaMotivos(archivo) {
  if (!/\.(csv|xlsx?)$/i.test(archivo.name)) throw new Error('Selecciona una plantilla Excel o CSV.');
  const XLSX = await import('xlsx');
  const libro = XLSX.read(await archivo.arrayBuffer(), { type: 'array', codepage: 65001, raw: false });
  const hoja = libro.Sheets.Motivos || libro.Sheets[libro.SheetNames[0]];
  return normalizarMotivosFilas(XLSX.utils.sheet_to_json(hoja, { defval: '', raw: false }));
}

export function combinarMotivos(actuales, nuevos) {
  const resultado = actuales.map(item => ({ ...item }));
  for (const item of nuevos) {
    const index = resultado.findIndex(actual => codigoParo(actual.codigo || actual.id) === item.codigo);
    if (index < 0) resultado.push({ ...item });
    else resultado[index] = { ...resultado[index], ...item };
  }
  return resultado;
}

export function catalogoParaSala(sala, procesos = []) {
  return estandarDeSala(sala?.nombre) || (procesos.length === 1 ? estandarDeSala(procesos[0]) : null);
}

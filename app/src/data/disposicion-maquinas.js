export const dimensionValida = valor => Number.isInteger(Number(valor)) && Number(valor) >= 1 && Number(valor) <= 50;
export const numeroMaquina = (maquina, index) => String(maquina.numero || index + 1).padStart(2, '0');

export function gruposConfigurados(disposicion, cantidad) {
  if (Array.isArray(disposicion?.grupos)) return disposicion.grupos;
  if (disposicion?.modo !== 'grupos' || !dimensionValida(disposicion.filas) || !dimensionValida(disposicion.columnas)) return [];
  const capacidad = Number(disposicion.filas) * Number(disposicion.columnas);
  return Array.from({length:Math.ceil(cantidad / capacidad)}, (_, i) => ({cantidad:Math.min(capacidad,cantidad-i*capacidad),filas:Number(disposicion.filas),columnas:Number(disposicion.columnas)}));
}

export function crearGrupos(cantidad, total) {
  const n = Math.max(1, Math.min(Number(cantidad) || 1, total || 1));
  return Array.from({length:n}, (_, i) => {
    const maquinas = Math.floor(total/n) + (i < total % n ? 1 : 0);
    const columnas = Math.min(5, Math.max(1, maquinas));
    return {cantidad:maquinas, columnas, filas:Math.max(1,Math.ceil(maquinas/columnas))};
  });
}

export function errorDisposicion(disposicion, total) {
  if (disposicion?.modo !== 'grupos') return null;
  const grupos = gruposConfigurados(disposicion, total);
  if (!grupos.length) return 'Agrega al menos un grupo.';
  for (const [i,g] of grupos.entries()) {
    if (!Number.isInteger(Number(g.cantidad)) || Number(g.cantidad) < 1) return `Grupo ${i+1}: indica una cantidad entera de máquinas mayor que cero.`;
    if (!dimensionValida(g.filas) || !dimensionValida(g.columnas)) return `Grupo ${i+1}: filas y columnas deben ser enteros entre 1 y 50.`;
    if (Number(g.filas)*Number(g.columnas) < Number(g.cantidad)) return `Grupo ${i+1}: la cuadrícula no tiene espacio para sus ${g.cantidad} máquinas.`;
  }
  const asignadas=grupos.reduce((n,g)=>n+Number(g.cantidad),0);
  return asignadas===total ? null : `Has asignado ${asignadas} de ${total} máquinas. Ajusta las cantidades para incluir todas una sola vez.`;
}

export function normalizarDisposicion(disposicion, total) {
  return disposicion?.modo === 'grupos' ? {modo:'grupos',grupos:gruposConfigurados(disposicion,total).map(g=>({cantidad:Number(g.cantidad),filas:Number(g.filas),columnas:Number(g.columnas)}))} : {modo:'auto'};
}

export function disposicionValida(disposicion, total) {
  return disposicion?.modo==='grupos' && !errorDisposicion(disposicion,total);
}

export function agruparMaquinas(maquinas, disposicion) {
  if (!disposicionValida(disposicion,maquinas.length)) return [];
  let inicio=0;
  return gruposConfigurados(disposicion,maquinas.length).map(g=>{
    const grupo={...g,inicio,maquinas:maquinas.slice(inicio,inicio+Number(g.cantidad))};
    inicio+=Number(g.cantidad);return grupo;
  });
}

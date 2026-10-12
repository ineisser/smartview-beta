export function gruposSala(sala) {
  const layout = sala.disposicion || sala.disposicionMaquinas;
  if (layout?.modo !== 'grupos') return [];
  if (Array.isArray(layout.grupos)) return layout.grupos;
  const capacity = Number(layout.filas) * Number(layout.columnas);
  if (!capacity) return [];
  return Array.from({ length: Math.ceil((sala.maquinas || []).length / capacity) }, (_, i) => ({ cantidad: Math.min(capacity, sala.maquinas.length - i * capacity) }));
}
export function grupoMaquina(sala, numero) {
  const index = (sala?.maquinas || []).findIndex((m, i) => String(m.numero || i + 1).padStart(2, '0') === String(numero).padStart(2, '0'));
  let limit = 0;
  for (const [i, group] of gruposSala(sala || {}).entries()) { limit += Number(group.cantidad); if (index >= 0 && index < limit) return i + 1; }
  return 0;
}
export const claveGrupo = (sala, grupo) => `${sala}:${grupo}`;
export function coincideGrupo(sala, numero, seleccion) {
  return !seleccion || claveGrupo(sala.codigo, grupoMaquina(sala, numero)) === seleccion;
}
export function opcionesGrupos(salas) {
  return salas.flatMap(s => gruposSala(s).map((_, i) => ({ value: claveGrupo(s.codigo, i + 1), label: `${salas.length > 1 ? `${s.nombre} · ` : ''}Grupo ${i + 1}`, sala: s.codigo, numero: i + 1 })));
}

// No migrar machine_stop_logs: esos registros antiguos no identifican su empresa.
export const claveHistorialLocal = org => org ? `smartview-historial:v2:${org}` : null;
export const claveControlLocal = (org, uid, sala) => org && uid && sala ? `smartview-paros:v2:${org}:${uid}:${sala}` : null;

export function leerHistorialLocal(org, storage = globalThis.localStorage) {
  const key = claveHistorialLocal(org);
  if (!key) return [];
  try {
    const data = JSON.parse(storage.getItem(key) || 'null');
    return data?.org === org && Array.isArray(data.registros)
      ? data.registros.filter(item => item?.org === org) : [];
  } catch { return []; }
}

export function guardarHistorialLocal(org, registros, storage = globalThis.localStorage) {
  const key = claveHistorialLocal(org);
  if (!key) return;
  try {
    storage.setItem(key, JSON.stringify({ org, registros: registros.filter(item => !item.org || item.org === org).map(item => ({ ...item, org })) }));
  } catch { /* almacenamiento no disponible */ }
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { get, ref, query, orderByKey, limitToLast, endBefore } from 'firebase/database';
import { rtdb } from '../firebase';

const BLOQUE = 150;
const pertenece = (x, uid, otro) => (x.de === uid && x.para === otro) || (x.de === otro && x.para === uid);

export default function useConversacion(org, uid, otro, recientes) {
  const [estado, setEstado] = useState({ clave: '', mensajes: [], cursor: null, mas: true, cargando: true, error: null });
  const clave = `${org}:${uid}:${otro}`;
  const generacion = useRef(0), ocupado = useRef(false);
  const cargar = useCallback(async (cursor, inicial = false) => {
    if (!org || !uid || !otro || ocupado.current) return;
    ocupado.current = true;
    const turno = generacion.current;
    setEstado(prev => ({ ...prev, cargando: true, error: null }));
    try {
      let rows, matches, siguiente = cursor;
      // Omite bloques de otras conversaciones sin conservarlos en memoria.
      do {
        const constraints = [orderByKey(), limitToLast(BLOQUE)];
        if (siguiente) constraints.push(endBefore(siguiente));
        const snap = await get(query(ref(rtdb, `organizaciones/${org}/mensajes`), ...constraints));
        if (turno !== generacion.current) return;
        rows = [];
        snap.forEach(child => rows.push({ ...child.val(), id: child.key }));
        matches = rows.filter(x => pertenece(x, uid, otro));
        siguiente = rows[0]?.id || siguiente;
      } while (!matches.length && rows.length === BLOQUE);
      setEstado(prev => ({ clave, mensajes: inicial ? matches : [...matches, ...prev.mensajes], cursor: siguiente, mas: rows.length === BLOQUE, cargando: false, error: null }));
    } catch {
      if (turno === generacion.current) setEstado(prev => ({ ...prev, cargando: false, error: 'No se pudieron cargar los mensajes. Intenta nuevamente.' }));
    } finally { if (turno === generacion.current) ocupado.current = false; }
  }, [org, uid, otro, clave]);
  useEffect(() => {
    generacion.current++; ocupado.current = false;
    setEstado({ clave, mensajes: [], cursor: null, mas: true, cargando: true, error: null });
    void cargar(null, true);
    return () => { generacion.current++; ocupado.current = false; };
  }, [clave, cargar]);
  const mensajes = useMemo(() => {
    if (estado.clave !== clave) return [];
    const mapa = new Map(estado.mensajes.map(x => [x.id, x]));
    recientes.filter(x => pertenece(x, uid, otro)).forEach(x => mapa.set(x.id, x));
    return [...mapa.values()].sort((a,b) => a.en - b.en || a.id.localeCompare(b.id));
  }, [estado, clave, recientes, uid, otro]);
  return { mensajes, cargando: estado.clave !== clave || estado.cargando, mas: estado.mas, error: estado.error, cargarMas: () => cargar(estado.cursor) };
}

import { useEffect, useMemo, useState } from "react";
import { onValue, ref, onDisconnect, push, serverTimestamp, update } from "firebase/database";
import { rtdb } from "../firebase";

const KEY = "smartview-device-id";
const ONLINE = 150000;
const cierres = new Set();
let memoriaId;
function localId() {
  try {
    const guardado = localStorage.getItem(KEY);
    if (guardado) return guardado;
  } catch { /* almacenamiento restringido */ }
  memoriaId ||= crypto.randomUUID();
  try { localStorage.setItem(KEY, memoriaId); } catch { /* identidad de esta sesión */ }
  return memoriaId;
}
function deviceType() {
  const ua = navigator.userAgent || "";
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "tablet";
  return /Mobi|iPhone|Android/i.test(ua) ? "movil" : "desktop";
}
export const contarConectados = (items = []) => items.filter(x => x.estado === "Conectado").length;
export async function cerrarPresencia() {
  await Promise.allSettled([...cierres].map(cerrar => cerrar()));
}

// Montar una sola vez para toda la aplicación autenticada, no por página.
export function useRegistrarPresencia(org, user, profile) {
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!org || !user?.uid) return;
    let activo = true;
    let conectado = false;
    let listo = false;
    let cola = Promise.resolve();
    const id = localId();
    const base = ref(rtdb, `organizaciones/${org}/dispositivos/${id}`);
    const sesion = push(ref(rtdb, `organizaciones/${org}/dispositivos/${id}/sesiones`));
    const desconexion = onDisconnect(sesion);
    const tipo = deviceType();
    const fallo = () => { if (activo) setError('No se pudo actualizar tu conexión en Firebase.'); };
    const cerrar = async () => {
      activo = false;
      // Si estamos sin red, onDisconnect ya quedó registrado en el servidor.
      if (!conectado) return;
      await cola.catch(() => {});
      await update(sesion, { conectado: false, ultima: serverTimestamp() });
      await desconexion.cancel();
    };
    cierres.add(cerrar);
    const stop = onValue(ref(rtdb, '.info/connected'), snap => {
      conectado = snap.val() === true;
      listo = false;
      if (!conectado || !activo) return;
      cola = cola.catch(() => {}).then(async () => {
        if (!activo) return;
        // Confirmar la limpieza en el servidor ANTES de anunciar la conexión.
        await desconexion.update({ conectado: false, ultima: serverTimestamp() });
        if (!activo) { await desconexion.cancel(); return; }
        await update(base, {
          id, tipo, nombre: tipo === 'movil' ? 'Móvil' : tipo === 'tablet' ? 'Tablet' : 'Computadora',
          usuario: profile?.nombre || user.displayName || user.email || '', uid: user.uid,
          presenciaVersion: 2, ultima: serverTimestamp(),
          [`sesiones/${sesion.key}`]: { uid: user.uid, conectado: true, inicio: serverTimestamp(), ultima: serverTimestamp() },
        });
        listo = true;
        if (activo) setError(null);
      }).catch(fallo);
    }, fallo);
    const latido = () => {
      if (!activo || !conectado || !listo) return;
      update(base, { ultima: serverTimestamp(), [`sesiones/${sesion.key}/ultima`]: serverTimestamp() }).catch(fallo);
    };
    const timer = window.setInterval(latido, 30000);
    const visible = () => { if (document.visibilityState === 'visible') latido(); };
    document.addEventListener('visibilitychange', visible);
    return () => {
      stop(); clearInterval(timer); document.removeEventListener('visibilitychange', visible);
      cierres.delete(cerrar);
      void cerrar().catch(() => {});
    };
  }, [org, user?.uid, user?.displayName, user?.email, profile?.nombre]);
  return error;
}

export default function useDispositivosOrg(org) {
  const [data, setData] = useState({});
  const [ahora, setAhora] = useState(Date.now);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState(null);
  const [conectado, setConectado] = useState(false);
  useEffect(() => {
    setData({}); setError(null);
    if (!org) return;
    return onValue(ref(rtdb, `organizaciones/${org}/dispositivos`), snap => {
      setData(snap.val() || {}); setError(null);
    }, () => setError('No se pudo leer la presencia de los dispositivos.'));
  }, [org]);
  useEffect(() => {
    const reloj = onValue(ref(rtdb, '.info/serverTimeOffset'), snap => setOffset(Number(snap.val()) || 0));
    const red = onValue(ref(rtdb, '.info/connected'), snap => setConectado(snap.val() === true));
    const timer = setInterval(() => setAhora(Date.now()), 10000);
    return () => { reloj(); red(); clearInterval(timer); };
  }, []);
  const dispositivos = useMemo(() => Object.entries(data).filter(([, x]) => x && typeof x === 'object').map(([id, x]) => {
    const sesiones = Object.values(x.sesiones || {});
    const tiempos = [Number(x.ultima) || 0, ...sesiones.map(s => Number(s.ultima) || 0)];
    const ultima = Math.max(...tiempos);
    const enLinea = x.presenciaVersion === 2
      ? sesiones.some(s => s.conectado === true && ahora + offset - Number(s.ultima) <= ONLINE)
      : ahora + offset - ultima <= ONLINE;
    const historial = [...new Set([...Object.values(x.historial || {}), ...sesiones.map(s => s.inicio)].map(Number).filter(n => Number.isFinite(n) && n > 0))].sort((a,b) => b-a);
    return { ...x, id, ultima, historial, estado: enLinea ? 'Conectado' : 'Desconectado' };
  }).sort((a,b) => b.ultima-a.ultima), [data, ahora, offset]);
  return { dispositivos, error: error || (!conectado ? 'Sin conexión con Firebase. Los estados pueden estar desactualizados.' : null) };
}

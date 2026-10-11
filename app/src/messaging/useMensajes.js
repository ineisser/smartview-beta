import { useCallback, useEffect, useMemo, useState } from "react";
import { onValue, push, ref, set, query, orderByKey, limitToLast, orderByChild, startAfter } from "firebase/database";
import { rtdb } from "../firebase";

const mensajesRef = (org) => ref(rtdb, `organizaciones/${org}/mensajes`);
const leidoRef = (org, uid) => ref(rtdb, `organizaciones/${org}/mensajesLeidos/${uid}`);

export default function useMensajes({ org, uid, nombre }) {
  const [crudos, setCrudos] = useState([]);
  const [leido, setLeido] = useState(null);
  const [pendientes, setPendientes] = useState([]);

  useEffect(() => {
    if (!org) {
      setCrudos([]);
      return undefined;
    }
    setCrudos([]);
    const off = onValue(query(mensajesRef(org), orderByKey(), limitToLast(150)), (snap) => {
      const data = snap.val() || {};
      const lista = Object.entries(data)
        .map(([id, item]) => ({ id, ...item }))
        .sort((a, b) => (a.en || 0) - (b.en || 0));
      setCrudos(lista);
    });
    return () => off();
  }, [org]);

  useEffect(() => {
    setLeido(null);
    if (!org || !uid) {
      setLeido(0);
      return undefined;
    }
    const off = onValue(leidoRef(org, uid), (snap) => {
      setLeido(Number(snap.val()) || 0);
    });
    return () => off();
  }, [org, uid]);

  const mensajes = useMemo(
    () => crudos.filter((item) => item.de === uid || item.para === uid || item.para === "todos"),
    [crudos, uid]
  );

  useEffect(() => {
    setPendientes([]);
    if (!org || !uid || leido === null) return;
    return onValue(query(mensajesRef(org), orderByChild('en'), startAfter(leido)), snap => {
      const lista = [];
      snap.forEach(child => { const item = child.val(); if (item.de !== uid && (item.para === uid || item.para === 'todos')) lista.push({ ...item, id: child.key }); });
      setPendientes(lista);
    });
  }, [org, uid, leido]);
  const noLeidos = pendientes;

  const enviar = useCallback(async (texto, para, paraNombre) => {
    const limpio = String(texto || "").trim();
    if (!org || !uid || !limpio) return;
    await push(mensajesRef(org), {
      texto: limpio,
      de: uid,
      deNombre: nombre || "",
      para: para || "todos",
      paraNombre: paraNombre || "Todos",
      en: Date.now(),
    });
  }, [org, uid, nombre]);

  const marcarLeido = useCallback(async () => {
    if (!org || !uid) return;
    await set(leidoRef(org, uid), Date.now()).catch(() => {});
  }, [org, uid]);

  return { mensajes, noLeidos, enviar, marcarLeido };
}

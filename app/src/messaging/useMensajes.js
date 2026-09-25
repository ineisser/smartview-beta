import { useCallback, useEffect, useMemo, useState } from "react";
import { onValue, push, ref, set } from "firebase/database";
import { rtdb } from "../firebase";

const mensajesRef = (org) => ref(rtdb, `organizaciones/${org}/mensajes`);
const leidoRef = (org, uid) => ref(rtdb, `organizaciones/${org}/mensajesLeidos/${uid}`);

export default function useMensajes({ org, uid, nombre }) {
  const [crudos, setCrudos] = useState([]);
  const [leido, setLeido] = useState(0);

  useEffect(() => {
    if (!org) {
      setCrudos([]);
      return undefined;
    }
    const off = onValue(mensajesRef(org), (snap) => {
      const data = snap.val() || {};
      const lista = Object.entries(data)
        .map(([id, item]) => ({ id, ...item }))
        .sort((a, b) => (a.en || 0) - (b.en || 0));
      setCrudos(lista);
    });
    return () => off();
  }, [org]);

  useEffect(() => {
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

  const noLeidos = useMemo(
    () => mensajes.filter((item) => item.de !== uid && (item.en || 0) > leido),
    [mensajes, uid, leido]
  );

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

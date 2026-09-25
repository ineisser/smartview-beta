import { useEffect, useState } from "react";

const VIDA = 4000;
const SALIDA = 800;

export default function Toast({ message, onClose }) {
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    if (!message) {
      setSaliendo(false);
      return undefined;
    }
    setSaliendo(false);
    const vida = window.setTimeout(() => setSaliendo(true), VIDA);
    const fin = window.setTimeout(onClose, VIDA + SALIDA);
    return () => {
      window.clearTimeout(vida);
      window.clearTimeout(fin);
    };
  }, [message, onClose]);

  if (!message) return null;
  return <p className={`toast${saliendo ? " is-out" : ""}`} role="status">{message}</p>;
}

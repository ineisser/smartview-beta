import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic } from "lucide-react";
import Button from "../components/Button";

const Recognition = typeof window !== "undefined"
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

export default function MensajeInput({ onEnviar, disabled }) {
  const [texto, setTexto] = useState("");
  const [oyendo, setOyendo] = useState(false);
  const [aviso, setAviso] = useState("");
  const area = useRef(null);
  const reconocimiento = useRef(null);
  const prefijo = useRef("");
  const confirmado = useRef("");
  const oyendoRef = useRef(false);

  useEffect(() => {
    const nodo = area.current;
    if (!nodo) return;
    nodo.style.height = "0px";
    nodo.style.height = `${Math.min(nodo.scrollHeight, 120)}px`;
  }, [texto]);

  useEffect(() => () => {
    oyendoRef.current = false;
    try { reconocimiento.current?.abort?.(); } catch { /* ya parado */ }
  }, []);

  const pintar = (parcial = "") => {
    const junto = `${prefijo.current}${confirmado.current}${parcial}`.replace(/\s+/g, " ").trimStart();
    setTexto(junto);
  };

  const consolidar = () => {
    if (!confirmado.current) return;
    prefijo.current = `${prefijo.current}${confirmado.current}`.replace(/\s+/g, " ");
    if (prefijo.current && !prefijo.current.endsWith(" ")) prefijo.current += " ";
    confirmado.current = "";
  };

  const mandar = (valor = texto) => {
    const limpio = String(valor || "").trim();
    if (!limpio || disabled) return;
    pararDictado(false);
    onEnviar(limpio);
    setTexto("");
    prefijo.current = "";
    confirmado.current = "";
  };

  const pararDictado = (quedar = true) => {
    oyendoRef.current = false;
    setOyendo(false);
    consolidar();
    try { reconocimiento.current?.stop?.(); } catch { /* ok */ }
    if (!quedar) reconocimiento.current = null;
    pintar("");
  };

  const alternarMic = () => {
    if (disabled) return;
    if (oyendoRef.current) {
      pararDictado(true);
      return;
    }
    if (!Recognition) {
      setAviso("Este navegador no admite dictado.");
      window.setTimeout(() => setAviso(""), 2500);
      return;
    }
    const motor = new Recognition();
    motor.lang = "es-PE";
    motor.continuous = true;
    motor.interimResults = true;
    prefijo.current = texto.trim() ? `${texto.trim()} ` : "";
    confirmado.current = "";
    motor.onresult = (event) => {
      let parcial = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const pieza = event.results[i][0]?.transcript || "";
        if (!pieza) continue;
        if (event.results[i].isFinal) {
          confirmado.current = `${confirmado.current}${pieza} `.replace(/\s+/g, " ");
        } else {
          parcial += pieza;
        }
      }
      pintar(parcial);
    };
    motor.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      oyendoRef.current = false;
      setOyendo(false);
      consolidar();
      pintar("");
    };
    motor.onend = () => {
      consolidar();
      pintar("");
      if (!oyendoRef.current) return;
      try { motor.start(); } catch {
        oyendoRef.current = false;
        setOyendo(false);
      }
    };
    reconocimiento.current = motor;
    oyendoRef.current = true;
    setOyendo(true);
    setAviso("");
    try { motor.start(); } catch {
      oyendoRef.current = false;
      setOyendo(false);
      setAviso("No se pudo abrir el micrófono.");
      window.setTimeout(() => setAviso(""), 2500);
    }
  };

  return (
    <div className="msg-composer">
      <div className={`msg-field${oyendo ? " is-listening" : ""}`}>
        <textarea
          ref={area}
          rows={1}
          value={texto}
          placeholder={oyendo ? "Escuchando…" : "Escribe un mensaje"}
          disabled={disabled}
          onChange={(event) => {
            setTexto(event.target.value);
            prefijo.current = event.target.value;
            confirmado.current = "";
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              mandar();
            }
          }}
        />
        <button
          type="button"
          className={`msg-mic${oyendo ? " is-on" : ""}`}
          aria-label={oyendo ? "Detener dictado" : "Dictar mensaje"}
          aria-pressed={oyendo}
          disabled={disabled}
          onClick={alternarMic}
        >
          {oyendo ? (
            <span className="msg-mic-wave" aria-hidden="true">
              <i /><i /><i /><i /><i />
            </span>
          ) : (
            <Mic size={18} />
          )}
        </button>
      </div>
      <Button
        variant="primary"
        className="msg-send"
        aria-label="Enviar"
        disabled={disabled || !texto.trim()}
        onClick={() => mandar()}
      >
        <ArrowUp size={18} />
      </Button>
      {aviso ? <p className="msg-aviso" role="status">{aviso}</p> : null}
    </div>
  );
}

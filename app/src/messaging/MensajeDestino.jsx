import { useEffect, useRef, useState } from "react";

export default function MensajeDestino({ personas, value, onChange }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const elegido = personas.find((item) => item.id === value) || personas[0];

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!box.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div className="msg-to menu" ref={box}>
      <button
        type="button"
        className={`menu-trigger ${open ? "open" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((actual) => !actual)}
      >
        Para {elegido?.label || "todos"}
        <span className="menu-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <ul className="menu-list" role="listbox">
          {personas.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={value === item.id}
                className={value === item.id ? "selected" : ""}
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

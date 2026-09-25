import { useEffect, useRef, useState } from "react";
import Tooltip from "./Tooltip";

export default function TabSwitch({ items, value, onChange, size = "normal" }) {
  const list = useRef(null);
  const [mark, setMark] = useState(null);

  useEffect(() => {
    const current = list.current?.querySelector(".is-on");
    if (!current || !list.current) return;
    const lista = list.current.getBoundingClientRect();
    const caja = current.getBoundingClientRect();
    setMark({ left: caja.left - lista.left, width: caja.width });
  }, [value, size, items]);

  return (
    <div className={`tab-switch btn-slide is-${size}`} ref={list} role="tablist">
      {mark ? <i className="tab-switch-mark" style={{ left: mark.left, width: mark.width }} aria-hidden="true" /> : null}
      {items.map((item) => {
        const Icon = item.icon;
        const button = (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={value === item.id}
            className={value === item.id ? "is-on" : ""}
            onClick={() => onChange(item.id)}
          >
            {Icon ? <Icon size={size === "small" ? 16 : 18} strokeWidth={2.5} /> : null}
            <span>{item.label}</span>
          </button>
        );
        return item.tip ? <Tooltip key={item.id} label={item.tip}>{button}</Tooltip> : button;
      })}
    </div>
  );
}

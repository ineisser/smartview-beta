export default function Switch({ value = true, onChange, "aria-label": ariaLabel = "Sí o no" }) {
  const on = value !== false && value !== "no";
  return (
    <div
      className={`segment btn-slide${on ? " is-si" : " is-no"}`}
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
    >
      <i aria-hidden="true" />
      <button type="button" className={on ? "is-on" : ""} onClick={() => onChange?.(true)}>Sí</button>
      <button type="button" className={on ? "" : "is-on"} onClick={() => onChange?.(false)}>No</button>
    </div>
  );
}

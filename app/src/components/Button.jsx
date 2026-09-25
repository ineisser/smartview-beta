if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", (event) => {
    const btn = event.target.closest?.(".btn");
    if (!btn || btn.classList.contains("btn-slide") || btn.closest(".maquinas-container-tab-view")) return;
    btn.classList.remove("is-pressed");
    void btn.offsetWidth;
    btn.classList.add("is-pressed");
  });
}

export default function Button({ variant = "primary", className = "", type = "button", children, ...props }) {
  const classes = `btn btn-${variant}${className ? ` ${className}` : ""}`;
  if (props.as === "label") {
    const { as, ...rest } = props;
    return <label className={classes} {...rest}>{children}</label>;
  }
  return <button className={classes} type={type} {...props}>{children}</button>;
}

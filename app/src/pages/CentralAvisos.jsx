import { useEffect, useRef, useState } from "react";
import Switch from "../components/Switch";
import TimeField from "../components/TimeField";
import { REPETICIONES_VOZ, repeticionesValidas } from "../sonido";
import { alertaValida } from "../turno";
import { avisoAvancePorDefecto, DIAS, FRECUENCIAS } from "../robotAvance";

function MenuOpcion({ value, onChange, opciones }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const elegido = opciones.find((item) => item.id === value);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!box.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div className="menu" ref={box}>
      <button
        type="button"
        className={`menu-trigger ${open ? "open" : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((actual) => !actual)}
      >
        {elegido?.label || "Elige"}
        <span className="menu-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <ul className="menu-list" role="listbox">
          {opciones.map((item) => (
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

function CampoPct({ value, onChange, min = "0", max = "100", step = "0.1" }) {
  return (
    <div className="campo-pct">
      <input
        className="umbral-oee"
        type="number"
        min={min}
        max={max}
        step={step}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => event.target.select()}
      />
      <small>%</small>
    </div>
  );
}

export default function CentralAvisos({
  valor,
  umbral,
  repeticiones: repeticionesProp,
  notificacionesAltavoz = true,
  onAplicar,
}) {
  const guardado = { ...avisoAvancePorDefecto(), ...valor };
  const [plan, setPlan] = useState(guardado);
  const [alerta, setAlerta] = useState(String(umbral ?? ""));
  const [vozOn, setVozOn] = useState(notificacionesAltavoz !== false);
  const [repeticiones, setRepeticiones] = useState(String(repeticionesProp ?? REPETICIONES_VOZ));

  useEffect(() => { setPlan({ ...avisoAvancePorDefecto(), ...valor }); }, [valor]);
  useEffect(() => { setAlerta(String(umbral ?? "")); }, [umbral]);
  useEffect(() => { setVozOn(notificacionesAltavoz !== false); }, [notificacionesAltavoz]);
  useEffect(() => { setRepeticiones(String(repeticionesProp ?? REPETICIONES_VOZ)); }, [repeticionesProp]);

  const umbralListo = alertaValida(alerta);
  const vecesListas = repeticionesValidas(repeticiones);
  const cambio = plan.cada !== guardado.cada
    || Number(plan.dia) !== Number(guardado.dia)
    || plan.hora !== guardado.hora
    || Number(alerta) !== Number(umbral)
    || vozOn !== (notificacionesAltavoz !== false)
    || Number(repeticiones) !== Number(repeticionesProp ?? REPETICIONES_VOZ);

  const aplicar = (event) => {
    event.preventDefault();
    if (!cambio || umbralListo == null || vecesListas == null) return;
    onAplicar({
      avance: { cada: plan.cada, dia: plan.dia, hora: plan.hora },
      umbral: umbralListo,
      notificacionesAltavoz: vozOn,
      repeticionesVoz: vecesListas,
    });
  };

  return (
    <section className="config-section">
      <h2>Central de notificaciones</h2>
      <form className="config-ask" onSubmit={aplicar}>
        <label className="config-row">
          <span>¿Cada cuánto tiempo deseas notificar el informe de avance?</span>
          <MenuOpcion value={plan.cada} opciones={FRECUENCIAS} onChange={(cada) => setPlan((actual) => ({ ...actual, cada }))} />
        </label>
        {plan.cada === "semana" ? (
          <>
            <label className="config-row">
              <span>Día de la semana</span>
              <MenuOpcion value={Number(plan.dia)} opciones={DIAS} onChange={(dia) => setPlan((actual) => ({ ...actual, dia }))} />
            </label>
            <label className="config-row">
              <span>Hora</span>
              <TimeField value={plan.hora} onChange={(hora) => setPlan((actual) => ({ ...actual, hora }))} />
            </label>
          </>
        ) : null}
        <label className="config-row config-row-copy">
          <span className="config-copy">
            <strong>Alerta de eficiencia (OEE)</strong>
            <small>Por debajo de este porcentaje el avance de cada sala se pone en rojo y avisa. Puedes buscar este parámetro en cada sala para ajustarlo de manera independiente.</small>
          </span>
          <CampoPct value={alerta} onChange={setAlerta} />
        </label>
        <label className="config-row">
          <span className="config-copy">
            <strong>Activar notificaciones</strong>
            <small>Predeterminado para toda la planta. Si lo apagas, no suenan avisos de altavoz en ningún equipo.</small>
          </span>
          <Switch value={vozOn} onChange={setVozOn} aria-label="Activar notificaciones de altavoz" />
        </label>
        <label className="config-row">
          <span>Número de repeticiones de notificaciones en altavoz.</span>
          <input
            className="umbral-oee"
            type="number"
            min="1"
            max="10"
            step="1"
            inputMode="numeric"
            value={repeticiones}
            onChange={(event) => setRepeticiones(event.target.value)}
            onFocus={(event) => event.target.select()}
          />
        </label>
        <div className="config-row config-row-actions">
          <button className="btn btn-primary" type="submit" disabled={!cambio || umbralListo == null || vecesListas == null}>Aplicar cambios</button>
        </div>
      </form>
    </section>
  );
}

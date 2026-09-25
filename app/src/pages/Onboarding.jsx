import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";

const PROCESOS = ["Hilandería", "Tejeduría", "Tintorería", "Confección", "Otros"];
const PERSONAL = ["1 a 10", "10 a 20", "20 a 50", "50 a 500", "500 a 1000", "Más de 1000"];
const SALAS = ["1", "2 a 3", "4 a 5", "Más de 5"];
const EQUIPOS = ["1 a 20", "20 a 50", "50 a 100", "100 a 500", "500 a 1000"];

function Menu({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);

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
      <span className="menu-label">{label}</span>
      <button
        type="button"
        className={`menu-trigger ${open ? "open" : ""} ${value ? "" : "placeholder"}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {value || "Elige un rango"}
        <span className="menu-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <ul className="menu-list" role="listbox">
          {options.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={value === option}
                className={value === option ? "selected" : ""}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const STEP_NAMES = ["organizacion", "rubro", "personal", "salas", "equipos"];

const empty = {
  organizacion: "",
  rubro: "",
  procesos: [],
  otrosRubro: "",
  empleados: "",
  personasPlanta: "",
  maquinas: "",
  salas: "",
};

const fromProfile = (profile) => ({
  organizacion: profile?.organizacion || "",
  rubro: profile?.rubro || "",
  procesos: Array.isArray(profile?.procesos) ? profile.procesos : [],
  otrosRubro: profile?.otrosRubro || "",
  empleados: profile?.empleados || "",
  personasPlanta: profile?.personasPlanta || "",
  maquinas: profile?.maquinas || "",
  salas: profile?.salas || "",
});

export default function Onboarding() {
  const { user, profile, saveProfile, dbError } = useAuth();
  const navigate = useNavigate();
  const hydrated = useRef(false);
  const [step, setStep] = useState(0);
  const [data, setData] = useState(empty);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile || hydrated.current) return;
    hydrated.current = true;
    setData(fromProfile(profile));
    const saved = Number(profile.paso) || 0;
    setStep(Math.min(Math.max(saved, 0), 4));
  }, [profile]);

  const toggleProceso = (item) => {
    setData((d) => {
      const has = d.procesos.includes(item);
      return { ...d, procesos: has ? d.procesos.filter((p) => p !== item) : [...d.procesos, item] };
    });
  };

  const validate = () => {
    if (step === 0 && !data.organizacion.trim()) return "Escribe el nombre de la organización.";
    if (step === 1 && !data.rubro) return "Elige un rubro.";
    if (step === 1 && data.rubro === "Textil" && data.procesos.length === 0) return "Marca al menos un proceso.";
    if (step === 1 && data.procesos.includes("Otros") && !data.otrosRubro.trim()) return "Especifica el otro proceso.";
    if (step === 2 && !data.empleados) return "Elige el rango de empleados.";
    if (step === 2 && !data.personasPlanta) return "Elige cuántos están en planta.";
    if (step === 3 && !data.salas) return "Elige cuántas salas.";
    if (step === 4 && !data.maquinas) return "Elige el rango de equipos.";
    return "";
  };

  const next = async () => {
    const message = validate();
    setError(message);
    if (message) return;
    setBusy(true);
    const done = step === 4;
    try {
      await saveProfile(user.uid, {
        ...data,
        paso: done ? 4 : Math.max(Number(profile?.paso) || 0, step + 1),
        pasos: { ...(profile?.pasos || {}), [STEP_NAMES[step]]: true },
        onboardingCompleto: done,
      });
      if (done) navigate("/inicio");
      else setStep((current) => current + 1);
    } catch {
      setError(dbError || "No se pudo guardar este paso.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Tu organización" lede="Estos datos solo dimensionan el tamaño de la empresa." step={step + 1}>
      <div className="progress" aria-hidden="true"><span style={{ width: `${((step + 1) / 5) * 100}%` }} /></div>
      <div className="stack">
        {error ? <p className="error">{error}</p> : null}
        {dbError ? <p className="error">{dbError}</p> : null}
        {step === 0 && (
          <label className="field">
            <span>Nombre de la organización</span>
            <input type="text" value={data.organizacion} onChange={(e) => setData({ ...data, organizacion: e.target.value })} autoComplete="organization" />
          </label>
        )}
        {step === 1 && (
          <>
            {["Textil", "Metalmecánica"].map((rubro) => (
              <label key={rubro} className={`choice ${data.rubro === rubro ? "selected" : ""}`}>
                <input type="radio" name="rubro" checked={data.rubro === rubro} onChange={() => setData({ ...data, rubro, procesos: rubro === "Textil" ? data.procesos : [] })} />
                {rubro}
              </label>
            ))}
            {data.rubro === "Textil" && PROCESOS.map((item) => (
              <label key={item} className={`choice ${data.procesos.includes(item) ? "selected" : ""}`}>
                <input type="checkbox" checked={data.procesos.includes(item)} onChange={() => toggleProceso(item)} />
                {item}
              </label>
            ))}
            {data.procesos.includes("Otros") && (
              <label className="field">
                <span>¿Cuál?</span>
                <input type="text" value={data.otrosRubro} onChange={(e) => setData({ ...data, otrosRubro: e.target.value })} autoComplete="off" />
              </label>
            )}
          </>
        )}
        {step === 2 && (
          <>
            <Menu label="¿Cuántos empleados?" value={data.empleados} options={PERSONAL} onChange={(empleados) => setData({ ...data, empleados })} />
            <Menu label="¿Cuántos en planta?" value={data.personasPlanta} options={PERSONAL} onChange={(personasPlanta) => setData({ ...data, personasPlanta })} />
          </>
        )}
        {step === 3 && (
          <Menu label="¿Cuántas salas deseas controlar?" value={data.salas} options={SALAS} onChange={(salas) => setData({ ...data, salas })} />
        )}
        {step === 4 && (
          <Menu label="¿Qué número de equipos quieres controlar?" value={data.maquinas} options={EQUIPOS} onChange={(maquinas) => setData({ ...data, maquinas })} />
        )}
      </div>
      <div className="pager">
        <button className="btn btn-ghost" type="button" onClick={() => (step > 0 ? setStep((current) => current - 1) : navigate(-1))}>Atrás</button>
        <button className="btn btn-primary" type="button" disabled={busy} onClick={next}>{step === 4 ? "Guardar" : "Continuar"}</button>
      </div>
    </Screen>
  );
}

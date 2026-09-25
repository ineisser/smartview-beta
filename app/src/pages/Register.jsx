import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Screen from "../components/Screen";
import PasswordField from "../components/PasswordField";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    email: params.get("email") || "",
    password: "",
    repetir: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.telefono.replace(/\D/g, "").length < 6) {
      setError("Escribe un teléfono válido.");
      return;
    }
    if (form.password !== form.repetir) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      await register({ nombre: form.nombre, telefono: form.telefono, email: form.email.trim(), password: form.password });
      navigate("/continuar");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") setError("Ese correo ya tiene cuenta. Entra con él.");
      else if (err.code === "auth/weak-password") setError("La contraseña debe tener al menos 6 caracteres.");
      else setError("No se pudo crear la cuenta.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Crear cuenta" lede="Nombre, teléfono y correo.">
      <form className="stack" onSubmit={onSubmit}>
        {error ? <p className="error">{error}</p> : null}
        <label className="field">
          <span>Nombre</span>
          <input type="text" required autoComplete="name" value={form.nombre} onChange={set("nombre")} />
        </label>
        <label className="field">
          <span>Teléfono</span>
          <input type="tel" required autoComplete="tel" value={form.telefono} onChange={set("telefono")} />
        </label>
        <label className="field">
          <span>Correo</span>
          <input type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
        </label>
        <PasswordField label="Contraseña" autoComplete="new-password" value={form.password} onChange={set("password")} />
        <PasswordField label="Repetir contraseña" autoComplete="new-password" value={form.repetir} onChange={set("repetir")} />
        <button className="btn btn-primary" disabled={busy} type="submit">Crear cuenta</button>
        <p className="note">¿Ya tienes cuenta? <Link to="/login">Entra</Link></p>
        <button className="btn btn-ghost" type="button" onClick={() => navigate("/login")}>Atrás</button>
      </form>
    </Screen>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Screen from "../components/Screen";
import PasswordField from "../components/PasswordField";
import { useAuth } from "../context/AuthContext";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8c-.2 1.1-.8 2-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z"/>
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.6-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3C2.4 16 5.5 18 9 18z"/>
      <path fill="#FBBC05" d="M3.9 10.7c-.2-.6-.3-1.2-.3-1.7s.1-1.2.3-1.7V5H.9C.3 6.2 0 7.6 0 9s.3 2.8.9 4l3-2.3z"/>
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6C13.5.9 11.4 0 9 0 5.5 0 2.4 2 0.9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z"/>
    </svg>
  );
}

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const goNext = () => navigate("/continuar");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email.trim(), password);
      goNext();
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        navigate(`/registro?email=${encodeURIComponent(email.trim())}`);
        return;
      }
      setError("Correo o contraseña incorrectos.");
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setError("");
    setBusy(true);
    try {
      await loginWithGoogle();
      goNext();
    } catch {
      setError("No se pudo entrar con Google.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Entrar" lede="Usa tu correo o tu cuenta de Google.">
      <form className="stack" onSubmit={onSubmit}>
        {error ? <p className="error">{error}</p> : null}
        <label className="field">
          <span>Correo</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <PasswordField label="Contraseña" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn btn-primary" disabled={busy} type="submit">Entrar</button>
        {error ? (
          <p className="note">
            Si aún no tienes cuenta,{" "}
            <Link to={`/registro?email=${encodeURIComponent(email.trim())}`}>créala con este correo</Link>.
          </p>
        ) : null}
      </form>
      <div className="stack">
        <div className="divider">o</div>
        <button className="btn btn-ghost" type="button" disabled={busy} onClick={onGoogle}>
          <span className="google-mark"><GoogleMark /> Continuar con Google</span>
        </button>
        <p className="note">¿No tienes cuenta? <Link to="/registro">Regístrate</Link></p>
        <button className="btn btn-ghost" type="button" onClick={() => navigate("/")}>Atrás</button>
      </div>
    </Screen>
  );
}

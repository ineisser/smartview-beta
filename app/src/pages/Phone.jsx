import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";

export default function Phone() {
  const { user, profile, saveProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [telefono, setTelefono] = useState(profile?.telefono || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const yaDentro = profile?.onboardingCompleto || profile?.organizacion || profile?.rolTenant || profile?.planta;

  useEffect(() => {
    if (yaDentro) navigate("/continuar", { replace: true });
  }, [yaDentro, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (profile?.onboardingCompleto || profile?.organizacion || profile?.rolTenant) {
      navigate("/continuar");
      return;
    }
    if (telefono.replace(/\D/g, "").length < 6) {
      setError("Escribe un teléfono válido.");
      return;
    }
    setBusy(true);
    try {
      await saveProfile(user.uid, {
        telefono,
        nombre: profile?.nombre || user.displayName || "",
        email: profile?.email || user.email || "",
        pasos: { ...(profile?.pasos || {}), telefono: true },
      });
      navigate("/continuar");
    } catch {
      setError("No se pudo guardar el teléfono.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Tu teléfono" lede="Google ya nos dio tu nombre y tu correo.">
      <form className="stack" onSubmit={onSubmit}>
        {error ? <p className="error">{error}</p> : null}
        <label className="field">
          <span>Teléfono</span>
          <input type="tel" required autoComplete="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </label>
        <button className="btn btn-primary" disabled={busy} type="submit">Continuar</button>
        <button className="btn btn-ghost" type="button" onClick={() => logout().then(() => navigate("/"))}>Atrás</button>
      </form>
    </Screen>
  );
}

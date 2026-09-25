import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { etiquetaPerfil } from "../access";
import Screen from "../components/Screen";
import PasswordField from "../components/PasswordField";
import Boot from "./Boot";

const irDespues = (invite, navigate) => {
  if (invite.tipo === "plataforma") navigate("/plataforma", { replace: true });
  else if (invite.salas?.[0]) navigate(`/${invite.orgCodigo}/${invite.salas[0]}`, { replace: true });
  else navigate(`/${invite.orgCodigo}/configuracion`, { replace: true });
};

export default function Invite() {
  const { token } = useParams();
  const { user, profile, loading, leerInvitacion, aceptarInvitacion, registrarInvitacion } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [carga, setCarga] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [repetir, setRepetir] = useState("");

  useEffect(() => {
    if (token) sessionStorage.setItem("smartview-invitacion", token);
  }, [token]);

  useEffect(() => {
    let vivo = true;
    setCarga(true);
    leerInvitacion(token)
      .then((data) => {
        if (!vivo) return;
        setInvite(data);
        if (!data) setError("Esta invitación no existe.");
      })
      .catch(() => {
        if (vivo) setError("No se pudo leer la invitación.");
      })
      .finally(() => {
        if (vivo) setCarga(false);
      });
    return () => { vivo = false; };
  }, [token]);

  if (loading || carga) return <Boot />;

  const empresa = invite?.orgNombre || "esta organización";
  const pie = invite ? `Perfil ${etiquetaPerfil(invite.rol)}` : "";
  const correoSesion = String(user?.email || profile?.email || "").toLowerCase();
  const mismoCorreo = Boolean(invite?.email && correoSesion && invite.email === correoSesion);

  const aceptar = async () => {
    setBusy(true);
    setError("");
    try {
      const usada = await aceptarInvitacion(token);
      sessionStorage.removeItem("smartview-invitacion");
      irDespues(usada, navigate);
    } catch (err) {
      setError(err.message || "No se pudo aceptar la invitación.");
    } finally {
      setBusy(false);
    }
  };

  const crearCuenta = async (event) => {
    event.preventDefault();
    setError("");
    if (password !== repetir) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      const usada = await registrarInvitacion(token, { password, nombre: invite.nombre });
      sessionStorage.removeItem("smartview-invitacion");
      irDespues(usada, navigate);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Ese correo ya tiene cuenta. Entra con él.");
      } else if (err.code === "auth/weak-password") {
        setError("La contraseña debe tener al menos 6 caracteres.");
      } else {
        setError(err.message || "No se pudo crear la cuenta.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (invite?.tipo === "plataforma" && !user) {
    return (
      <Screen title="Invitación" lede="Entra con tu cuenta para unirte a la plataforma.">
        <div className="stack">
          <Link className="btn btn-primary" to="/login">Entrar</Link>
        </div>
      </Screen>
    );
  }

  if (user && invite && !mismoCorreo && invite.tipo !== "plataforma") {
    return (
      <Screen title={`Has sido invitado a ${empresa}.`} lede="Esta invitación es para otro correo. Cierra sesión y entra con el que te invitaron.">
        <div className="stack">
          {error ? <p className="error">{error}</p> : null}
        </div>
        {pie ? <p className="caption invite-foot">{pie}</p> : null}
      </Screen>
    );
  }

  if (user && invite) {
    return (
      <Screen title={`Has sido invitado a ${empresa}.`} lede="Tu cuenta ya está lista. Únete y entra a trabajar.">
        <div className="stack">
          {error ? <p className="error">{error}</p> : null}
          <button className="btn btn-primary" type="button" disabled={busy} onClick={aceptar}>
            {busy ? "Uniendo…" : "Aceptar invitación"}
          </button>
        </div>
        {pie ? <p className="caption invite-foot">{pie}</p> : null}
      </Screen>
    );
  }

  return (
    <Screen title={invite ? `Has sido invitado a ${empresa}.` : "Invitación"} lede={invite ? "Elige una contraseña para entrar." : "No encontramos esta invitación."}>
      {invite ? (
        <form className="stack" onSubmit={crearCuenta}>
          {error ? (
            <p className="error">
              {error}
              {error.includes("ya tiene cuenta") ? <> <Link to="/login">Entra con él</Link>.</> : null}
            </p>
          ) : null}
          <label className="field">
            <span>Correo</span>
            <input type="email" readOnly value={invite.email || ""} />
          </label>
          <PasswordField label="Contraseña" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <PasswordField label="Confirmar contraseña" autoComplete="new-password" value={repetir} onChange={(event) => setRepetir(event.target.value)} />
          <button className="btn btn-primary" disabled={busy} type="submit">{busy ? "Entrando…" : "Entrar a la organización"}</button>
        </form>
      ) : (
        <div className="stack">
          {error ? <p className="error">{error}</p> : null}
          <Link className="btn btn-ghost" to="/">Volver</Link>
        </div>
      )}
      {pie ? <p className="caption invite-foot">{pie}</p> : null}
    </Screen>
  );
}

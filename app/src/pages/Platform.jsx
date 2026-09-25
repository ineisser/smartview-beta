import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, ref } from "firebase/database";
import { rtdb } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { permisos } from "../access";
import Screen from "../components/Screen";
import Boot from "./Boot";

export default function Platform() {
  const { user, profile, loading, logout, crearInvitacion } = useAuth();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState([]);
  const [correo, setCorreo] = useState("");
  const [enlace, setEnlace] = useState("");
  const [error, setError] = useState("");
  const puede = permisos(profile);

  useEffect(() => {
    get(ref(rtdb, "organizaciones")).then((snap) => {
      const valor = snap.val() || {};
      setOrgs(Object.entries(valor).map(([codigo, org]) => ({ codigo, ...org })));
    }).catch(() => setError("No se pudieron leer las organizaciones."));
  }, []);

  if (loading) return <Boot />;
  if (!user) return null;
  if (!profile?.rolPlataforma) return null;

  const invitarSoporte = async (event) => {
    event.preventDefault();
    setError("");
    setEnlace("");
    try {
      const invite = await crearInvitacion({ email: correo, rol: "soporte", tipo: "plataforma" });
      const url = `${window.location.origin}/invitar/${invite.token}`;
      setEnlace(url);
      await navigator.clipboard.writeText(url).catch(() => {});
      setCorreo("");
    } catch {
      setError("No se pudo crear la invitación.");
    }
  };

  const abrir = (org) => {
    const sala = org.planta?.salas?.find((item) => item.codigo) || org.planta?.salas?.[0];
    if (sala?.codigo) navigate(`/${org.codigo}/${sala.codigo}`);
    else navigate(`/${org.codigo}/configuracion`);
  };

  return (
    <Screen title="Plataforma" lede={profile.rolPlataforma === "superusuario" ? "Toda la plataforma." : "Soporte a clientes."}>
      <div className="stack">
        {error ? <p className="error">{error}</p> : null}
        <ul className="menu-list" role="list">
          {orgs.map((org) => (
            <li key={org.codigo}>
              <button type="button" onClick={() => abrir(org)}>
                {org.nombre || org.codigo}{org.prueba ? " · prueba" : ""}
              </button>
            </li>
          ))}
        </ul>
        {puede.facturacion ? (
          <p className="lede">Facturación queda en este panel. Soporte no entra aquí.</p>
        ) : null}
        {puede.invitarSoporte ? (
          <form className="stack" onSubmit={invitarSoporte}>
            <label className="field">
              <span>Invitar soporte</span>
              <input type="email" required value={correo} onChange={(event) => setCorreo(event.target.value)} autoComplete="email" />
            </label>
            <button className="btn btn-primary" type="submit">Copiar enlace</button>
            {enlace ? <p className="lede">{enlace}</p> : null}
          </form>
        ) : null}
        <button className="btn btn-ghost" type="button" onClick={() => logout().then(() => navigate("/"))}>Cerrar sesión</button>
      </div>
    </Screen>
  );
}

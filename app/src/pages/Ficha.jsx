import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { etiquetaPerfil, permisos } from "../access";

export default function Ficha({ profile, onGuardar, onVolver }) {
  const acceso = permisos(profile);
  const [nombre, setNombre] = useState(profile?.nombre || "");
  const [telefono, setTelefono] = useState(profile?.telefono || "");
  const [aviso, setAviso] = useState("");
  const salas = acceso.salasDe(profile?.planta?.salas || []);
  const todas = salas.length === (profile?.planta?.salas || []).length && salas.length > 0;
  const sucio = nombre.trim() !== (profile?.nombre || "") || telefono.trim() !== (profile?.telefono || "");

  const guardar = async (event) => {
    event.preventDefault();
    const limpio = nombre.trim();
    if (!limpio || !sucio) return;
    await onGuardar({ nombre: limpio, telefono: telefono.trim() });
    setAviso("Guardado correctamente");
    window.setTimeout(() => setAviso(""), 3000);
  };

  return (
    <div className="ficha-page">
      <form className="ficha-form" onSubmit={guardar}>
        <span>Organización</span>
        <em className="ficha-dato ficha-org">{profile?.organizacion || "—"}</em>
        <span>Correo</span>
        <em className="ficha-dato">{profile?.email || "—"}</em>
        <span>Nombre</span>
        <input type="text" value={nombre} onChange={(event) => setNombre(event.target.value)} autoComplete="name" />
        <span>Teléfono</span>
        <input type="tel" value={telefono} onChange={(event) => setTelefono(event.target.value)} autoComplete="tel" />
        <span>Perfil</span>
        <em className="ficha-dato">{etiquetaPerfil(profile?.rolTenant || profile?.rolPlataforma)}</em>
        <span>Salas</span>
        <em className="ficha-dato">{salas.length ? (todas ? "Todas" : salas.map((sala) => sala.nombre || sala.codigo).join(", ")) : "Ninguna"}</em>
        <div className="ficha-acciones">
          <button className="btn" type="button" onClick={onVolver}><ArrowLeft size={18} />Volver</button>
          <button className="btn btn-primary" type="submit" disabled={aviso !== "" || !sucio || !nombre.trim()}>
            {aviso || "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

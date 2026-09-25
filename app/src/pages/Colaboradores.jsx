import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { EllipsisVertical, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { esOwner, etiquetaPerfil } from "../access";
import Button from "../components/Button";
import Tooltip from "../components/Tooltip";
import InviteModal from "../components/InviteModal";
import "../styles/components/modal.css";

const ordenPerfil = (rol) => {
  if (esOwner(rol)) return 0;
  if (rol === "admin") return 1;
  if (rol === "jefe") return 2;
  return 3;
};

const enEspera = (estado) => estado === "espera" || estado === "pendiente" || estado === "revocada";

const etiquetaEstado = (estado) => {
  if (estado === "inactivo") return "Inactivo";
  if (enEspera(estado)) return "En espera";
  return "Activo";
};

function AccionModal({ titulo, lede, accion, busy, onClose, onOk }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setVisible(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, []);
  const cerrar = () => {
    setVisible(false);
    window.setTimeout(onClose, 600);
  };
  return createPortal(
    <div id="modal-overlay" className={visible ? "active" : ""} onClick={(event) => { if (event.target.id === "modal-overlay") cerrar(); }}>
      <div className="modal-glass" role="dialog" aria-labelledby="accion-titulo" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" aria-label="Cerrar" onClick={cerrar}><X size={18} /></button>
        <h3 id="accion-titulo">{titulo}</h3>
        <p>{lede}</p>
        <div className="modal-actions">
          <Button variant="ghost" type="button" onClick={cerrar}>Cancelar</Button>
          <Button type="button" disabled={busy} onClick={onOk}>{busy ? "Guardando…" : accion}</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Colaboradores({ orgCodigo, salas, owner, orgNombre }) {
  const { profile, crearInvitacion, editarMiembro, desactivarMiembro, activarCuenta, revocarClave } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [editar, setEditar] = useState(null);
  const [menu, setMenu] = useState(null);
  const [accion, setAccion] = useState(null);
  const [busy, setBusy] = useState(false);

  const filas = useMemo(() => {
    const miembros = Object.entries(profile?.miembros || {})
      .map(([id, item]) => ({ id, ...item }))
      .filter((item) => item.estado !== "revocada" || item.uid);
    const hayOwner = miembros.some((item) => esOwner(item.rol));
    if (!hayOwner && owner) {
      miembros.unshift({
        id: owner.uid || "owner",
        nombre: owner.nombre || "",
        email: owner.email || "",
        rol: "owner",
        estado: "activo",
      });
    }
    return miembros.sort((a, b) => {
      const rango = ordenPerfil(a.rol) - ordenPerfil(b.rol);
      if (rango) return rango;
      if (a.estado === "activo" && b.estado !== "activo") return -1;
      if (a.estado !== "activo" && b.estado === "activo") return 1;
      return String(a.nombre || a.email).localeCompare(String(b.nombre || b.email), "es");
    });
  }, [profile?.miembros, owner]);

  useEffect(() => {
    if (!menu) return undefined;
    const cerrar = (event) => {
      if (event.target.closest?.(".user-row-menu, .col-acciones")) return;
      setMenu(null);
    };
    document.addEventListener("pointerdown", cerrar);
    return () => document.removeEventListener("pointerdown", cerrar);
  }, [menu]);

  const crear = async ({ nombre, email, rol, salas: elegidas, orgCodigo: codigo, orgNombre: empresa }) => {
    const invite = await crearInvitacion({
      nombre,
      email,
      rol,
      tipo: "tenant",
      orgCodigo: codigo,
      orgNombre: empresa,
      salas: elegidas,
    });
    return `${window.location.origin}/invitar/${invite.token}`;
  };

  const uidDe = (item) => item.uid || (item.id !== "owner" ? item.id : "");

  const abrirMenu = (event, item) => {
    const caja = event.currentTarget.getBoundingClientRect();
    setMenu({
      item,
      top: caja.bottom + 6,
      right: Math.max(8, window.innerWidth - caja.right),
    });
  };

  const pedirAccion = (tipo, item) => {
    setMenu(null);
    setAccion({ tipo, item });
  };

  const confirmarAccion = async () => {
    if (!accion) return;
    const item = accion.item;
    const clave = item.id;
    const uid = uidDe(item);
    setBusy(true);
    try {
      if (accion.tipo === "revocar") {
        await revocarClave({
          orgCodigo,
          clave,
          email: item.email,
          nombre: item.nombre,
          rol: item.rol,
          salas: item.salas,
          orgNombre,
        });
      } else if (accion.tipo === "desactivar") {
        await desactivarMiembro({ orgCodigo, clave, uid });
      } else if (accion.tipo === "activar") {
        await activarCuenta({ orgCodigo, clave, uid });
      }
      setAccion(null);
    } finally {
      setBusy(false);
    }
  };

  const textoAccion = () => {
    if (accion?.tipo === "revocar") {
      return {
        titulo: "Revocar contraseña",
        lede: "Este usuario tendrá que crear una nueva para entrar.",
        accion: "Revocar",
      };
    }
    if (accion?.tipo === "desactivar") {
      return {
        titulo: "Desactivar usuario",
        lede: "No podrá entrar hasta que lo actives de nuevo. Su contraseña se mantiene.",
        accion: "Desactivar",
      };
    }
    return {
      titulo: "Activar usuario",
      lede: "Vuelve a entrar con su misma contraseña.",
      accion: "Activar",
    };
  };

  return (
    <section className="config-section">
      <div className="config-section-head">
        <h2>Usuarios y accesos</h2>
        <Tooltip label="Invitar nuevos usuarios">
          <Button className="btn-compact" onClick={() => setAbierto(true)}>Invitar</Button>
        </Tooltip>
      </div>
      <div className="sheet is-small">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Perfil</th>
              <th>Estado</th>
              <th className="col-acciones" />
            </tr>
          </thead>
          <tbody>
            {filas.map((item) => (
              <tr key={item.id || item.email} className={item.estado === "inactivo" ? "is-off" : ""}>
                <td>{item.nombre || "—"}</td>
                <td className="col-correo">{item.email || "—"}</td>
                <td>{etiquetaPerfil(item.rol)}</td>
                <td>
                  <span className="estado-fila">
                    {etiquetaEstado(item.estado)}
                    {enEspera(item.estado) ? <i className="estado-punto" aria-hidden="true" /> : null}
                  </span>
                </td>
                <td className="col-acciones">
                  <button className="icon-btn" type="button" aria-label="Opciones de usuario" onClick={(event) => abrirMenu(event, item)}>
                    <EllipsisVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {menu ? createPortal(
        <div className="user-row-menu glass-pop" style={{ top: menu.top, right: menu.right }}>
          <button type="button" onClick={() => { setMenu(null); setEditar(menu.item); }}>Editar</button>
          {esOwner(menu.item.rol) ? null : (
            <>
              <button type="button" onClick={() => pedirAccion("revocar", menu.item)}>Revocar contraseña</button>
              <button type="button" onClick={() => pedirAccion(menu.item.estado === "inactivo" ? "activar" : "desactivar", menu.item)}>
                {menu.item.estado === "inactivo" ? "Activar" : "Desactivar"}
              </button>
            </>
          )}
        </div>,
        document.body
      ) : null}
      {abierto ? (
        <InviteModal
          salas={salas}
          orgCodigo={orgCodigo}
          orgNombre={orgNombre}
          onClose={() => setAbierto(false)}
          onCrear={crear}
        />
      ) : null}
      {editar ? (
        <InviteModal
          modo="editar"
          usuario={editar}
          salas={salas}
          orgCodigo={orgCodigo}
          orgNombre={orgNombre}
          onClose={() => setEditar(null)}
          onEditar={async ({ nombre, telefono, rol, salas: elegidas, clave, uid }) => {
            await editarMiembro({
              orgCodigo,
              clave,
              uid: uid || editar.uid || editar.id,
              nombre,
              telefono,
              rol,
              salas: elegidas,
            });
          }}
        />
      ) : null}
      {accion ? (
        <AccionModal
          {...textoAccion()}
          busy={busy}
          onClose={() => setAccion(null)}
          onOk={confirmarAccion}
        />
      ) : null}
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import "../styles/components/modal.css";
import Button from "./Button";
import { PERFILES_INVITACION, correoValido, esOwner, etiquetaPerfil } from "../access";

function MenuPerfil({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const elegido = PERFILES_INVITACION.find((item) => item.id === value);

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
      <span className="menu-label">Perfil</span>
      <button
        type="button"
        className={`menu-trigger ${open ? "open" : ""} ${elegido ? "" : "placeholder"}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {elegido?.label || "Elige un perfil"}
        <span className="menu-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <ul className="menu-list" role="listbox">
          {PERFILES_INVITACION.map((item) => (
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

function MenuSalas({ salas, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [borrador, setBorrador] = useState(value);
  const box = useRef(null);
  const clave = (sala) => sala.codigo || sala.nombre;

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!box.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const abrir = () => {
    setBorrador(value);
    setOpen(true);
  };

  const toggle = (codigo) => {
    setBorrador((actual) => (actual.includes(codigo) ? actual.filter((item) => item !== codigo) : [...actual, codigo]));
  };

  const resumen = () => {
    if (!value.length) return "Seleccione una o más salas";
    const nombres = (salas || []).filter((sala) => value.includes(clave(sala))).map((sala) => sala.nombre);
    if (nombres.length === 1) return nombres[0];
    if (nombres.length === 2) return nombres.join(" y ");
    return `${nombres.length} salas`;
  };

  return (
    <div className="menu" ref={box}>
      <span className="menu-label">Seleccione una o más salas a las que tendrá acceso</span>
      <button
        type="button"
        className={`menu-trigger ${open ? "open" : ""} ${value.length ? "" : "placeholder"}`}
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : abrir())}
      >
        {resumen()}
        <span className="menu-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div className="menu-list menu-multi" onPointerDown={(event) => event.stopPropagation()}>
          <ul role="listbox" aria-multiselectable="true">
            {(salas || []).map((sala) => {
              const id = clave(sala);
              return (
                <li key={id}>
                  <label className={`menu-check${borrador.includes(id) ? " selected" : ""}`}>
                    <input
                      type="checkbox"
                      checked={borrador.includes(id)}
                      onChange={() => toggle(id)}
                      onClick={(event) => event.stopPropagation()}
                    />
                    {sala.nombre}
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="menu-actions">
            <Button variant="ghost" type="button" onClick={() => { setBorrador(value); setOpen(false); }}>Cancelar</Button>
            <Button type="button" onClick={() => { onChange(borrador); setOpen(false); }}>Seleccionar</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function InviteModal({ modo = "invitar", usuario, salas, orgCodigo, orgNombre, onClose, onCrear, onEditar }) {
  const editando = modo === "editar";
  const duenio = esOwner(usuario?.rol);
  const [visible, setVisible] = useState(false);
  const [nombre, setNombre] = useState(usuario?.nombre || "");
  const [correo, setCorreo] = useState(usuario?.email || "");
  const [telefono, setTelefono] = useState(usuario?.telefono || "");
  const [rol, setRol] = useState(duenio ? "owner" : (usuario?.rol || "operario"));
  const [elegidas, setElegidas] = useState(usuario?.salas || []);
  const [error, setError] = useState("");
  const [tocado, setTocado] = useState({ nombre: false, correo: false });
  const [busy, setBusy] = useState(false);
  const [enlace, setEnlace] = useState("");
  const [copiado, setCopiado] = useState(false);

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

  const errorNombre = tocado.nombre && nombre.trim().length < 2 ? "El nombre necesita al menos dos caracteres." : "";
  const errorCorreo = tocado.correo && correo.trim() && !correoValido(correo) ? "Escribe un correo con dominio, como ana@planta.com." : "";

  const generar = async (event) => {
    event.preventDefault();
    setTocado({ nombre: true, correo: true });
    setError("");
    if (nombre.trim().length < 2) {
      setError("El nombre necesita al menos dos caracteres.");
      return;
    }
    if (!editando && !correoValido(correo)) {
      setError("Escribe un correo con dominio, como ana@planta.com.");
      return;
    }
    if (!duenio && !elegidas.length) {
      setError("Selecciona al menos una sala.");
      return;
    }
    setBusy(true);
    try {
      if (editando) {
        await onEditar({
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          rol: duenio ? "owner" : rol,
          salas: duenio ? [] : elegidas,
          clave: usuario.id,
          uid: usuario.uid,
        });
        cerrar();
        return;
      }
      const url = await onCrear({
        nombre: nombre.trim(),
        email: correo.trim(),
        rol,
        salas: elegidas,
        orgCodigo,
        orgNombre,
      });
      setEnlace(url);
    } catch {
      setError(editando ? "No se pudo guardar el usuario. Inténtalo de nuevo." : "No se pudo generar la invitación. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const copiar = async () => {
    await navigator.clipboard.writeText(enlace).catch(() => {});
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 3000);
  };

  return createPortal(
    <div id="modal-overlay" className={visible ? "active" : ""} onClick={(event) => { if (event.target.id === "modal-overlay") cerrar(); }}>
      <div className="modal-glass" role="dialog" aria-labelledby="invitar-titulo" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" aria-label="Cerrar" onClick={cerrar}><X size={18} /></button>
        {enlace ? (
          <>
            <h3 id="invitar-titulo">Invitación</h3>
            <p>Hemos generado una invitación para este usuario.</p>
            <label className="field">
              <span>Enlace para enviarle</span>
              <input readOnly value={enlace} onFocus={(event) => event.target.select()} />
            </label>
            <p className="caption">Cópialo y mándaselo. Ahí pone su contraseña y entra a {orgNombre || "la organización"} como {etiquetaPerfil(rol).toLocaleLowerCase("es")}.</p>
            <div className="modal-actions">
              <Button variant="ghost" onClick={cerrar}>Cerrar</Button>
              <Button onClick={copiar}>{copiado ? "Copiado" : "Copiar enlace"}</Button>
            </div>
          </>
        ) : (
          <form onSubmit={generar}>
            <h3 id="invitar-titulo">{editando ? (correo || "Usuario") : "Invitar"}</h3>
            <p>{editando ? "Cambia el nombre, el teléfono, el perfil o las salas." : "Invita a un nuevo usuario."}</p>
            {error ? <p className="error">{error}</p> : null}
            <div className="stack invite-stack">
              <label className="field">
                <span>Nombre</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  onBlur={() => setTocado((actual) => ({ ...actual, nombre: true }))}
                />
                {errorNombre ? <small className="field-hint">{errorNombre}</small> : null}
              </label>
              {editando ? (
                <label className="field">
                  <span>Teléfono</span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={telefono}
                    onChange={(event) => setTelefono(event.target.value)}
                  />
                </label>
              ) : (
                <label className="field">
                  <span>Correo</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={correo}
                    onChange={(event) => setCorreo(event.target.value)}
                    onBlur={() => setTocado((actual) => ({ ...actual, correo: true }))}
                  />
                  {errorCorreo ? <small className="field-hint">{errorCorreo}</small> : null}
                </label>
              )}
              {duenio ? null : <MenuPerfil value={rol} onChange={setRol} />}
              {duenio ? null : <MenuSalas salas={salas} value={elegidas} onChange={setElegidas} />}
            </div>
            <div className="modal-actions">
              <Button variant="ghost" type="button" onClick={cerrar}>Cancelar</Button>
              <Button type="submit" disabled={busy}>{busy ? (editando ? "Guardando…" : "Generando…") : (editando ? "Guardar" : "Generar invitación")}</Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

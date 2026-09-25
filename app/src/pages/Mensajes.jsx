import { useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { etiquetaPerfil } from "../access";
import { buzonesDe } from "../avisos";
import useMensajes from "../messaging/useMensajes";
import MensajeLista from "../messaging/MensajeLista";
import MensajeInput from "../messaging/MensajeInput";
import Avatar from "../components/Avatar";

const claveDe = (item) => item?.uid || item?.id || "";

const fotoDe = (item, uid, miFoto) => item?.photoURL || ((item?.uid === uid || item?.id === uid) ? miFoto : "");

export default function Mensajes({ org, uid, nombre, rol, salas, miembros, foto }) {
  const emisor = useMemo(() => ({ uid, nombre, rol, salas }), [uid, nombre, rol, salas]);
  const { mensajes, noLeidos, enviar, marcarLeido } = useMensajes({ org, uid, nombre });
  const permitidos = useMemo(() => buzonesDe(emisor, miembros), [emisor, miembros]);
  const [activo, setActivo] = useState("");

  const buzones = useMemo(() => {
    const mapa = new Map(permitidos.map((item) => [claveDe(item), { ...item, id: claveDe(item) }]));
    mensajes.forEach((item) => {
      const otro = item.de === uid ? item.para : item.de;
      if (!otro || otro === "todos" || otro === uid || mapa.has(otro)) return;
      mapa.set(otro, {
        id: otro,
        uid: otro,
        nombre: item.de === uid ? item.paraNombre : item.deNombre,
        rol: "",
      });
    });
    return [...mapa.values()].sort((a, b) => String(a.nombre || a.email).localeCompare(String(b.nombre || b.email), "es"));
  }, [permitidos, mensajes, uid]);

  useEffect(() => {
    if (!buzones.length) {
      setActivo("");
      return;
    }
    if (!buzones.some((item) => item.id === activo)) setActivo(buzones[0].id);
  }, [buzones, activo]);

  const elegido = buzones.find((item) => item.id === activo) || null;
  const hilo = useMemo(
    () => mensajes.filter((item) => (
      (item.de === uid && item.para === activo) || (item.de === activo && item.para === uid)
    )),
    [mensajes, uid, activo],
  );
  const cuentaDe = (id) => noLeidos.filter((item) => item.de === id).length;

  const abrirBuzon = (id) => {
    setActivo(id);
    marcarLeido();
  };

  return (
    <section className="mensajes-page" aria-label="Mensajes">
      <aside className="mensajes-buzones">
        <h2>Buzones</h2>
        {buzones.length ? (
          <ul>
            {buzones.map((item) => {
              const deEste = mensajes.filter((msg) => (
                (msg.de === uid && msg.para === item.id) || (msg.de === item.id && msg.para === uid)
              ));
              const tapa = deEste[deEste.length - 1];
              const nuevos = cuentaDe(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={item.id === activo ? "is-on" : ""}
                    onClick={() => abrirBuzon(item.id)}
                  >
                    <Avatar nombre={item.nombre || item.email} foto={fotoDe(item, uid, foto)} />
                    <span>
                      <strong>{item.nombre || item.email || "Alguien"}</strong>
                      <small>{etiquetaPerfil(item.rol) !== "Soporte" ? etiquetaPerfil(item.rol) : (tapa?.texto || "Sin mensajes")}</small>
                    </span>
                    {nuevos ? <i className="chat-badge">{nuevos > 99 ? "99+" : nuevos}</i> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="nota-vacio">No hay buzones para tu perfil.</p>
        )}
      </aside>
      <div className="mensajes-hilo">
        {elegido ? (
          <>
            <header>
              <Avatar nombre={elegido.nombre || elegido.email} foto={fotoDe(elegido, uid, foto)} />
              <div>
                <strong>{elegido.nombre || elegido.email || "Alguien"}</strong>
                {elegido.rol ? <small>{etiquetaPerfil(elegido.rol)}</small> : null}
              </div>
            </header>
            {hilo.length ? <MensajeLista mensajes={hilo} uid={uid} /> : (
              <p className="nota-vacio">Escribe el primer mensaje.</p>
            )}
            <MensajeInput
              onEnviar={(texto) => enviar(texto, elegido.id, elegido.nombre || elegido.email)}
              disabled={!elegido.id}
            />
          </>
        ) : (
          <div className="mensajes-vacio">
            <MessageCircle size={28} />
            <p>Elige un buzón para hablar.</p>
          </div>
        )}
      </div>
    </section>
  );
}

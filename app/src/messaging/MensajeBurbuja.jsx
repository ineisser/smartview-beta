const hora = (marca) => {
  if (!marca) return "";
  return new Date(marca).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
};

export default function MensajeBurbuja({ mensaje, mio }) {
  return (
    <article className={`msg-bubble${mio ? " is-mine" : ""}`}>
      <div className="msg-bubble-meta">
        <span>{mio ? "Tú" : (mensaje.deNombre || "Alguien")}</span>
        <time>{hora(mensaje.en)}</time>
      </div>
      <p>{mensaje.texto}</p>
    </article>
  );
}

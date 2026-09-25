const hora = (marca) => {
  if (!marca) return "";
  return new Date(marca).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
};

export default function MensajeBurbuja({ mensaje, mio, bloque = "solo" }) {
  const conHora = bloque === "solo" || bloque === "inicio" || bloque === "fin";
  return (
    <article className={`msg-bubble${mio ? " is-mine" : ""} is-${bloque}`}>
      <p>{mensaje.texto}</p>
      {conHora ? <time dateTime={mensaje.en ? new Date(mensaje.en).toISOString() : undefined}>{hora(mensaje.en)}</time> : null}
    </article>
  );
}

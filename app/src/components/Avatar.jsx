export default function Avatar({ nombre, foto }) {
  const inicial = String(nombre || "").trim().slice(0, 1).toUpperCase() || "·";
  if (foto) return <img className="avatar" src={foto} alt="" referrerPolicy="no-referrer" />;
  return <span className="avatar" aria-hidden="true">{inicial}</span>;
}

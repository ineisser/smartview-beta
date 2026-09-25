export default function AvanceTurno({ letra, avance, fuera, umbral }) {
  if (fuera) {
    return <span className="avance-turno is-fuera">Fuera de turno</span>;
  }
  const alerta = Number(avance) < Number(umbral);
  const ancho = Math.max(0, Math.min(100, Number(avance) || 0));
  return (
    <span className={`avance-turno${alerta ? " is-alerta" : " is-ok"}`} aria-label={`Turno ${letra}, avance ${avance} por ciento`}>
      <i className="avance-relleno" style={{ width: `${ancho}%` }} aria-hidden="true" />
      <span className="avance-letra">{letra}</span>
      <span className="avance-pct">
        {avance}<small>%</small>
      </span>
    </span>
  );
}

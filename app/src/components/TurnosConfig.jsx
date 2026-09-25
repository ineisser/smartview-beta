import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import TimeField from "./TimeField";

const BASE = [
  { nombre: "Turno 1", inicio: "07:00", fin: "15:00" },
  { nombre: "Turno 2", inicio: "15:00", fin: "23:00" },
  { nombre: "Turno 3", inicio: "23:00", fin: "07:00" },
];

const minutos = (hora) => {
  const [h, m] = String(hora || "00:00").split(":").map(Number);
  return ((h || 0) * 60) + (m || 0);
};

const reloj = (total) => {
  const value = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
};

const normalizar = (lista) => (lista || []).map((turno, index) => ({
  nombre: turno.nombre || `Turno ${index + 1}`,
  inicio: turno.inicio || "07:00",
  fin: turno.fin || "15:00",
}));

const iguales = (a, b) => JSON.stringify(normalizar(a)) === JSON.stringify(normalizar(b));

export default function TurnosConfig({ turnos, onGuardar }) {
  const [lista, setLista] = useState(() => normalizar(turnos?.length ? turnos : BASE));
  const [busy, setBusy] = useState(false);
  const origen = turnos?.length ? turnos : BASE;
  const sucio = !iguales(lista, origen);

  useEffect(() => {
    setLista(normalizar(turnos?.length ? turnos : BASE));
  }, [turnos]);

  const cambiar = (index, campo, valor) => {
    setLista((actual) => actual.map((turno, i) => (i === index ? { ...turno, [campo]: valor } : turno)));
  };

  const agregar = () => {
    setLista((actual) => {
      const ultimo = actual[actual.length - 1];
      const inicio = ultimo?.fin || "07:00";
      return [
        ...actual,
        { nombre: `Turno ${actual.length + 1}`, inicio, fin: reloj(minutos(inicio) + 480) },
      ];
    });
  };

  const quitar = (index) => {
    setLista((actual) => {
      if (actual.length <= 1) return actual;
      return actual
        .filter((_, i) => i !== index)
        .map((turno, i) => ({ ...turno, nombre: `Turno ${i + 1}` }));
    });
  };

  const guardar = async (event) => {
    event.preventDefault();
    if (!sucio || busy) return;
    setBusy(true);
    try {
      await onGuardar(normalizar(lista));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="config-ask setup-turnos" onSubmit={guardar}>
      <h2 className="setup-general-title">Turnos</h2>
      <hr className="setup-general-rule" />
      <p className="setup-turnos-lede">
        Revisa los turnos de esta sala o agrega otros. Cada uno define de qué hora a qué hora trabaja el equipo.
      </p>
      <div className="setup-turnos-lista">
        {lista.map((turno, index) => (
          <div className="shift setup-turno" key={`${turno.nombre}-${index}`}>
            <span>{turno.nombre}</span>
            <label className="field">
              <span>Desde</span>
              <TimeField value={turno.inicio} onChange={(valor) => cambiar(index, "inicio", valor)} />
            </label>
            <label className="field">
              <span>Hasta</span>
              <TimeField value={turno.fin} onChange={(valor) => cambiar(index, "fin", valor)} />
            </label>
            <button
              className="icon-btn setup-turno-quitar"
              type="button"
              aria-label={`Quitar ${turno.nombre}`}
              disabled={lista.length <= 1}
              onClick={() => quitar(index)}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
      <div className="config-row config-row-actions setup-turnos-actions">
        <button className="btn btn-ghost btn-inline" type="button" onClick={agregar}>
          <Plus size={18} /> Agregar turno
        </button>
        <button className="btn btn-primary" type="submit" disabled={!sucio || busy}>
          {busy ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

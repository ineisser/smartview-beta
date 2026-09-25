import { useEffect, useMemo, useRef, useState } from "react";
import { Smartphone } from "lucide-react";
import { UMBRAL_OEE, avanceDeTurno, inicioDeTurno } from "../turno";

const MARCAS = 12;
const RADIO = 42;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;
const TURNOS_BASE = [
  { letra: "A", inicio: "07:00", fin: "15:00" },
  { letra: "B", inicio: "15:00", fin: "23:00" },
  { letra: "C", inicio: "23:00", fin: "07:00" },
];

const minutosDe = (valor) => {
  const [hora, minuto] = String(valor || "00:00").split(":").map(Number);
  return ((hora || 0) * 60) + (minuto || 0);
};

const letraDe = (turno, index) => {
  const nombre = String(turno.nombre || turno.letra || "").trim();
  if (nombre.length === 1) return nombre.toUpperCase();
  return TURNOS_BASE[index]?.letra || String.fromCharCode(65 + index);
};

const turnosDe = (turnos) => {
  const lista = turnos?.length ? turnos : TURNOS_BASE;
  return lista.map((turno, index) => ({
    letra: letraDe(turno, index),
    inicio: minutosDe(turno.inicio),
    fin: minutosDe(turno.fin),
  }));
};

const turnoActual = (turnos, ahora) => {
  const minuto = ahora.getHours() * 60 + ahora.getMinutes();
  return turnos.find((turno) => {
    if (turno.inicio === turno.fin) return true;
    return turno.inicio < turno.fin
      ? minuto >= turno.inicio && minuto < turno.fin
      : minuto >= turno.inicio || minuto < turno.fin;
  }) || turnos[0];
};

const minutosTurno = (turno) => {
  if (turno.fin > turno.inicio) return turno.fin - turno.inicio;
  return (24 * 60 - turno.inicio) + turno.fin;
};

const transcurrido = (turno, ahora) => {
  const minuto = ahora.getHours() * 60 + ahora.getMinutes();
  if (turno.fin > turno.inicio) return Math.max(0, minuto - turno.inicio);
  if (minuto >= turno.inicio) return minuto - turno.inicio;
  return (24 * 60 - turno.inicio) + minuto;
};

const formatoReloj = (minutos) => {
  const seguro = Math.max(0, minutos);
  const horas = Math.floor(seguro / 60);
  const resto = seguro % 60;
  return `-${horas}:${String(resto).padStart(2, "0")}`;
};

const formatoMin = (minutos) => (minutos < 60 ? `${minutos} min` : `${Math.floor(minutos / 60)}h ${minutos % 60}m`);

const marcas = Array.from({ length: MARCAS }, (_, index) => {
  const angulo = index * 30 * (Math.PI / 180);
  return {
    x1: 50 + 38 * Math.cos(angulo),
    y1: 50 + 38 * Math.sin(angulo),
    x2: 50 + 44 * Math.cos(angulo),
    y2: 50 + 44 * Math.sin(angulo),
  };
});

function usePulso(valor, pasoMs) {
  const [visto, setVisto] = useState(valor);
  const vistoRef = useRef(valor);
  useEffect(() => {
    vistoRef.current = visto;
  }, [visto]);
  useEffect(() => {
    if (vistoRef.current === valor) return undefined;
    const id = window.setInterval(() => {
      const actual = vistoRef.current;
      if (actual === valor) {
        window.clearInterval(id);
        return;
      }
      const siguiente = actual + (valor > actual ? 1 : -1);
      vistoRef.current = siguiente;
      setVisto(siguiente);
    }, pasoMs);
    return () => window.clearInterval(id);
  }, [valor, pasoMs]);
  return visto;
}

export default function EficienciaPanel({ maquinas = [], paros = {}, salaCodigo, turnos, logs = [], umbral = UMBRAL_OEE }) {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const agenda = useMemo(() => turnosDe(turnos), [turnos]);
  const turno = turnoActual(agenda, ahora);
  const totalMin = Math.max(1, minutosTurno(turno));
  const elapsed = Math.min(totalMin, transcurrido(turno, ahora));
  const restante = formatoReloj(totalMin - elapsed);

  const numeros = maquinas.map((machine, index) => String(machine.numero || index + 1).padStart(2, "0"));
  const activos = numeros.filter((numero) => paros[numero]);
  const parosVistos = usePulso(activos.length, 100);

  const calculo = useMemo(() => {
    const delTurno = logs.filter((item) => !salaCodigo || !item.sala || item.sala === salaCodigo);
    const corte = inicioDeTurno(turno, ahora).getTime();
    const enTurno = delTurno.filter((item) => {
      const fin = Number(item.fin || (item.status === "atendido" ? 0 : ahora.getTime()) || 0);
      return (Number(item.inicio || item.id || 0) >= corte) || (fin >= corte);
    });
    const avance = avanceDeTurno({ turnos, ahora, maquinas, paros, salaCodigo, logs: delTurno });
    const posibles = Math.max(0, elapsed) * Math.max(numeros.length, 1);
    const eficiencia = avance.fuera ? 100 : (avance.avance ?? 100);
    const improductivo = posibles - Math.round((posibles * eficiencia) / 100);
    const maquinasHistorial = new Set(enTurno.map((item) => String(item.machine || item.maquina).padStart(2, "0")));
    activos.forEach((numero) => maquinasHistorial.add(numero));
    return {
      eficiencia,
      improductivo,
      posibles,
      parosHistorial: enTurno.length + activos.filter((numero) => !maquinasHistorial.has(numero)).length,
      maquinas: maquinasHistorial.size,
    };
  }, [ahora, turno, salaCodigo, paros, activos, elapsed, numeros.length, logs, turnos, maquinas]);

  const eficiencia = usePulso(calculo.eficiencia, 30);
  const buena = eficiencia >= Number(umbral);
  const arco = (Math.min(totalMin, 12 * 60) / (12 * 60)) * CIRCUNFERENCIA;
  const avance = (Math.min(elapsed, 12 * 60) / (12 * 60)) * CIRCUNFERENCIA;
  const giro = ((turno.inicio / 60) % 12) * 30;
  const hora = ahora.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const segundo = ahora.getSeconds().toString().padStart(2, "0");

  return (
    <section className="eficiencia-panel" aria-label="Eficiencia del turno">
      <article className="eficiencia-card eficiencia-reloj">
        <div className="clock-svg-wrapper">
          <svg className="clock-svg" viewBox="0 0 100 100" aria-hidden="true">
            <g>
              {marcas.map((marca) => (
                <line key={`${marca.x1}-${marca.y1}`} className="hour-mark" x1={marca.x1} y1={marca.y1} x2={marca.x2} y2={marca.y2} />
              ))}
            </g>
            <circle className="clock-face" cx="50" cy="50" r={RADIO} />
            <circle
              className="shift-track"
              cx="50"
              cy="50"
              r={RADIO}
              style={{ strokeDasharray: `${arco} ${CIRCUNFERENCIA}`, transform: `rotate(${giro}deg)` }}
            />
            <circle
              className={`shift-progress ${buena ? "efficiency-good" : "efficiency-bad"}`}
              cx="50"
              cy="50"
              r={RADIO}
              style={{ strokeDasharray: `${avance} ${CIRCUNFERENCIA}`, transform: `rotate(${giro}deg)` }}
            />
          </svg>
          <div className="clock-center-info">
            <span className="eficiencia-caption">tiempo restante</span>
            <div className={`remaining-val ${buena ? "is-good" : "is-bad"}`}>{restante}</div>
          </div>
        </div>
      </article>

      <article className="eficiencia-card eficiencia-valor">
        <span className="eficiencia-caption">Eficiencia</span>
        <div className="eficiencia-numero">
          <span>{eficiencia}</span>
          <small>%</small>
        </div>
        <div className="efficiency-bar-container">
          <div className={`efficiency-bar-fill ${buena ? "is-good" : "is-bad"}`} style={{ width: `${eficiencia}%` }} />
        </div>
        <div className="eficiencia-minutos">
          <span className="is-down">{formatoMin(calculo.improductivo)}</span>
          <span className="is-sep">/</span>
          <span>{formatoMin(calculo.posibles)}</span>
        </div>
      </article>

      <article className="eficiencia-card eficiencia-hora">
        <span className="eficiencia-caption">hora actual</span>
        <div className="hora-actual">
          <span>{hora}</span>
          <small>:{segundo}</small>
        </div>
      </article>

      <article className="eficiencia-card eficiencia-turno">
        <span className="eficiencia-caption">turno</span>
        <div className="eficiencia-cifra">{turno.letra}</div>
      </article>

      <article className="eficiencia-card eficiencia-paros">
        <div className="paros-cifra">
          <span className="eficiencia-caption">paros</span>
          <div className="eficiencia-cifra is-alert">{parosVistos}</div>
        </div>
        <div className="incidentes">
          <Smartphone size={40} />
          <div>
            <strong>{calculo.parosHistorial} paros en {calculo.maquinas} máquinas</strong>
            <span>{formatoMin(calculo.improductivo)} tiempo sin producción</span>
          </div>
        </div>
      </article>
    </section>
  );
}

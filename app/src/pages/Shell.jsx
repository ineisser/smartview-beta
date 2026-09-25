import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRightFromLine, Bell, Cast, Check, ChevronRight, Circle, CircleGauge, CircleUser, Clock, EllipsisVertical, FlaskConical, Grip, History, List, LogOut, Maximize2, MessageCircle, Minimize2, Monitor, Moon, Percent, RefreshCw, RotateCcw, Server, Settings, Square, Sun, Volume2, VolumeOff, X } from "lucide-react";
import "../styles/components/modal.css";
import { push, ref, update } from "firebase/database";
import { rtdb } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { descripcionPerfil, etiquetaPerfil, permisos } from "../access";
import { esUrgenteParo, tonoCampana } from "../avisos";
import useMensajes from "../messaging/useMensajes";
import Mensajes from "./Mensajes";
import Avatar from "../components/Avatar";
import Colaboradores from "./Colaboradores";
import CentralAvisos from "./CentralAvisos";
import Laboratorio from "./Laboratorio";
import { operariaAna, salasTelares } from "../simulador";
import Ficha from "./Ficha";
import useRobotAvance from "../hooks/useRobotAvance";
import useHistorialOrg from "../hooks/useHistorialOrg";
import useAvisoSonido from "../hooks/useAvisoSonido";
import { aplicarTema, leerTema } from "../theme";
import { alternarPantalla, estaCompleta, entrarPantalla, guardarPantalla, leerPantalla } from "../pantalla";
import Toast from "../components/Toast";
import Switch from "../components/Switch";
import TabSwitch from "../components/TabSwitch";
import Tooltip from "../components/Tooltip";
import ParoModal from "../components/ParoModal";
import EficienciaPanel from "../components/EficienciaPanel";
import AvanceTurno from "../components/AvanceTurno";
import AvisoActualizacion from "../components/AvisoActualizacion";
import TurnosConfig from "../components/TurnosConfig";
import { UMBRAL_OEE, alertaValida, avanceDeTurno, umbralDe } from "../turno";
import { ALTAVOZ, REPETICIONES_VOZ, altavozActivo, etiquetaMaquina, fijarAltavoz, fijarVolumen, fraseParo, parosVozDe, repeticionesValidas, tocarLlegada, volumenPorcentaje, VOLUMEN } from "../sonido";
import useAppVersion from "../hooks/useAppVersion";
import { Campana, CentroAvisos, PaginaAvisos, notasDeSala } from "../components/Notificaciones";
import useSalaControl from "../hooks/useSalaControl";
import { MOTIVOS_PARO } from "../data/motivos-paro";
import { VIA, nombreDeVia } from "../paro";
import { borrarHistorialSala, cerrarParoRemoto } from "../historial";
import "../styles/components/machine-card.css";
import "../styles/components/eficiencia.css";
import "../styles/components/log-item.css";

const lista = (sala) => (sala?.maquinas || []).length > 0 && (sala?.motivos || []).length > 0;
const siglas = (nombre) => {
  const limpio = String(nombre || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z]/g, "");
  return (limpio.slice(0, 2) || "SA").toUpperCase();
};
const codigoOrganizacion = (uid) => `SV${String(uid || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16).toUpperCase()}`;
const codigoSala = (nombre, index) => `${siglas(nombre)}${String(index + 1).padStart(2, "0")}`;
const capital = (texto) => String(texto || "").toLocaleLowerCase("es").replace(/(^|\s)\p{L}/gu, (letra) => letra.toLocaleUpperCase("es"));
const inicioTurno = (ahora = new Date()) => {
  const hora = ahora.getHours();
  const salida = hora >= 7 && hora < 15 ? 7 : hora >= 15 && hora < 23 ? 15 : 23;
  const marca = new Date(ahora);
  marca.setHours(salida, 0, 0, 0);
  if (marca.getTime() > ahora.getTime()) marca.setDate(marca.getDate() - 1);
  return marca;
};
const textoDuracion = (desde) => {
  const minutos = Math.max(0, Math.floor((Date.now() - desde) / 60000));
  return minutos < 60 ? `${minutos} min` : `${Math.floor(minutos / 60)}h ${minutos % 60}m`;
};
const textoMinutos = (minutos) => (minutos < 60 ? `${minutos} min` : `${Math.floor(minutos / 60)}h ${minutos % 60}m`);
const horaCorta = (marca) => new Date(marca).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
const minutosReloj = (value) => {
  const [hora, minuto] = String(value || "00:00").split(":").map(Number);
  return ((hora || 0) * 60) + (minuto || 0);
};
const nombreTurno = (turnos, marca) => {
  if (!marca) return "—";
  const fecha = new Date(marca);
  const minuto = fecha.getHours() * 60 + fecha.getMinutes();
  const lista = turnos?.length ? turnos : [
    { nombre: "Turno 1", inicio: "07:00", fin: "15:00" },
    { nombre: "Turno 2", inicio: "15:00", fin: "23:00" },
    { nombre: "Turno 3", inicio: "23:00", fin: "07:00" },
  ];
  const encontrado = lista.find((turno) => {
    const ini = minutosReloj(turno.inicio);
    const fin = minutosReloj(turno.fin);
    if (ini === fin) return true;
    return ini < fin ? minuto >= ini && minuto < fin : minuto >= ini || minuto < fin;
  });
  return encontrado?.nombre || "—";
};
const leerLogs = () => {
  try { return JSON.parse(localStorage.getItem("machine_stop_logs") || "[]"); } catch { return []; }
};
const guardarLogs = (logs) => localStorage.setItem("machine_stop_logs", JSON.stringify(logs));
const claveAviso = (sala, numero, inicio) => `${sala || ""}:${numero}:${inicio || ""}`;
const leerVistos = (uid) => {
  try { return new Set(JSON.parse(localStorage.getItem(`smartview-avisos:${uid || "x"}`) || "[]")); } catch { return new Set(); }
};
const guardarVistos = (uid, vistos) => {
  localStorage.setItem(`smartview-avisos:${uid || "x"}`, JSON.stringify([...vistos]));
};
const mismaMaquina = (machine, numero) => String(machine).padStart(2, "0") === String(numero).padStart(2, "0");
const minutosDe = (item) => {
  const inicio = Number(item.inicio || item.id || 0);
  const enCurso = item.status !== "atendido" && !item.fin;
  const fin = enCurso ? Date.now() : Number(item.fin || 0);
  if (inicio && fin) return Math.max(0, Math.round((fin - inicio) / 60000));
  return Number(item.duration) || 0;
};
const COLUMNAS_HISTORIAL = [
  { key: "turno", titulo: "Turno", ancho: 150, min: 90 },
  { key: "maquina", titulo: "Máquina", ancho: 110, min: 80 },
  { key: "motivo", titulo: "Motivo", ancho: 220, min: 120 },
  { key: "inicio", titulo: "Inicio", ancho: 110, min: 80 },
  { key: "termino", titulo: "Término", ancho: 110, min: 80 },
  { key: "tiempo", titulo: "Tiempo", ancho: 140, min: 110 },
  { key: "detuvo", titulo: "Detuvo", ancho: 140, min: 90 },
  { key: "arranco", titulo: "Arrancó", ancho: 140, min: 90 },
  { key: "estado", titulo: "Estado", ancho: 130, min: 90 },
];

function FilaSala({ numero, motivo, hora, desde, activo, onAbrir }) {
  return (
    <div className="log-item" data-machine-id={numero} role={onAbrir ? "button" : undefined} tabIndex={onAbrir ? 0 : undefined} onClick={onAbrir} onKeyDown={onAbrir ? (event) => { if (event.key === "Enter") onAbrir(); } : undefined}>
      <div className="log-col-1">{numero}</div>
      <div className="log-col-2">
        <div className="log-item-reason" style={activo ? { opacity: 0.6 } : undefined}>{motivo}</div>
        <div className="log-item-footer">
          <div className="log-time-data">
            <div className="log-capsule">
              {activo ? <ArrowRightFromLine size={14} color="#10b981" /> : <Clock size={14} />}
              <span>{hora}</span>
            </div>
            <div className="log-capsule">
              <CircleGauge className="spinning-icon" size={16} color={activo ? "#10b981" : undefined} />
              <span style={activo ? { fontWeight: 700 } : undefined}>{textoDuracion(desde)}</span>
            </div>
          </div>
          {activo ? <Circle className="status-icon-log activo" /> : <Square className="status-icon-log detenido" />}
        </div>
      </div>
    </div>
  );
}

function ListaSala({ panel, maquinas, paros, onAbrir }) {
  const [, setMarca] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setMarca((valor) => valor + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const turno = inicioTurno();
  const horaTurno = turno.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const detenidas = [];
  const activas = [];
  maquinas.forEach((machine, index) => {
    const numero = String(machine.numero || index + 1).padStart(2, "0");
    if (paros[numero]) detenidas.push(numero);
    else activas.push(numero);
  });
  const filaActiva = (numero) => (
    <FilaSala key={numero} numero={numero} motivo="Operando" hora={horaTurno} desde={turno.getTime()} activo onAbrir={() => onAbrir(numero)} />
  );
  const filaParo = (numero) => {
    const paro = paros[numero];
    const inicio = paro.inicio || Date.now();
    return (
      <FilaSala
        key={numero}
        numero={numero}
        motivo={paro.nombre || "Paro manual"}
        hora={new Date(inicio).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
        desde={inicio}
        onAbrir={() => onAbrir(numero)}
      />
    );
  };
  const primero = panel === "priority" ? detenidas : activas;
  const segundo = panel === "priority" ? activas : detenidas;
  const etiquetaPrimero = panel === "priority" ? "En espera" : "Activas";
  const etiquetaSegundo = panel === "priority" ? "Funcionando" : "Detenidas";
  return (
    <div id="main-log-container" className="log-list-container activity-grid-desktop">
      <div className="section-label">
        <span>{etiquetaPrimero}</span>
        <span className="section-count">{primero.length}</span>
      </div>
      {primero.map((numero) => (panel === "priority" ? filaParo(numero) : filaActiva(numero)))}
      <div className="section-label section-label-spaced">
        <span>{etiquetaSegundo}</span>
        <span className="section-count">{segundo.length}</span>
      </div>
      {segundo.map((numero) => (panel === "priority" ? filaActiva(numero) : filaParo(numero)))}
    </div>
  );
}

function HistorialTabla({ org, salaCodigo, paros, turnos, nombres = {}, puedeReiniciar = false, logs = [] }) {
  const [, setMarca] = useState(0);
  const [anchos, setAnchos] = useState(() => Object.fromEntries(COLUMNAS_HISTORIAL.map((columna) => [columna.key, columna.ancho])));
  const [girando, setGirando] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const drag = useRef(null);
  useEffect(() => {
    const id = window.setInterval(() => setMarca((valor) => valor + 1), 30000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    const mover = (event) => {
      if (!drag.current) return;
      const ancho = Math.max(drag.current.min, drag.current.ancho + event.clientX - drag.current.x);
      setAnchos((prev) => ({ ...prev, [drag.current.key]: ancho }));
    };
    const soltar = () => { drag.current = null; };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    return () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
    };
  }, []);
  const abiertos = new Set(logs.filter((item) => item.status !== "atendido" && !item.fin).map((item) => String(item.machine).padStart(2, "0")));
  const filas = [
    ...logs,
    ...Object.entries(paros).filter(([numero]) => !abiertos.has(numero)).map(([numero, paro]) => ({
      id: paro.inicio || Date.now(),
      machine: numero,
      reason: paro.nombre,
      inicio: paro.inicio,
      status: "detenido",
    })),
  ].sort((a, b) => (b.inicio || b.id || 0) - (a.inicio || a.id || 0));
  const total = filas.reduce((suma, item) => suma + minutosDe(item), 0);
  const actualizar = () => {
    if (girando) return;
    setGirando(true);
    setMarca((valor) => valor + 1);
    window.setTimeout(() => setGirando(false), 500);
  };
  const eliminar = async () => {
    guardarLogs(leerLogs().filter((item) => item.sala && item.sala !== salaCodigo));
    await borrarHistorialSala(org, salaCodigo).catch(() => {});
    setMarca((valor) => valor + 1);
  };
  useEffect(() => {
    if (!confirmar) {
      setModalVisible(false);
      return undefined;
    }
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setModalVisible(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [confirmar]);
  const cerrarConfirmacion = () => {
    setModalVisible(false);
    window.setTimeout(() => setConfirmar(false), 600);
  };
  const reiniciarHistorial = () => {
    eliminar();
    cerrarConfirmacion();
  };
  const celda = (item, key) => {
    const enCurso = item.status !== "atendido" && !item.fin;
    const inicio = item.inicio || item.id;
    if (key === "turno") return nombreTurno(turnos, inicio);
    if (key === "maquina") return String(item.machine).padStart(2, "0");
    if (key === "motivo") {
      const texto = item.reason || "Paro manual";
      if (enCurso) {
        return (
          <span className="historial-motivo-badge">
            {texto}
            <i className="historial-motivo-dot" aria-hidden="true" />
          </span>
        );
      }
      return texto;
    }
    if (key === "inicio") return item.inicio ? horaCorta(item.inicio) : (item.stopTime || "—");
    if (key === "termino") return item.fin ? horaCorta(item.fin) : "—";
    if (key === "detuvo") return nombreDeVia(item.via || VIA.paroManual, nombres[item.autor] || item.autorNombre);
    if (key === "arranco") {
      if (item.status !== "atendido" && !item.fin) return "—";
      return nombreDeVia(item.arranqueVia || VIA.arranqueManual, nombres[item.arranqueAutor] || item.arranqueNombre);
    }
    if (key === "tiempo") {
      return (
        <span className="paro-tiempo">
          {enCurso ? <Clock className="spinning-icon" size={18} /> : null}
          <span>{textoMinutos(minutosDe(item))}</span>
        </span>
      );
    }
    return (
      <span className={enCurso ? "paro-curso" : "paro-atendido"}>
        {enCurso ? null : <Check size={18} />}
        <span>{enCurso ? "Detenido" : "Atendido"}</span>
      </span>
    );
  };
  return (
    <div className="historial">
      <div className="historial-bar">
        <span>Tiempo de paro {textoMinutos(total)}</span>
        <div className="historial-tools">
          <button className={`btn btn-ghost setup-tool${girando ? " is-spin" : ""}`} type="button" aria-label="Actualizar" onClick={actualizar}>
            <RefreshCw size={18} />
          </button>
          {puedeReiniciar ? (
          <div className="historial-mas">
            <button className="btn btn-ghost setup-tool" type="button" aria-label="Más" aria-expanded={menu} onClick={() => setMenu((abierto) => !abierto)}>
              <EllipsisVertical size={18} />
            </button>
            {menu ? (
              <ul className="menu-list historial-opciones">
                <li>
                  <button type="button" className="historial-reiniciar" onClick={() => { setMenu(false); setConfirmar(true); }}>
                    <RotateCcw size={18} />
                    <span>Reiniciar registro de historial</span>
                  </button>
                </li>
              </ul>
            ) : null}
          </div>
          ) : null}
        </div>
      </div>
      {confirmar ? createPortal(
        <div id="modal-overlay" className={modalVisible ? "active" : ""} onClick={(event) => { if (event.target.id === "modal-overlay") cerrarConfirmacion(); }}>
          <div className="modal-glass" role="dialog" aria-labelledby="historial-reiniciar-titulo">
            <button className="modal-close" type="button" aria-label="Cerrar" onClick={cerrarConfirmacion}><X size={18} /></button>
            <h3 id="historial-reiniciar-titulo">Reiniciar registro de historial</h3>
            <p>Se borran solo los registros del historial de esta sala. Los paros en curso no se tocan.</p>
            <div className="modal-actions">
              <button className="btn theme-cancel-btn" type="button" onClick={cerrarConfirmacion}>cancelar</button>
              <button className="btn confirm-stop" type="button" onClick={reiniciarHistorial}>reiniciar</button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
      {filas.length ? (
        <div className="sheet sala-historial">
          <table>
            <colgroup>
              {COLUMNAS_HISTORIAL.map((columna) => <col key={columna.key} style={{ width: anchos[columna.key] }} />)}
            </colgroup>
            <thead>
              <tr>
                {COLUMNAS_HISTORIAL.map((columna) => (
                  <th key={columna.key}>
                    {columna.titulo}
                    <span
                      className="col-resize"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        drag.current = { key: columna.key, x: event.clientX, ancho: anchos[columna.key], min: columna.min };
                      }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((item) => {
                const enCurso = item.status !== "atendido" && !item.fin;
                return (
                  <tr key={`${item.id}-${item.machine}`}>
                    {COLUMNAS_HISTORIAL.map((columna) => (
                      <td
                        key={columna.key}
                        className={enCurso && columna.key === "estado" ? "historial-celda-detenido" : undefined}
                      >
                        {celda(item, columna.key)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <p className="historial-vacio">Sin historial</p>}
    </div>
  );
}

function FilasSkeleton({ columnas }) {
  return Array.from({ length: 6 }, (_, fila) => (
    <tr key={fila} className="skeleton-row">
      {Array.from({ length: columnas }, (_, celda) => (
        <td key={celda}><span className="skeleton" /></td>
      ))}
    </tr>
  ));
}

function Segmento({ value, onChange }) {
  return (
    <div className={`segment btn-slide${value ? ` is-${value}` : ""}`} role="group" aria-label="Sí o no">
      {value ? <i aria-hidden="true" /> : null}
      {["si", "no"].map((opcion) => (
        <button key={opcion} type="button" className={value === opcion ? "is-on" : ""} onClick={() => onChange(opcion)}>
          {opcion === "si" ? "Sí" : "No"}
        </button>
      ))}
    </div>
  );
}

function Paso({ hecho, texto, pregunta, value, onChange }) {
  return (
    <li className="setup-row">
      <span className={`setup-mark${hecho ? " is-done" : ""}`} aria-hidden="true">
        {hecho ? <Check size={16} /> : <X size={16} />}
      </span>
      <p>{texto}</p>
      {hecho ? null : (
        <div className="setup-ask">
          <span>{pregunta}</span>
          <Segmento value={value} onChange={onChange} />
        </div>
      )}
    </li>
  );
}

const MODOS = [
  { id: "light", label: "Claro", Icon: Sun },
  { id: "dark", label: "Oscuro", Icon: Moon },
  { id: "system", label: "Sistema", Icon: Monitor },
];

export default function Shell() {
  const { profile, user, saveProfile, logout, cargarOrganizacion, guardarAvisoAvance, guardarMisDatos, editarMiembro, activarCuenta } = useAuth();
  const { hayActualizacion, actualizar } = useAppVersion();
  const acceso = permisos(profile);
  const navigate = useNavigate();
  const { pathname, search, state: rutaState } = useLocation();
  const { orgCodigo, salaCodigo } = useParams();
  const [open, setOpen] = useState(() => (typeof window !== "undefined" ? window.innerHeight <= window.innerWidth : true));
  const [vertical, setVertical] = useState(() => (typeof window !== "undefined" ? window.innerHeight > window.innerWidth : false));
  const [menu, setMenu] = useState(null);
  const [menuOn, setMenuOn] = useState(false);
  const menuTimer = useRef(0);
  const restaurarPantalla = useRef(leerPantalla());
  const [modos, setModos] = useState(false);
  const [tema, setTema] = useState(leerTema);
  const [completa, setCompleta] = useState(estaCompleta);
  const [altavoz, setAltavoz] = useState(altavozActivo);
  const [volumen, setVolumen] = useState(volumenPorcentaje);
  const [volMenu, setVolMenu] = useState(null);
  const [volOn, setVolOn] = useState(false);
  const volTimer = useRef(0);
  const [organizacion, setOrganizacion] = useState(profile?.organizacion || "");
  const [simulador, setSimulador] = useState(profile?.planta?.simuladorFallos === true);
  const [alertaSala, setAlertaSala] = useState("");
  const [vozSala, setVozSala] = useState(true);
  const [vecesSala, setVecesSala] = useState(String(REPETICIONES_VOZ));
  const [parosVoz, setParosVoz] = useState("todas");
  const [ahora, setAhora] = useState(() => new Date());
  const [aviso, setAviso] = useState("");
  const [toast, setToast] = useState("");
  const [pestana, setPestana] = useState("general");
  const [panel, setPanel] = useState("mapa");
  const [tituloPanel, setTituloPanel] = useState("mapa");
  const [faseTitulo, setFaseTitulo] = useState("");
  const [paro, setParo] = useState(null);
  const [ficha, setFicha] = useState(null);
  const [actualizando, setActualizando] = useState(false);
  const [avisos, setAvisos] = useState(false);
  const [centro, setCentro] = useState(false);
  const campanaRef = useRef(null);
  const [vistos, setVistos] = useState(() => new Set());
  const salas = acceso.salasDe(profile?.planta?.salas || []);
  const activa = Math.max(0, salas.findIndex((item) => item.codigo === salaCodigo));
  const sala = salas[activa];
  const orgActiva = profile?.codigo || orgCodigo || "";
  const motivosSala = (sala?.motivos || []).length
    ? sala.motivos
    : MOTIVOS_PARO.map((item) => ({ codigo: item.id, nombre: item.nombre, corta: item.nombre }));
  const { paros, detener, reiniciar, comentar } = useSalaControl({
    org: orgActiva,
    sala: salaCodigo,
    uid: user?.uid,
    motivos: motivosSala,
  });
  const historialOrg = useHistorialOrg(orgActiva);
  const logsSala = useMemo(
    () => historialOrg.filter((item) => !item.sala || item.sala === salaCodigo),
    [historialOrg, salaCodigo],
  );
  const { informes, listo: avisosListos } = useRobotAvance({
    org: orgActiva,
    planta: profile?.planta,
    config: profile?.avisosAvance,
    activo: Boolean(orgActiva && acceso.estadistica),
  });
  const salasOk = new Set(salas.map((item) => item.codigo));
  const informesSala = informes.filter((item) => !item.sala || salasOk.has(item.sala));
  const avisosNuevos = Object.entries(paros).flatMap(([numero, item]) => {
    const id = claveAviso(salaCodigo, numero, item.inicio);
    if (vistos.has(id)) return [];
    const motivo = motivosSala.find((m) => (m.codigo || m.id) === item.motivo) || {};
    return [{ ...item, tipo: motivo.tipo, oee: motivo.oee, urgente: esUrgenteParo({ ...item, tipo: motivo.tipo, oee: motivo.oee }) }];
  });
  const parosNota = Object.fromEntries(Object.entries(paros).map(([numero, item]) => {
    const motivo = motivosSala.find((m) => (m.codigo || m.id) === item.motivo) || {};
    const machine = (sala?.maquinas || []).find((m) => mismaMaquina(m.numero, numero));
    const log = logsSala.find((entrada) => mismaMaquina(entrada.machine, numero) && Number(entrada.inicio) === Number(item.inicio));
    const via = item.via || log?.via;
    return [numero, {
      ...item,
      urgente: esUrgenteParo({ ...item, tipo: motivo.tipo, oee: motivo.oee }),
      automatico: via !== VIA.paroManual,
      frase: fraseParo(etiquetaMaquina(machine?.nombre, numero, sala?.nombre), item.nombre),
    }];
  }));
  const avanceSala = sala
    ? avanceDeTurno({ turnos: sala.turnos, ahora, maquinas: sala.maquinas || [], paros, salaCodigo, logs: logsSala })
    : null;
  const umbralSala = umbralDe(sala, profile?.planta);
  const alertaOee = avanceSala && !avanceSala.fuera && avanceSala.avance < umbralSala
    ? {
      id: `oee:${salaCodigo}:${avanceSala.inicio}`,
      en: avanceSala.inicio,
      corto: `${sala?.nombre || "Sala"} · OEE ${avanceSala.avance}%`,
      largo: `La eficiencia de ${sala?.nombre || "la sala"} está en ${avanceSala.avance}%, por debajo del ${umbralSala}%.`,
      cuerpo: "",
      tipo: "avance",
      eficiencia: avanceSala.avance,
      sala: salaCodigo,
      salaNombre: sala?.nombre || "",
      urgente: true,
      progreso: null,
      procesando: false,
      listo: false,
      accion: { tipo: "avance", sala: salaCodigo },
    }
    : null;
  const notas = [
    ...(alertaOee ? [alertaOee] : []),
    ...notasDeSala({ informes: informesSala, paros: parosNota, salaCodigo, salaNombre: sala?.nombre }),
  ];
  const informesNuevos = acceso.estadistica ? informesSala.filter((item) => !vistos.has(item.id)) : [];
  const oeeNuevo = alertaOee && !vistos.has(alertaOee.id) ? [alertaOee] : [];
  const puntoAviso = tonoCampana([...avisosNuevos, ...informesNuevos, ...oeeNuevo]);
  const vecesDeSala = repeticionesValidas(sala?.repeticionesVoz) ?? profile?.planta?.repeticionesVoz ?? REPETICIONES_VOZ;
  useAvisoSonido(notas, {
    listo: avisosListos,
    org: orgActiva,
    veces: vecesDeSala,
    planta: profile?.planta?.notificacionesAltavoz !== false && sala?.notificacionesAltavoz !== false,
    paros: parosVozDe(sala?.parosVoz),
  });
  const { noLeidos } = useMensajes({ org: orgActiva, uid: user?.uid, nombre: profile?.nombre || user?.displayName || "" });
  const vista = pathname.endsWith("/mensajes") ? "mensajes" : pathname.endsWith("/notificaciones") ? "notificaciones" : pathname.endsWith("/laboratorio") ? "laboratorio" : pathname.endsWith("/ficha") ? "ficha" : pathname.endsWith("/setup") ? "sala-config" : pathname.endsWith("/configuracion") ? "config" : "sala";
  const listaMiembros = useMemo(
    () => Object.entries(profile?.miembros || {}).map(([id, item]) => ({ id, ...item })),
    [profile?.miembros],
  );
  const insigniaMensajes = noLeidos.length > 99 ? "99+" : noLeidos.length;
  const ruta = (codigoSala, config) => `/${profile?.codigo || orgCodigo}/${codigoSala}${config ? "/setup" : ""}`;
  const nombre = profile?.nombre || user?.displayName || user?.email || "Cuenta";
  const correo = profile?.email || user?.email || "";
  const rolChip = profile?.rolTenant || (profile?.rolPlataforma === "superusuario" ? "plataforma" : profile?.rolPlataforma) || "";
  const foto = profile?.photoURL || user?.photoURL || "";
  const ModoIcon = MODOS.find((item) => item.id === tema)?.Icon || Monitor;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => { if (leerTema() === "system") aplicarTema("system"); };
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const sync = () => {
      const on = estaCompleta();
      setCompleta(on);
      guardarPantalla(on);
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    if (restaurarPantalla.current && !estaCompleta()) {
      const intentar = (event) => {
        if (event.target.closest?.(".pantalla-hit")) return;
        if (restaurarPantalla.current && !estaCompleta()) entrarPantalla();
        restaurarPantalla.current = false;
        document.removeEventListener("pointerdown", intentar);
      };
      document.addEventListener("pointerdown", intentar);
      return () => {
        document.removeEventListener("fullscreenchange", sync);
        document.removeEventListener("webkitfullscreenchange", sync);
        document.removeEventListener("pointerdown", intentar);
      };
    }
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  useEffect(() => {
    let previa = window.innerHeight > window.innerWidth;
    const sync = () => {
      const esVertical = window.innerHeight > window.innerWidth;
      if (esVertical === previa) return;
      previa = esVertical;
      setVertical(esVertical);
      setOpen(!esVertical);
    };
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      setAltavoz(altavozActivo());
      setVolumen(volumenPorcentaje());
    };
    window.addEventListener(ALTAVOZ, sync);
    window.addEventListener(VOLUMEN, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ALTAVOZ, sync);
      window.removeEventListener(VOLUMEN, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => { setSimulador(profile?.planta?.simuladorFallos === true); }, [profile?.planta?.simuladorFallos]);
  const anaLista = useRef(false);
  useEffect(() => {
    if (vista !== "laboratorio" || !new URLSearchParams(search).get("correr") || anaLista.current) return;
    const ana = operariaAna(profile?.miembros);
    const codigo = profile?.codigo || orgCodigo;
    if (!ana.clave || !codigo) return;
    anaLista.current = true;
    const asignadas = salasTelares(profile?.planta?.salas || []).map((sala) => sala.codigo);
    editarMiembro({
      orgCodigo: codigo,
      clave: ana.clave,
      uid: ana.uid,
      nombre: ana.nombre,
      telefono: ana.telefono || "",
      rol: "operario",
      salas: asignadas.length ? asignadas : ana.salas,
    }).then(() => activarCuenta({ orgCodigo: codigo, clave: ana.clave, uid: ana.uid })).catch(() => {});
  }, [vista, search, profile?.miembros, profile?.codigo, profile?.planta?.salas, orgCodigo, editarMiembro, activarCuenta]);
  useEffect(() => {
    if (!user?.uid || !foto || !orgActiva || !profile?.miembros) return;
    const entrada = Object.entries(profile.miembros).find(([clave, item]) => clave === user.uid || item?.uid === user.uid);
    if (!entrada || entrada[1]?.photoURL === foto) return;
    update(ref(rtdb, `organizaciones/${orgActiva}/miembros/${entrada[0]}`), { photoURL: foto }).catch(() => {});
  }, [user?.uid, foto, orgActiva, profile?.miembros]);
  useEffect(() => {
    setAlertaSala(sala?.alertaOee == null || sala?.alertaOee === "" ? "" : String(sala.alertaOee));
    setVozSala(sala?.notificacionesAltavoz !== false);
    setVecesSala(String(sala?.repeticionesVoz ?? profile?.planta?.repeticionesVoz ?? REPETICIONES_VOZ));
    setParosVoz(parosVozDe(sala?.parosVoz));
  }, [sala?.codigo, sala?.alertaOee, sala?.notificacionesAltavoz, sala?.repeticionesVoz, sala?.parosVoz, profile?.planta?.repeticionesVoz]);
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => { setVistos(leerVistos(user?.uid)); }, [user?.uid]);

  useEffect(() => {
    if (!user || !profile?.rolPlataforma || !orgCodigo) return;
    if (profile.codigo === orgCodigo && profile.planta) return;
    cargarOrganizacion(orgCodigo).catch(() => {});
  }, [user, profile?.rolPlataforma, profile?.codigo, profile?.planta, orgCodigo, cargarOrganizacion]);

  useEffect(() => {
    if (!profile || !salas.length) return;
    const bloqueada = (vista === "sala-config" && !acceso.editarPlanta) || (vista === "config" && !acceso.editarPlanta && !acceso.invitar);
    if (!bloqueada) return;
    navigate(`/${profile.codigo || orgCodigo}/${salas[0].codigo}`, { replace: true });
  }, [profile, vista, acceso.editarPlanta, acceso.invitar, salas, orgCodigo, navigate]);

  useEffect(() => {
    if (!profile || vista === "config" || vista === "ficha" || vista === "notificaciones" || vista === "mensajes" || vista === "laboratorio" || !salaCodigo || !salas.length) return;
    if (salas.some((item) => item.codigo === salaCodigo)) return;
    navigate(`/${profile.codigo || orgCodigo}/${salas[0].codigo}`, { replace: true });
  }, [profile, vista, salaCodigo, salas, orgCodigo, navigate]);

  useEffect(() => {
    if (panel === tituloPanel) return undefined;
    setFaseTitulo("is-out");
    const id = window.setTimeout(() => {
      setTituloPanel(panel);
      setFaseTitulo("is-in");
    }, 450);
    return () => window.clearTimeout(id);
  }, [panel, tituloPanel]);

  const actualizarTabla = () => {
    if (actualizando) return;
    setActualizando(true);
    window.setTimeout(() => setActualizando(false), 500);
  };

  useEffect(() => {
    if (!user || !profile) return;
    const codigo = profile.codigo || codigoOrganizacion(user.uid);
    const siguientes = (profile.planta?.salas || []).map((item, index) => (
      item.codigo ? item : { ...item, codigo: codigoSala(item.nombre, index) }
    ));
    const faltan = !profile.codigo || siguientes.some((item, index) => item.codigo !== profile.planta?.salas?.[index]?.codigo);
    if (!faltan) return;
    saveProfile(user.uid, { codigo, planta: { ...profile.planta, salas: siguientes } }).catch(() => {});
  }, [user, profile, saveProfile]);

  const puestoMenu = (nodo) => {
    const usuario = nodo.getBoundingClientRect();
    const barra = nodo.closest(".sidebar")?.getBoundingClientRect();
    return {
      left: (barra?.right ?? usuario.right) + 8,
      bottom: window.innerHeight - usuario.top + 8,
    };
  };

  const mostrarMenu = (nodo) => {
    window.clearTimeout(menuTimer.current);
    ocultarVolumen();
    setModos(false);
    setMenu(puestoMenu(nodo));
    setMenuOn(false);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setMenuOn(true));
    });
  };

  const ocultarMenu = () => {
    setMenuOn(false);
    setModos(false);
    window.clearTimeout(menuTimer.current);
    menuTimer.current = window.setTimeout(() => setMenu(null), 800);
  };

  const ocultarVolumen = () => {
    setVolOn(false);
    window.clearTimeout(volTimer.current);
    volTimer.current = window.setTimeout(() => setVolMenu(null), 800);
  };

  const mostrarVolumen = (nodo) => {
    ocultarMenu();
    window.clearTimeout(volTimer.current);
    setVolMenu(puestoMenu(nodo));
    setVolOn(false);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setVolOn(true));
    });
  };

  useEffect(() => {
    if (!menu || !menuOn) return undefined;
    const cerrar = (event) => {
      if (event.target.closest?.(".user-menu, .user-sub, .user-hit")) return;
      ocultarMenu();
    };
    document.addEventListener("pointerdown", cerrar);
    return () => document.removeEventListener("pointerdown", cerrar);
  }, [menu, menuOn]);

  useEffect(() => {
    if (!volMenu || !volOn) return undefined;
    const cerrar = (event) => {
      if (event.target.closest?.(".volumen-menu, .volumen-hit")) return;
      ocultarVolumen();
    };
    document.addEventListener("pointerdown", cerrar);
    return () => document.removeEventListener("pointerdown", cerrar);
  }, [volMenu, volOn]);

  const elegirTema = (id) => {
    setTema(aplicarTema(id));
    setModos(false);
  };

  const salir = () => {
    ocultarMenu();
    logout().then(() => navigate("/"));
  };

  const guardarOrganizacion = async (event) => {
    event.preventDefault();
    const limpio = organizacion.trim();
    if (!limpio || !user) return;
    await saveProfile(user.uid, { organizacion: limpio });
    setAviso("Guardado correctamente");
    setToast("Se guardó correctamente.");
    setTimeout(() => setAviso(""), 4000);
  };

  const guardarAlertaSala = async (event) => {
    event.preventDefault();
    if (!user || !sala) return;
    const umbral = alertaValida(alertaSala);
    const veces = repeticionesValidas(vecesSala);
    if (umbral === undefined || (vozSala && veces == null)) return;
    const siguientes = salas.map((item, index) => (
      index === activa ? {
        ...item,
        alertaOee: umbral,
        notificacionesAltavoz: vozSala,
        repeticionesVoz: veces ?? (repeticionesValidas(sala.repeticionesVoz) || REPETICIONES_VOZ),
        parosVoz: parosVozDe(parosVoz),
      } : item
    ));
    await saveProfile(user.uid, { planta: { ...profile.planta, salas: siguientes } });
    setToast("Se guardó la configuración de la sala.");
  };

  const guardarTurnosSala = async (turnos) => {
    if (!user || !sala) return;
    const siguientes = salas.map((item, index) => (
      index === activa ? { ...item, turnos, cantidadTurnos: turnos.length } : item
    ));
    await saveProfile(user.uid, { planta: { ...profile.planta, salas: siguientes } });
    setToast("Se guardaron los turnos.");
  };

  const aplicarCentral = async ({ avance, umbral, notificacionesAltavoz, repeticionesVoz }) => {
    if (!orgActiva || !user) return;
    await guardarAvisoAvance(orgActiva, avance);
    await saveProfile(user.uid, {
      planta: {
        ...profile.planta,
        alertaOee: umbral,
        notificacionesAltavoz: notificacionesAltavoz !== false,
        repeticionesVoz,
      },
    });
    setToast("Se aplicaron los cambios.");
  };

  const decidir = async (campo, fase, opcion) => {
    if (!user || !sala) return;
    const siguientes = salas.map((item, index) => (
      index === activa ? { ...item, [campo]: opcion, operativa: opcion === "si" ? item.operativa : false } : item
    ));
    const planta = { ...profile.planta, salas: siguientes };
    if (opcion === "si") {
      planta.fase = fase;
      planta.salaIndex = activa;
      planta.importado = false;
    }
    await saveProfile(user.uid, { planta });
  };

  const guardarFicha = async (event) => {
    event.preventDefault();
    if (!user || !sala || !ficha) return;
    const listaActual = ficha.tipo === "maquina" ? [...(sala.maquinas || [])] : [...(sala.motivos || [])];
    const { tipo, index, ...datos } = ficha;
    listaActual[index] = { ...listaActual[index], ...datos };
    const siguientes = salas.map((item, i) => (
      i === activa ? { ...item, [tipo === "maquina" ? "maquinas" : "motivos"]: listaActual } : item
    ));
    await saveProfile(user.uid, { planta: { ...profile.planta, salas: siguientes } });
    setFicha(null);
    setToast("Se guardó correctamente.");
  };

  const cerrarCajon = () => { if (vertical) { ocultarMenu(); ocultarVolumen(); setOpen(false); } };

  return (
    <div className={`shell${open ? "" : " is-collapsed"}${vertical ? " is-portrait" : ""}${vertical && open ? " is-drawer" : ""}`}>
      {vertical && open ? (
        <button
          type="button"
          className="saiba-scrim"
          aria-label="Cerrar menú"
          onClick={() => { ocultarMenu(); setOpen(false); }}
        />
      ) : null}
      <aside className="sidebar">
        <div className="sidebar-top">
          <button
            className="icon-btn"
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => {
              setOpen((value) => {
                if (value) ocultarMenu();
                return !value;
              });
            }}
          >
            <Cast size={20} />
          </button>
          <span className="sidebar-brand">Smart View</span>
        </div>
        <nav className="sidebar-nav">
          {salas.map((item, index) => (
            <Tooltip key={item.nombre} label={open ? "" : capital(item.nombre)}>
              <button
                type="button"
                className={`sala-link${vista === "sala" || vista === "sala-config" ? (index === activa ? " is-on" : "") : ""}`}
                onClick={() => { navigate(ruta(item.codigo || codigoSala(item.nombre, index))); cerrarCajon(); }}
              >
                <span className="sala-mark">{siglas(item.nombre)}</span>
                <span className="sala-copy">
                  <span>{item.nombre}</span>
                  {lista(item) ? null : <small>No operativa</small>}
                </span>
              </button>
            </Tooltip>
          ))}
        </nav>
        <div className="sidebar-tools">
          <hr className="linea-moderna" />
          <Tooltip label={open ? "" : "Notificaciones"}>
            <button
              type="button"
              className={`sala-link saiba-atajo${vista === "notificaciones" ? " is-on" : ""}`}
              onClick={() => { navigate(`/${orgActiva}/notificaciones`, { state: { desde: pathname } }); cerrarCajon(); }}
            >
              <Bell className="saiba-ico" size={18} />
              <span className="sala-copy">Notificaciones</span>
              {puntoAviso ? <i className={`aviso-punto is-${puntoAviso}`} aria-hidden="true" /> : null}
            </button>
          </Tooltip>
          <Tooltip label={open ? "" : "Mensajes"}>
            <button
              type="button"
              className={`sala-link saiba-atajo${vista === "mensajes" ? " is-on" : ""}`}
              onClick={() => { navigate(`/${orgActiva}/mensajes`, { state: { desde: pathname } }); cerrarCajon(); }}
            >
              <MessageCircle className="saiba-ico" size={18} />
              <span className="sala-copy">Mensajes</span>
              {noLeidos.length ? <i className="chat-badge">{insigniaMensajes}</i> : null}
            </button>
          </Tooltip>
        </div>
        <div className="sidebar-foot">
          <Tooltip label={open ? "" : (altavoz && volumen > 0 ? "Volumen" : "Sonido apagado")}>
            <button
              className="pantalla-hit volumen-hit"
              type="button"
              aria-label={altavoz && volumen > 0 ? "Volumen" : "Sonido apagado"}
              aria-expanded={Boolean(volMenu && volOn)}
              onClick={(event) => {
                if (volMenu && volOn) ocultarVolumen();
                else mostrarVolumen(event.currentTarget);
              }}
            >
              {altavoz && volumen > 0 ? <Volume2 size={18} /> : <VolumeOff size={18} />}
              <span className="sala-copy">Volumen</span>
            </button>
          </Tooltip>
          <Tooltip label={open ? "" : (completa ? "Reducir pantalla" : "Pantalla completa")}>
            <button
              className="pantalla-hit"
              type="button"
              aria-label={completa ? "Reducir pantalla" : "Pantalla completa"}
              onPointerDown={() => { restaurarPantalla.current = false; }}
              onClick={() => { restaurarPantalla.current = false; ocultarMenu(); alternarPantalla(); }}
            >
              {completa ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              <span className="sala-copy">{completa ? "Reducir pantalla" : "Pantalla completa"}</span>
            </button>
          </Tooltip>
          {acceso.editarPlanta || acceso.invitar ? (
            <Tooltip label={open ? "" : "Configuración"}>
              <button
                className="pantalla-hit saiba-config-hit"
                type="button"
                aria-label="Configuración"
                onClick={() => { ocultarMenu(); navigate(`/${profile?.codigo || orgCodigo}/configuracion`, { state: { desde: pathname } }); cerrarCajon(); }}
              >
                <Settings size={18} />
                <span className="sala-copy">Configuración</span>
              </button>
            </Tooltip>
          ) : null}
          <AvisoActualizacion visible={hayActualizacion} onActualizar={actualizar} compacto={!open} />
          <div className="sidebar-user">
            <button
              className="user-hit"
              type="button"
              onClick={(event) => {
                if (menu && menuOn) ocultarMenu();
                else mostrarMenu(event.currentTarget);
              }}
            >
              <Avatar nombre={nombre} foto={foto} />
              <span className="user-copy">
                <span className="user-name">{nombre}</span>
              </span>
            </button>
          </div>
        </div>
      </aside>
      <main className="shell-main">
        <header className="room-nav">
          <div className="room-title">
            <h1>
              {vista === "notificaciones" || vista === "mensajes" || vista === "config" || vista === "ficha" || vista === "sala-config" || vista === "laboratorio" ? (
                <button
                  className={`icon-btn${vista === "config" || vista === "ficha" || vista === "sala-config" || vista === "laboratorio" ? " volver-btn" : ""}`}
                  type="button"
                  aria-label="Volver"
                  onClick={() => navigate(rutaState?.desde || `/${orgActiva}/${sala?.codigo || salas[0]?.codigo || ""}`)}
                >
                  <ArrowLeft size={18} />
                </button>
              ) : null}
              {vista === "config" ? "Configuración" : vista === "laboratorio" ? "Laboratorio" : vista === "notificaciones" ? "Notificaciones" : vista === "mensajes" ? "Mensajes" : vista === "ficha" ? "Ficha personal" : (sala?.nombre || "Planta")}
              {vista === "sala-config" ? <span className="room-kicker">Configuración</span> : null}
            </h1>
          </div>
          <div className="room-nav-actions">
            {(vista === "sala" || vista === "sala-config") && avanceSala ? (
              <AvanceTurno letra={avanceSala.letra} avance={avanceSala.avance} fuera={avanceSala.fuera} umbral={umbralSala} />
            ) : null}
            <button
              ref={campanaRef}
              className="icon-btn aviso-btn"
              type="button"
              aria-label="Notificaciones"
              onClick={() => setAvisos((abierto) => !abierto)}
            >
              <Bell size={18} />
              {puntoAviso ? <i className={`aviso-punto is-${puntoAviso}`} aria-hidden="true" /> : null}
            </button>
            <Campana
              abierto={avisos}
              ancla={campanaRef.current}
              notas={notas}
              onCerrar={() => setAvisos(false)}
              onLeer={(nota) => {
                const next = new Set(vistos);
                next.add(nota.id);
                setVistos(next);
                guardarVistos(user?.uid, next);
              }}
              onExpandir={() => { setAvisos(false); setCentro(true); }}
            />
            {sala && vista === "sala" && acceso.editarPlanta ? (
              <button className="icon-btn" type="button" aria-label="Configuración de la sala" onClick={() => navigate(ruta(sala.codigo || codigoSala(sala.nombre, activa), true), { state: { desde: pathname } })}>
                <Settings size={18} />
              </button>
            ) : null}
          </div>
        </header>
        <div className="shell-pane" key={`${vista}-${sala?.nombre || ""}`}>
        {vista === "mensajes" ? (
          <Mensajes
            org={orgActiva}
            uid={user?.uid}
            nombre={nombre}
            rol={profile?.rolTenant}
            salas={profile?.salasAsignadas || []}
            miembros={listaMiembros}
            foto={foto}
          />
        ) : vista === "notificaciones" ? (
          <PaginaAvisos
            notas={notas}
            onLeer={(nota) => {
              const next = new Set(vistos);
              next.add(nota.id);
              setVistos(next);
              guardarVistos(user?.uid, next);
            }}
          />
        ) : vista === "sala-config" && sala ? (
          <div className="setup-page">
            <div className="setup-bar">
              <TabSwitch
                size="small"
                value={pestana}
                onChange={setPestana}
                items={[
                  { id: "general", label: "General", icon: Settings },
                  { id: "turnos", label: "Turnos", icon: Clock },
                  { id: "maquinas", label: "Máquinas", icon: Server },
                  { id: "motivos", label: "Motivos", icon: List },
                ]}
              />
              <button className={`btn btn-ghost setup-tool${actualizando ? " is-spin" : ""}`} type="button" aria-label="Actualizar" onClick={actualizarTabla}>
                <RefreshCw size={18} />
              </button>
            </div>
            {pestana === "general" ? (
              <>
              <h2 className="setup-general-title">Configuración general de la sala</h2>
              <hr className="setup-general-rule" />
              <form className="config-ask setup-general" onSubmit={guardarAlertaSala}>
                <label className="config-row">
                  <span className="config-copy">
                    <strong>Alerta de eficiencia (OEE)</strong>
                    <small>Vacío usa el {umbralDe(null, profile?.planta)} % de la organización. Por debajo de ese porcentaje el avance de esta sala se pone en rojo y avisa.</small>
                  </span>
                  <div className="campo-pct">
                    <input className="umbral-oee" type="number" min="0" max="100" step="0.1" inputMode="decimal" placeholder={String(umbralDe(null, profile?.planta))} value={alertaSala} onChange={(event) => setAlertaSala(event.target.value)} onFocus={(event) => event.target.select()} />
                    <small>%</small>
                  </div>
                </label>
                <div className="config-row">
                  <span className="config-copy">
                    <strong>Recibir notificaciones</strong>
                    <small>Si lo apagas, esta sala no anuncia los avisos por el altavoz.</small>
                  </span>
                  <Switch value={vozSala} onChange={setVozSala} aria-label="Recibir notificaciones de esta sala" />
                </div>
                <div className={`config-reveal${vozSala ? " is-open" : ""}`}>
                  <div className="config-reveal-stack">
                    <label className="config-row">
                      <span className="config-copy">
                        <strong>Repeticiones</strong>
                        <small>Cuántas veces se repite cada aviso de esta sala en el altavoz.</small>
                      </span>
                      <input className="umbral-oee" type="number" min="1" max="10" step="1" inputMode="numeric" value={vecesSala} onChange={(event) => setVecesSala(event.target.value)} onFocus={(event) => event.target.select()} />
                    </label>
                    <div className="config-row">
                      <span className="config-copy">
                        <strong>Notificaciones por paro en altavoz</strong>
                        <small>Ninguna: esta sala no anuncia paros. Automáticas: solo los que crea el sistema, por ejemplo «Telar 03, rotura de trama». Todas: también los que carga una persona, por ejemplo «Telar 09, falso paro».</small>
                      </span>
                      <TabSwitch
                        value={parosVoz}
                        onChange={setParosVoz}
                        items={[
                          { id: "ninguna", label: "Ninguna" },
                          { id: "auto", label: "Automáticas" },
                          { id: "todas", label: "Todas" },
                        ]}
                      />
                    </div>
                  </div>
                </div>
                <div className="config-row config-row-actions">
                  <button className="btn btn-primary" type="submit" disabled={alertaValida(alertaSala) === undefined || (vozSala && repeticionesValidas(vecesSala) == null) || (String(sala?.alertaOee ?? "") === alertaSala.trim() && vozSala === (sala?.notificacionesAltavoz !== false) && parosVoz === parosVozDe(sala?.parosVoz) && (!vozSala || Number(vecesSala) === Number(sala?.repeticionesVoz ?? profile?.planta?.repeticionesVoz ?? REPETICIONES_VOZ)))}>
                    Guardar
                  </button>
                </div>
              </form>
              </>
            ) : null}
            {pestana === "turnos" ? (
              <TurnosConfig turnos={sala.turnos} onGuardar={guardarTurnosSala} />
            ) : null}
            {pestana === "maquinas" ? (
              <div className={`sheet${actualizando ? " is-loading" : ""}`}>
                <table>
                  <colgroup>
                    <col className="col-code" />
                    <col className="col-machine" />
                    <col />
                    <col />
                    <col />
                  </colgroup>
                  <thead>
                    <tr><th>Código</th><th>Máquina</th><th>Marca</th><th>Modelo</th><th>Serie</th></tr>
                  </thead>
                  <tbody>
                    {actualizando ? <FilasSkeleton columnas={5} /> : (sala.maquinas || []).map((machine, index) => (
                      <tr key={machine.numero || index} onClick={() => setFicha({ tipo: "maquina", index, ...machine })}>
                        <td>{machine.codigo || machine.numero}</td>
                        <td>{machine.nombre}</td>
                        <td>{machine.marca || "—"}</td>
                        <td>{machine.modelo || "—"}</td>
                        <td>{machine.serie || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {pestana === "motivos" ? (
              <div className={`sheet${actualizando ? " is-loading" : ""}`}>
                <table>
                  <colgroup>
                    <col className="col-code" />
                    <col />
                    <col />
                  </colgroup>
                  <thead>
                    <tr><th>Código</th><th>Descripción corta</th><th>Tipo de paro</th></tr>
                  </thead>
                  <tbody>
                    {actualizando ? <FilasSkeleton columnas={3} /> : (sala.motivos || []).map((motivo, index) => (
                      <tr key={motivo.codigo || index} onClick={() => setFicha({ tipo: "motivo", index, ...motivo })}>
                        <td>{motivo.codigo}</td>
                        <td>{motivo.corta || motivo.nombre || "—"}</td>
                        <td>{motivo.tipo || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : vista === "ficha" ? (
          <Ficha
            profile={profile}
            onVolver={() => navigate(rutaState?.desde || `/${orgActiva}/${sala?.codigo || salas[0]?.codigo || ""}`)}
            onGuardar={async (datos) => {
              await guardarMisDatos(datos);
              setToast("Se guardó la ficha personal.");
            }}
          />
        ) : vista === "config" ? (
          <div className="config-page">
          {acceso.editarPlanta ? (
          <section className="config-section">
            <h2>General</h2>
            <form className="config-ask" onSubmit={guardarOrganizacion}>
              <label className="config-row">
                <span>Nombre de la organización</span>
                <input type="text" value={organizacion} onChange={(event) => setOrganizacion(event.target.value)} autoComplete="organization" />
              </label>
              <div className="config-row config-row-actions">
                <button className="btn btn-primary" type="submit" disabled={aviso !== "" || !organizacion.trim() || organizacion.trim() === (profile?.organizacion || "")}>
                  {aviso || "Guardar"}
                </button>
              </div>
            </form>
          </section>
          ) : null}
          {acceso.editarPlanta && acceso.invitar ? <hr className="config-rule" /> : null}
          {acceso.invitar ? (
            <Colaboradores
              orgCodigo={profile?.codigo || orgCodigo}
              salas={profile?.planta?.salas || []}
              orgNombre={profile?.organizacion || ""}
              owner={{ uid: user?.uid, nombre, email: correo }}
            />
          ) : null}
          {acceso.editarPlanta ? (
            <>
              <hr className="config-rule" />
              <CentralAvisos
                valor={profile?.avisosAvance}
                umbral={profile?.planta?.alertaOee ?? UMBRAL_OEE}
                repeticiones={profile?.planta?.repeticionesVoz ?? REPETICIONES_VOZ}
                notificacionesAltavoz={profile?.planta?.notificacionesAltavoz !== false}
                onAplicar={aplicarCentral}
              />
            </>
          ) : null}
          {acceso.editarPlanta ? (
            <>
              <hr className="config-rule" />
              <section className="config-section">
                <h2 className="lab-titulo"><FlaskConical size={22} /> Laboratorio</h2>
                <div className="config-ask">
                  <div className="config-row">
                    <span className="config-copy">
                      <strong>Usar simulador de fallos</strong>
                      <small>Genera paros al azar en los telares y los levanta sola. La eficiencia de la sala no baja de 75 %.</small>
                    </span>
                    <Switch
                      aria-label="Usar simulador de fallos"
                      value={simulador}
                      onChange={(valor) => {
                        setSimulador(valor);
                        if (!user || !profile?.planta) return;
                        saveProfile(user.uid, { planta: { ...profile.planta, simuladorFallos: valor } }).catch(() => {});
                      }}
                    />
                  </div>
                  <div className={`config-reveal${simulador ? " is-open" : ""}`}>
                    <div>
                      <div className="config-row config-row-actions">
                        <button
                          className="btn btn-primary"
                          type="button"
                          disabled={!simulador}
                          onClick={() => {
                            if (!simulador) return;
                            localStorage.setItem("smartview-sim-pedido", orgActiva);
                            if (user && profile?.planta && !profile.planta.simuladorFallos) {
                              saveProfile(user.uid, { planta: { ...profile.planta, simuladorFallos: true } }).catch(() => {});
                            }
                            const destino = `/${orgActiva}/laboratorio?correr=1`;
                            const ventana = window.open(destino, "smartview-laboratorio");
                            if (!ventana) navigate(destino);
                          }}
                        >
                          Iniciar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </>
          ) : null}
          </div>
        ) : vista === "laboratorio" ? (
          <Laboratorio
            org={orgActiva}
            planta={profile?.planta}
            miembros={profile?.miembros}
            correr={new URLSearchParams(search).get("correr") === "1" && (profile?.planta?.simuladorFallos === true || localStorage.getItem("smartview-sim-pedido") === orgActiva)}
          />
        ) : sala && lista(sala) ? (
          <>
            <div className="sala-head">
              <h2 key={tituloPanel} className={`sala-titulo${faseTitulo ? ` ${faseTitulo}` : ""}`}>
                {tituloPanel === "history" ? <History size={36} /> : tituloPanel === "priority" ? <Square size={36} /> : tituloPanel === "activity" ? <Circle size={36} /> : tituloPanel === "efficiency" ? <Percent size={36} /> : <Grip size={36} />}
                {tituloPanel === "history" ? "Historial completo" : tituloPanel === "priority" ? "Máquinas en paro" : tituloPanel === "activity" ? "Máquinas operando" : tituloPanel === "efficiency" ? "Eficiencia" : "Mapa de sección"}
              </h2>
              <TabSwitch
                size="small"
                value={panel}
                onChange={setPanel}
                items={[
                  { id: "mapa", label: "Mapa", icon: Grip, tip: "Ver mapa de planta" },
                  { id: "history", label: "Historial", icon: History, tip: "Historial de registros" },
                  { id: "priority", label: "Paros", icon: Square, tip: "Máquinas detenidas" },
                  { id: "activity", label: "Activas", icon: Circle, tip: "Máquinas en producción" },
                  { id: "efficiency", label: "Eficiencia", icon: Percent, tip: "Productividad" },
                ].filter((item) => item.id !== "efficiency" || acceso.estadistica)}
              />
            </div>
            <div className="sala-vista" key={panel}>
            {panel === "mapa" ? (
              <div className="maquinas-grid">
                {sala.maquinas.map((machine, index) => {
                  const numero = String(machine.numero || index + 1).padStart(2, "0");
                  return (
                    <div key={numero} className={`card-maquina${paros[numero] ? " is-stopped" : ""}`} role="button" tabIndex={0} onClick={() => { if (acceso.cargarParo || acceso.comentar) setParo(numero); }} onKeyDown={(event) => { if (event.key === "Enter" && (acceso.cargarParo || acceso.comentar)) setParo(numero); }}>
                      <span className="maquina-id">{numero}</span>
                      <span className="stop-timer">0 min</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {panel === "activity" || panel === "priority" ? (
              <ListaSala panel={panel} maquinas={sala.maquinas} paros={paros} onAbrir={setParo} />
            ) : null}
            {panel === "history" ? <HistorialTabla org={orgActiva} salaCodigo={salaCodigo} paros={paros} turnos={sala.turnos} logs={logsSala} puedeReiniciar={acceso.editarPlanta} nombres={Object.fromEntries(Object.values(profile?.miembros || {}).filter((item) => item.uid).map((item) => [item.uid, item.nombre || item.email]) .concat(user?.uid ? [[user.uid, nombre]] : []))} /> : null}
            {panel === "efficiency" ? <EficienciaPanel maquinas={sala.maquinas} paros={paros} salaCodigo={salaCodigo} turnos={sala.turnos} logs={logsSala} umbral={umbralSala} /> : null}
            </div>
            {paro ? (
              <ParoModal
                numero={paro}
                paroActual={paros[paro] || null}
                puedeCargar={acceso.cargarParo}
                motivos={(sala.motivos || []).length ? sala.motivos.map((item) => ({ id: item.codigo, name: item.corta || item.nombre })) : MOTIVOS_PARO.map((item) => ({ id: item.id, name: item.nombre }))}
                onClose={() => setParo(null)}
                onComentar={(comentario) => {
                  comentar(paro, comentario);
                  setToast("Se guardó el comentario.");
                }}
                onEnterado={acceso.enterado && paros[paro] ? () => {
                  const clave = `smartview-enterados:${user?.uid}`;
                  const id = `${salaCodigo}:${paro}:${paros[paro].inicio || ""}`;
                  const previos = JSON.parse(localStorage.getItem(clave) || "[]");
                  localStorage.setItem(clave, JSON.stringify([...new Set([...previos, id])]));
                  if (profile?.codigo) update(ref(rtdb, `organizaciones/${profile.codigo}/enterados/${user?.uid}/${paro}`), { en: Date.now(), sala: salaCodigo }).catch(() => {});
                  setToast("Quedó registrado que te enteraste.");
                } : null}
                onConfirm={(datos) => {
                  const inicio = paros[paro]?.inicio || Date.now();
                  detener(paro, { ...datos, inicio });
                  const logs = leerLogs();
                  const abierto = [...logs].reverse().find((item) => mismaMaquina(item.machine, paro) && item.status !== "atendido" && !item.fin && (!item.sala || item.sala === salaCodigo));
                  if (paros[paro] && abierto) {
                    abierto.motivo = datos.motivo;
                    abierto.reason = datos.nombre;
                  } else {
                    logs.push({
                      id: Date.now(),
                      sala: salaCodigo,
                      machine: paro,
                      motivo: datos.motivo,
                      reason: datos.nombre,
                      inicio,
                      stopTime: horaCorta(inicio),
                      status: "detenido",
                      fin: null,
                      duration: 0,
                      via: VIA.paroManual,
                      autor: user?.uid || "",
                      autorNombre: nombre,
                    });
                  }
                  guardarLogs(logs);
                  if (orgActiva) push(ref(rtdb, `organizaciones/${orgActiva}/paros`), { sala: salaCodigo, maquina: paro, motivo: datos.motivo, nombre: datos.nombre, inicio, estado: "detenido", via: VIA.paroManual, autor: user?.uid || "" }).catch(() => {});
                }}
                onReiniciar={() => {
                  const actual = paros[paro];
                  reiniciar(paro);
                  const logs = leerLogs();
                  const abierto = [...logs].reverse().find((item) => mismaMaquina(item.machine, paro) && item.status !== "atendido" && !item.fin && (!item.sala || item.sala === salaCodigo));
                  const fin = Date.now();
                  if (abierto) {
                    abierto.fin = fin;
                    abierto.status = "atendido";
                    abierto.duration = abierto.inicio ? Math.max(0, Math.round((fin - abierto.inicio) / 60000)) : 0;
                    abierto.arranqueVia = VIA.arranqueManual;
                    abierto.arranqueAutor = user?.uid || "";
                    abierto.arranqueNombre = nombre;
                  } else {
                    logs.push({
                      id: fin,
                      sala: salaCodigo,
                      machine: paro,
                      reason: actual?.nombre || "",
                      inicio: actual?.inicio || fin,
                      fin,
                      stopTime: actual?.inicio ? horaCorta(actual.inicio) : horaCorta(fin),
                      status: "atendido",
                      duration: actual?.inicio ? Math.max(0, Math.round((fin - actual.inicio) / 60000)) : 0,
                      via: VIA.paroManual,
                      arranqueVia: VIA.arranqueManual,
                      arranqueAutor: user?.uid || "",
                      arranqueNombre: nombre,
                    });
                  }
                  guardarLogs(logs);
                  if (orgActiva && actual) {
                    cerrarParoRemoto(orgActiva, {
                      sala: salaCodigo,
                      maquina: paro,
                      motivo: actual.motivo,
                      nombre: actual.nombre,
                      inicio: actual.inicio,
                      fin,
                      duration: actual.inicio ? Math.max(0, Math.round((fin - actual.inicio) / 60000)) : 0,
                      via: VIA.arranqueManual,
                      autor: user?.uid || "",
                    }).catch(() => {});
                  }
                }}
              />
            ) : null}
          </>
        ) : sala ? (
          <>
            <p className="lede">No operativa. Falta configuración para poder usarla.</p>
            <ul className="setup-list">
              <Paso hecho texto="Has completado colocarle el nombre" />
              <Paso
                hecho={(sala.maquinas || []).length > 0}
                texto={(sala.maquinas || []).length > 0 ? "Has completado ingresar el número de máquinas" : "No has completado ingresar el número de máquinas"}
                pregunta="¿Quieres cargar las máquinas ahora?"
                value={sala.decisionMaquinas || ""}
                onChange={(opcion) => decidir("decisionMaquinas", "cantidad", opcion)}
              />
              <Paso
                hecho={(sala.motivos || []).length > 0}
                texto={(sala.motivos || []).length > 0 ? "Has completado la carga de motivos de paro" : "No has completado la carga de motivos de paro"}
                pregunta="¿Deseas cargar los motivos de paro ahora?"
                value={sala.decisionMotivos || ""}
                onChange={(opcion) => decidir("decisionMotivos", "motivos", opcion)}
              />
            </ul>
          </>
        ) : (
          <h1>Planta</h1>
        )}
        </div>
      </main>
      {ficha ? (
        <div className="drawer-layer">
          <button className="drawer-back" type="button" aria-label="Cerrar" onClick={() => setFicha(null)} />
          <form className="drawer" onSubmit={guardarFicha}>
            <h2>{ficha.tipo === "maquina" ? ficha.nombre : (ficha.corta || ficha.codigo)}</h2>
            {ficha.tipo === "maquina" ? (
              ["nombre", "marca", "modelo", "serie", "anio"].map((campo) => (
                <label className="field" key={campo}>
                  <span>{campo}</span>
                  <input value={ficha[campo] || ""} onChange={(event) => setFicha({ ...ficha, [campo]: event.target.value })} />
                </label>
              ))
            ) : (
              [["codigo", "Código"], ["corta", "Descripción corta"], ["tipo", "Tipo de paro"], ["causa", "Motivo"], ["deteccion", "Detección"], ["oee", "Afecta en OEE"]].map(([campo, etiqueta]) => (
                <label className="field" key={campo}>
                  <span>{etiqueta}</span>
                  <input value={ficha[campo] || ""} onChange={(event) => setFicha({ ...ficha, [campo]: event.target.value })} />
                </label>
              ))
            )}
            <button className="btn btn-primary" type="submit">Guardar</button>
          </form>
        </div>
      ) : null}
      {centro ? (
        <CentroAvisos
          notas={notas}
          pendientes={notas.filter((item) => !vistos.has(item.id)).length}
          onCerrar={() => setCentro(false)}
          onContraer={() => { setCentro(false); setAvisos(true); }}
          onAbrirPagina={() => {
            setCentro(false);
            const desde = pathname.endsWith("/notificaciones") ? rutaState?.desde : pathname;
            navigate(`/${orgActiva}/notificaciones`, { state: { desde } });
          }}
          onLeer={(nota) => {
            const next = new Set(vistos);
            next.add(nota.id);
            setVistos(next);
            guardarVistos(user?.uid, next);
          }}
        />
      ) : null}
      <Toast message={toast} onClose={() => setToast("")} />
      {volMenu ? createPortal(
        <div className={`volumen-menu glass-pop${volOn ? " is-on" : ""}`} style={{ left: volMenu.left, bottom: volMenu.bottom }}>
          <div className="volumen-fila">
            <span>Sonido</span>
            <Switch
              aria-label="Sonido de este equipo"
              value={altavoz}
              onChange={(valor) => {
                fijarAltavoz(valor);
                setAltavoz(valor);
                if (valor && volumenPorcentaje() === 0) setVolumen(fijarVolumen(100));
              }}
            />
          </div>
          <label className="volumen-fila">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              aria-label="Volumen"
              value={volumen}
              style={{ "--vol": `${volumen}%` }}
              onChange={(event) => {
                const pct = fijarVolumen(event.target.value);
                setVolumen(pct);
                const activo = pct > 0;
                if (activo !== altavozActivo()) fijarAltavoz(activo);
                setAltavoz(activo);
              }}
            />
            <span className="volumen-pct">{volumen}%</span>
          </label>
        </div>,
        document.body,
      ) : null}
      {menu ? createPortal(
        <div className={`user-menu glass-pop${menuOn ? " is-on" : ""}`} style={{ left: menu.left, bottom: menu.bottom }}>
          <div className="user-menu-id">
            <strong>{nombre}</strong>
            <span>{correo}</span>
          </div>
          {rolChip ? (
            <div className="user-menu-perfil">
              <Tooltip wrap label={descripcionPerfil(rolChip)}>
                <span className="perfil-chip">{etiquetaPerfil(rolChip)}</span>
              </Tooltip>
            </div>
          ) : null}
          <hr />
          <button
            type="button"
            onClick={() => {
              ocultarMenu();
              const desde = pathname.endsWith("/ficha") ? rutaState?.desde : pathname;
              navigate(`/${orgActiva}/ficha`, { state: { desde } });
              cerrarCajon();
            }}
          >
            <CircleUser size={18} /> Ficha personal
          </button>
          <div className="menu-sub-wrap">
            <button type="button" className="menu-sub" onClick={() => setModos((value) => !value)}>
              <span><ModoIcon size={18} /> Modo</span>
              <ChevronRight size={16} />
            </button>
            {modos ? (
              <div className="user-sub glass-pop">
                {MODOS.map(({ id, label, Icon }) => (
                  <button key={id} type="button" className={tema === id ? "is-on" : ""} onClick={() => elegirTema(id)}>
                    <Icon size={18} /> {label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <hr />
          <button type="button" onClick={salir}><LogOut size={18} /> Cerrar sesión</button>
        </div>,
        document.body
      ) : null}
    </div>
  );
}

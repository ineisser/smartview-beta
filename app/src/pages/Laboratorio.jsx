import { useEffect, useRef, useState } from "react";
import { get, push, ref } from "firebase/database";
import { rtdb } from "../firebase";
import { VIA } from "../paro";
import { borrarParo, escribirParo } from "../salaControl";
import { cerrarParoRemoto } from "../historial";
import {
  cabeEnEficiencia,
  duracionDe,
  elegirMotivo,
  elegirTelar,
  esMecanica,
  etiquetaTelar,
  metaDeHora,
  operariaAna,
  salasTelares,
} from "../simulador";

const CLAVE = (org) => `smartview-sim:${org || "x"}`;
const ESPERA_MS = 60 * 1000;

const leer = (org) => {
  try { return JSON.parse(sessionStorage.getItem(CLAVE(org)) || "null"); } catch { return null; }
};

const guardar = (org, estado) => {
  sessionStorage.setItem(CLAVE(org), JSON.stringify(estado));
};

const horaDe = (inicio, ahora) => Math.max(0, Math.floor((ahora - inicio) / (60 * 60 * 1000)));

export default function Laboratorio({ org, planta, miembros, correr }) {
  const salas = salasTelares(planta?.salas || []);
  const ana = operariaAna(miembros);
  const anaRef = useRef(ana);
  const salasRef = useRef(salas);
  anaRef.current = ana;
  salasRef.current = salas;
  const [lineas, setLineas] = useState(() => leer(org)?.lineas || []);
  const [vivo, setVivo] = useState(false);
  const estado = useRef(null);

  const decir = (texto) => {
    const linea = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, en: Date.now(), texto };
    setLineas((prev) => {
      const next = [...prev, linea].slice(-200);
      if (estado.current) {
        estado.current.lineas = next;
        guardar(org, estado.current);
      }
      return next;
    });
    const caja = document.querySelector(".lab-log");
    if (caja) requestAnimationFrame(() => { caja.scrollTop = caja.scrollHeight; });
  };

  const firma = salas.map((sala) => sala.codigo).join(",");
  useEffect(() => {
    if (!correr || !org || !firma) return undefined;
    let cancelado = false;
    const previo = leer(org);
    const base = previo?.inicio ? previo : {
      inicio: Date.now(),
      hechos: {},
      usados: {},
      abiertos: [],
      enfriar: [],
      ultimo: 0,
      lineas: previo?.lineas || [],
    };
    estado.current = base;
    if (!previo?.inicio) {
      base.lineas = [...(base.lineas || []), {
        id: `inicio-${base.inicio}`,
        en: base.inicio,
        texto: `${anaRef.current.nombre} empezó el simulador de fallos.`,
      }];
    }
    guardar(org, base);
    setLineas(base.lineas || []);
    setVivo(true);

    const ocupados = () => new Set(base.abiertos.map((item) => item.numero));
    const frio = () => new Map(base.enfriar);

    const soltar = async (ahora) => {
      const listos = base.abiertos.filter((item) => item.fin <= ahora);
      base.abiertos = base.abiertos.filter((item) => item.fin > ahora);
      for (const item of listos) {
        await borrarParo(org, item.sala, item.numero);
        await cerrarParoRemoto(org, {
          sala: item.sala,
          maquina: item.numero,
          motivo: item.motivo,
          nombre: item.nombre,
          inicio: item.inicio,
          fin: item.fin,
          duration: item.minutos,
          via: VIA.paroManual,
          autor: anaRef.current.uid,
          autorNombre: anaRef.current.nombre,
          arranqueVia: VIA.arranqueManual,
          arranqueAutor: anaRef.current.uid,
          arranqueNombre: anaRef.current.nombre,
        });
        base.enfriar.push([item.numero, item.fin + 10 * 60 * 1000]);
        if (!cancelado) decir(`${anaRef.current.nombre} arrancó ${item.telar}. El paro por ${item.nombre.toLowerCase()} duró ${item.minutos} minutos.`);
      }
    };

    const parar = async (ahora) => {
      const indice = horaDe(base.inicio, ahora);
      const meta = metaDeHora(indice);
      const hechos = base.hechos[indice] || 0;
      if (hechos >= meta) return;
      const separacion = Math.max(ESPERA_MS, Math.floor((60 / meta) * 60 * 1000));
      if (ahora - base.ultimo < separacion) return;
      const lista = salasRef.current;
      const sala = lista[Math.floor(Math.random() * lista.length)];
      const maquina = elegirTelar(sala.maquinas || [], ocupados(), frio(), ahora);
      if (!maquina) return;
      const motivo = elegirMotivo(sala.motivos);
      if (!motivo) return;
      const minutos = duracionDe(motivo);
      const telares = lista.reduce((suma, item) => suma + (item.maquinas || []).length, 0);
      const usados = base.usados[indice] || 0;
      if (!cabeEnEficiencia(telares, usados, minutos)) {
        if (!cancelado && ahora - (base.avisoTope || 0) > 60 * 1000) {
          base.avisoTope = ahora;
          decir("Espero un momento: otro paro bajaría la eficiencia de 75 %.");
        }
        return;
      }
      const numero = String(maquina.numero || 1).padStart(2, "0");
      const inicio = ahora;
      const fin = ahora + minutos * 60 * 1000;
      const telar = etiquetaTelar(maquina, numero, sala.nombre);
      const nombre = motivo.corta || motivo.nombre || "paro";
      await escribirParo(org, sala.codigo, numero, { motivo: motivo.codigo || nombre, inicio });
      await push(ref(rtdb, `organizaciones/${org}/paros`), {
        sala: sala.codigo,
        maquina: numero,
        motivo: motivo.codigo || "",
        nombre,
        inicio,
        estado: "detenido",
        via: VIA.paroManual,
        autor: anaRef.current.uid,
        autorNombre: anaRef.current.nombre,
      });
      base.abiertos.push({ sala: sala.codigo, numero, motivo: motivo.codigo || "", nombre, inicio, fin, minutos, telar });
      base.hechos[indice] = hechos + 1;
      base.usados[indice] = usados + minutos;
      base.ultimo = ahora;
      const rango = esMecanica(motivo) ? "entre una y dos horas" : `${minutos} minutos`;
      if (!cancelado) decir(`${anaRef.current.nombre} detuvo ${telar} por ${nombre.toLowerCase()}. Lo levanta en ${rango}.`);
    };

    const adoptar = async () => {
      const snap = await get(ref(rtdb, `organizaciones/${org}/paros`));
      Object.values(snap.val() || {}).forEach((item) => {
        if (!item || item.fin || item.estado === "atendido") return;
        const nombre = anaRef.current.nombre;
        if (item.autorNombre !== nombre && item.autor !== anaRef.current.uid) return;
        const numero = String(item.maquina || "").padStart(2, "0");
        if (base.abiertos.some((abierto) => abierto.sala === item.sala && abierto.numero === numero)) return;
        const sala = salasRef.current.find((actual) => actual.codigo === item.sala);
        const motivo = (sala?.motivos || []).find((actual) => actual.codigo === item.motivo);
        const minutos = Number(item.duration) || (esMecanica(motivo) ? 90 : 10);
        base.abiertos.push({
          sala: item.sala,
          numero,
          motivo: item.motivo || "",
          nombre: item.nombre || "paro",
          inicio: item.inicio,
          fin: Number(item.inicio) + minutos * 60 * 1000,
          minutos,
          telar: `Telar ${numero}`,
        });
      });
    };
    const ciclo = () => {
      if (base.ocupado || cancelado) return Promise.resolve();
      base.ocupado = true;
      const ahora = Date.now();
      return soltar(ahora).then(() => parar(ahora)).catch(() => {}).finally(() => {
        base.ocupado = false;
        guardar(org, base);
      });
    };
    const pronto = window.setTimeout(() => { adoptar().then(ciclo).catch(() => {}); }, 1000);
    const id = window.setInterval(ciclo, 20000);

    return () => {
      cancelado = true;
      window.clearTimeout(pronto);
      window.clearInterval(id);
      base.ocupado = false;
      guardar(org, base);
    };
  }, [correr, org, firma]);

  return (
    <section className="lab-page">
      <p className="lab-lede">{vivo ? `${ana.nombre} está generando los paros. La eficiencia no baja de 75 %.` : "Abre esta página con Iniciar para que el simulador arranque."}</p>
      <div className="lab-log" role="log">
        {lineas.length ? lineas.map((linea) => (
          <article key={linea.id} className="lab-linea">
            <time>{new Date(linea.en).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</time>
            <p>{linea.texto}</p>
          </article>
        )) : <p className="lab-vacio">Todavía no hay paros.</p>}
      </div>
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CloudUpload, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { COLUMNAS_PARO, codigoParo, estandarDeSala } from "../data/catalogos-paro";
import TimeField from "../components/TimeField";

const emptyPlant = {
  fase: "nombre",
  salaIndex: 0,
  excelDescargado: false,
  salas: [],
};

const serieDe = (numero) => String(numero).padStart(3, "0");
const esTelar = (nombre) => /telar/i.test(nombre || "");

const controlDeSala = (nombre) => (
  esTelar(nombre) ? { tipo: "Tela plana", control: "RPM" } : { tipo: "", control: "" }
);

const machineDraft = (numero, salaNombre, previous) => {
  const telar = esTelar(salaNombre);
  return {
    numero,
    nombre: `Máquina ${numero}`,
    marca: telar ? "Marca 1" : (previous?.marca || ""),
    modelo: telar ? "Modelo 1" : (previous?.modelo || ""),
    serie: telar ? serieDe(numero) : "",
    anio: previous?.anio || "",
    ...controlDeSala(salaNombre),
  };
};

const conDatosDeSala = (sala) => {
  const control = controlDeSala(sala.nombre);
  return {
    ...sala,
    ...control,
    ...(Array.isArray(sala.motivos) ? { motivos: sala.motivos.map((item) => ({ ...item, codigo: codigoParo(item.codigo) })) } : {}),
    maquinas: (sala.maquinas || []).map((machine, index) => {
      const numero = machine.numero || index + 1;
      if (!esTelar(sala.nombre)) return { ...machine, numero };
      return {
        ...machine,
        numero,
        nombre: machine.nombre || `Máquina ${numero}`,
        marca: machine.marca || "Marca 1",
        modelo: machine.modelo || "Modelo 1",
        serie: machine.serie || serieDe(numero),
        tipo: machine.tipo || control.tipo,
        control: machine.control || control.control,
      };
    }),
  };
};

const MOTIVOS = {
  telar: ["Rotura de urdimbre", "Rotura de trama", "Cambio de urdimbre", "Cambio de pieza", "Falla mecánica", "Falla eléctrica", "Limpieza", "Mantenimiento", "Falta de material", "Paro programado"],
  circular: ["Rotura de aguja", "Rotura de hilo", "Cambio de hilo", "Cambio de artículo", "Falla mecánica", "Falla eléctrica", "Limpieza", "Mantenimiento", "Falta de material", "Paro programado"],
};

const catalogoMotivos = (nombre) => (esTelar(nombre) ? MOTIVOS.telar : MOTIVOS.circular);

const buildMotivos = (count, salaNombre) => {
  const total = Math.max(1, Math.min(Number(count) || 1, 50));
  const base = catalogoMotivos(salaNombre);
  return Array.from({ length: total }, (_, index) => ({
    codigo: `MP${String(index + 1).padStart(3, "0")}`,
    nombre: base[index] || `Motivo ${index + 1}`,
  }));
};

const minutos = (value) => {
  const [hora, minuto] = String(value || "07:00").split(":").map(Number);
  return ((hora || 0) * 60) + (minuto || 0);
};

const reloj = (total) => {
  const value = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
};

const sugerirTurnos = (cantidad, inicio = "07:00") => {
  const start = minutos(inicio);
  return Array.from({ length: cantidad }, (_, index) => ({
    nombre: `Turno ${index + 1}`,
    inicio: reloj(start + index * 480),
    fin: reloj(start + (index + 1) * 480),
  }));
};

const buildMachines = (count, salaNombre, previousList = []) => {
  const total = Math.max(1, Math.min(Number(count) || 1, 200));
  return Array.from({ length: total }, (_, index) => {
    const existing = previousList[index];
    if (existing?.marca) return { ...existing, ...controlDeSala(salaNombre) };
    return machineDraft(index + 1, salaNombre, previousList[index - 1] || previousList[0]);
  });
};

const toMachine = (row, index, salaNombre) => {
  const pick = (...keys) => {
    for (const key of keys) {
      const found = Object.keys(row).find((name) => name.toLowerCase() === key);
      if (found && String(row[found]).trim()) return String(row[found]).trim();
    }
    return "";
  };
  const control = controlDeSala(salaNombre);
  return {
    numero: Number(pick("numero", "número", "n")) || index + 1,
    nombre: pick("nombre", "maquina", "máquina") || `Máquina ${index + 1}`,
    marca: pick("marca"),
    modelo: pick("modelo"),
    serie: pick("serie"),
    anio: pick("anio", "año"),
    tipo: pick("tipo") || control.tipo,
    control: pick("control") || control.control,
  };
};

const parseCsv = (text, salaNombre) => {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("vacio");
  const cells = (line) => line.split(",").map((cell) => cell.replace(/^"|"$/g, "").replaceAll('""', '"').trim());
  const headers = cells(lines[0]).map((header) => header.toLowerCase());
  if (!headers.some((header) => ["nombre", "numero", "número", "marca"].includes(header))) throw new Error("columnas");
  return lines.slice(1).map((line, index) => {
    const row = {};
    cells(line).forEach((value, cell) => { row[headers[cell] || cell] = value; });
    return toMachine(row, index, salaNombre);
  });
};

const parseExcel = async (file, salaNombre) => {
  const XLSX = await import("xlsx");
  const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = book.Sheets[book.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  if (!rows.length) throw new Error("vacio");
  return rows.map((row, index) => toMachine(row, index, salaNombre));
};

const readMachinesFile = async (file, salaNombre) => {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseCsv(await file.text(), salaNombre);
  if (name.endsWith(".xls") || name.endsWith(".xlsx")) return parseExcel(file, salaNombre);
  throw new Error("formato");
};

function TablaMotivos({ filas }) {
  const [anchos, setAnchos] = useState(() => Object.fromEntries(COLUMNAS_PARO.map((columna) => [columna.key, columna.ancho])));
  const drag = useRef(null);

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

  return (
    <div className="sheet sheet-motivos">
      <table>
        <colgroup>
          {COLUMNAS_PARO.map((columna) => <col key={columna.key} style={{ width: anchos[columna.key] }} />)}
        </colgroup>
        <thead>
          <tr>
            {COLUMNAS_PARO.map((columna) => (
              <th key={columna.key} className={columna.entero ? "entero" : ""}>
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
          {filas.map((motivo) => (
            <tr key={motivo.codigo}>
              {COLUMNAS_PARO.map((columna) => (
                <td key={columna.key} className={columna.entero ? "entero" : ""}>
                  {motivo[columna.key] || (columna.key === "corta" ? motivo.nombre : "") || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PlantSetup({ onFase }) {
  const { user, profile, saveProfile } = useAuth();
  const hydrated = useRef(false);
  const [plant, setPlant] = useState(emptyPlant);
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState("");
  const [shown, setShown] = useState(null);
  const [busy, setBusy] = useState(false);
  const [importando, setImportando] = useState(false);
  const [preguntarEstandar, setPreguntarEstandar] = useState(false);
  const [sugeridos, setSugeridos] = useState(null);
  const revealTimer = useRef(null);

  useEffect(() => {
    if (!profile || hydrated.current) return;
    hydrated.current = true;
    if (profile.planta) {
      const salas = (profile.planta.salas || []).map(conDatosDeSala);
      const next = { ...emptyPlant, ...profile.planta, salas };
      setPlant(next);
    }
  }, [profile]);

  useEffect(() => {
    const fase = plant.fase === "excel" ? "maquinas" : plant.fase === "motivosCantidad" ? "motivos" : plant.fase;
    onFase?.({ fase, sala: plant.salas[plant.salaIndex]?.nombre || "" });
  }, [plant.fase, plant.salaIndex, plant.salas, onFase]);

  const reveal = (total) => {
    clearInterval(revealTimer.current);
    setShown(0);
    let count = 0;
    revealTimer.current = setInterval(() => {
      count += 1;
      setShown(count);
      if (count >= total) clearInterval(revealTimer.current);
    }, 160);
  };

  const sala = plant.salas[plant.salaIndex];

  const persist = async (next) => {
    const marcada = next.fase === "sistema" || next.fase === "lista" ? { ...next, confirmada: true } : next;
    setPlant(marcada);
    if (!user) return;
    setBusy(true);
    try {
      await saveProfile(user.uid, { planta: marcada });
      setError("");
    } catch {
      setError("No se pudo guardar este paso.");
    } finally {
      setBusy(false);
    }
  };

  const addSala = async (andContinue) => {
    const clean = nombre.trim();
    if (!clean && plant.salas.length === 0) {
      setError("Escribe el nombre de la sala.");
      return;
    }
    const salas = clean ? [...plant.salas, { nombre: clean, cantidad: 0, maquinas: [] }] : plant.salas;
    setNombre("");
    if (!andContinue) {
      await persist({ ...plant, fase: "otra", salas });
      return;
    }
    await persist({ ...plant, fase: "cantidad", salaIndex: 0, salas, excelDescargado: false });
  };

  const setCount = async () => {
    const count = Number(cantidad);
    if (!count || count < 1) {
      setError("Indica cuántas máquinas hay en esta sala.");
      return;
    }
    const salas = plant.salas.map((item, index) => (
      index === plant.salaIndex
        ? { ...item, ...controlDeSala(item.nombre), cantidad: count, maquinas: buildMachines(count, item.nombre, item.maquinas) }
        : item
    ));
    setCantidad("");
    await persist({ ...plant, fase: "maquinas", salas, excelDescargado: false });
  };

  const marcarSala = (patch) => plant.salas.map((item, index) => (
    index === plant.salaIndex ? { ...item, ...patch } : item
  ));

  const irSalaSiguiente = async (salas) => {
    const following = plant.salaIndex + 1;
    setShown(null);
    setResultado("");
    if (following >= salas.length) {
      await persist({ ...plant, salas, fase: "sistema", importado: false });
      return;
    }
    await persist({ ...plant, salas, fase: "cantidad", salaIndex: following, importado: false, excelDescargado: false });
  };

  const nextSala = async () => {
    setShown(null);
    setResultado("");
    setPreguntarEstandar(false);
    setSugeridos(null);
    if (plant.fase === "maquinas" || plant.fase === "excel") {
      await persist({ ...plant, fase: "motivos", importado: false });
      return;
    }
    if (plant.fase === "motivos" || plant.fase === "motivosCantidad") {
      await persist({ ...plant, salas: marcarSala({ motivosHecho: true }), fase: "turnos", importado: false });
      return;
    }
    if (plant.fase === "horarios") {
      await irSalaSiguiente(marcarSala({ turnosHecho: true }));
    }
  };

  const skipStep = async () => {
    setShown(null);
    setResultado("");
    if (plant.fase === "cantidad" || plant.fase === "maquinas" || plant.fase === "excel") {
      await persist({ ...plant, fase: "motivos", importado: false });
      return;
    }
    if (plant.fase === "motivos" || plant.fase === "motivosCantidad") {
      await persist({ ...plant, salas: marcarSala({ motivosHecho: true, saltadaMotivos: true }), fase: "turnos", importado: false });
      return;
    }
    if (plant.fase === "turnos" || plant.fase === "horarios") {
      await irSalaSiguiente(marcarSala({ turnosHecho: true, saltadaTurnos: true }));
    }
  };

  const goBack = async () => {
    setError("");
    setResultado("");
    setShown(null);
    if (plant.fase === "horarios") {
      await persist({ ...plant, fase: "turnos" });
      return;
    }
    if (plant.fase === "turnos") {
      await persist({ ...plant, fase: "motivos", importado: Boolean(sala?.motivosImportados) });
      return;
    }
    if (plant.fase === "motivos" || plant.fase === "motivosCantidad") {
      await persist({ ...plant, fase: "maquinas", importado: Boolean(sala?.maquinas?.length) });
      return;
    }
    if (plant.fase === "maquinas" || plant.fase === "excel") {
      await persist({ ...plant, fase: "cantidad", importado: false });
      return;
    }
    if (plant.fase === "cantidad" && plant.salaIndex > 0) {
      await persist({ ...plant, fase: "horarios", salaIndex: plant.salaIndex - 1 });
      return;
    }
    if (plant.fase === "cantidad") await persist({ ...plant, fase: "otra" });
  };

  const elegirTurnos = async (total) => {
    const salas = marcarSala({ turnos: sugerirTurnos(total, "07:00"), cantidadTurnos: total });
    await persist({ ...plant, fase: "horarios", salas });
  };

  const cambiarTurno = (index, field, value) => {
    const actuales = sala.turnos || [];
    const turnos = index === 0 && field === "inicio"
      ? sugerirTurnos(actuales.length, value)
      : actuales.map((turno, turnoIndex) => (turnoIndex === index ? { ...turno, [field]: value } : turno));
    const salas = marcarSala({ turnos });
    const next = { ...plant, salas };
    setPlant(next);
    if (user) saveProfile(user.uid, { planta: next }).catch(() => {});
  };

  const downloadFormat = async () => {
    const XLSX = await import("xlsx");
    const rows = (sala?.maquinas || []).map((machine) => ({
      numero: machine.numero,
      nombre: machine.nombre,
      marca: machine.marca,
      modelo: machine.modelo,
      serie: machine.serie,
      anio: machine.anio,
      tipo: machine.tipo,
      control: machine.control,
    }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), "Maquinas");
    XLSX.writeFile(book, `${sala?.nombre || "sala"}-maquinas.xlsx`);
    persist({ ...plant, excelDescargado: true, fase: "maquinas" });
  };

  const uploadFormat = async (file) => {
    setError("");
    setResultado("");
    setImportando(true);
    try {
      const maquinas = await readMachinesFile(file, sala?.nombre);
      if (!maquinas.length) throw new Error("vacio");
      const salas = plant.salas.map((item, index) => (
        index === plant.salaIndex ? { ...item, cantidad: maquinas.length, maquinas } : item
      ));
      await persist({ ...plant, fase: "maquinas", salas, excelDescargado: true, importado: true });
      setResultado(`Se encontraron ${maquinas.length} máquinas.`);
      reveal(maquinas.length);
    } catch (err) {
      const message = {
        formato: "Sube un archivo Excel o CSV.",
        vacio: "El archivo no trae máquinas.",
        columnas: "Faltan las columnas de las máquinas.",
      }[err.message] || "No se pudo validar el archivo.";
      setError(message);
    } finally {
      setImportando(false);
    }
  };

  const filasMotivo = (lista) => lista.map((item) => {
    const row = {};
    COLUMNAS_PARO.forEach((columna) => { row[columna.titulo] = item[columna.key] || ""; });
    return row;
  });

  const bajarPlantillaMotivos = async (lista) => {
    const XLSX = await import("xlsx");
    const book = XLSX.utils.book_new();
    const hoja = lista.length
      ? XLSX.utils.json_to_sheet(filasMotivo(lista))
      : XLSX.utils.aoa_to_sheet([COLUMNAS_PARO.map((columna) => columna.titulo)]);
    XLSX.utils.book_append_sheet(book, hoja, "Motivos");
    XLSX.writeFile(book, `${sala?.nombre || "sala"}-motivos.xlsx`);
  };

  const downloadMotivos = () => {
    const cargados = sala?.motivos || [];
    if (cargados.length) {
      setPreguntarEstandar(false);
      bajarPlantillaMotivos(cargados);
      return;
    }
    const estandar = estandarDeSala(sala?.nombre);
    if (estandar?.motivos?.length) {
      setPreguntarEstandar(true);
      return;
    }
    bajarPlantillaMotivos([]);
  };

  const confirmarEstandar = (conEjemplos) => {
    const estandar = estandarDeSala(sala?.nombre);
    setPreguntarEstandar(false);
    if (conEjemplos && estandar) {
      setSugeridos(estandar);
      setResultado(`Estos son los motivos de paro estándar de ${estandar.industria}. Revísalos, cámbialos si hace falta y súbelos. Quedan en motivos.`);
      bajarPlantillaMotivos(estandar.motivos);
      return;
    }
    setSugeridos(null);
    bajarPlantillaMotivos([]);
  };

  const uploadMotivos = async (file) => {
    setError("");
    setResultado("");
    try {
      const name = file.name.toLowerCase();
      let rows = [];
      if (name.endsWith(".csv")) {
        const lines = (await file.text()).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        const headers = lines[0].split(",").map((cell) => cell.replace(/"/g, "").trim().toLowerCase());
        rows = lines.slice(1).map((line) => {
          const cells = line.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim());
          const row = {};
          headers.forEach((header, index) => { row[header] = cells[index] || ""; });
          return row;
        });
      } else if (name.endsWith(".xls") || name.endsWith(".xlsx")) {
        const XLSX = await import("xlsx");
        const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
        rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { defval: "" });
      } else {
        throw new Error("formato");
      }
      const motivos = rows.map((row, index) => {
        const pick = (...keys) => {
          const found = Object.keys(row).find((key) => keys.includes(String(key).toLowerCase()));
          return found ? String(row[found]).trim() : "";
        };
        const leido = {};
        COLUMNAS_PARO.forEach((columna) => {
          leido[columna.key] = pick(columna.titulo.toLowerCase(), columna.key);
        });
        if (!leido.corta) leido.corta = pick("nombre", "motivo", "descripcion corta", "descripción corta");
        leido.codigo = codigoParo(leido.codigo) || `MP${String(index + 1).padStart(3, "0")}`;
        return leido;
      }).filter((motivo) => motivo.corta || motivo.causa);
      if (!motivos.length) throw new Error("vacio");
      const salas = marcarSala({ motivos: motivos.slice(), cantidadMotivos: motivos.length, motivosImportados: true, motivosHecho: false });
      setSugeridos(null);
      setPreguntarEstandar(false);
      await persist({ ...plant, fase: "motivos", salas, importado: true });
      setResultado(`Formato válido. Se reconocieron ${motivos.length} motivos de paro.`);
      reveal(motivos.length);
    } catch (err) {
      const message = {
        formato: "Sube un archivo Excel o CSV.",
        vacio: "El archivo no trae motivos de paro.",
      }[err.message] || "No se pudo validar el archivo.";
      setError(message);
    }
  };

  const listaMaquinas = (plant.fase === "maquinas" || plant.fase === "excel") && ((sala?.maquinas || []).length > 0 || importando);
  const conTabla = listaMaquinas
    || ((plant.fase === "motivos" || plant.fase === "motivosCantidad") && (plant.importado || sugeridos));

  return (
    <section className={`plant-ask paso${conTabla ? " has-table" : ""}`} key={plant.fase}>
      {error ? <p className="error">{error}</p> : null}

      {plant.fase === "nombre" && (
        <form className="ask" onSubmit={(event) => { event.preventDefault(); addSala(false); }}>
          <h2>¿Cómo quieres llamar a tu primera sala?</h2>
          <div className="stack">
            <label className="field">
              <span>Nombre de la sala</span>
              <input type="text" value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Telares" autoComplete="off" />
            </label>
            <button className="btn btn-primary" disabled={busy} type="submit">Listo</button>
          </div>
        </form>
      )}

      {plant.fase === "otra" && (
        <form className="ask" onSubmit={(event) => { event.preventDefault(); addSala(false); }}>
          <h2>¿Quieres agregar otra más?</h2>
          <p className="lede">Ya van: {plant.salas.map((item) => item.nombre).join(", ")}.</p>
          <div className="stack">
            <label className="field">
              <span>Otra sala</span>
              <input type="text" value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Circulares" autoComplete="off" />
            </label>
            <button className="btn btn-primary" disabled={busy} type="submit">Agregar otra</button>
            <button className="btn btn-ghost" disabled={busy} type="button" onClick={() => addSala(true)}>Continuar</button>
          </div>
        </form>
      )}

      {plant.fase === "cantidad" && sala && (
        <form className="ask" onSubmit={(event) => { event.preventDefault(); setCount(); }}>
          <h2>¿Cuántas máquinas hay en {sala.nombre}?</h2>
          <div className="stack">
            <label className="field">
              <span>Cantidad</span>
              <input type="number" min="1" value={cantidad} onChange={(event) => setCantidad(event.target.value)} />
            </label>
            <button className="btn btn-primary" disabled={busy} type="submit">Crear máquinas</button>
          </div>
        </form>
      )}

      {(plant.fase === "maquinas" || plant.fase === "excel") && sala && !listaMaquinas && (
        <div className="ask">
          <h2>{sala.nombre}</h2>
          <p className="lede">Baja la lista, completa los datos y, cuando estés listo, impórtala. Las máquinas aparecen de una en una.</p>
          <div className="stack">
            <button className="btn btn-ghost" type="button" onClick={downloadFormat}>
              <Download size={18} /> Bajar lista
            </button>
            <label className="btn btn-primary">
              <CloudUpload size={18} /> Importar lista
              <input className="file-input" type="file" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => event.target.files?.[0] && uploadFormat(event.target.files[0])} />
            </label>
          </div>
        </div>
      )}

      {(plant.fase === "maquinas" || plant.fase === "excel") && sala && listaMaquinas && (
        <div className="import-panel">
          <div className="import-head">
            <h2>{sala.nombre}</h2>
            <div className="import-actions">
              <button className="btn btn-ghost btn-inline" type="button" onClick={downloadFormat}>
                <Download size={18} /> Bajar lista
              </button>
              <label className="btn btn-primary btn-inline">
                <CloudUpload size={18} /> Importar lista
                <input className="file-input" type="file" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => event.target.files?.[0] && uploadFormat(event.target.files[0])} />
              </label>
            </div>
          </div>
          <p className="lede import-note">{importando ? "Importando lista" : (resultado || `Se encontraron ${sala.maquinas.length} máquinas.`)}</p>
          {sala.maquinas.length ? (
            <div className="sheet import-sheet">
              <table>
                <thead>
                  <tr>
                    <th>Máquina</th>
                    <th>Marca</th>
                    <th>Modelo</th>
                    <th>Serie</th>
                    <th>Año</th>
                    <th>Control</th>
                  </tr>
                </thead>
                <tbody>
                  {sala.maquinas.slice(0, shown === null ? sala.maquinas.length : shown).map((machine, index) => (
                    <tr key={machine.numero || index}>
                      <td>{machine.nombre}</td>
                      <td>{machine.marca}</td>
                      <td>{machine.modelo}</td>
                      <td>{machine.serie}</td>
                      <td>{machine.anio || "—"}</td>
                      <td>{machine.control || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}

      {(plant.fase === "motivos" || plant.fase === "motivosCantidad") && sala && !(plant.importado || sugeridos) && (
        <div className="ask">
          <h2>Motivos de paro de {sala.nombre}</h2>
          <p className="lede">Es la lista de motivos de paro conocidos de los telares, no el historial de paros. Descarga el formato, cámbialo si hace falta y súbelo. Lo guardamos en motivos.</p>
          <div className="stack">
            {preguntarEstandar ? (
              <>
                <p className="lede">¿Quiere descargar una plantilla con motivos de paro de ejemplo, estándares para tejeduría?</p>
                <button className="btn btn-primary" type="button" onClick={() => confirmarEstandar(true)}>Sí, con los estándar</button>
                <button className="btn btn-ghost" type="button" onClick={() => confirmarEstandar(false)}>No, plantilla vacía</button>
              </>
            ) : (
              <button className="btn btn-ghost" type="button" onClick={downloadMotivos}>
                <Download size={18} /> Descargar el formato
              </button>
            )}
            <label className="btn btn-primary">
              <CloudUpload size={18} /> Estoy listo para subir
              <input className="file-input" type="file" accept=".csv,.xls,.xlsx,text/csv" onChange={(event) => event.target.files?.[0] && uploadMotivos(event.target.files[0])} />
            </label>
            {resultado ? <p className="lede">{resultado}</p> : null}
          </div>
        </div>
      )}

      {(plant.fase === "motivos" || plant.fase === "motivosCantidad") && sala && (plant.importado || sugeridos) && (
        <>
          <div className="motivos-bar">
            <h2>Motivos de paro</h2>
            <div className="motivos-actions">
              <button className="btn btn-ghost btn-inline" type="button" onClick={() => bajarPlantillaMotivos(plant.importado && sala.motivos?.length ? sala.motivos : (sugeridos?.motivos || sala.motivos || []))}>
                <Download size={18} /> Bajar plantilla
              </button>
              <label className="btn btn-primary btn-inline">
                <CloudUpload size={18} /> Subir datos
                <input className="file-input" type="file" accept=".csv,.xls,.xlsx,text/csv" onChange={(event) => event.target.files?.[0] && uploadMotivos(event.target.files[0])} />
              </label>
            </div>
          </div>
          {resultado ? <p className="lede motivos-note">{resultado}</p> : null}
          <TablaMotivos filas={(plant.importado ? sala.motivos || [] : sugeridos.motivos).slice(0, plant.importado && shown !== null ? shown : undefined)} />
        </>
      )}

      {plant.fase === "turnos" && sala && (
        <form className="ask" onSubmit={(event) => event.preventDefault()}>
          <h2>¿Cuántos turnos trabajan en {sala.nombre}?</h2>
          <div className="stack">
            {[1, 2, 3].map((total) => (
              <button key={total} className="btn btn-ghost" type="button" onClick={() => elegirTurnos(total)}>
                {total} {total === 1 ? "turno" : "turnos"}
              </button>
            ))}
          </div>
        </form>
      )}

      {plant.fase === "horarios" && sala && (
        <div className="ask">
          <h2>Horario de {sala.nombre}</h2>
          {sala.cantidadTurnos === 1 ? (
            <p className="lede">Un turno no cubre las 24 horas. Ajusta la hora de salida.</p>
          ) : (
            <p className="lede">Si el primero empieza a las 07:00, los siguientes quedan sugeridos de ocho horas. Puedes cambiarlos.</p>
          )}
          <div className="stack">
            {(sala.turnos || []).map((turno, index) => (
              <div className="shift" key={turno.nombre}>
                <span>{turno.nombre}</span>
                <label className="field">
                  <span>Desde</span>
                  <TimeField value={turno.inicio} onChange={(valor) => cambiarTurno(index, "inicio", valor)} />
                </label>
                <label className="field">
                  <span>Hasta</span>
                  <TimeField value={turno.fin} onChange={(valor) => cambiarTurno(index, "fin", valor)} />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {(plant.fase === "cantidad" || plant.fase === "maquinas" || plant.fase === "excel" || plant.fase === "motivosCantidad" || plant.fase === "motivos" || plant.fase === "turnos" || plant.fase === "horarios") && createPortal(
        <footer className="plant-footer">
          <button className="btn btn-ghost btn-inline" type="button" onClick={goBack}>Atrás</button>
          <button className="btn btn-ghost btn-inline" type="button" disabled={busy} onClick={skipStep}>Saltar este paso</button>
          {plant.fase !== "cantidad" && plant.fase !== "turnos" && (
            <button className="btn btn-primary btn-inline" type="button" disabled={busy} onClick={nextSala}>
              {plant.fase === "maquinas" || plant.fase === "excel" ? "Continuar con motivos de paro" : null}
              {plant.fase === "motivos" || plant.fase === "motivosCantidad" ? "Continuar con turnos" : null}
              {plant.fase === "horarios" ? (plant.salaIndex + 1 < plant.salas.length ? `Continuar con ${plant.salas[plant.salaIndex + 1].nombre}` : "Entrar") : null}
            </button>
          )}
        </footer>,
        document.body
      )}
    </section>
  );
}

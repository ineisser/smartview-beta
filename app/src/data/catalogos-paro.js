// Catálogo global de motivos de paro, compartido entre clientes.
// Cada industria es un nodo. Tejeduría ya está cargada.
// Circulares, manuales y coneras se agregan aquí cuando existan.

export const COLUMNAS_PARO = [
  { key: "codigo", titulo: "Código", ancho: 108, min: 88, entero: true },
  { key: "corta", titulo: "Descripción Corta", ancho: 180, min: 148, entero: true },
  { key: "tipo", titulo: "Tipo de Paro", ancho: 168, min: 132, entero: true },
  { key: "causa", titulo: "Motivo / Causa Detallada", ancho: 280, min: 180 },
  { key: "deteccion", titulo: "Detección / Origen", ancho: 260, min: 180 },
  { key: "oee", titulo: "Afecta en OEE", ancho: 200, min: 160, entero: true },
];

export const codigoParo = (codigo) => String(codigo || "").replace(/-/g, "");

const motivo = (codigo, tipo, corta, causa, deteccion, oee) => ({
  codigo, tipo, corta, causa, deteccion, oee,
});

export const CATALOGOS_PARO = {
  tejeduria: {
    id: "tejeduria",
    industria: "Tejeduría",
    motivos: [
      motivo("PTEC01", "Proceso / Material", "Rotura Urdimbre", "Hilo longitudinal cortado o flojo", "Lamilla cae a barra portalamillas", "Disponibilidad / Rend."),
      motivo("PTEC02", "Proceso / Material", "Rotura Trama", "Hilo transversal cortado o fallo de inserción", "Sensor antetrama o mecanismo FA", "Disponibilidad / Rend."),
      motivo("PTEC03", "Proceso / Material", "Falso Paro", "Pelusa/borra acumulada cerrando contacto", "Suciedad en lamillas o haz óptico", "Rendimiento (Microporos)"),
      motivo("PTEC04", "Proceso / Material", "Falta Cono Trama", "Cono de hilo agotado en la fileta exterior", "Sensor de reserva / prealimentador", "Disponibilidad"),
      motivo("PTEC05", "Proceso / Material", "Falla de Orillos", "Enganche de hilo en tijera u orillo falso", "Cortador de orillo / remetedor", "Disponibilidad"),
      motivo("PCAR01", "Carga / Descarga", "Cambio Plegador", "Urdimbre agotada; anudado y remetido", "Fin de rollo en barra tensora", "Disponibilidad (Programado)"),
      motivo("PCAR02", "Carga / Descarga", "Corte de Rollo", "Pieza de tela tejida lista para descarga", "Metraje estándar alcanzado", "Disponibilidad"),
      motivo("PCAR03", "Carga / Descarga", "Cambio Artículo", "Cambio de ligamento, peine o densidad de trama", "Orden de producción nueva", "Disponibilidad (Set-up)"),
      motivo("PMEC01", "Falla Mecánica", "Atasco Proyectil", "Proyectil trabado o freno descalibrado", "Caja receptora / guía de peine", "Disponibilidad (Avería)"),
      motivo("PMEC02", "Falla Mecánica", "Rotura Peine/Malla", "Dientes de batán o lizos rotos", "Inspección visual en zona de calada", "Disponibilidad (Avería)"),
      motivo("PMEC03", "Falla Mecánica", "Falla Disparo", "Barra de torsión descalibrada o fatigada", "Mecanismo de tiro desincronizado", "Disponibilidad (Avería)"),
      motivo("PMEC04", "Falla Mecánica", "Falla Transmisión", "Cadena de proyectiles o faja rota", "Transmisión mecánica principal", "Disponibilidad (Avería)"),
      motivo("PELE01", "Falla Eléctrica", "Térmico Motor", "Sobrecarga eléctrica en motor principal", "Térmico del contactor K1 abre", "Disponibilidad (Avería)"),
      motivo("PELE02", "Falla Eléctrica", "Falla Freno", "Pérdida de frenado instantáneo del eje", "Bobina Bremse abierta o quemada", "Disponibilidad (Avería)"),
      motivo("PELE03", "Falla Eléctrica", "Falla Control", "Transformador o fusibles sin energía", "Líneas de control 12VCA / 24VCC", "Disponibilidad (Avería)"),
      motivo("PMNT01", "Mantenimiento", "Limpieza Borra", "Sopleteado de pelusa y residuos de algodón", "Rutina de limpieza por turno", "Disponibilidad"),
      motivo("PMNT02", "Mantenimiento", "Engrase/Lubricación", "Lubricación periódica de levas y guías", "Rutina preventiva menor de taller", "Disponibilidad (Prev.)"),
      motivo("PMNT03", "Mantenimiento", "Preventivo Mayor", "Ajuste mecánico o revisión general programada", "Paro por equipo de mecánicos", "Disponibilidad (Prev.)"),
      motivo("PPLN01", "Planta / Suministro", "Corte Eléctrico", "Falta de energía externa o acometida general", "Tablero de fuerza sin tensión", "Tiempo no planificado"),
      motivo("PPLN02", "Planta / Suministro", "Desabastecimiento", "Falta de material entregado por bodega", "Falta de conos o plegador listo", "Disponibilidad (Logística)"),
      motivo("PPLN03", "Planta / Suministro", "Falta Aire", "Compresor general detenido o línea sin presión", "Manómetro bajo rango mínimo", "Disponibilidad (Suministro)"),
      motivo("PPLN04", "Planta / Suministro", "Sin Turno/Feriado", "Parada programada de planta o día no laborable", "Decisión de gerencia/producción", "Fuera de programación"),
      motivo("PPLN05", "Planta / Suministro", "Falta Tejedor", "Inasistencia o falta de personal asignado", "Telar sin operador en el turno", "Fuera de programación"),
      motivo("PMAN01", "Operación Manual", "Paro Manual", "Parada deliberada por palanca o pulsador", "Barra Einschaltstange accionada", "Disponibilidad"),
    ],
  },
};

const plano = (nombre) => String(nombre || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");

export const industriaDeSala = (nombre) => {
  const texto = plano(nombre);
  if (/telar|tejedur|tejido|tela plana/.test(texto)) return "tejeduria";
  return null;
};

export const estandarDeSala = (nombre) => {
  const id = industriaDeSala(nombre);
  return id ? CATALOGOS_PARO[id] : null;
};

# Reglas de Visualización de Máquinas (SmartView)

1. **Estado de Máquinas Operando (Activas):**
   - Todas las máquinas que se encuentren en producción ("Operando") deben mostrar claramente:
     - El **último reinicio** registrado.
     - Si la máquina no ha sido detenida durante el turno actual, se debe asumir y mostrar el **inicio del turno** (ej. 06:00).
     - El **tiempo transcurrido** (en minutos u horas) desde ese último reinicio (o inicio de turno) hasta el momento actual.

2. **Diseño de Interfaz:**
   - En el panel principal (`#main-log-container`), los registros se visualizarán en un layout de una sola línea ocupando el ancho completo de su celda, asegurando legibilidad sin sobrecargar el diseño.
   - Toda máquina activa debe llevar el indicador de estado circular verde (`O`) y los motivos de paro el cuadrado rojo (`[]`).

3. **Restricciones de Altura:**
   - La altura máxima de cada bloque de registro en el escritorio es de `40px` para mantener densidad de información. 
   - El espacio interno (padding vertical) es de `6px` y el `line-height` de `28px` garantizando el centrado perfecto del contenido.

4. **Tarjeta de Incidencias (Footer):**
   - **Total de Paros**: Debe corresponder a la longitud total del historial de registros (`logs.length`). No se debe sumar dos veces la cantidad de paros actuales, ya que el historial ya los incluye.
   - **Máquinas Únicas**: Es el conteo de máquinas distintas (IDs únicos) que se encuentren dentro del historial de paros.
   - **Tiempo Sin Producción**: Debe ser la suma total del tiempo acumulado de los paros resueltos (`log.duration` cuando `status === 'atendido'`) más los minutos transcurridos en tiempo real de los paros actualmente activos (`Date.now() - log.id` cuando `status === 'detenido'`).

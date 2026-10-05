# Consultas de Análisis

`historialPagina` verifica Auth, empresa, rol y salas asignadas. Sirve Historial,
Máquinas, Motivos y Dashboard; el cliente ya no descarga todo el historial.

## Datos derivados

La primera consulta prepara `organizaciones/{org}/analisis`, sin modificar
los registros originales de `paros`: eventos fusionados, cerrados divididos por
día, abiertos y resúmenes diarios por máquina, motivo y turno.
Los resúmenes guardan conteos y tiempos; solo los eventos que atraviesan límites
llevan identificadores, para evitar contar el mismo paro varias veces.
La disponibilidad usa tiempo programado y perdido acumulados.

`indexarParo` mantiene esa proyección al insertar, cerrar, corregir o borrar un
registro. Recalcula únicamente los días afectados. Las transacciones y versiones
impiden reemplazar resúmenes recientes con otros anteriores. Cambiar el catálogo
u horario fuerza una preparación nueva.

Abiertos, día actual y días parcialmente seleccionados se calculan al consultar,
junto con los cerrados de esos días. No se escribe por segundo. El cliente escucha
la revisión, actualiza períodos actuales cada minuto y permite actualizar manualmente.

## Lecturas y límites

Máquinas y Motivos leen los resúmenes diarios. Historial lee los días del período
y los abiertos, responde con bloques de 100 y cursores vinculados a la revisión.
El servidor aplica filtros y órdenes combinados. Los detalles se conservan en una
caché acotada durante 60 segundos por empresa y revisión; las siguientes páginas
reutilizan la lectura si la instancia sigue caliente y los datos no cambian.

**La primera consulta puede leer más de 100 eventos en el servidor.** Realtime
Database no combina todos los filtros y órdenes de la UI en una sola consulta.
La división por día evita leer toda la empresa; la caché evita repetir lecturas
por página. No se garantiza caché entre instancias ni tras un arranque en frío.

Se añaden índices `.indexOn`, sin modificar permisos. La primera preparación lee
el historial una vez y duplica lo necesario para consultar por día: añade
almacenamiento y escrituras para reducir las lecturas frecuentes.

## Desarrollo y publicación

Vite sirve el mismo cálculo por `/api/analisis/historial`, verificando el token.
Sin el trigger desplegado, **Actualizar** reconstruye la proyección en desarrollo
para recoger escrituras de otros clientes; este fallback sí relee el historial
completo al actualizar manualmente. Producción utiliza el trigger incremental.

`prepare.mjs` copia los cálculos compartidos desde la app al paquete antes de
publicarlo. No editar las copias de `shared/` manualmente.

Validación desde la raíz:

```sh
node functions/prepare.mjs
node --test app/src/data/analisis.test.js functions/*.test.js
node functions/benchmark.mjs
```

El benchmark usa datos sintéticos y un adaptador en memoria: mide cálculo y bytes
leídos; excluye red, facturación y arranque de funciones.

Publicación pendiente de aprobación:

```sh
firebase deploy --only database,functions:historialPagina,functions:indexarParo --project isagismartview
```

Publicar funciones e índices juntos. Cloud Functions debe estar habilitado.
Las pruebas locales no confirman el despliegue cloud.

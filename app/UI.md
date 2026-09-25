# UI de Smart View

Fuente: modo claro de `index.html`. Las pantallas de `app/` usan estos tokens y no inventan otra paleta.

## Tipografía

| Uso | Familia | Tamaño | Peso |
| --- | --- | --- | --- |
| Texto | `Inter, system-ui, -apple-system, sans-serif` | 1rem | 400 |
| Títulos H1–H4 y textos grandes | `Urbanist, system-ui, -apple-system, sans-serif` | 1.75rem el título de pantalla | 400, tracking -0.02em |
| Caption | Inter | 0.75rem | 400, opacidad 0.6, sin mayúsculas forzadas |

## Color, modo claro

| Token | Valor | Uso |
| --- | --- | --- |
| Fondo | `#ffffff` | Página. El formulario no lleva tarjeta opaca. |
| Texto | `rgba(15, 25, 40, 0.8)` | Texto principal. |
| Texto suave | `#475569` | Ayudas y captions. |
| Activo | `#0f172a` | Botón principal y opción elegida. Es el activo de las pestañas de `index.html`. |
| Superficie | `#ffffff` | Campos y opciones. |
| Borde | `rgba(0, 0, 0, 0.08)` | Campos, opciones, divisores. |
| Hover de opción | `#f1f5f9` | Igual que el hover de pestaña en claro. |
| Acento | `#10b981` | Solo la barra de avance. No pinta botones ni fondos. |
| Error | `#990000` sobre `#fff5f5` | El granate de la paleta de alerta. |
| Alerta 1 | `#e10202` | Rojo vivo del borde. |
| Alerta 2 | `#500d0d` | Rojo oscuro del relleno. |

El modo oscuro usa fondo `#050505` y texto `rgba(230, 245, 255, 0.9)`. Se elige en el menú del usuario: claro, oscuro o del sistema. La elección queda guardada y el icono del menú es el de la última opción.

En el historial, un paro en curso dice **Detenido** en el color del texto (oscuro en claro, claro en oscuro). La celda de Estado lleva un bloque plano de Alerta 1 (`#e10202`) al 20% de mezcla; al hover de la fila sube al 50% (sin degradé ni blur). El reloj giratorio no va en Estado: aparece delante de la duración en Tiempo, solo mientras la máquina sigue parada, y usa ese mismo color de texto. En Motivo, un puntito rojo (Alerta 1) queda arriba a la derecha del texto. **Atendido** sigue en verde con el check.

## Cristal

En claro, la aplicación es un panel de vidrio sobre un fondo frío: entrada, Saiba, tarjetas, tablas, menús, modales y el formulario lateral. El vidrio es blanco translúcido (`--glass`), con desenfoque y una sombra amplia. El modal en claro usa ese mismo cristal; el overlay es un velo frío sobre el fondo `#e7edf4`, no un negro denso, para que el fondo de la app se lea a través del vidrio. En oscuro, Saiba y tarjetas llevan sombra desenfocada y una línea negra, más oscura que esa sombra. Los menús flotantes (usuario, listas, hora) se aclaran un poco, llevan borde blanco y sombra amplia para distinguirse del resto de la app. El modal en oscuro es vidrio líquido: el borde se ilumina en blanco desde la esquina superior izquierda y sigue visible en la inferior derecha, para que el modal se separe del resto de la app. El overlay del modal es oscuro. Cualquier menú entra en 0.8s, con un leve desplazamiento. El referente es el cristal de `index.html`: paneles de auto, cercanos a iPhone y a un HMI. La tipografía sigue siendo Urbanist en títulos e Inter en el texto. No se inventa otra paleta.

En todo modal, la fila de acciones (`.modal-actions`) lleva `padding-top` para respirar del cuerpo. El botón cerrar es circular y transparente; en hover se vuelve fantasma (`var(--hover)`), con la misma transición suave de 0.8s.

## Movimiento

Toda transición es muy suave: dura 0.8s y usa la curva `cubic-bezier(0.22, 1, 0.36, 1)`. Nada entra, sale ni cambia de golpe. En el inicio, cada paso y cada pantalla entran con un leve desplazamiento hacia arriba y un desvanecido.

El Saiba cambia de ancho en 0.8s. El texto se desvanece. Contraído, cada sala muestra dos iniciales centradas. El logo es el icono Cast y abre o cierra el Saiba. Los iconos de esa barra no llevan borde: son transparentes y en hover se ven como botón fantasma. Al cambiar de sala o de página, el contenido entra en 0.8s, con un leve desplazamiento hacia arriba. El fondo también pasa de claro a oscuro en 0.8s. Los menús y los tooltips usan la misma duración y la misma curva.

## Botones

Todo botón de acción usa el componente `Button` (clase `.btn`). El cursor es siempre la manito, también sobre el texto y el icono. No hay caret de escritura ni selección de texto dentro del botón.

El cursor de texto solo aparece dentro de un campo. Títulos, ayudas y el resto de la columna usan la flecha.

Al pulsar, sale un círculo desde el centro del botón hacia afuera y se desvanece en medio segundo, aunque el dedo ya se haya levantado. Así, en tablet, se nota que el toque ocurrió. El principal usa un halo claro; el secundario, uno oscuro.

No lleva este efecto un grupo de opciones que se desplaza en horizontal de una a otra, como `.segment` y `.maquinas-container-tab-view`. Esos controles usan la clase `btn-slide` y no el componente `Button`. En `.segment`, una pastilla negra se mueve de Sí a No. Una sala sin máquinas o sin motivos de paro se llama **No operativa**.

## Controles

Los campos y botones no heredan el estilo del navegador (`appearance: none`).

- Campo: alto 48px, borde 1px, radio 8px, sombra `0 1px 2px rgba(0,0,0,0.06)`. Hover oscurece el borde. Foco: borde `#0f172a` y anillo suave.
- Hora: componente `TimeField`. No usa el selector del navegador. El campo muestra `HH:MM` y un reloj. Al abrirlo, horas y minutos quedan en dos columnas que se desplazan. La opción elegida usa el activo `#0f172a` con texto blanco.
- Botón principal: fondo `#0f172a`, texto blanco, alto 48px, radio 8px, padding 12px 24px (el horizontal es el doble del vertical).
- Botón secundario: fondo blanco, borde `rgba(0,0,0,0.08)`.
- En los modales, Cancelar y la acción principal usan ese mismo botón, no pastilla. El cerrar sigue circular.
- Encima de una tabla condensada (`.sheet.is-small`), el botón del header (Invitar) es compacto: padding 8px 16px, `0.75rem`, `width: auto`. Las filas de esa tabla son más bajas que las de la tabla normal.
- Opción (rubro, máquinas, salas): píldora de radio completo, como `.maquinas-container-tab-view`. Elegida: fondo `#0f172a`, texto blanco.
- Enlace: color del texto, subrayado. No azul del navegador.
- Error: una frase que dice qué pasó y cómo seguir.

## Menú del usuario

Está en la zona inferior del Saiba. Encima del avatar va el icono de pantalla completa (como F11), con el texto a la derecha: «Pantalla completa» o «Reducir pantalla». Si el Saiba está cerrado, queda solo el icono encima de la ruedita. La preferencia se guarda y se restaura al volver a entrar. Cualquier punto de esa zona, salvo el engranaje y la pantalla completa, abre el menú a la derecha y arriba de la opción de usuario, tanto si el Saiba está abierto como cerrado. Entra y sale en 0.8s. Al perder el foco se oculta. Arriba va el nombre, debajo el correo y el chip del perfil a la derecha (fondo fantasma, no es clic). Al pasar el cursor, un tooltip describe a qué tiene acceso. Luego Ficha personal (el profile: los datos de la persona, no el rol), Modo, una línea y Cerrar sesión con el icono de salir a la izquierda. La ficha muestra organización, correo, nombre, teléfono, perfil y salas. El teléfono y el nombre se pueden cambiar. El correo no. El formulario empieza en la F del título y termina donde empieza la campana. Las filas son de 48px, en dos columnas: labels a la izquierda y datos a la izquierda de la segunda columna. Abajo, Volver a la izquierda y Guardar a la derecha; Guardar solo se activa si hay un cambio. El padding horizontal del botón es el doble del vertical. Arriba va el título Ficha personal y una flecha atrás a la página anterior. Modo abre un submenú: Claro, Oscuro, Sistema. El engranaje no abre ese menú: entra a Configuración. Esa página tiene tres secciones, General, Usuarios y accesos y Central de notificaciones, separadas por una línea. En cada línea, el atributo va a la izquierda y el campo o la acción a la derecha. En Central de notificaciones, el primer parámetro es cada cuánto se notifica el informe de avance (5, 10 o 30 minutos; 2, 6 u 8 horas; o un día por semana, con día y hora). El robot envía ese informe a la campana con el porcentaje de eficiencia de cada sala. En General, el nombre de la organización y su campo quedan en la misma fila; Guardar va en la última, a la derecha. En Usuarios y accesos hay una tabla compacta de miembros: el primero es siempre el propietario (owner). Los tres puntos de cada fila abren el modal para editar nombre, perfil y salas; el propietario no cambia de perfil. Invitar abre un modal conversacional; no se invita otro owner, solo administrador, jefe u operario. La invitación deja al usuario en espera y entrega un enlace. En ese enlace, el invitado ve el nombre de la empresa, elige contraseña y confirmación, y el pie muestra su perfil.

El menú usa el mismo padding de 6px, opciones de 40px y radio de 8px que `.menu-list`. Si una opción abre un submenú o un formulario, lleva un chevron a la derecha.

Cualquier menú que despliega opciones (motivos de paro, hora, selects tipo lista) usa ese mismo respiro: padding 6px en el contenedor e ítems de 40px con padding horizontal 10px y radio 6px. El texto no pega al borde ni al scrollbar.

Un tooltip usa el fondo oscuro de los botones, `#0f172a`, con letra clara. Si el fondo es claro, la letra es oscura. Sale en 0.8s, de escala 0.9 a 1, con borde circular. Aparece debajo del botón, centrado. Si por el ancho se sale, se corre a la izquierda o a la derecha. Si abajo no cabe en la pantalla, pasa arriba.

Un menú flota sobre toda la aplicación. No vive dentro del Saiba: el Saiba recorta lo que se sale, así que el menú se dibuja encima de la página, con sombra amplia, y nada lo corta.

Una acción guardada avisa con un aviso abajo a la derecha durante 3 segundos. El botón Guardar dice «Guardado correctamente» ese mismo tiempo y queda inactivo hasta que el campo cambie. La sala vive en `/{código de organización}/{código de sala}` y su ajuste en `.../setup`, para que el navegador pueda volver atrás. El título sigue siendo el nombre de la sala. A su derecha, en la misma línea, dice Configuración, un 25 % más pequeña. En la página de la sala, la campanita va a la derecha y el engranaje queda a la derecha de la campanita. Si hay avisos nuevos, la campanita lleva un punto verde; si alguno es urgente, el punto es rojo. Esa campana abre el menú corto y el panel que entra de derecha a izquierda. En el Saiba, debajo de las salas, una línea separa dos atajos: Notificaciones (va a la página larga) y Mensajes (buzones a la izquierda, conversación a la derecha). Si hay mensajes sin leer, Mensajes lleva una insignia con el número. Quién escribe a quién lo decide `avisos.js`, de abajo hacia arriba: el operario a su jefe (si no, admin u owner); el jefe a los operarios de su sala y hacia arriba; admin y owner a cualquiera. En configuración ese engranaje no aparece. El Saiba mide el alto de la pantalla y no se mueve al bajar. En configuración, el título y la barra de selección quedan fijos arriba. Al bajar, los dos reducen su altura. Los encabezados de la tabla se fijan debajo, en vidrio empañado, y las filas pasan por debajo. Esa tabla no tiene borde, radio ni fondo: usa el fondo de la página. La fila se marca al pasar el cursor, y la celda un poco más. A la izquierda del selector va la casita, que vuelve a la sala. A la derecha, Actualizar: el icono gira medio segundo y la tabla muestra filas skeleton. El skeleton es una barra que recorre un degradado y se reutiliza cuando una lista está cargando. Al pulsar una fila, el formulario entra desde la derecha, pegado al borde, con 480px de ancho. El cambio entre General, Máquinas y Motivos usa `TabSwitch`, en tamaño small o normal, con la pastilla que se desplaza.

## Pantallas

Una columna centrada, máximo 420px, sobre fondo blanco.

1. Bienvenida. Dos acciones: Entrar y Crear cuenta.
2. Entrar. Correo, contraseña y Google.
3. Crear cuenta. Nombre, teléfono, correo, contraseña.
4. Teléfono. Solo si la cuenta viene de Google.
5. Organización, en cinco pasos: nombre, rubro, empleados y personas en planta, salas, equipos. Esos cuatro últimos datos se eligen en un menú que se abre hacia abajo. La barra verde marca el paso.

Rangos de empleados y de planta: 1 a 10, 10 a 20, 20 a 50, 50 a 500, 500 a 1000, más de 1000. Salas: 1, 2 a 3, 4 a 5, más de 5. Equipos: 1 a 20, 20 a 50, 50 a 100, 100 a 500, 500 a 1000.

El rubro textil permite varias marcas: hilandería, tejeduría, tintorería, confección y otros. Metalmecánica no tiene subopciones.

# Diseño por tamaño de pantalla

Estándar móvil primero de Smart View. La paleta, el cristal, la tipografía y el movimiento salen de `UI.md`; aquí va cómo se acomoda la interfaz en móvil, tablet y escritorio. Nada de esta guía inventa colores: usa los tokens de `app.css`.

## Breakpoints

| Tamaño | Ancho | Consulta |
| --- | --- | --- |
| Móvil | hasta 640px | `MOVIL` en `hooks/useMedia.js` |
| Tablet | 641px a 1024px | `TABLET` en `hooks/useMedia.js` |
| Escritorio | más de 1024px | sin consulta |

En CSS se usan las mismas cifras con `max-width`: primero el estilo general y luego los ajustes de tablet (`1024px`) y móvil (`640px`) al final de `app.css`. En JavaScript, `useMedia(MOVIL)` decide lo que cambia de estructura, como la hoja inferior.

## Saiba

En móvil el Saiba no aparece: la única navegación es la barra inferior.

En tablet vertical (`.shell.is-portrait`) el Saiba flota sobre la página y queda contraído. La página deja libre su ancho (72px) más el margen. Nada del contenido queda debajo del Saiba. Al abrirlo entra como cajón de 240px con el velo frío detrás.

## Página

- Escritorio: padding 48px.
- Tablet: padding 32px. El título de la sala y las pestañas se separan en dos líneas; el título no se corta palabra por palabra. El mapa usa 6 columnas y las listas de Paros y Activas, una sola columna.
- Móvil: padding 20px arriba y 16px a los lados, más la zona segura del teléfono. El título de la organización baja a 1.35rem y el de la vista a 1.25rem, con icono de 24px. El mapa usa 4 columnas, con tarjetas de radio 16px (en todos los tamaños). Un barrido de luz recorre el mapa telar por telar: un degradé blanco suave (28 % en oscuro, 60 % en claro) cruza la tarjeta de izquierda a derecha en 0.8s lineal y, justo al salir, entra en la siguiente, fila por fila; al llegar al último vuelve al primero. Solo con el mapa visible en móvil y nunca con movimiento reducido (`useBarrido`). Las pestañas de la sala se ocultan: su lugar lo toma la barra inferior. El contenido deja abajo `--tabbar-reserva` para que la barra no lo tape.
- El aviso de guardado en móvil ocupa el ancho, centrado, encima de la barra inferior.
- Debajo del mapa de sección, en tablet y escritorio (en móvil pasa a la hoja Eficiencia), va la línea en degradé (`.linea-moderna`, del centro hacia los lados) y la sección «Motivos», con el total de paros a la derecha. Cada motivo es una fila de 44px con fondo Alerta 1 translúcido (14 % en oscuro, 9 % en claro), separada 2px de la siguiente; el grupo lleva radio 14px. La fila dice «cantidad | motivo» y el porcentaje sobre el total a la derecha: cantidad y porcentaje en peso 700/600 con cifras tabulares, motivo en peso 500 a 15px, y el divisor es una línea vertical de 1px en Alerta 1 al 45 %. Cuenta los paros del turno en curso (incluidos los abiertos), de mayor a menor. Sin paros: «Sin paros en este turno». Debajo va el reloj del turno de Eficiencia (`RelojTurno`): la misma tarjeta de vidrio con el arco del turno y el «tiempo restante», verde si la eficiencia alcanza el umbral y Alerta 1 si no.

### Volumen en la ficha (móvil)

- En el menú de usuario, debajo de Modo, una sola fila de 40px: a la izquierda el icono (botón circular de 38px) y a la derecha la barra de volumen con su punto. Sin cifras ni porcentajes.
- El icono es el altavoz cuando suena y el altavoz tachado cuando está en cero o apagado. Tocarlo silencia (barra a cero) o, si está en silencio, devuelve el último volumen usado (100 si no había).
- Correr la barra a la derecha enciende el sonido; llevarla a cero lo apaga.
- Mientras el dedo arrastra, detrás de la barra aparece en 0.8s una cápsula de verde suave en degradé (`#10b981` del 6 % al 30 %, de izquierda a derecha, con canto fino del mismo verde) y se apaga igual al soltar.
- En escritorio el volumen sigue en su botón de la barra lateral.

### Configuración de la sala en móvil

- Cabecera estilo título grande: arriba, la flecha de volver a la izquierda (su icono alineado al borde) y las acciones a la derecha; debajo, el nombre de la sala pegado al borde izquierdo con «Configuración» al lado. La flecha siempre está: la página no tiene otra salida.
- Las pestañas (General, Turnos, Máquinas, Motivos) son una barra de pestañas a todo el ancho, con el botón de actualizar a la derecha. Cada pestaña: icono de 20px arriba y etiqueta de 11px debajo, 56px de alto; la activa en peso 600 con la pastilla deslizante.
- Nada pasa del ancho del teléfono: sin ancho mínimo ni sangría. En General cada ajuste se apila: texto arriba y control debajo, alineado a la derecha como en escritorio. Las tablas usan columnas compactas (código 60px, máquina 96px) y cortan con puntos suspensivos lo que no cabe; el detalle completo está en la ficha al tocar la fila.

### Modal de paro en móvil

- Es una hoja emergente abajo, a todo el ancho con 8px de margen y radio 28px. Sube con el teclado: se mide con `visualViewport` para que el comentario y los botones nunca queden tapados.
- Cabecera: el número de máquina en Urbanist 700 a 4rem (3.5rem en escritorio), en Alerta 1, y al lado el caption «Máquina». Debajo, la frase de ayuda en 15px.
- Motivo y comentario a 52/48px de alto, con texto de 16px para que el teléfono no haga zoom. La lista de motivos se abre hacia arriba.
- Botones apilados a todo el ancho, 52px de alto: la acción principal arriba (Reiniciar, Cambiar motivo o Confirmar paro), luego Comentar y Me enteré si aplican, y Cancelar al final. En escritorio siguen en fila, con Cancelar a la izquierda.

## Barras del sistema

La app se comporta como una app del teléfono, no como una página dentro del navegador.

- `viewport-fit=cover`: la app llega a los bordes y respeta las zonas seguras con `env(safe-area-inset-*)`. El contenido nunca queda debajo del notch, de la barra de estado ni del indicador de inicio.
- `theme-color` sigue el tema elegido: `#e7edf4` en claro y `#050505` en oscuro. Así la barra del navegador y la de estado se funden con la app. Lo aplica `aplicarTema` en `theme.js`.
- Se puede instalar en la pantalla de inicio (`mobile-web-app-capable`).

## Hoja inferior (móvil)

Es el panel de la sala en el teléfono. Componente `HojaSala`, estilos en `styles/components/hoja-sala.css`.

- Ancho completo, máximo 420px, centrada. Alto: la pantalla menos 74px. Radio 32px arriba.
- Cristal `--glass` con desenfoque. En claro, velo frío detrás; en oscuro, velo oscuro y borde de vidrio líquido que se ilumina desde la esquina superior izquierda.
- Entra desde abajo en 0.8s con `var(--ease)` y sale igual. El contenido de cada vista entra con un leve desplazamiento hacia arriba.
- Tirador de 40×4px arriba. Se cierra con el tirador, con el cerrar, tocando el velo, con Escape o arrastrando hacia abajo más de 96px.
- Header: icono de 24px y título Urbanist 1.25rem, peso 600. El cerrar es circular, transparente, y en hover se vuelve fantasma (`var(--hover)`).
- Se dibuja en un portal sobre `body`, para que el Saiba no la recorte. El modal de paro queda encima de la hoja.

### Vistas

| Vista | Título | Contenido |
| --- | --- | --- |
| Sala | Mapa de sección | El inicio: el mapa de la sala, con la hoja cerrada. |
| Paros | Prioridad de Atención | «En espera» con las tarjetas de las máquinas detenidas y luego «Funcionando» como cuadros de 5 columnas con solo el número, borde verde `#10b981` y fondo verde translúcido `rgba(16, 185, 129, 0.2)`, el mismo del icono de máquina en funcionamiento. |
| Activas | Activas | «Activas» primero y luego «Detenidas». La tarjeta activa no lleva «Operando»: solo el número y dos cápsulas de 16px, peso 600 (hora de arranque y cuánto lleva activa). El arranque es el último fin de paro de esa máquina en el turno; si no paró, el inicio del turno. |
| Historial | Historial de Paros | Todos los paros, del más reciente al más antiguo, sin secciones. |
| Eficiencia (botón central) | Eficiencia | «Motivos» con el conteo por motivo y, debajo, el reloj del turno. En móvil estos dos componentes salen del mapa y viven solo aquí. |

Las etiquetas de sección son el caption de `UI.md`, sin mayúsculas forzadas, con el contador a la derecha.

Cuando una máquina cambia de sección (arranca o se detiene), viaja a su nuevo lugar en 0.8s con la curva de la app; las demás se reacomodan con el mismo movimiento. Mientras el modal de paro está abierto la lista no cambia: el movimiento ocurre al cerrarse, para que se vea.

### Barra inferior

Sigue la tab bar de un teléfono (guía `mobile-bottom-nav-design`) con el cristal líquido de la app.

- Flota abajo, 64px de alto (`--tabbar-alto`), radio completo, padding 5px. Queda centrada, con 12px de margen a cada lado, esté la hoja abierta o cerrada.
- Nunca pisa el indicador de inicio: su base es `--tabbar-base`, la zona segura inferior más 6px, con un mínimo de 12px.
- Cuatro botones iguales, de izquierda a derecha: Sala (icono del mapa de sección), Paros, Activas e Historial. Icono de 24px, etiqueta de 11px en una línea y área táctil de al menos 44px.
- Activo, con tres cambios a la vez: pastilla de vidrio detrás, icono con trazo más grueso (de 1.75 a 2.5) y etiqueta en peso 600. Inactivos con opacidad 0.6 en claro y 0.55 en oscuro.
- Paros lleva una burbuja roja arriba a la derecha del icono con el número de máquinas detenidas en la sala. Es Alerta 1, texto blanco de 10px, 18px de alto, con un aro fino del color de la barra para separarla del icono. Pasa de 99 a «99+». Sin paros, no aparece. Entra en 0.8s de escala 0.6 a 1 y no se atenúa con el botón inactivo.
- La pastilla se desplaza de un botón a otro en 0.8s. Es un grupo `btn-slide`: no lleva el efecto de pulsación del botón.
- Sala está activa mientras no hay hoja abierta, así que la pastilla siempre se ve. Tocar Paros, Activas o Historial abre la hoja en esa vista; tocar Sala o la vista activa la cierra y vuelve al mapa.
- Si el perfil ve estadística, el centro lleva el botón de eficiencia: Sala y Paros a la izquierda, Activas e Historial a la derecha, y un hueco en medio del mismo ancho que un botón.
  - Círculo de 60px que asoma sobre la barra (su centro queda 4px por encima del borde superior). La barra se recorta con una muesca de 37px de radio alrededor del botón, y el canto de la muesca lleva la misma línea de luz del vidrio.
  - Usa la misma lógica de color que la píldora de turno de la cabecera (`.avance-turno`): la parte vacía es el verde de máquina (`--machine-bg-op`: `#14532d` en oscuro, `#86efac` en claro) y el relleno, plano, es `#10b981` hasta el porcentaje de eficiencia del turno; sube en 0.8s. Bajo el umbral, la parte vacía es rojo al 20 % y el relleno `#ff0000`. Aro fino y halo del color del relleno.
  - El porcentaje va en Urbanist 1rem, peso 700, cifras tabulares: blanco en oscuro y color del texto en claro, como la píldora. Fuera de turno dice «—», el fondo es vidrio transparente con borde de línea y no hay relleno.
  - Tocarlo abre la hoja Eficiencia; tocarlo otra vez la cierra. Abierto, el aro se engrosa y la pastilla de las pestañas se oculta. Al pulsar se reduce a escala 0.94.
  - Al tocarlo salta como una gota durante 0.5s (es la única animación que no dura 0.8s, a propósito): se aplasta, se estira 16px hacia arriba (más angosta y alta, con la punta más redonda arriba), rebota al caer y vuelve a su sitio. Se ancla en la base.
  - Cada 2 segundos un destello láser da una vuelta al aro: un arco del color del relleno que termina en blanco, 3px de grosor sobre un círculo de 70px, con un brillo del mismo color. Gira en 0.8s, se apaga y espera el siguiente ciclo. Fuera de turno no hay destello; con movimiento reducido tampoco.
  - Sin estadística no hay botón central ni hueco, y Motivos con el reloj siguen debajo del mapa.

### Cabecera en móvil

- A la derecha van la campana y los tres puntos. Los tres puntos ocupan el lugar del engranaje de la sala.
- Los tres puntos abren el menú de usuario debajo, alineado a la derecha: nombre, correo, perfil, Ficha personal, Configuración (solo en la sala y si el perfil puede editarla), Modo y Cerrar sesión.
- El menú entra desde arriba en 0.8s y el submenú Modo se abre hacia abajo, dentro de la pantalla.
- En tablet y escritorio la cabecera no cambia: el engranaje sigue a la derecha de la campana.

#### Sombra de la barra

- Detrás de la barra hay un velo en degradé con desenfoque de 14px (`.hoja-nav-sombra`): cubre todo el ancho desde el borde inferior hasta 56px por encima de la reserva, con el color del fondo (frío `#e7edf4` en claro, `#050505` en oscuro) al 96 % abajo, 86 % a la mitad y transparente arriba. El contenido se funde antes de llegar a la barra.
- La barra suma una sombra hacia arriba (24–28px) y otra amplia hacia abajo, más densas en oscuro.

#### Cristal líquido de la barra

- Fondo translúcido (blanco al 55 % en claro, gris al 55 % en oscuro) con desenfoque de 24px y saturación: el contenido se ve pasar por debajo.
- Borde de 1px en degradado que se ilumina desde la esquina superior izquierda y vuelve a brillar abajo a la derecha.
- Reflejo suave arriba a la izquierda, línea de luz interior en el borde superior y sombra amplia debajo.
- La pastilla activa es también vidrio: fondo tenue con su propia línea de luz arriba.

## Tarjeta de máquina en la hoja

- 80px de alto, radio 14px. Columnas: número (44px, con divisor) y contenido, separadas 14px.
- Jerarquía para leer de un vistazo en el teléfono, solo en móvil (escritorio no cambia):
  - Número: Urbanist 1.375rem (22px), peso 700, cifras tabulares, sin atenuar. Es lo primero que se busca.
  - Motivo: 1rem (16px), peso 600, interlineado 1.25. «Operando» va atenuado al 60 %.
  - Cápsulas: 0.8125rem (13px), peso 500, cifras tabulares, separadas 8px. La hora queda en gris; la duración va en el color del texto y peso 600, porque es el dato que urge.
  - Etiquetas de sección: 0.8125rem, peso 500; el contador en 600.
  - Cuadros de «Funcionando»: Urbanist 1.25rem (20px), peso 700.
- Al pulsar se reduce a escala 0.98.

| Estado | Primera cápsula | Segunda cápsula | Derecha | Fondo |
| --- | --- | --- | --- | --- |
| Detenido | Reloj y hora de inicio | Medidor girando y duración en curso | Cuadrado Alerta 1 | Propio, con un toque de Alerta 1 |
| Activo | Flecha verde y hora de arranque | Medidor verde y duración en negrita | Círculo verde | Blanco en claro, fantasma en oscuro |
| Atendido | Reloj y hora de inicio | Check verde y duración total en negrita | Círculo verde relleno | Igual que activo |

La tarjeta detenida lleva fondo propio más opaco para que el cristal no la tiña con el verde del mapa que queda detrás: un paro siempre se lee rojo. El rojo es Alerta 1 (`--color-alert-1`), nunca `#ff0000`.

## Comprobar

Cada cambio de interfaz se revisa a 360px, 390px, 768px y más de 1024px, en claro y en oscuro. En móvil, la lista pasa por debajo de la barra y la última tarjeta queda visible al terminar el desplazamiento.

# Correos de invitación y proveedores de modelos

## Invitaciones actuales

SmartView genera enlaces para compartir, con vigencia de siete días. No se ha activado envío automático de correo. Configuración y el estado vacío de Mensajes usan el mismo formulario.

## Enviar correos con Firebase

Firebase no sustituye al proveedor de entrega. Su extensión Trigger Email conecta una colección de Firestore con un servidor SMTP. Requiere SMTP, remitente y un proyecto con facturación habilitada para las extensiones. El consumo de Functions, Firestore y otros recursos puede generar cargos, además del proveedor de correo.

Las invitaciones personalizadas pueden tener asunto, HTML, texto y variables editables. Trigger Email admite plantillas Handlebars almacenadas en Firestore. Son distintas de las plantillas de autenticación para recuperar contraseña o verificar correo.

Pasos:

1. Verificar un dominio y configurar los registros DNS indicados por el proveedor de correo.
2. Elegir remitente, por ejemplo `invitaciones@tu-dominio.com`.
3. Guardar las credenciales SMTP como secretos del backend.
4. Instalar Trigger Email y configurar su colección y servidor SMTP, o llamar directamente a la API del proveedor desde una función de Firebase.
5. Preparar una plantilla con nombre, planta, perfil, enlace y vencimiento.
6. Permitir que solo el backend autorizado genere los envíos, con límites y registro de entrega. Probar primero con un destinatario controlado.

[Documentación de Trigger Email y plantillas](https://firebase.google.com/docs/extensions/official/firestore-send-email).

## Flujo de invitaciones implementado

SmartView utiliza `sendSignInLinkToEmail` de Firebase Authentication: Google envía un correo de acceso con la plantilla estándar de Firebase en español. No se usa Resend ni SMTP propio en este flujo. Al abrir el enlace, el destinatario ve la planta, el invitador y el perfil, confirma su correo dos veces y Firebase autentica el enlace antes de que el backend añada su membresía. Una sesión guardada permite volver a entrar; si cierra sesión, puede solicitar otro enlace desde Entrar.

Configuración del proyecto comprobada: acceso por enlace habilitado y `main.da3cm3kazy3vu.amplifyapp.com` añadido a los dominios autorizados, conservando los dominios previos. Remitente y opciones disponibles de la plantilla se revisan en Firebase Console → Authentication → Templates. La plantilla estándar tiene personalización limitada. Para un diseño HTML propio con remitente de marca, planta e invitador dentro del correo, se necesita generar el enlace en backend y enviarlo mediante Resend u otro proveedor.

La pantalla confirma que Firebase aceptó el envío; eso no confirma entrega en la bandeja de entrada. Si falla, conserva la invitación y permite reintentar sin crear otra. La recepción y aceptación en una bandeja real requieren un correo de prueba autorizado.

Los límites oficiales de envío por enlace son 5 correos diarios en Spark y 25.000 en Blaze; no deben confundirse con la cuota de generación de enlaces. Blaze requiere facturación y puede tener otros cargos por servicios utilizados. [Límites de Firebase Authentication](https://firebase.google.com/docs/auth/limits), [acceso por enlace](https://firebase.google.com/docs/auth/web/email-link-auth), [plantillas y proveedores propios](https://firebase.google.com/docs/auth/admin/email-action-links).

## Resend

Recomiendo integrar su API desde Firebase Functions para esta aplicación: permite controlar el diseño de la invitación en el código y evita agregar una colección de correo solo para usar SMTP. También ofrece SMTP si se prefiere Trigger Email.

Según la tarifa consultada el 11 de octubre de 2026, el plan gratuito permite 3.000 correos al mes, con límite de 100 diarios. Pro cuesta USD 20 al mes para 50.000. Los posibles cargos de Firebase se calculan aparte. [Tarifas de Resend](https://resend.com/pricing).

Para conectarlo faltan una cuenta del proveedor, dominio verificado, remitente y clave API. La clave debe guardarse en Secret Manager, nunca en React, GitHub ni la configuración pública del navegador. La plantilla será modificable en el repositorio; un editor dentro de SmartView sería una función adicional.

## Codex con créditos de Claude o Gemini

Una clave de Claude o Gemini no transfiere sus créditos a la cuenta de Codex. La documentación de Codex permite proveedores personalizados mediante un endpoint compatible. No establece que pegar cualquiera de esas claves nativas habilite sus modelos directamente en esta instalación.

La vía documentada para configurar un proveedor es el CLI. Para usar un servicio con otro protocolo hace falta un gateway que adapte las solicitudes; si quieres consumir tus créditos existentes, ese gateway debe admitir tus propias claves del proveedor (BYOK). Un gateway que te cobre con su propia cuenta no consumirá necesariamente tus créditos de Claude o Gemini.

Pasos para un gateway compatible:

1. Confirmar que admite el protocolo que usa tu versión de Codex, herramientas y streaming; para el ejemplo siguiente, Responses API. Confirmar también BYOK y el identificador exacto del modelo.
2. Configurar la clave de Claude o Gemini en ese gateway conforme a sus instrucciones. No guardar la clave en el repositorio.
3. Crear una variable de entorno `MODEL_GATEWAY_API_KEY` con la credencial del gateway, en la terminal desde la que iniciarás Codex.
4. Agregar lo siguiente a `%USERPROFILE%\.codex\config.toml`, conservando las otras preferencias:

```toml
model_provider = "mi_gateway"
model = "IDENTIFICADOR_DEL_MODELO_EN_EL_GATEWAY"

[model_providers.mi_gateway]
name = "Mi gateway"
base_url = "https://TU_GATEWAY/v1"
env_key = "MODEL_GATEWAY_API_KEY"
wire_api = "responses"
```

5. Abrir Codex CLI desde esa terminal y probar una consulta pequeña. Comprobar en el proveedor el consumo y que las herramientas funcionan antes de usarlo para modificar código.

Este ejemplo es una configuración condicional, no una conexión verificada a Claude o Gemini. La disponibilidad en la aplicación de escritorio depende de su versión y configuración; no se ha cambiado tu proveedor actual.

[Configuración oficial de proveedores y gateways](https://developers.openai.com/codex/config-advanced).

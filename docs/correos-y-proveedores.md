# Correos de invitación y proveedores de modelos

## Invitaciones y correos de SmartView

Los correos de invitación, recuperación de contraseña y acceso por enlace se envían desde funciones de Firebase mediante Resend. Firebase Authentication conserva las cuentas y genera los enlaces seguros; Resend entrega el HTML y el texto personalizados. La clave RESEND_API_KEY se guarda en Firebase Secret Manager y solo la utilizan las funciones de correo.

Remitente: SmartView <invitaciones@isagi.cloud>. Respuestas: isagionline@gmail.com. El dominio isagi.cloud está verificado en Resend. La plantilla corporativa clara está en functions/email-service.js; se pueden cambiar texto, colores, marca y detalles allí. Las variables de usuarios y plantas se escapan antes de insertarlas en HTML.

Al invitar se elige Enviar correo personalizado o Generar código para copiar. Ambas opciones utilizan la misma invitación, con un destinatario, rol, salas y caducidad de siete días. El código se pega en /aceptar-invitacion. Una cuenta existente inicia sesión y conserva sus credenciales y membresías. Una cuenta nueva crea y confirma su contraseña usando el correo de la invitación. El backend vuelve a validar identidad, vigencia y permisos del invitador al aceptar.

La confirmación de envío significa que Resend aceptó el correo; no garantiza recepción en la bandeja. Los envíos de una invitación usan una clave de idempotencia para que un reintento no duplique el correo. Recuperación y acceso por enlace tienen límites de frecuencia y no revelan si un correo existe.

La recuperación se solicita en /recuperar-contrasena y se completa en /restablecer-contrasena usando el código firmado por Firebase. Cambia la contraseña de la cuenta en todas sus plantas. El flujo mantiene una confirmación de contraseña y valida el enlace antes de aceptar el cambio.

[Enlaces de Firebase y correo personalizado](https://firebase.google.com/docs/auth/admin/email-action-links), [envíos de Resend](https://resend.com/docs/api-reference/emails/send-email).
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

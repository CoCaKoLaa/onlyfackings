# ONLYFACKINGS — prototipo con registro conectado

Este repositorio mantiene la web estática y añade un Worker de Cloudflare con registro, verificación por correo, inicio/cierre de sesión y rol de administrador asignado solo al correo configurado después de verificarlo.

## Estado actual

- Estamos haciendo todo lo posible y rapidamente para que OF funcione en breve!! porfavor tengan paciencia. 
- El registro y la sesión requieren configurar Cloudflare D1 y Cloudflare Email Service y dominio emisor verificado.
- El primer rol `admin` solo se asigna al correo `ADMIN_EMAIL` cuando completa la verificación de correo.
- Suscripciones, cobros, pagos a creadores, cargas multimedia, verificación legal de identidad/edad, moderación, soporte y recuperación de contraseña aún no están conectados.
- No publiques ni aceptes pagos hasta completar los requisitos del proveedor de pagos y la revisión legal/comercial.

## Preparar Cloudflare D1

1. En Cloudflare Dashboard, abre **Workers & Pages → D1 SQL Database** y crea `onlyfackings-production`.
2. Copia el identificador de la base de datos y reemplaza `CREATE_D1_DATABASE_AND_REPLACE_THIS` en `wrangler.jsonc`.
3. En D1 abre **Console**, pega el contenido de `schema.sql` y ejecútalo para crear las tablas; alternativamente, usa `npx wrangler d1 execute onlyfackings-production --remote --file=schema.sql`.
4. No guardes en Git contraseñas, claves API ni tokens.

## Preparar verificación de correo

1. En Cloudflare, abre **Compute → Email Service → Email Sending** y activa el dominio `onlyfackings.com`. Revisa los registros DNS de SPF, DKIM y DMARC que indique Cloudflare.
2. Usa `cuentas@onlyfackings.com` como remitente verificado o cambia `EMAIL_FROM` en `wrangler.jsonc`.
3. El Worker ya declara el binding `EMAIL`. Para una prueba gratuita, Cloudflare limita los destinatarios a direcciones que hayas verificado en tu cuenta. En ese modo, verifica `sugarbot8@gmail.com` como destino. Para que el público se registre desde cualquier correo, la documentación actual indica que se requiere Workers Paid.
4. Confirma `ADMIN_EMAIL` = `sugarbot8@gmail.com` y `PUBLIC_BASE_URL` = `https://onlyfackings.com`.
5. Despliega el Worker. En la web, usa **Crear cuenta** con ese correo y tu propia contraseña; confirma el email recibido. Solo entonces el sistema asignará el rol de administrador. Entra en `/admin.html`.
## Cookies

La barra guarda la elección en el almacenamiento local del navegador. No hay analítica conectada. La cookie de sesión estrictamente necesaria se crea al iniciar sesión. Antes de añadir analítica, publicidad u otros rastreadores, documenta cada proveedor y no lo cargues antes del consentimiento correspondiente. La página `/cookies.html` debe reflejar la configuración real antes de publicación.

## Pagos y contenidos

El endpoint de suscripciones responde deshabilitado hasta que se integre un procesador aprobado. No conectes Stripe para contenido sexualmente explícito. Para contenido adulto no explícito, presenta a Segpay y CCBill una descripción precisa (contenido, países, suscripciones, pagos a creadores y moderación) y obtén aceptación escrita antes de integrar. La categoría “no explícito” no garantiza aprobación automática.

GitHub es para el código fuente, no para archivos privados de clientes. Para una prueba de medios, prepara un bucket R2 privado y autoriza acceso mediante Worker y enlaces temporales; R2 tiene cuota gratuita inicial y puede cobrar el exceso.

Consulta `PREPARACION-PAGOS.md`. No pongas logos de redes de tarjetas ni afirmes “licencia” o certificaciones de pago sin autorización real.

## Antes de abrir el registro públicamente

- Configura reglas de límite de solicitudes o desafío anti-bot para /api/register, /api/login y /api/verify en Cloudflare.
- El hash de contraseña usa PBKDF2. El plan Workers Free limita cada solicitud a 10 ms de CPU y Cloudflare indica que tareas típicas de autenticación pueden consumir 10–20 ms; para un servicio estable probablemente hará falta Workers Paid o cambiar a un proveedor de autenticación gestionado. Consulta los límites y observa CPU en los primeros despliegues.
- Añade MFA para la cuenta de administración antes de guardar datos de usuarios reales.
- No abras registro/cobros mientras las páginas legales sigan con campos [COMPLETAR] y no exista un canal de soporte y denuncias atendido.

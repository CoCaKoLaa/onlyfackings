# Preparación antes de solicitar un proveedor de pagos

Esta lista se basa en los requisitos que publica Segpay para webs adultas. La aceptación final depende del proveedor, el adquirente, la entidad titular y los países objetivo.

## Antes de presentar la solicitud

- [ ] Registrar la empresa y reunir prueba de domicilio y titularidad del dominio.
- [ ] Definir países de operación, contenido permitido, previsión de ventas y modelo de pagos a creadores.
- [ ] Publicar los datos legales reales del comerciante y un correo de soporte atendido.
- [ ] Completar condiciones de uso, política de privacidad, precios, renovación, cancelación y reembolsos.
- [ ] Crear canal accesible de denuncias y retirada urgente, incluida solicitud de retirada por personas representadas.
- [ ] Verificar identidad y mayoría de edad de creadores y de todas las personas que aparezcan; conservar consentimiento documentado.
- [ ] Revisar cada publicación antes de hacerla pública y bloquear contenido ilegal o no consentido.
- [ ] Proporcionar al proveedor credenciales de revisión separadas y seguras cuando las solicite; nunca subirlas al repositorio.
- [ ] Implementar controles de edad apropiados para los mercados donde se ofrecerá el servicio. El botón actual es una autodeclaración, no una verificación.
- [ ] No mostrar logos ni afirmar certificaciones de Visa, Mastercard o Google Pay hasta que el procesador confirme que están habilitados.

## Decisión de pagos

Solicitar evaluación comercial a Segpay y CCBill para el caso exacto: plataforma de creadores con posible contenido adulto, suscripciones recurrentes y pagos a terceros. Pedir aprobación escrita del modelo de plataforma y los pagos a creadores antes de programar su integración. Stripe indica que no admite material sexualmente explícito.

## Almacenamiento de pruebas

Usar Cloudflare R2 privado para archivos subidos por usuarios y servirlos mediante enlaces temporales después de comprobar permisos. Tiene uso mensual gratuito incluido para empezar, pero el exceso se factura. No usar GitHub para fotos o vídeos de clientes: un repositorio no es almacenamiento privado de medios ni control de acceso para suscriptores. El plan gratuito de D1 puede servir para una prueba limitada de perfiles y suscripciones, no como promesa de coste cero en producción.

## Estado de este proyecto

La web del ZIP sigue siendo una maqueta. El aviso de cookies añadido solo registra la elección local y no carga una herramienta de analítica. Registro, verificación, pagos, subida de archivos, soporte y panel de administración aún requieren backend, cuentas de proveedor, credenciales y datos legales reales.

- [ ] Publicar páginas legales completas con nombre legal del comerciante, domicilio, jurisdicción, datos de contacto, precio final, periodicidad, renovación automática, cancelación y reembolsos.
- [ ] Añadir declaración 18 U.S.C. § 2257 solo si corresponde a la naturaleza del contenido o lo exige el procesador/mercado; confirmar aplicabilidad con asesoría legal.
- [ ] Sustituir la autodeclaración de edad por el mecanismo de comprobación que exija cada mercado y el proveedor adquirente.
- [ ] Definir los territorios disponibles y bloquear los que no estén revisados/aprobados; no anunciar cobertura mundial por defecto.


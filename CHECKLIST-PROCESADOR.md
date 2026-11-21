# Checklist para el procesador de pagos (Verotel, Segpay, CCBill…)

Cada procesador tiene su propio proceso y decide caso por caso. Esta lista recoge lo que suelen pedir. Ninguna lista garantiza la aprobación.

## 1. Empresa (lo que más tarda)
- [ ] Sociedad constituida (SL o similar) o, como mínimo, autónomo dado de alta con actividad correcta. Pregunta al procesador qué admite.
- [ ] NIF/CIF, escritura o alta, y datos de los administradores.
- [ ] Cuenta bancaria a nombre de la empresa (IBAN).
- [ ] Documento de identidad de los representantes y, a veces, prueba de domicilio.
- [ ] Alta fiscal correcta y asesor para IVA e IRPF de creadores.

## 2. Web (ya cubierto por los archivos entregados)
- [x] Puerta de mayoría de edad y etiquetas de contenido adulto (RTA).
- [x] Términos, privacidad, cookies, contacto.
- [x] Cancelaciones y reembolsos (`reembolsos.html`).
- [x] Retirada de contenido y denuncias (`retirada-contenido.html`).
- [x] Verificación de edad y registros (`verificacion-edad.html`).
- [ ] **Rellenar `[RAZÓN SOCIAL]`, `[NIF/CIF]` y `[DIRECCIÓN POSTAL]`** en todas las páginas (se ven en naranja). Sin datos reales, la solicitud se rechaza.
- [ ] Certificado HTTPS activo (Cloudflare ya lo da).
- [ ] Precios claros, con impuestos y periodicidad, visibles antes de pagar.
- [ ] Descriptor de cargo acordado con el procesador y mostrado al comprar.
- [ ] Web real y funcional: sin perfiles ficticios ni páginas "en construcción" vacías.

## 3. Creadores e intérpretes
- [ ] Verificación de identidad con proveedor (Veriff, Onfido, Stripe Identity…) y conexión de `createProviderSession()` en `compliance.js`.
- [ ] Contrato de creador y **consentimiento firmado** de cualquier otra persona que aparezca.
- [ ] Copia del documento de identidad conservada por el proveedor y acceso para auditorías del procesador.
- [ ] Declaración de titularidad de derechos por parte del creador.

## 4. Moderación y contenido
- [x] Normas con lista de contenido prohibido.
- [x] Sistema de denuncias y panel de revisión (`compliance.js` + `admin.html`).
- [ ] Persona responsable de revisar denuncias y plazos reales (72 h, urgentes inmediato).
- [ ] Protocolo escrito de comunicación a autoridades (material de abuso sexual infantil).
- [ ] Revisión de contenido antes de publicar o muestreo periódico.

## 5. Seguridad
- [x] Administrador con contraseña hash, sesión HttpOnly, límite de intentos y registro de acciones.
- [ ] Activar 2FA para el administrador (siguiente mejora recomendada).
- [ ] Copias de seguridad de la base de datos.
- [ ] Plan para brechas de datos (aviso a la AEPD en 72 h).

## 6. Legal (consulta a un abogado)
- [ ] Revisión de términos, privacidad y política de reembolsos.
- [ ] Registro de actividades de tratamiento (RGPD) y evaluación de impacto, por tratar datos sensibles.
- [ ] Marca: "Onlyfackings" se parece a "OnlyFans" y puede generar conflicto.
- [ ] Obligaciones de la DSA (punto de contacto, mecanismo de notificación y motivación).

## 7. Antes de solicitar el alta
1. Rellena los datos de empresa en las páginas.
2. Activa la verificación de identidad real.
3. Ten el contrato de creador redactado.
4. Solicita el alta a 2 o 3 procesadores en paralelo y compara comisiones, retenciones, plazos de pago y condiciones de contracargo.

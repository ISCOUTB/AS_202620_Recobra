# Aspectos del proyecto Recobra

## Tabla de aspectos arquitectónicos

| Aspecto | Decisión | Justificación | Pruebas |
|---------|----------|---------------|---------|
| **Seguridad en la entrega de objetos** | Para reclamar un objeto, el sistema solicitará al usuario que verifique su identidad mediante el código estudiantil, correo institucional o carné universitario. La información sensible se almacenará de forma protegida y solo se usará para el proceso de recuperación. | Evita que personas no autorizadas reclamen objetos que no les pertenecen (fraude). Genera confianza en los usuarios que publican objetos encontrados, al saber que solo el dueño legítimo podrá recuperarlos. Protege los datos personales de los usuarios, cumpliendo con las restricciones de privacidad del proyecto. | **Prueba de integración**: Se verificará que el flujo de reclamación requiera y valide correctamente los datos de identificación (código/correo/carné). **Prueba de seguridad**: Se comprobará que la información sensible no se expone en respuestas de la API ni en logs. **Prueba de aceptación**: Se simularán intentos de reclamación fraudulenta para confirmar que el sistema los bloquea. |

# Violaciones detectadas y plan de corrección - Recobra

## Lista de violaciones

| ID | Violación | Severidad | Evidencia en el código |
|----|-----------|-----------|------------------------|
| **V1** | **Falta de módulo de autenticación/usuarios** | Alta | No existe `AuthModule` ni entidad `Usuario`. La seguridad mencionada en `aspectos.md` no está implementada. |
| **V2** | **Persistencia volátil (en memoria)** | Media | `MemoriaPublicacionRepository` usa un `Map<string, Publicacion>`. Los datos se pierden al reiniciar el servidor. |
| **V3** | **Falta de trazabilidad de estados** | Media | La entidad `Publicacion` tiene `estado` fijo `'publicado'` (ver `publicacion.ts`), sin métodos para cambiarlo a `'en contacto'`, `'reclamado'` o `'cerrado'`. |
| **V4** | **No hay pruebas de integración (e2e)** | Media | Solo existen pruebas unitarias (`publicaciones.spec.ts`, `crear-publicacion.spec.ts`, `consultar-publicacion.spec.ts`). No se prueba el flujo completo HTTP. |
| **V5** | **DTO sin validación de entrada** | Baja | `CrearPublicacionDto` es una interfaz sin `class-validator`. La validación vive en el dominio (correcto), pero el controlador podría recibir datos malformados antes de llegar al caso de uso. |

---

## Plan de corrección

| ID | Acción concreta | Prioridad | Plazo |
|----|-----------------|-----------|-------|
| **V1** | 1. Crear `AuthModule` con entidad `Usuario`. <br> 2. Implementar registro y login con JWT. <br> 3. Proteger los endpoints de publicaciones con un guard. | **Alta** | Semana 1 |
| **V2** | 1. Mantener `MemoriaPublicacionRepository` para desarrollo. <br> 2. Crear un adaptador con TypeORM/Prisma para PostgreSQL. <br> 3. Cambiar solo la línea de `useClass` en `PublicacionesModule` (gracias al puerto). | **Alta** | Semana 1-2 |
| **V3** | 1. Agregar métodos a `Publicacion`: `marcarEnContacto()`, `marcarReclamado()`, `marcarCerrado()`. <br> 2. Validar transiciones (ej. no volver a `'publicado'` desde `'reclamado'`). | **Media** | Semana 2 |
| **V4** | 1. Agregar pruebas e2e con `@nestjs/testing` y `supertest`. <br> 2. Probar `POST /publicaciones` y `GET /publicaciones/:id`. | **Media** | Semana 2 |
| **V5** | 1. (Opcional) Agregar `class-validator` al DTO como primera línea de defensa. <br> 2. Mantener la validación en el dominio como respaldo. | **Baja** | Semana 3 |

---

## Notas sobre las correcciones

- **V2 es fácil de corregir gracias a tu arquitectura hexagonal**: el puerto `PublicacionRepository` ya está definido, así que cambiar de memoria a PostgreSQL solo requiere implementar un nuevo adaptador y cambiar una línea en el módulo. Esto es un **beneficio directo de tu diseño**.
- **V3 es importante para la trazabilidad**: la funcionalidad de "reclamar un objeto" depende de que el estado pueda cambiar.
- **V1 es crítica para la seguridad**: sin autenticación, cualquiera puede publicar o consultar, lo cual contradice el aspecto de seguridad documentado en `aspectos.md`.
- **V4 se puede mitigar rápido**: con `@nestjs/testing` y `supertest` se pueden agregar pruebas e2e en pocas líneas.

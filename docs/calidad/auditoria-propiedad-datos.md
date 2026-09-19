# Auditoría de propiedad de datos (S6)

Recorrido de búsqueda de escrituras en el código, contra la tabla de `docs/modulo-datos.md`.

| Entidad | Dueño esperado | Dónde se escribe en el código hoy | ¿Conforme? |
|---|---|---|---|
| **Publicacion** | Publicaciones | `src/infrastructure/persistence/memoria-publicacion.repository.ts` (único lugar que escribe: `this.publicaciones.set(...)`), invocado solo desde `src/application/use-cases/crear-publicacion.ts` | **Sí** — un único dueño, ningún otro módulo escribe esta entidad |
| **Coincidencia** | Emparejamiento | No implementado todavía | No aplica |
| **Notificacion** | Notificaciones | No implementado todavía | No aplica |
| **Usuario** | Identidad | No implementado todavía | No aplica |
| **Reclamacion** | Reclamaciones | No implementado todavía | No aplica |

## Evidencia de la búsqueda

Búsqueda realizada sobre todo `src/`:

```bash
grep -rn ".set(\|.save(\|.guardar(\|repository\." src/
```

Único resultado con escritura real:

```text
memoria-publicacion.repository.ts:10
```

# C4 — Recobra

Reemplaza `docs/C4.md` (texto plano) por diagramas como código. GitHub
renderiza Mermaid automáticamente en la vista del `.md`. Ajusta actores,
sistemas y flechas a la realidad del proyecto; esto es un punto de partida
con leyenda y flechas etiquetadas, tal como pide la retroalimentación.

## Nivel 1 — Diagrama de contexto

```mermaid
C4Context
    title Diagrama de contexto — Recobra

    Person(usuario, "Usuario del campus", "Pierde o encuentra un objeto")
    Person(admin, "Administrador", "Modera publicaciones y reclamos")

    System(recobra, "Recobra", "Centraliza, empareja y notifica objetos perdidos/encontrados")

    System_Ext(notificaciones, "Proveedor de notificaciones", "Envío de correo/push")
    System_Ext(auth, "Proveedor de autenticación", "Verifica identidad institucional")

    Rel(usuario, recobra, "Publica objetos perdidos/encontrados, consulta coincidencias", "HTTPS")
    Rel(admin, recobra, "Modera publicaciones, resuelve reclamos disputados", "HTTPS")
    Rel(recobra, notificaciones, "Envía alerta de coincidencia probable", "API/HTTPS")
    Rel(recobra, auth, "Valida credenciales del usuario", "API/HTTPS")
```

## Nivel 2 — Diagrama de contenedores

```mermaid
C4Container
    title Diagrama de contenedores — Recobra

    Person(usuario, "Usuario del campus")

    System_Boundary(recobra, "Recobra") {
        Container(api, "API backend", "Node.js / Express", "Expone REST, aplica reglas de emparejamiento")
        Container(app, "App cliente", "Flutter", "Publicar, buscar y ver coincidencias")
        ContainerDb(db, "Base de datos", "PostgreSQL", "Publicaciones, usuarios, emparejamientos")
    }

    System_Ext(notificaciones, "Proveedor de notificaciones")

    Rel(usuario, app, "Usa", "UI")
    Rel(app, api, "Llama", "HTTPS/JSON")
    Rel(api, db, "Lee/escribe", "SQL")
    Rel(api, notificaciones, "Solicita envío de alerta", "API/HTTPS")
```

> Ajusten actores, sistemas externos y verbos de las flechas a lo que
> realmente hace su MVP; lo importante es que quede como código versionable
> (Mermaid), con leyenda de qué representa cada rectángulo y flechas
> etiquetadas con el protocolo/acción, no como texto narrativo.

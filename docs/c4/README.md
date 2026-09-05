# C4 - Recobra

## Nivel 1 — Diagrama de contexto

```mermaid
flowchart LR
    usuario["Usuario del campus<br/><i>Persona</i><br/>Pierde o encuentra un objeto"]
    admin["Administrador<br/><i>Persona</i><br/>Modera publicaciones y reclamos"]
    recobra["Recobra<br/><i>Sistema de software</i><br/>Centraliza, empareja y notifica objetos perdidos/encontrados"]
    notif["Proveedor de notificaciones<br/><i>Sistema externo</i><br/>Envío de correo/push — planeado"]
    auth["Proveedor de autenticación<br/><i>Sistema externo</i><br/>Identidad institucional — planeado"]

    usuario -->|"Publica objetos, consulta coincidencias (HTTPS)"| recobra
    admin -->|"Modera publicaciones, resuelve reclamos (HTTPS)"| recobra
    recobra -->|"Envía alerta de coincidencia (API/HTTPS)"| notif
    recobra -->|"Valida credenciales del usuario (API/HTTPS)"| auth

    classDef persona fill:#08427b,color:#fff,stroke:#052e56;
    classDef sistema fill:#1168bd,color:#fff,stroke:#0b4884;
    classDef externo fill:#999999,color:#fff,stroke:#6b6b6b;

    class usuario,admin persona;
    class recobra sistema;
    class notif,auth externo;
```

**Leyenda:** azul oscuro = persona · azul = sistema Recobra · gris = sistema externo.
Las etiquetas de las flechas indican la acción y el protocolo.
Notificaciones y autenticación están en el contexto objetivo; el corte 1 aún no
los implementa en código.

## Nivel 2 — Diagrama de contenedores

Alcance **actual del corte 1** vs **objetivo**:

| Contenedor | Estado en código | Notas |
|------------|------------------|-------|
| App cliente Flutter | Implementado (mínimo) | `mobile/` — crear/consultar publicación |
| API backend NestJS | Implementado | Corte vertical crear/consultar + `/health` |
| Persistencia en memoria | Implementado (adaptador temporal) | Puerto `PublicacionRepository` |
| PostgreSQL | Planeado | Sustituye el adaptador en memoria sin tocar dominio |
| Notificaciones / Auth | Planeado | Aparecen en nivel 1; aún no son contenedores con código |

```mermaid
flowchart LR
    usuario["Usuario del campus<br/><i>Persona</i>"]
    auth["Proveedor de autenticación<br/><i>Sistema externo — planeado</i>"]
    notif["Proveedor de notificaciones<br/><i>Sistema externo — planeado</i>"]

    subgraph recobra["Recobra"]
        direction LR
        app["App cliente<br/><i>Contenedor: Flutter</i><br/>Publicar y consultar objetos"]
        api["API backend<br/><i>Contenedor: NestJS / TypeScript</i><br/>REST hexagonal — corte vertical"]
        store[("Persistencia<br/><i>Ahora: memoria</i><br/><i>Objetivo: PostgreSQL</i>")]
    end

    usuario -->|"Usa (UI)"| app
    app -->|"Llama (HTTP/JSON)"| api
    api -->|"Lee/escribe vía puerto PublicacionRepository"| store
    api -.->|"Valida identidad — planeado"| auth
    api -.->|"Alerta de coincidencia — planeado"| notif

    classDef persona fill:#08427b,color:#fff,stroke:#052e56;
    classDef contenedor fill:#438dd5,color:#fff,stroke:#2e6295;
    classDef externo fill:#999999,color:#fff,stroke:#6b6b6b;

    class usuario persona;
    class app,api,store contenedor;
    class notif,auth externo;
```

**Leyenda:** azul oscuro = persona · azul claro = contenedor · gris = externo.
Flechas discontinuas = relaciones planeadas aún no cableadas en el corte 1.
Decisiones: [ADR-0002](../adr/0002-arquitectura-y-stack.md),
[ADR-0003](../adr/0003-reto-corte1-stack-obligatorio.md).

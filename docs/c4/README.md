# C4 - Recobra

## Nivel 1 — Diagrama de contexto

```mermaid
flowchart LR
    usuario["Usuario del campus<br/><i>Persona</i><br/>Pierde o encuentra un objeto"]
    admin["Administrador<br/><i>Persona</i><br/>Modera publicaciones y reclamos"]
    recobra["Recobra<br/><i>Sistema de software</i><br/>Centraliza, empareja y notifica objetos perdidos/encontrados"]
    notif["Proveedor de notificaciones<br/><i>Sistema externo</i><br/>Envio de correo/push"]
    auth["Proveedor de autenticacion<br/><i>Sistema externo</i><br/>Verifica identidad institucional"]

    usuario -->|"Publica objetos, consulta coincidencias (HTTPS)"| recobra
    admin -->|"Modera publicaciones, resuelve reclamos (HTTPS)"| recobra
    recobra -->|"Envia alerta de coincidencia (API/HTTPS)"| notif
    recobra -->|"Valida credenciales del usuario (API/HTTPS)"| auth

    classDef persona fill:#08427b,color:#fff,stroke:#052e56;
    classDef sistema fill:#1168bd,color:#fff,stroke:#0b4884;
    classDef externo fill:#999999,color:#fff,stroke:#6b6b6b;

    class usuario,admin persona;
    class recobra sistema;
    class notif,auth externo;
```

**Leyenda:** azul oscuro = persona · azul = sistema Recobra · gris = sistema externo. Las etiquetas de las flechas indican la accion y el protocolo.

## Nivel 2 — Diagrama de contenedores

```mermaid
flowchart LR
    usuario["Usuario del campus<br/><i>Persona</i>"]

    subgraph recobra["Recobra"]
        direction LR
        app["App cliente<br/><i>Contenedor: Flutter</i><br/>Publicar, buscar, ver coincidencias"]
        api["API backend<br/><i>Contenedor: Node.js/Express</i><br/>Expone REST, aplica reglas de emparejamiento"]
        db[("Base de datos<br/><i>Contenedor: PostgreSQL</i><br/>Publicaciones, usuarios, emparejamientos")]
    end

    notif["Proveedor de notificaciones<br/><i>Sistema externo</i>"]

    usuario -->|"Usa (UI)"| app
    app -->|"Llama (HTTPS/JSON)"| api
    api -->|"Lee/escribe (SQL)"| db
    api -->|"Solicita envio de alerta (API/HTTPS)"| notif

    classDef persona fill:#08427b,color:#fff,stroke:#052e56;
    classDef contenedor fill:#438dd5,color:#fff,stroke:#2e6295;
    classDef externo fill:#999999,color:#fff,stroke:#6b6b6b;

    class usuario persona;
    class app,api,db contenedor;
    class notif externo;
```

**Leyenda:** azul oscuro = persona · azul claro = contenedor dentro de Recobra · gris = sistema externo. El cilindro representa la base de datos.

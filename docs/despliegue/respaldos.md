# Respaldos y restauración de la base de datos

Recobra guarda todo en un único PostgreSQL (9 tablas; ver
[ADR-0027](../adr/0027-la-decision-de-datos-mas-costosa-de-revertir.md)): cuentas,
sesiones, publicaciones, reclamaciones, avisos, reportes, coincidencias, **fotos**
(bytes en `BYTEA`) y la cola de eventos fallidos. Es la decisión de datos más
costosa de revertir, y también donde una pérdida no tiene vuelta atrás. Este
documento dice cómo se respalda, cómo se restaura y, sobre todo, **qué está
probado y qué no**.

## Estado, sin adornos

| | Estado |
|---|---|
| El procedimiento (respaldo → restauración en otra base → comparación tabla por tabla) | **Verificado en cada commit** por el flujo de integración (trabajo «Adaptadores contra PostgreSQL real», paso «Respaldo y restauración verificados») con `scripts/verificar-respaldo-postgres.sh` |
| Respaldo programado de la base de **producción** en Dokploy | **Pendiente: lo configura el equipo en el panel** (pasos abajo). Hasta entonces no hay copia de seguridad de producción |
| Una restauración real de un respaldo de producción | **No se ha hecho.** Lo que se probó es el procedimiento sobre una base de pruebas con datos de la suite, no una restauración de datos reales |
| Tiempo de restauración (RTO) | **No medido** con datos de producción |
| Punto de recuperación (RPO) | Lo que dure el intervalo entre respaldos: con uno diario, hasta 24 horas de datos |

## Qué demuestra la verificación y qué no

`scripts/verificar-respaldo-postgres.sh` hace lo que se haría en una emergencia:

1. **Respaldo:** `pg_dump -Fc` de la base de origen.
2. **Restauración:** crea una base nueva y le aplica el respaldo con `pg_restore`.
3. **Comparación:** para cada una de las 9 tablas compara el número de filas y una
   huella `md5` de **todo su contenido** (incluidos los bytes de las fotos y los
   JSON). Si algo difiere, o si la base de origen estaba vacía (un respaldo vacío
   no demuestra nada), el paso falla.

En CI corre con los datos que dejó la suite de los adaptadores (`test/adaptadores.e2e-spec.ts`),
que incluye una foto con los 256 valores posibles de byte y un evento con JSON
anidado, justamente para que la comparación sea significativa.

**No demuestra:** que el respaldo programado de Dokploy funcione, que el destino
de los respaldos sea accesible, ni cuánto tarda con el volumen real.

## Configurarlo en Dokploy (lo hace el equipo)

Los nombres de los botones pueden variar según la versión del panel.

1. **Destino:** en *Destinations*, agregar un almacenamiento compatible con S3
   (Cloudflare R2, Backblaze B2, el que ofrezca el laboratorio). Las llaves se
   escriben solo en el panel, nunca en el repositorio.
2. **Respaldo programado:** en el servicio PostgreSQL, pestaña *Backups*, crear uno
   diario (por ejemplo, `0 3 * * *`, de madrugada) hacia ese destino.
3. **Retención:** conservar **7 a 14 días**. No es un detalle: las copias guardan
   también lo que la aplicación ya borró (fotos de publicaciones cerradas, cuentas
   eliminadas). La retención corta limita cuánto tiempo sobreviven esos datos y es
   coherente con el derecho de supresión (ADR-0021). **Pendiente con la universidad:**
   decidir si el aviso de privacidad debe mencionar que las copias conservan los
   datos hasta ese plazo.
4. **Primer ensayo:** una vez exista el primer respaldo, hacer el ensayo de
   restauración de abajo y anotar la fecha y el tiempo que tomó.

## Restaurar (emergencia o ensayo)

Con las herramientas de PostgreSQL 16 (las mismas del servidor) y sin escribir
contraseñas en el repositorio ni en el historial del terminal (se pasan por
variables de entorno):

```bash
# 1. Bajar el respaldo del destino a un archivo local (según el destino elegido).
# 2. Ensayo: restaurar en una base NUEVA y comparar con la de producción
PGHOST=<servidor> PGUSER=<usuario> PGPASSWORD=<desde-el-panel> \
  BASE_ORIGEN=<base-de-produccion> bash scripts/verificar-respaldo-postgres.sh

# Emergencia: restaurar sobre la base que se perdió
pg_restore --clean --if-exists --no-owner -d <base> recobra-respaldo.dump
```

Después de restaurar: comprobar `GET /health/ready` (debe decir `postgres`),
entrar con una cuenta de prueba y abrir una publicación con foto. Las sesiones
posteriores al respaldo se pierden (la gente tendrá que iniciar sesión de nuevo) y
los avisos creados después se rehacen solos en parte, por la conciliación
(ADR-0024), durante 3 días.

## Lo que sigue

- Configurar el respaldo programado y hacer el primer ensayo con datos reales
  (acción del equipo).
- Medir el tiempo de restauración con el volumen real y anotarlo aquí.
- Una alerta si el respaldo programado falla (hoy dependería de lo que ofrezca
  Dokploy; no se afirma que exista).

#!/usr/bin/env bash
# Verifica que un respaldo de la base de Recobra se puede RESTAURAR y que lo
# restaurado es idéntico a lo respaldado, tabla por tabla (docs/despliegue/respaldos.md).
#
# Hace lo mismo que se haría en una emergencia:
#   1. respaldo   : pg_dump en formato personalizado de la base de origen;
#   2. restaurar  : crea una base nueva y le aplica el respaldo con pg_restore;
#   3. comparar   : para cada tabla, número de filas y una huella (md5) de todo su
#                   contenido, incluidos los bytes de las fotos y los JSON.
# Sale con código distinto de cero si algo no coincide o si no había datos que comparar
# (un respaldo de una base vacía no demuestra nada).
#
# Variables: PGHOST, PGUSER (y PGPASSWORD si la base la pide), BASE_ORIGEN.
# Opcionales: PGPORT, BASE_RESTAURADA (por omisión <origen>_restaurada), ARCHIVO.
set -euo pipefail

: "${PGHOST:?falta PGHOST}" "${PGUSER:?falta PGUSER}" "${BASE_ORIGEN:?falta BASE_ORIGEN}"
BASE_RESTAURADA="${BASE_RESTAURADA:-${BASE_ORIGEN}_restaurada}"
ARCHIVO="${ARCHIVO:-/tmp/recobra-respaldo.dump}"
TABLAS="publicaciones coincidencias cuentas sesiones reclamaciones notificaciones reportes fotos eventos_fallidos"

# "<filas> <huella>" de una tabla; el orden por texto de la fila hace la huella estable.
huella() {
  psql -d "$1" -tA -c "SELECT count(*) || ' ' || COALESCE(md5(string_agg(x::text, '|' ORDER BY x::text)), '-') FROM $2 x"
}

echo "1/3 Respaldo de ${BASE_ORIGEN} -> ${ARCHIVO}"
pg_dump -Fc -d "${BASE_ORIGEN}" -f "${ARCHIVO}"
echo "    $(du -h "${ARCHIVO}" | cut -f1) escritos"

echo "2/3 Restauración en una base nueva (${BASE_RESTAURADA})"
psql -d postgres -qc "DROP DATABASE IF EXISTS \"${BASE_RESTAURADA}\""
psql -d postgres -qc "CREATE DATABASE \"${BASE_RESTAURADA}\""
pg_restore --no-owner -d "${BASE_RESTAURADA}" "${ARCHIVO}"

echo "3/3 Comparación tabla por tabla (filas y huella del contenido)"
fallos=0
total_filas=0
for tabla in ${TABLAS}; do
  origen="$(huella "${BASE_ORIGEN}" "${tabla}")"
  restaurada="$(huella "${BASE_RESTAURADA}" "${tabla}")"
  filas="${origen%% *}"
  total_filas=$((total_filas + filas))
  if [ "${origen}" = "${restaurada}" ]; then
    printf '    OK         %-16s %s filas\n' "${tabla}" "${filas}"
  else
    printf '    DIFERENTE  %-16s origen=[%s] restaurada=[%s]\n' "${tabla}" "${origen}" "${restaurada}"
    fallos=1
  fi
done

if [ "${total_filas}" -eq 0 ]; then
  echo "ERROR: la base de origen no tiene datos; no hay nada que comparar." >&2
  exit 2
fi
if [ "${fallos}" -ne 0 ]; then
  echo "ERROR: lo restaurado no coincide con lo respaldado." >&2
  exit 1
fi
echo "Respaldo verificado: ${total_filas} filas en ${TABLAS// /, } restauradas sin diferencias."

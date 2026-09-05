# Checklist manual antes de subir (NO lo hace el agente)

El código y la documentación del corte ya están listos en el working tree.
**No se hizo push.** Ustedes suben cuando quieran.

## 1. Revisar localmente

```bash
npm test
npm run test:e2e
cd mobile && flutter test
```

## 2. Quitar `node_modules` del índice de git (si aún aparece)

Ya se ejecutó `git rm -r --cached node_modules` en esta máquina. Si en
`git status` siguen saliendo como deleted staged, es lo esperado: en el
próximo commit dejan de versionarse. El `.gitignore` ya los ignora.

Para limpiar el historial remoto (opcional, solo si el profesor lo pide):

```bash
# Solo si hace falta reescribir historial — coordinar con el equipo
git filter-repo --path node_modules --invert-paths
```

El token de Coveralls vivía dentro de `node_modules/debug/.coveralls.yml`.
Al dejar de versionar `node_modules` deja de exponerse en commits nuevos.
Si ese token era real de alguna cuenta, rótenlo en Coveralls.

## 3. Commit (cuando el equipo esté de acuerdo)

Incluyan al menos:

- Backend NestJS (`src/`, `test/`, `package.json`, tsconfigs, `nest-cli.json`)
- Cliente Flutter (`mobile/`)
- Docs (ADR-0002/0003, aspectos, C4, arc42, medicion-corte1, ia)
- CI (`.github/workflows/ci.yml`)
- `.gitignore`
- Eliminación de `node_modules` del tracking

## 4. Etiqueta `corte-1`

Después del commit que quieran calificar:

```bash
git tag corte-1
git push origin master
git push origin corte-1
```

## 5. PDF de dos páginas (Moodle)

Archivo listo en el repo (no sustituye el adjunto de Moodle; hay que subirlo allá):

`docs/entrega-corte1-moodle.pdf`

Regenerar si cambia la medición:

```bash
python scripts/generar-pdf-corte1.py
```

## 6. Evidencia de CI en verde

Tras el push, copiar la URL del run verde de Actions en la columna Evidencia
de `docs/aspectos.md` (filas A1/A2) si el algoritmo la exige explícita.

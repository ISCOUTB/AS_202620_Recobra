import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Respaldo de las decisiones de `docs/seguridad/hallazgos-dependencias.json`
 * (ADR-0030). Los avisos de `multer`, `file-type`, `@nestjs/core` (SSE) y
 * `path-to-regexp` se aceptaron porque la función afectada NO se usa en Recobra.
 * Eso solo es cierto mientras siga siendo así: esta prueba falla si el código
 * empieza a usar alguna, y obliga a revisar el hallazgo antes de seguir.
 */
function archivosTs(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivosTs(ruta);
    return ruta.endsWith('.ts') && !ruta.endsWith('.spec.ts') ? [ruta] : [];
  });
}

describe('Alcance de las dependencias con avisos aceptados (ADR-0030)', () => {
  const codigo = archivosTs(__dirname).map((ruta) => ({ ruta, texto: readFileSync(ruta, 'utf-8') }));

  const usos = (patron: RegExp) => codigo.filter((f) => patron.test(f.texto)).map((f) => f.ruta.replace(__dirname, 'src'));

  it('multer: ninguna ruta recibe archivos con multipart (la foto llega como cuerpo image/jpeg crudo)', () => {
    expect(usos(/FileInterceptor|FilesInterceptor|AnyFilesInterceptor|FileFieldsInterceptor|NoFilesInterceptor|UploadedFiles?\b|MulterModule|from ['"]multer['"]/)).toEqual([]);
  });

  it('file-type: nadie usa la validación de archivos de Nest que se apoya en esa librería', () => {
    expect(usos(/FileTypeValidator|ParseFilePipe|MaxFileSizeValidator|from ['"]file-type['"]/)).toEqual([]);
  });

  it('@nestjs/core SSE: no hay endpoints de eventos del servidor', () => {
    expect(usos(/@Sse\s*\(|MessageEvent/)).toEqual([]);
  });

  it('path-to-regexp: ninguna ruta tiene dos parámetros en un mismo segmento (por ejemplo /:a-:b)', () => {
    const rutas = codigo.flatMap((f) => [...f.texto.matchAll(/@(?:Get|Post|Put|Patch|Delete|All|Controller)\(\s*['"`]([^'"`]*)['"`]/g)].map((m) => m[1]));
    expect(rutas.length).toBeGreaterThan(20); // la búsqueda encuentra las rutas de verdad
    const peligrosas = rutas.filter((r) => r.split('/').some((segmento) => (segmento.match(/:[A-Za-z_]/g) ?? []).length > 1));
    expect(peligrosas).toEqual([]);
  });
});

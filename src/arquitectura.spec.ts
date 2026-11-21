import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

/**
 * Reglas de la arquitectura hexagonal (ADR-0001, ADR-0002), comprobadas en cada push en vez de solo
 * escritas: si alguien importa un adaptador desde el dominio o desde un caso de uso, esta prueba falla.
 *
 * - `domain/` no depende de nada fuera de `domain/`: ni de NestJS, ni de la base de datos, ni de HTTP.
 * - `application/` depende de `domain/` y de sí misma. De NestJS solo usa `@nestjs/common`
 *   (`@Injectable`, `Logger`) y `@nestjs/event-emitter` (el bus en proceso, ADR-0004/0026): decoradores
 *   de inyección y el puerto de eventos, aceptados en ADR-0002. Nunca `infrastructure/`, controladores,
 *   `pg` ni `express`.
 * - `infrastructure/` (adaptadores de salida) no depende de los adaptadores de entrada (controladores).
 *
 * Los `*.spec.ts` quedan fuera: una prueba puede armar adaptadores reales para ejercitar un caso de uso.
 */
const SRC = __dirname;

const ADAPTADORES_DE_ENTRADA = [
  'emparejamiento',
  'fotos',
  'identidad',
  'moderacion',
  'notificaciones',
  'observabilidad',
  'privacidad',
  'publicaciones',
  'raiz',
  'reclamaciones',
  'salud',
  'seguridad',
];

function archivosDe(capa: string): string[] {
  const recorrer = (carpeta: string): string[] =>
    readdirSync(carpeta, { withFileTypes: true }).flatMap((e) => {
      const ruta = join(carpeta, e.name);
      if (e.isDirectory()) return recorrer(ruta);
      return e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts') ? [ruta] : [];
    });
  return recorrer(join(SRC, capa));
}

/** Cada import del archivo: el módulo externo tal cual, o la carpeta de `src/` a la que llega uno relativo. */
function importsDe(archivo: string): { texto: string; capa: string | null; externo: string | null }[] {
  const codigo = readFileSync(archivo, 'utf8');
  return [...codigo.matchAll(/(?:from|import)\s+'([^']+)'/g)].map(([, texto]) => {
    if (!texto.startsWith('.')) return { texto, capa: null, externo: texto };
    const destino = relative(SRC, resolve(dirname(archivo), texto));
    return { texto, capa: destino.split(sep)[0], externo: null };
  });
}

function violaciones(capa: string, permitido: (i: { capa: string | null; externo: string | null }) => boolean): string[] {
  return archivosDe(capa).flatMap((archivo) =>
    importsDe(archivo)
      .filter((i) => !permitido(i))
      .map((i) => `${relative(SRC, archivo).split(sep).join('/')} importa '${i.texto}'`),
  );
}

const esNodo = (externo: string | null) => externo !== null && externo.startsWith('node:');

describe('Reglas de la arquitectura hexagonal (ADR-0002)', () => {
  it('el dominio no depende de nada fuera del dominio', () => {
    expect(violaciones('domain', (i) => i.capa === 'domain' || esNodo(i.externo))).toEqual([]);
  });

  it('la aplicación depende solo del dominio, de sí misma y de la inyección y el bus de NestJS', () => {
    const nestPermitido = new Set(['@nestjs/common', '@nestjs/event-emitter']);
    expect(
      violaciones(
        'application',
        (i) => i.capa === 'domain' || i.capa === 'application' || esNodo(i.externo) || nestPermitido.has(i.externo ?? ''),
      ),
    ).toEqual([]);
  });

  it('los adaptadores de salida no dependen de los de entrada (controladores)', () => {
    expect(violaciones('infrastructure', (i) => !ADAPTADORES_DE_ENTRADA.includes(i.capa ?? ''))).toEqual([]);
  });

  it('la lista de adaptadores de entrada coincide con las carpetas de src/', () => {
    const carpetas = readdirSync(SRC, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !['domain', 'application', 'infrastructure'].includes(e.name))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b));
    expect(carpetas).toEqual(ADAPTADORES_DE_ENTRADA);
  });
});

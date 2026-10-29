import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * El barrido de secretos (scripts/barrido-secretos.js, ADR-0030) tiene que
 * encontrar un secreto aunque ya se haya quitado del último commit: el repositorio
 * es público y el historial también lo es.
 */
describe('Barrido de secretos del historial', () => {
  let repo: string;
  const git = (...args: string[]) => {
    const r = spawnSync('git', ['-C', repo, '-c', 'user.name=Prueba', '-c', 'user.email=prueba@utb.edu.co', '-c', 'commit.gpgsign=false', ...args], { encoding: 'utf-8' });
    expect(r.status).toBe(0);
  };
  const barrer = () => spawnSync('node', [join(__dirname, '..', '..', 'scripts', 'barrido-secretos.js'), '--repo', repo], { encoding: 'utf-8' });
  const confirmar = (archivo: string, contenido: string, mensaje: string) => {
    writeFileSync(join(repo, archivo), contenido);
    git('add', '-A');
    git('commit', '-q', '-m', mensaje);
  };

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'barrido-'));
    git('init', '-q');
  });
  afterEach(() => rmSync(repo, { recursive: true, force: true }));

  it('un repositorio sin credenciales pasa, aunque tenga contraseñas de prueba y marcadores de posición', () => {
    confirmar('prueba.ts', "const contrasena = 'contrasena-segura-1';\nconst token = 'tok-123';\n// DATABASE_URL=<la-conexion-desde-el-panel>\n", 'limpio');
    const r = barrer();
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Sin credenciales');
  });

  it('encuentra un token de GitHub, una cadena de conexión y una clave privada', () => {
    // Se arman en tiempo de ejecución para que este archivo no contenga nada que parezca un secreto (lo vería el propio barrido).
    const tokenGithub = ['ghp', '_', 'a1B2c3D4e5'.repeat(4).slice(0, 36)].join('');
    const conexion = ['postgresql', '://', 'recobra:S3cretaReal99', '@db.interna:5432/recobra'].join('');
    const llave = ['-----BEGIN RSA ', 'PRIVATE KEY-----'].join('');
    confirmar('config.ts', `const t = "${tokenGithub}";
const u = "${conexion}";
`, 'agrega credenciales');
    confirmar('llave.txt', `${llave}
MIIEow
`, 'agrega llave');

    const r = barrer();

    expect(r.status).toBe(1);
    expect(r.stderr).toContain('token de GitHub');
    expect(r.stderr).toContain('cadena de conexión con contraseña');
    expect(r.stderr).toContain('clave privada');
    expect(r.stderr).toContain('rótala YA');
  });

  it('lo encuentra aunque el último commit ya lo haya quitado: el historial sigue siendo público', () => {
    const llaveApi = ['sk', '-', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('');
    confirmar('config.ts', `const llave = "${llaveApi}";
`, 'agrega');
    confirmar('config.ts', 'const llave = process.env.LLAVE;\n', 'la quita del último commit');

    const r = barrer();

    expect(r.status).toBe(1);
    expect(r.stderr).toContain('llave de API');
  });

  it('señala un archivo sensible (.env) que alguna vez se versionó, aunque se haya borrado', () => {
    confirmar('.env', 'PUERTO=3000\n', 'agrega .env');
    git('rm', '-q', '.env');
    git('commit', '-q', '-m', 'quita .env');

    const r = barrer();

    expect(r.status).toBe(1);
    expect(r.stderr).toContain('ARCHIVO SENSIBLE');
  });

  it('un .env.example no es sensible: es la plantilla sin valores', () => {
    confirmar('.env.example', 'DATABASE_URL=\n', 'plantilla');
    expect(barrer().status).toBe(0);
  });
});

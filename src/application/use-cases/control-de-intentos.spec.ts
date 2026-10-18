import { ControlDeIntentos, IniciarSesion, RegistrarCuenta } from './identidad';
import { MemoriaCuentaRepository } from '../../infrastructure/persistence/memoria-cuenta.repository';
import { MemoriaSesionRepository } from '../../infrastructure/persistence/memoria-sesion.repository';
import { ScryptHashContrasenas } from '../../infrastructure/seguridad/scrypt-hash-contrasenas';
import { DemasiadosIntentosError, NoAutenticadoError } from '../../domain/errors/errores-de-dominio';

/** Límite de intentos fallidos de inicio de sesión (ADR-0021). */
describe('Límite de intentos de inicio de sesión', () => {
  let ahora: number;
  let iniciar: IniciarSesion;
  const correo = 'ana@utb.edu.co';
  const clave = 'contrasena-1';

  beforeEach(async () => {
    ahora = Date.parse('2026-10-18T12:00:00.000Z');
    const cuentas = new MemoriaCuentaRepository();
    const hash = new ScryptHashContrasenas();
    await new RegistrarCuenta(cuentas, hash).ejecutar({ correo, nombre: 'Ana', contrasena: clave, aceptoPrivacidad: true });
    const control = new ControlDeIntentos();
    control.reloj = () => ahora;
    iniciar = new IniciarSesion(cuentas, new MemoriaSesionRepository(), hash, control);
  });

  const fallar = () => iniciar.ejecutar(correo, 'equivocada-1').catch((e: Error) => e);

  it('tras 5 fallos seguidos bloquea el 6.º intento, aunque la contraseña sea la correcta', async () => {
    for (let i = 0; i < 5; i++) expect(await fallar()).toBeInstanceOf(NoAutenticadoError);

    const bloqueado = await iniciar.ejecutar(correo, clave).catch((e: Error) => e);
    expect(bloqueado).toBeInstanceOf(DemasiadosIntentosError);
    expect((bloqueado as DemasiadosIntentosError).esperarSegundos).toBe(15 * 60);
  });

  it('pasada la ventana de 15 minutos se puede volver a intentar', async () => {
    for (let i = 0; i < 5; i++) await fallar();
    ahora += 15 * 60 * 1000 + 1;
    await expect(iniciar.ejecutar(correo, clave)).resolves.toMatchObject({ cuenta: { correo } });
  });

  it('un inicio de sesión correcto reinicia la cuenta de fallos', async () => {
    for (let i = 0; i < 4; i++) await fallar();
    await iniciar.ejecutar(correo, clave);
    for (let i = 0; i < 4; i++) expect(await fallar()).toBeInstanceOf(NoAutenticadoError); // empieza de cero
  });

  it('cuenta también los correos que no existen, así no revela cuáles tienen cuenta', async () => {
    const intento = () => iniciar.ejecutar('nadie@utb.edu.co', clave).catch((e: Error) => e);
    for (let i = 0; i < 5; i++) expect(await intento()).toBeInstanceOf(NoAutenticadoError);
    expect(await intento()).toBeInstanceOf(DemasiadosIntentosError);
  });

  it('el bloqueo de un correo no afecta a otro', async () => {
    for (let i = 0; i < 5; i++) await fallar();
    await expect(iniciar.ejecutar('otra@utb.edu.co', clave)).rejects.toBeInstanceOf(NoAutenticadoError); // no 429
  });
});

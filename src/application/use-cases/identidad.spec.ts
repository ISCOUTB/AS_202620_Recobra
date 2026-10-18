import {
  CerrarSesion,
  ControlDeIntentos,
  IniciarSesion,
  RegistrarCuenta,
  ResolverSesion,
  hashToken,
} from './identidad';
import { MemoriaCuentaRepository } from '../../infrastructure/persistence/memoria-cuenta.repository';
import { MemoriaSesionRepository } from '../../infrastructure/persistence/memoria-sesion.repository';
import { ScryptHashContrasenas } from '../../infrastructure/seguridad/scrypt-hash-contrasenas';
import {
  ConflictoError,
  DatoInvalidoError,
  DemasiadosIntentosError,
  NoAutenticadoError,
} from '../../domain/errors/errores-de-dominio';
import { VERSION_AVISO_PRIVACIDAD } from '../../domain/privacidad/aviso-privacidad';

describe('Identidad', () => {
  let cuentas: MemoriaCuentaRepository;
  let sesiones: MemoriaSesionRepository;
  let hash: ScryptHashContrasenas;
  let registrar: RegistrarCuenta;
  let iniciar: IniciarSesion;
  let resolver: ResolverSesion;

  beforeEach(() => {
    cuentas = new MemoriaCuentaRepository();
    sesiones = new MemoriaSesionRepository();
    hash = new ScryptHashContrasenas();
    registrar = new RegistrarCuenta(cuentas, hash);
    iniciar = new IniciarSesion(cuentas, sesiones, hash, new ControlDeIntentos());
    resolver = new ResolverSesion(cuentas, sesiones);
  });

  const datos = { correo: 'ana@utb.edu.co', nombre: 'Ana', contrasena: 'contrasena-1', aceptoPrivacidad: true };

  it('sin aceptar el aviso de privacidad no se crea la cuenta; al aceptarlo queda constancia de la versión', async () => {
    await expect(registrar.ejecutar({ ...datos, aceptoPrivacidad: false })).rejects.toBeInstanceOf(DatoInvalidoError);
    await expect(registrar.ejecutar({ ...datos, aceptoPrivacidad: undefined as unknown as boolean })).rejects.toBeInstanceOf(
      DatoInvalidoError,
    );
    const cuenta = await registrar.ejecutar(datos);
    expect(cuenta.privacidadVersion).toBe(VERSION_AVISO_PRIVACIDAD);
    expect(cuenta.privacidadAceptadaEn).toEqual(expect.any(String));
  });

  it('guarda el hash de la contraseña, nunca la contraseña', async () => {
    const cuenta = await registrar.ejecutar(datos);
    expect(cuenta.hashContrasena).not.toContain(datos.contrasena);
    expect(await hash.verificar(datos.contrasena, cuenta.hashContrasena)).toBe(true);
    expect(await hash.verificar('otra-contrasena', cuenta.hashContrasena)).toBe(false);
  });

  it('no permite dos cuentas con el mismo correo, aunque cambien mayúsculas', async () => {
    await registrar.ejecutar(datos);
    await expect(registrar.ejecutar({ ...datos, correo: 'ANA@utb.edu.co' })).rejects.toBeInstanceOf(ConflictoError);
  });

  it('inicia sesión y el token resuelve la cuenta; solo se guarda el hash del token', async () => {
    const cuenta = await registrar.ejecutar(datos);
    const { token } = await iniciar.ejecutar(datos.correo, datos.contrasena);

    expect((await resolver.ejecutar(token)).id).toBe(cuenta.id);
    expect(await sesiones.buscarPorTokenHash(token)).toBeNull();
    expect(await sesiones.buscarPorTokenHash(hashToken(token))).not.toBeNull();
  });

  it('el mismo mensaje para correo inexistente y contraseña incorrecta', async () => {
    await registrar.ejecutar(datos);
    const correoMalo = iniciar.ejecutar('nadie@utb.edu.co', datos.contrasena).catch((e: Error) => e.message);
    const claveMala = iniciar.ejecutar(datos.correo, 'equivocada').catch((e: Error) => e.message);
    expect(await correoMalo).toBe(await claveMala);
    await expect(iniciar.ejecutar(datos.correo, 'equivocada')).rejects.toBeInstanceOf(NoAutenticadoError);
  });

  it('rechaza un token inexistente o vencido, y borra la sesión vencida', async () => {
    await expect(resolver.ejecutar(undefined)).rejects.toBeInstanceOf(NoAutenticadoError);
    await expect(resolver.ejecutar('inventado')).rejects.toBeInstanceOf(NoAutenticadoError);

    const cuenta = await registrar.ejecutar(datos);
    await sesiones.guardar({
      tokenHash: hashToken('viejo'),
      cuentaId: cuenta.id,
      creadaEn: '2020-01-01T00:00:00.000Z',
      expiraEn: '2020-01-08T00:00:00.000Z',
    });
    await expect(resolver.ejecutar('viejo')).rejects.toBeInstanceOf(NoAutenticadoError);
    expect(await sesiones.buscarPorTokenHash(hashToken('viejo'))).toBeNull();
  });

  it('cerrar sesión invalida el token', async () => {
    await registrar.ejecutar(datos);
    const { token } = await iniciar.ejecutar(datos.correo, datos.contrasena);
    await new CerrarSesion(sesiones).ejecutar(token);
    await expect(resolver.ejecutar(token)).rejects.toBeInstanceOf(NoAutenticadoError);
  });
});

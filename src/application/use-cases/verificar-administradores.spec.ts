import { Logger } from '@nestjs/common';
import { Cuenta } from '../../domain/entities/cuenta';
import { MemoriaCuentaRepository } from '../../infrastructure/persistence/memoria-cuenta.repository';
import { estadoDeSeguridad } from '../../seguridad/estado-de-seguridad';
import { RegistrarCuenta } from './identidad';
import { VerificarAdministradores } from './verificar-administradores';
import { ScryptHashContrasenas } from '../../infrastructure/seguridad/scrypt-hash-contrasenas';

Logger.overrideLogger(false);

/** Amenaza T01: un correo de administrador sin cuenta lo puede registrar cualquiera primero. */
describe('Administradores y correo sin verificar (amenaza T01)', () => {
  const anterior = process.env.ADMIN_CORREOS;
  let cuentas: MemoriaCuentaRepository;
  let advertencias: Array<Record<string, unknown>>;
  let espia: jest.SpyInstance;

  beforeEach(() => {
    cuentas = new MemoriaCuentaRepository();
    advertencias = [];
    espia = jest.spyOn(Logger.prototype, 'warn').mockImplementation((m: unknown) => {
      advertencias.push(m as Record<string, unknown>);
    });
    estadoDeSeguridad.administradoresSinCuenta = null;
  });
  afterEach(() => {
    espia.mockRestore();
    if (anterior === undefined) delete process.env.ADMIN_CORREOS;
    else process.env.ADMIN_CORREOS = anterior;
  });

  const cuenta = (id: string, correo: string, extra: Partial<ConstructorParameters<typeof Cuenta>[0]> = {}) =>
    new Cuenta({ id, correo, nombre: `Cuenta ${id}`, hashContrasena: 'h', creadoEn: '2026-10-28T10:00:00.000Z', ...extra });

  it('señala cada correo de administrador que todavía no tiene cuenta, y lo deja en la métrica', async () => {
    process.env.ADMIN_CORREOS = 'con.cuenta@utb.edu.co, sin.cuenta@utb.edu.co , eliminada@utb.edu.co';
    await cuentas.guardarSiCorreoLibre(cuenta('a', 'con.cuenta@utb.edu.co'));
    await cuentas.guardarSiCorreoLibre(cuenta('b', 'eliminada@utb.edu.co', { eliminadaEn: '2026-10-27T10:00:00.000Z' }));

    const r = await new VerificarAdministradores(cuentas).ejecutar();

    expect(r.sinCuenta.sort()).toEqual(['eliminada@utb.edu.co', 'sin.cuenta@utb.edu.co']);
    expect(estadoDeSeguridad.administradoresSinCuenta).toBe(2);
    expect(advertencias).toContainEqual(expect.objectContaining({ evento: 'seguridad.administrador_sin_cuenta', correo: 'sin.cuenta@utb.edu.co' }));
  });

  it('con todos los administradores registrados no hay advertencias y la métrica queda en cero', async () => {
    process.env.ADMIN_CORREOS = 'uno@utb.edu.co';
    await cuentas.guardarSiCorreoLibre(cuenta('a', 'uno@utb.edu.co'));

    expect((await new VerificarAdministradores(cuentas).ejecutar()).sinCuenta).toEqual([]);
    expect(estadoDeSeguridad.administradoresSinCuenta).toBe(0);
    expect(advertencias).toHaveLength(0);
  });

  it('un correo de administrador que no es institucional se señala aparte: nunca podría registrarse', async () => {
    process.env.ADMIN_CORREOS = 'alguien@gmail.com';
    const r = await new VerificarAdministradores(cuentas).ejecutar();
    expect(r.invalidos).toEqual(['alguien@gmail.com']);
    expect(r.sinCuenta).toEqual([]);
  });

  it('sin ADMIN_CORREOS no hay administradores que comprobar', async () => {
    delete process.env.ADMIN_CORREOS;
    expect(await new VerificarAdministradores(cuentas).ejecutar()).toEqual({ sinCuenta: [], invalidos: [] });
    expect(estadoDeSeguridad.administradoresSinCuenta).toBe(0);
  });

  it('al registrar una cuenta con correo de administrador queda una advertencia; con otro correo, no', async () => {
    process.env.ADMIN_CORREOS = 'jefe@utb.edu.co';
    const registrar = new RegistrarCuenta(cuentas, new ScryptHashContrasenas());
    const datos = { nombre: 'Persona', contrasena: 'contrasena-segura-1', aceptoPrivacidad: true };

    await registrar.ejecutar({ ...datos, correo: 'otra@utb.edu.co' });
    expect(advertencias.filter((a) => a.evento === 'seguridad.registro_de_administrador')).toHaveLength(0);

    await registrar.ejecutar({ ...datos, correo: 'Jefe@UTB.edu.co' }); // se normaliza
    const registro = advertencias.filter((a) => a.evento === 'seguridad.registro_de_administrador');
    expect(registro).toHaveLength(1);
    expect(registro[0]).toEqual(expect.objectContaining({ cuentaId: expect.any(String), creadaEn: expect.any(String) }));
    expect(JSON.stringify(registro)).not.toContain('jefe@'); // el correo no queda en el registro: basta el id
  });
});

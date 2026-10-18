import { LimpiezaPeriodica } from './privacidad';
import { MemoriaSesionRepository } from '../../infrastructure/persistence/memoria-sesion.repository';
import { MemoriaNotificacionRepository } from '../../infrastructure/persistence/memoria-notificacion.repository';
import { Notificacion } from '../../domain/entities/notificacion';

describe('Retención de datos (ADR-0021)', () => {
  const ahora = new Date('2026-10-18T12:00:00.000Z');
  const hace = (dias: number) => new Date(ahora.getTime() - dias * 24 * 60 * 60 * 1000).toISOString();
  const aviso = (id: string, creadoEn: string) =>
    new Notificacion({ id, cuentaId: 'ana', tipo: 'coincidencia', titulo: 't', mensaje: 'm', publicacionId: 'p', creadoEn });

  it('borra las sesiones vencidas y los avisos de más de 90 días, y deja lo vigente', async () => {
    const sesiones = new MemoriaSesionRepository();
    await sesiones.guardar({ tokenHash: 'vencida', cuentaId: 'ana', creadaEn: hace(10), expiraEn: hace(3) });
    await sesiones.guardar({ tokenHash: 'vigente', cuentaId: 'ana', creadaEn: hace(1), expiraEn: hace(-6) });
    const avisos = new MemoriaNotificacionRepository();
    await avisos.guardarSiNoExiste(aviso('viejo', hace(91)));
    await avisos.guardarSiNoExiste(aviso('reciente', hace(89)));

    const borrado = await new LimpiezaPeriodica(sesiones, avisos).ejecutar(ahora);

    expect(borrado).toEqual({ sesiones: 1, avisos: 1 });
    expect(await sesiones.buscarPorTokenHash('vencida')).toBeNull();
    expect(await sesiones.buscarPorTokenHash('vigente')).not.toBeNull();
    expect((await avisos.listarPorCuenta('ana', 10)).map((n) => n.id)).toEqual(['reciente']);
  });
});

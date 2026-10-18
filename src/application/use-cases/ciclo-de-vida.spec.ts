import { EventEmitter2 } from '@nestjs/event-emitter';
import { ArchivarVencidas, CerrarPublicacion } from './ciclo-de-vida';
import { CrearPublicacion } from './crear-publicacion';
import { CambiarEstadoPublicacion } from './cambiar-estado-publicacion';
import { ConfirmarEntrega, CrearReclamacion, ResolverReclamacion } from './reclamaciones';
import { BuscarCoincidencias } from './buscar-coincidencias';
import { MemoriaPublicacionRepository } from '../../infrastructure/persistence/memoria-publicacion.repository';
import { MemoriaReclamacionRepository } from '../../infrastructure/persistence/memoria-reclamacion.repository';
import { MemoriaCoincidenciaRepository } from '../../infrastructure/persistence/memoria-coincidencia.repository';
import { Publicacion } from '../../domain/entities/publicacion';
import {
  ConflictoError,
  DatoInvalidoError,
  PermisoDenegadoError,
} from '../../domain/errors/errores-de-dominio';

/** Ciclo de vida completo (ADR-0017): cerrar, vencer y confirmar la entrega. */
describe('Ciclo de vida completo', () => {
  const PRUEBA = 'Tiene una calcomanía de la UTB por dentro';
  let publicaciones: MemoriaPublicacionRepository;
  let crear: CrearPublicacion;
  let cerrar: CerrarPublicacion;

  beforeEach(() => {
    publicaciones = new MemoriaPublicacionRepository();
    crear = new CrearPublicacion(publicaciones, new EventEmitter2());
    cerrar = new CerrarPublicacion(publicaciones);
  });

  const publicar = (tipo: 'perdido' | 'encontrado', autor = 'ana', categoria = 'otros') =>
    crear.ejecutar({ tipo, descripcion: 'Termo azul', categoria, ubicacion: 'Biblioteca' }, autor);

  describe('cerrar', () => {
    it('quien perdió algo lo marca como recuperado y sale de la búsqueda', async () => {
      const p = await publicar('perdido');
      const cerrada = await cerrar.ejecutar(p.id, 'ana', 'recuperado');

      expect(cerrada).toMatchObject({ estado: 'cerrado', motivoCierre: 'recuperado' });
      expect(cerrada.cerradoEn).toEqual(expect.any(String));
      expect(await publicaciones.buscar({ limite: 10 })).toHaveLength(0);
    });

    it('un objeto encontrado se puede retirar, pero no marcar como recuperado', async () => {
      const p = await publicar('encontrado');
      await expect(cerrar.ejecutar(p.id, 'ana', 'recuperado')).rejects.toBeInstanceOf(DatoInvalidoError);
      expect((await cerrar.ejecutar(p.id, 'ana', 'retirado')).motivoCierre).toBe('retirado');
    });

    it('solo su autor, con un motivo válido y mientras nadie la reclama', async () => {
      const p = await publicar('encontrado');
      await expect(cerrar.ejecutar(p.id, 'leo', 'retirado')).rejects.toBeInstanceOf(PermisoDenegadoError);
      await expect(cerrar.ejecutar(p.id, 'ana', 'aburrido')).rejects.toBeInstanceOf(DatoInvalidoError);

      const cambiar = new CambiarEstadoPublicacion(publicaciones);
      await new CrearReclamacion(new MemoriaReclamacionRepository(), publicaciones, cambiar, new EventEmitter2()).ejecutar(
        p.id,
        'leo',
        PRUEBA,
      );
      await expect(cerrar.ejecutar(p.id, 'ana', 'retirado')).rejects.toBeInstanceOf(ConflictoError);
    });
  });

  describe('vencer', () => {
    it('cierra como vencido solo lo publicado hace más de la vigencia', async () => {
      const vieja = new Publicacion({
        id: 'vieja',
        tipo: 'perdido',
        descripcion: 'Paraguas',
        categoria: 'otros',
        ubicacion: 'Biblioteca',
        autorId: 'ana',
        creadoEn: '2026-07-01T00:00:00.000Z',
      });
      await publicaciones.guardar(vieja);
      const nueva = await publicar('perdido');

      const cerradas = await new ArchivarVencidas(publicaciones).ejecutar(new Date('2026-10-17T00:00:00.000Z'), 60);

      expect(cerradas).toBe(1);
      expect(await publicaciones.buscarPorId('vieja')).toMatchObject({ estado: 'cerrado', motivoCierre: 'vencido' });
      expect((await publicaciones.buscarPorId(nueva.id))?.estado).toBe('publicado');
    });
  });

  describe('entregar', () => {
    it('aprobar deja el objeto por entregar; la entrega la confirma una de las dos partes', async () => {
      const reclamaciones = new MemoriaReclamacionRepository();
      const cambiar = new CambiarEstadoPublicacion(publicaciones);
      const p = await publicar('encontrado', 'leo');
      const r = await new CrearReclamacion(reclamaciones, publicaciones, cambiar, new EventEmitter2()).ejecutar(
        p.id,
        'ana',
        PRUEBA,
      );
      const confirmar = new ConfirmarEntrega(reclamaciones, publicaciones, cambiar);

      await expect(confirmar.ejecutar(r.id, 'ana')).rejects.toBeInstanceOf(ConflictoError); // aún sin aprobar
      await new ResolverReclamacion(reclamaciones, publicaciones, cambiar, new EventEmitter2()).aprobar(r.id, 'leo');
      expect((await publicaciones.buscarPorId(p.id))?.estado).toBe('por_entregar');

      await expect(confirmar.ejecutar(r.id, 'bea')).rejects.toBeInstanceOf(PermisoDenegadoError);
      const entregada = await confirmar.ejecutar(r.id, 'leo');
      expect(entregada.entregadaEn).toEqual(expect.any(String));
      expect((await publicaciones.buscarPorId(p.id))?.estado).toBe('reclamado');
      await expect(confirmar.ejecutar(r.id, 'ana')).rejects.toBeInstanceOf(ConflictoError);
    });
  });

  it('lo cerrado no recibe coincidencias', async () => {
    const coincidencias = new MemoriaCoincidenciaRepository();
    const perdido = await publicar('perdido', 'ana');
    await cerrar.ejecutar(perdido.id, 'ana', 'recuperado');
    const encontrado = await publicar('encontrado', 'leo');

    expect(await new BuscarCoincidencias(publicaciones, coincidencias).ejecutar(encontrado)).toHaveLength(0);
  });
});

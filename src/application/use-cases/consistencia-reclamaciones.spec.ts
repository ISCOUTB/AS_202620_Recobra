import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfirmarEntrega, CrearReclamacion, ResolverReclamacion } from './reclamaciones';
import { CambiarEstadoPublicacion } from './cambiar-estado-publicacion';
import { CrearPublicacion } from './crear-publicacion';
import { ReconciliarReclamaciones } from './reconciliar-reclamaciones';
import { MemoriaPublicacionRepository } from '../../infrastructure/persistence/memoria-publicacion.repository';
import { MemoriaReclamacionRepository } from '../../infrastructure/persistence/memoria-reclamacion.repository';
import { Reclamacion } from '../../domain/entities/reclamacion';
import { ConflictoError } from '../../domain/errors/errores-de-dominio';

/** Falla una vez, a pedido, al guardar: simula la base cayendo entre los dos pasos. */
class ReclamacionesQueFallan extends MemoriaReclamacionRepository {
  fallarProximoGuardado = false;

  async guardar(reclamacion: Reclamacion): Promise<Reclamacion> {
    if (this.fallarProximoGuardado) {
      this.fallarProximoGuardado = false;
      throw new Error('la base no respondió');
    }
    return super.guardar(reclamacion);
  }
}

/** Falla una vez, a pedido, al cambiar el estado de la publicación. */
class CambioDeEstadoQueFalla extends CambiarEstadoPublicacion {
  fallarProximoCambio = false;

  async ejecutar(...args: Parameters<CambiarEstadoPublicacion['ejecutar']>): Promise<boolean> {
    if (this.fallarProximoCambio) {
      this.fallarProximoCambio = false;
      throw new Error('la base no respondió');
    }
    return super.ejecutar(...args);
  }
}

/**
 * ADR-0020: aprobar, entregar, reclamar y rechazar escriben dos tablas sin
 * transacción. Si algo se interrumpe entre los dos pasos, el reintento o el
 * reconciliador dejan todo alineado.
 */
describe('Consistencia entre Publicaciones y Reclamaciones', () => {
  const PRUEBA = 'Tiene una calcomanía de la UTB por dentro';
  let publicaciones: MemoriaPublicacionRepository;
  let reclamaciones: ReclamacionesQueFallan;
  let cambiar: CambioDeEstadoQueFalla;
  let crear: CrearReclamacion;
  let resolver: ResolverReclamacion;
  let entregar: ConfirmarEntrega;
  let reconciliar: ReconciliarReclamaciones;
  let publicacionId: string;
  let deAna: Reclamacion;
  let deBea: Reclamacion;

  beforeEach(async () => {
    publicaciones = new MemoriaPublicacionRepository();
    reclamaciones = new ReclamacionesQueFallan();
    cambiar = new CambioDeEstadoQueFalla(publicaciones);
    crear = new CrearReclamacion(reclamaciones, publicaciones, cambiar, new EventEmitter2());
    resolver = new ResolverReclamacion(reclamaciones, publicaciones, cambiar, new EventEmitter2());
    entregar = new ConfirmarEntrega(reclamaciones, publicaciones, cambiar);
    reconciliar = new ReconciliarReclamaciones(reclamaciones, publicaciones, cambiar, resolver);

    const pub = await new CrearPublicacion(publicaciones, new EventEmitter2()).ejecutar(
      { tipo: 'encontrado', descripcion: 'Termo azul', categoria: 'otros', ubicacion: 'Biblioteca' },
      'leo',
    );
    publicacionId = pub.id;
    deAna = await crear.ejecutar(pub.id, 'ana', PRUEBA);
    deBea = await crear.ejecutar(pub.id, 'bea', 'Es negro con una abolladura en la base');
  });

  const estado = async () => (await publicaciones.buscarPorId(publicacionId))?.estado;
  const deLaBase = async (id: string) => reclamaciones.buscarPorId(id);

  describe('aprobar', () => {
    it('si cae entre los dos pasos, el reintento de la misma reclamación lo retoma', async () => {
      reclamaciones.fallarProximoGuardado = true;
      await expect(resolver.aprobar(deAna.id, 'leo')).rejects.toThrow('la base no respondió');

      // Quedó a medias: el objeto ya está por entregar, la reclamación sigue pendiente.
      expect(await estado()).toBe('por_entregar');
      expect((await deLaBase(deAna.id))?.estado).toBe('pendiente');

      // Otra reclamación no puede colarse en el hueco.
      await expect(resolver.aprobar(deBea.id, 'leo')).rejects.toBeInstanceOf(ConflictoError);

      await resolver.aprobar(deAna.id, 'leo');
      expect((await deLaBase(deAna.id))?.estado).toBe('aprobada');
      expect((await deLaBase(deBea.id))?.estado).toBe('rechazada');
      expect(await estado()).toBe('por_entregar');
    });

    it('si nadie reintenta, el reconciliador termina la aprobación y rechaza las demás', async () => {
      reclamaciones.fallarProximoGuardado = true;
      await expect(resolver.aprobar(deAna.id, 'leo')).rejects.toThrow();

      const resumen = await reconciliar.ejecutar();

      expect(resumen).toMatchObject({ aprobaciones: 1 });
      expect((await deLaBase(deAna.id))?.estado).toBe('aprobada');
      expect((await deLaBase(deBea.id))?.estado).toBe('rechazada');
    });
  });

  describe('entregar', () => {
    beforeEach(async () => {
      await resolver.aprobar(deAna.id, 'leo');
    });

    it('si cae entre los dos pasos, el reintento guarda la fecha de entrega', async () => {
      reclamaciones.fallarProximoGuardado = true;
      await expect(entregar.ejecutar(deAna.id, 'ana')).rejects.toThrow();
      expect(await estado()).toBe('reclamado');
      expect((await deLaBase(deAna.id))?.entregadaEn).toBeNull();

      const entregada = await entregar.ejecutar(deAna.id, 'leo');
      expect(entregada.entregadaEn).toEqual(expect.any(String));
      await expect(entregar.ejecutar(deAna.id, 'ana')).rejects.toBeInstanceOf(ConflictoError); // ya confirmada
    });

    it('si nadie reintenta, el reconciliador guarda la fecha de entrega', async () => {
      reclamaciones.fallarProximoGuardado = true;
      await expect(entregar.ejecutar(deAna.id, 'ana')).rejects.toThrow();

      expect(await reconciliar.ejecutar()).toMatchObject({ entregas: 1 });
      expect((await deLaBase(deAna.id))?.entregadaEn).toEqual(expect.any(String));
    });
  });

  describe('reclamar y rechazar', () => {
    it('una reclamación guardada sobre un objeto que quedó "publicado" lo pasa a "en verificación"', async () => {
      const otra = await new CrearPublicacion(publicaciones, new EventEmitter2()).ejecutar(
        { tipo: 'encontrado', descripcion: 'Llaves', categoria: 'llaves', ubicacion: 'Alcatraz' },
        'leo',
      );
      cambiar.fallarProximoCambio = true;
      await expect(crear.ejecutar(otra.id, 'ana', PRUEBA)).rejects.toThrow();
      expect((await publicaciones.buscarPorId(otra.id))?.estado).toBe('publicado');

      expect(await reconciliar.ejecutar()).toMatchObject({ enVerificacion: 1 });
      expect((await publicaciones.buscarPorId(otra.id))?.estado).toBe('en_verificacion');
    });

    it('si se rechazó la última pendiente pero el objeto sigue "en verificación", vuelve a "publicado"', async () => {
      await resolver.rechazar(deAna.id, 'leo', 'No coincide');
      cambiar.fallarProximoCambio = true;
      await expect(resolver.rechazar(deBea.id, 'leo', 'Tampoco coincide')).rejects.toThrow();
      expect(await estado()).toBe('en_verificacion'); // sin ninguna pendiente

      expect(await reconciliar.ejecutar()).toMatchObject({ publicadas: 1 });
      expect(await estado()).toBe('publicado');
    });
  });

  it('lo que está bien no se toca: una pasada sobre un estado sano no cambia nada', async () => {
    const antes = await estado();
    const resumen = await reconciliar.ejecutar();
    expect(resumen).toEqual({ enVerificacion: 0, publicadas: 0, aprobaciones: 0, entregas: 0 });
    expect(await estado()).toBe(antes);
    expect((await deLaBase(deAna.id))?.estado).toBe('pendiente');
  });

  it('la reclamación aprobada anotada en la publicación no sale por la API', async () => {
    await resolver.aprobar(deAna.id, 'leo');
    const publicacion = await publicaciones.buscarPorId(publicacionId);
    expect(publicacion?.reclamacionAprobadaId).toBe(deAna.id);
    expect(JSON.parse(JSON.stringify(publicacion))).not.toHaveProperty('reclamacionAprobadaId');
  });
});

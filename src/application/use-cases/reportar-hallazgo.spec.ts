import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReportarHallazgo } from './reportar-hallazgo';
import { CrearPublicacion } from './crear-publicacion';
import { CambiarCustodia } from './ciclo-de-vida';
import { MemoriaPublicacionRepository } from '../../infrastructure/persistence/memoria-publicacion.repository';
import { MemoriaCoincidenciaRepository } from '../../infrastructure/persistence/memoria-coincidencia.repository';
import { Publicacion, PublicacionInvalidaError } from '../../domain/entities/publicacion';
import { COINCIDENCIA_DETECTADA } from '../events/eventos-dominio';
import { ConflictoError, PermisoDenegadoError } from '../../domain/errors/errores-de-dominio';

describe('Dónde está el objeto y "Lo tengo yo" (ADR-0019)', () => {
  let publicaciones: MemoriaPublicacionRepository;
  let coincidencias: MemoriaCoincidenciaRepository;
  let eventos: EventEmitter2;
  let crear: CrearPublicacion;
  let reportar: ReportarHallazgo;

  beforeEach(() => {
    publicaciones = new MemoriaPublicacionRepository();
    coincidencias = new MemoriaCoincidenciaRepository();
    eventos = new EventEmitter2();
    crear = new CrearPublicacion(publicaciones, new EventEmitter2());
    reportar = new ReportarHallazgo(publicaciones, crear, coincidencias, eventos);
  });

  const perdidoDeAna = () =>
    crear.ejecutar({ tipo: 'perdido', descripcion: 'Audífonos Sony negros', categoria: 'electronica', ubicacion: 'Bloque A1' }, 'ana');

  describe('custodia', () => {
    const base = { id: '1', descripcion: 'Termo', categoria: 'otros', ubicacion: 'Biblioteca', creadoEn: '2026-10-17T00:00:00.000Z' };

    it('un encontrado sin custodia la tiene quien lo encontró; un perdido no tiene', () => {
      expect(new Publicacion({ ...base, tipo: 'encontrado' })).toMatchObject({ custodia: 'quien_lo_encontro', puntoCustodia: null });
      expect(new Publicacion({ ...base, tipo: 'perdido' }).custodia).toBeNull();
      expect(() => new Publicacion({ ...base, tipo: 'perdido', custodia: 'quien_lo_encontro' })).toThrow(PublicacionInvalidaError);
    });

    it('en un punto de entrega hay que decir cuál', () => {
      expect(() => new Publicacion({ ...base, tipo: 'encontrado', custodia: 'punto_de_entrega' })).toThrow(PublicacionInvalidaError);
      const p = new Publicacion({ ...base, tipo: 'encontrado', custodia: 'punto_de_entrega', puntoCustodia: ' Portería ' });
      expect(p.puntoCustodia).toBe('Portería');
    });

    it('quien lo encontró la actualiza; nadie más', async () => {
      const p = await crear.ejecutar({ tipo: 'encontrado', descripcion: 'Termo', categoria: 'otros', ubicacion: 'Biblioteca' }, 'leo');
      const cambiar = new CambiarCustodia(publicaciones);
      await expect(cambiar.ejecutar(p.id, 'ana', 'punto_de_entrega', 'Portería')).rejects.toBeInstanceOf(PermisoDenegadoError);
      const actualizada = await cambiar.ejecutar(p.id, 'leo', 'punto_de_entrega', 'Portería');
      expect(actualizada).toMatchObject({ custodia: 'punto_de_entrega', puntoCustodia: 'Portería' });
    });
  });

  describe('lo tengo yo', () => {
    it('crea un encontrado de la misma categoría, lo enlaza al perdido y avisa', async () => {
      const perdido = await perdidoDeAna();
      const avisos: unknown[] = [];
      eventos.on(COINCIDENCIA_DETECTADA, (c) => avisos.push(c));

      const encontrado = await reportar.ejecutar(perdido.id, 'leo', {
        descripcion: 'Audífonos negros en estuche',
        ubicacion: 'Bloque A3',
        custodia: 'punto_de_entrega',
        puntoCustodia: 'Portería de la entrada principal',
      });

      expect(encontrado).toMatchObject({ tipo: 'encontrado', categoria: 'electronica', autorId: 'leo', custodia: 'punto_de_entrega' });
      const enlazadas = await coincidencias.listarPorPublicacion(perdido.id);
      expect(enlazadas.map((c) => c.id)).toEqual([`${encontrado.id}__${perdido.id}`]);
      expect(avisos).toHaveLength(1);
    });

    it('no sobre lo propio, ni dos veces, ni sobre un encontrado', async () => {
      const perdido = await perdidoDeAna();
      const datos = { descripcion: 'Audífonos', ubicacion: 'Bloque A3' };
      await expect(reportar.ejecutar(perdido.id, 'ana', datos)).rejects.toBeInstanceOf(ConflictoError);
      await reportar.ejecutar(perdido.id, 'leo', datos);
      await expect(reportar.ejecutar(perdido.id, 'leo', datos)).rejects.toBeInstanceOf(ConflictoError);

      const encontrado = await crear.ejecutar({ tipo: 'encontrado', descripcion: 'Termo', categoria: 'otros', ubicacion: 'Biblioteca' }, 'bea');
      await expect(reportar.ejecutar(encontrado.id, 'leo', datos)).rejects.toBeInstanceOf(ConflictoError);
    });
  });
});

import * as fs from 'node:fs';
import * as path from 'node:path';
import Ajv, { ValidateFunction } from 'ajv';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cuenta } from '../../domain/entities/cuenta';
import { Reporte } from '../../domain/entities/reporte';
import { MemoriaCoincidenciaRepository } from '../../infrastructure/persistence/memoria-coincidencia.repository';
import { MemoriaFotoRepository } from '../../infrastructure/persistence/memoria-foto.repository';
import { MemoriaPublicacionRepository } from '../../infrastructure/persistence/memoria-publicacion.repository';
import { MemoriaReclamacionRepository } from '../../infrastructure/persistence/memoria-reclamacion.repository';
import { MemoriaReporteRepository } from '../../infrastructure/persistence/memoria-reporte.repository';
import { CambiarEstadoPublicacion } from '../use-cases/cambiar-estado-publicacion';
import { CrearPublicacion } from '../use-cases/crear-publicacion';
import { EliminarFotoDe } from '../use-cases/fotos';
import { ResolverReporte } from '../use-cases/moderacion';
import { CrearReclamacion, ResolverReclamacion } from '../use-cases/reclamaciones';
import { ReportarHallazgo } from '../use-cases/reportar-hallazgo';
import {
  COINCIDENCIA_DETECTADA,
  EventoDominio,
  PUBLICACION_MODERADA,
  RECLAMACION_CREADA,
  RECLAMACION_RESUELTA,
} from './eventos-dominio';

/**
 * Contrato de los mensajes (ADR-0026): lo que de verdad emite el sistema tiene
 * que cumplir `docs/contracts/eventos.schema.json`. Si alguien cambia una carga
 * de forma incompatible (quita o renombra un campo, cambia su tipo), esta prueba
 * falla y obliga a decidir: o se restituye, o se sube la versión del evento.
 */
// Las líneas de registro de los eventos no se imprimen en la salida de las pruebas.
Logger.overrideLogger(false);

describe('Contrato de los eventos entre contextos (docs/contracts/eventos.schema.json)', () => {
  const esquema = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../../docs/contracts/eventos.schema.json'), 'utf-8'),
  );
  const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false });
  ajv.addSchema(esquema, 'eventos');
  const validador = (nombre: string): ValidateFunction => ajv.getSchema(`eventos#/definitions/${nombre}`) as ValidateFunction;

  const PRUEBA = 'Tiene una calcomanía de la UTB y las iniciales C.C. por dentro';
  const emitidos: EventoDominio[] = [];

  /** Ejecuta los casos de uso reales y recoge cada evento que emiten. */
  beforeAll(async () => {
    const emisor = new EventEmitter2();
    emisor.onAny((_nombre, evento) => emitidos.push(evento as EventoDominio));
    const publicaciones = new MemoriaPublicacionRepository();
    const reclamaciones = new MemoriaReclamacionRepository();
    const reportes = new MemoriaReporteRepository();
    const cambiar = new CambiarEstadoPublicacion(publicaciones);
    const crear = new CrearPublicacion(publicaciones, new EventEmitter2());
    const crearReclamacion = new CrearReclamacion(reclamaciones, publicaciones, cambiar, emisor);
    const resolver = new ResolverReclamacion(reclamaciones, publicaciones, cambiar, emisor);
    const encontrado = (autor: string, descripcion: string) =>
      crear.ejecutar({ tipo: 'encontrado', descripcion, categoria: 'otros', ubicacion: 'Biblioteca' }, autor);

    // reclamacion.creada + reclamacion.resuelta (aprobada, y rechazada automáticamente la otra)
    const a = await encontrado('bea', 'Termo azul');
    const deAna = await crearReclamacion.ejecutar(a.id, 'ana', PRUEBA);
    await crearReclamacion.ejecutar(a.id, 'leo', 'Es negro con una abolladura en la base');
    await resolver.aprobar(deAna.id, 'bea');

    // reclamacion.resuelta (rechazada con motivo)
    const b = await encontrado('bea', 'Mochila negra');
    const deLeo = await crearReclamacion.ejecutar(b.id, 'leo', 'Tiene un llavero rojo en el bolsillo de adelante');
    await resolver.rechazar(deLeo.id, 'bea', 'No coincide con lo que dices');

    // coincidencia.detectada ("Lo tengo yo")
    const perdido = await crear.ejecutar(
      { tipo: 'perdido', descripcion: 'Audífonos Sony negros', categoria: 'electronica', ubicacion: 'Bloque A1' },
      'ana',
    );
    await new ReportarHallazgo(publicaciones, crear, new MemoriaCoincidenciaRepository(), emisor).ejecutar(perdido.id, 'leo', {
      descripcion: 'Audífonos negros en estuche',
      ubicacion: 'Bloque A3',
    });

    // publicacion.moderada
    const abusiva = await encontrado('leo', 'Publicación abusiva');
    await reportes.guardar(new Reporte({ id: 'rep-1', publicacionId: abusiva.id, reportanteId: 'ana', motivo: 'spam', creadoEn: new Date().toISOString() }));
    await new ResolverReporte(reportes, publicaciones, emisor, new EliminarFotoDe(new MemoriaFotoRepository(), publicaciones)).ejecutar(
      'rep-1',
      { id: 'admin' } as Cuenta,
      'ocultar',
    );
  });

  it('el sistema emite los cuatro tipos de evento del contrato', () => {
    const tipos = new Set(emitidos.map((e) => e.tipo));
    expect(tipos).toEqual(new Set([RECLAMACION_CREADA, RECLAMACION_RESUELTA, COINCIDENCIA_DETECTADA, PUBLICACION_MODERADA]));
    expect(emitidos.filter((e) => e.tipo === RECLAMACION_RESUELTA).map((e) => (e.carga as { resultado: string }).resultado).sort()).toEqual([
      'aprobada',
      'rechazada',
      'rechazada',
    ]);
  });

  it('cada evento emitido cumple el sobre y el esquema de su tipo', () => {
    for (const evento of emitidos) {
      const sobre = validador('sobre');
      expect({ evento: evento.tipo, errores: sobre(evento) ? [] : sobre.errors }).toEqual({ evento: evento.tipo, errores: [] });
      const carga = validador(evento.tipo);
      expect({ evento: evento.tipo, errores: carga(evento.carga) ? [] : carga.errors }).toEqual({ evento: evento.tipo, errores: [] });
    }
  });

  it('las cargas no llevan el texto de la prueba: pueden guardarse en la cola de fallidos sin sumar datos personales', () => {
    expect(JSON.stringify(emitidos)).not.toContain('calcomanía');
    expect(JSON.stringify(emitidos)).not.toContain('abolladura');
  });

  describe('criterio de compatibilidad', () => {
    const base = { reclamacionId: 'r1', publicacionId: 'p1', publicacionAutorId: 'bea', publicacionDescripcion: 'Termo' };

    it('compatible: agregar un campo opcional no rompe a quien consume la versión 1', () => {
      expect(validador('reclamacion.creada')({ ...base, nuevoCampoOpcional: 'x' })).toBe(true);
    });

    it('incompatible: quitar o renombrar un campo, o cambiarle el tipo, exige un evento de otra versión', () => {
      const { publicacionAutorId, ...sinCampo } = base;
      void publicacionAutorId;
      expect(validador('reclamacion.creada')(sinCampo)).toBe(false);
      expect(validador('reclamacion.creada')({ ...base, reclamacionId: 7 })).toBe(false);
      expect(validador('reclamacion.resuelta')({ ...base, reclamanteId: 'ana', resultado: 'pendiente', motivoRechazo: null })).toBe(false);
    });

    it('un sobre de otra versión no se valida como versión 1: quien consume no debe entenderlo a medias', () => {
      const v2 = { id: 'e1', tipo: RECLAMACION_CREADA, version: 2, ocurridoEn: new Date().toISOString(), carga: base };
      expect(validador('sobre')(v2)).toBe(false);
    });
  });
});

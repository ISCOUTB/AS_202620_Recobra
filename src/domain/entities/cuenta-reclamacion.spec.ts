import { Cuenta } from './cuenta';
import { Reclamacion } from './reclamacion';
import { Publicacion } from './publicacion';
import { ConflictoError, DatoInvalidoError } from '../errors/errores-de-dominio';

describe('Cuenta', () => {
  const datos = { id: 'c1', nombre: 'Ana Pérez', hashContrasena: 'h', creadoEn: '2026-10-17T00:00:00.000Z' };

  it('normaliza el correo a minúsculas y sin espacios', () => {
    expect(new Cuenta({ ...datos, correo: '  Ana.Perez@UTB.edu.co ' }).correo).toBe('ana.perez@utb.edu.co');
  });

  it.each(['ana@gmail.com', 'ana@utb.edu.co.fake.com', 'no-es-correo', ''])('rechaza el correo %p', (correo) => {
    expect(() => new Cuenta({ ...datos, correo })).toThrow(DatoInvalidoError);
  });

  it('exige un nombre de 2 a 80 caracteres', () => {
    expect(() => new Cuenta({ ...datos, correo: 'a@utb.edu.co', nombre: 'A' })).toThrow(DatoInvalidoError);
  });

  it('exige una contraseña de al menos 8 caracteres', () => {
    expect(() => Cuenta.validarContrasena('corta')).toThrow(DatoInvalidoError);
    expect(() => Cuenta.validarContrasena('suficiente')).not.toThrow();
  });

  it('la vista pública nunca incluye el hash', () => {
    const vista = new Cuenta({ ...datos, correo: 'a@utb.edu.co' }).vistaPublica();
    expect(vista).toEqual({ id: 'c1', correo: 'a@utb.edu.co', nombre: 'Ana Pérez' });
  });
});

describe('Reclamacion', () => {
  const base = {
    id: 'r1',
    publicacionId: 'p1',
    reclamanteId: 'c2',
    prueba: 'Tiene una calcomanía de un gato en la tapa',
    creadoEn: '2026-10-17T00:00:00.000Z',
  };

  it('nace pendiente', () => {
    expect(new Reclamacion(base).estado).toBe('pendiente');
  });

  it('exige una prueba con detalle suficiente', () => {
    expect(() => new Reclamacion({ ...base, prueba: 'es mío' })).toThrow(DatoInvalidoError);
  });

  it('solo una pendiente se puede aprobar o rechazar, y una sola vez', () => {
    const aprobada = new Reclamacion(base).aprobar('2026-10-17T01:00:00.000Z');
    expect(aprobada.estado).toBe('aprobada');
    expect(() => aprobada.rechazar('2026-10-17T02:00:00.000Z', 'no coincide')).toThrow(ConflictoError);
    expect(() => aprobada.aprobar('2026-10-17T02:00:00.000Z')).toThrow(ConflictoError);
  });

  it('rechazar exige un motivo', () => {
    expect(() => new Reclamacion(base).rechazar('2026-10-17T01:00:00.000Z', '')).toThrow(DatoInvalidoError);
  });
});

describe('Ciclo de vida de la publicación', () => {
  it('permite publicado → en_verificacion → por_entregar → reclamado, volver a publicado o cerrar', () => {
    expect(() => Publicacion.exigirTransicion('publicado', 'en_verificacion')).not.toThrow();
    expect(() => Publicacion.exigirTransicion('en_verificacion', 'por_entregar')).not.toThrow();
    expect(() => Publicacion.exigirTransicion('por_entregar', 'reclamado')).not.toThrow();
    expect(() => Publicacion.exigirTransicion('en_verificacion', 'publicado')).not.toThrow();
    expect(() => Publicacion.exigirTransicion('publicado', 'cerrado')).not.toThrow();
  });

  it('no permite saltarse la aprobación ni la entrega, ni salir de reclamado o cerrado', () => {
    expect(() => Publicacion.exigirTransicion('publicado', 'reclamado')).toThrow(ConflictoError);
    expect(() => Publicacion.exigirTransicion('en_verificacion', 'reclamado')).toThrow(ConflictoError);
    expect(() => Publicacion.exigirTransicion('reclamado', 'publicado')).toThrow(ConflictoError);
    expect(() => Publicacion.exigirTransicion('cerrado', 'publicado')).toThrow(ConflictoError);
    expect(() => Publicacion.exigirTransicion('en_verificacion', 'cerrado')).toThrow(ConflictoError);
  });
});

import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConsultarNotificaciones, Notificar } from './notificaciones';
import { CrearPublicacion } from './crear-publicacion';
import { MemoriaPublicacionRepository } from '../../infrastructure/persistence/memoria-publicacion.repository';
import { MemoriaNotificacionRepository } from '../../infrastructure/persistence/memoria-notificacion.repository';
import { Coincidencia } from '../../domain/entities/coincidencia';
import { Reclamacion } from '../../domain/entities/reclamacion';
import { NoEncontradoError } from '../../domain/errors/errores-de-dominio';

describe('Notificaciones', () => {
  let publicaciones: MemoriaPublicacionRepository;
  let notificaciones: MemoriaNotificacionRepository;
  let notificar: Notificar;
  let consultar: ConsultarNotificaciones;
  let crear: CrearPublicacion;

  beforeEach(() => {
    publicaciones = new MemoriaPublicacionRepository();
    notificaciones = new MemoriaNotificacionRepository();
    notificar = new Notificar(notificaciones, publicaciones);
    consultar = new ConsultarNotificaciones(notificaciones);
    crear = new CrearPublicacion(publicaciones, new EventEmitter2());
  });

  async function parDeCoincidencia(autorPerdido: string | null = 'ana') {
    const perdido = await crear.ejecutar(
      { tipo: 'perdido', descripcion: 'Termo azul', categoria: 'otros', ubicacion: 'Biblioteca' },
      autorPerdido,
    );
    const encontrado = await crear.ejecutar(
      { tipo: 'encontrado', descripcion: 'Termo azul con calcomanía', categoria: 'otros', ubicacion: 'Biblioteca' },
      'bea',
    );
    const coincidencia = new Coincidencia({
      id: `${encontrado.id}__${perdido.id}`,
      publicacionOrigenId: encontrado.id,
      publicacionCoincidenteId: perdido.id,
      score: 1,
      creadoEn: new Date().toISOString(),
    });
    return { perdido, encontrado, coincidencia };
  }

  it('una coincidencia avisa a quien perdió el objeto y lleva a la publicación encontrada', async () => {
    const { encontrado, coincidencia } = await parDeCoincidencia();

    const [aviso] = await notificar.porCoincidencia(coincidencia);

    expect(aviso).toMatchObject({ cuentaId: 'ana', tipo: 'coincidencia', publicacionId: encontrado.id, leida: false });
    expect((await consultar.ejecutar('ana')).noLeidas).toBe(1);
    expect((await consultar.ejecutar('bea')).notificaciones).toHaveLength(0);
  });

  it('el mismo evento procesado dos veces no duplica el aviso', async () => {
    const { coincidencia } = await parDeCoincidencia();
    await notificar.porCoincidencia(coincidencia);
    await notificar.porCoincidencia(coincidencia);
    expect((await consultar.ejecutar('ana')).notificaciones).toHaveLength(1);
  });

  it('si el objeto perdido no tiene autor, no hay a quién avisar', async () => {
    const { coincidencia } = await parDeCoincidencia(null);
    expect(await notificar.porCoincidencia(coincidencia)).toHaveLength(0);
  });

  it('las reclamaciones avisan a quien publicó al crearse y a quien reclamó al resolverse', async () => {
    const { encontrado } = await parDeCoincidencia();
    const reclamacion = new Reclamacion({
      id: 'r1',
      publicacionId: encontrado.id,
      reclamanteId: 'ana',
      prueba: 'Tiene una calcomanía de la UTB por dentro',
      creadoEn: new Date().toISOString(),
    });

    await notificar.porReclamacionCreada(reclamacion, encontrado);
    await notificar.porReclamacionResuelta(reclamacion.rechazar(new Date().toISOString(), 'No coincide'), encontrado);

    const deBea = await consultar.ejecutar('bea');
    expect(deBea.notificaciones.map((n) => n.tipo)).toEqual(['reclamacion_nueva']);
    const deAna = await consultar.ejecutar('ana');
    expect(deAna.notificaciones[0]).toMatchObject({ tipo: 'reclamacion_rechazada' });
    expect(deAna.notificaciones[0].mensaje).toContain('No coincide');
  });

  it('marcar como leída solo funciona con avisos propios', async () => {
    const { coincidencia } = await parDeCoincidencia();
    const [aviso] = await notificar.porCoincidencia(coincidencia);

    await expect(consultar.marcarLeida(aviso.id, 'bea')).rejects.toBeInstanceOf(NoEncontradoError);
    await consultar.marcarLeida(aviso.id, 'ana');
    expect((await consultar.ejecutar('ana')).noLeidas).toBe(0);
  });
});

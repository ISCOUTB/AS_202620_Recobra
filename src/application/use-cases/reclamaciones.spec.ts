import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConsultarReclamaciones, CrearReclamacion, ResolverReclamacion } from './reclamaciones';
import { CambiarEstadoPublicacion } from './cambiar-estado-publicacion';
import { CrearPublicacion } from './crear-publicacion';
import { MemoriaPublicacionRepository } from '../../infrastructure/persistence/memoria-publicacion.repository';
import { MemoriaReclamacionRepository } from '../../infrastructure/persistence/memoria-reclamacion.repository';
import { MemoriaCuentaRepository } from '../../infrastructure/persistence/memoria-cuenta.repository';
import { Cuenta } from '../../domain/entities/cuenta';
import { ConflictoError, NoEncontradoError, PermisoDenegadoError } from '../../domain/errors/errores-de-dominio';

/**
 * Escenario S2: el 100 % de los intentos queda registrado con reclamante y
 * fecha, y el 0 % de las publicaciones llega a "reclamado" sin la aprobación
 * de quien encontró el objeto.
 */
describe('Reclamaciones', () => {
  const PRUEBA = 'Tiene una calcomanía de la UTB y las iniciales C.C. por dentro';
  let publicaciones: MemoriaPublicacionRepository;
  let reclamaciones: MemoriaReclamacionRepository;
  let cuentas: MemoriaCuentaRepository;
  let crearPublicacion: CrearPublicacion;
  let crear: CrearReclamacion;
  let resolver: ResolverReclamacion;
  let consultar: ConsultarReclamaciones;

  beforeEach(async () => {
    publicaciones = new MemoriaPublicacionRepository();
    reclamaciones = new MemoriaReclamacionRepository();
    cuentas = new MemoriaCuentaRepository();
    const cambiar = new CambiarEstadoPublicacion(publicaciones);
    crearPublicacion = new CrearPublicacion(publicaciones, new EventEmitter2());
    crear = new CrearReclamacion(reclamaciones, publicaciones, cambiar, new EventEmitter2());
    resolver = new ResolverReclamacion(reclamaciones, publicaciones, cambiar, new EventEmitter2());
    consultar = new ConsultarReclamaciones(reclamaciones, publicaciones, cuentas);
    for (const [id, nombre] of [
      ['quien-encontro', 'Bea'],
      ['dueno', 'Ana'],
      ['otro', 'Leo'],
    ]) {
      await cuentas.guardarSiCorreoLibre(
        new Cuenta({ id, correo: `${id}@utb.edu.co`, nombre, hashContrasena: 'h', creadoEn: new Date().toISOString() }),
      );
    }
  });

  async function encontrado(autorId: string | null = 'quien-encontro') {
    return crearPublicacion.ejecutar(
      { tipo: 'encontrado', descripcion: 'Termo azul', categoria: 'otros', ubicacion: 'Biblioteca' },
      autorId,
    );
  }

  const estado = async (id: string) => (await publicaciones.buscarPorId(id))?.estado;

  it('reclamar registra el intento con reclamante y fecha y pone el objeto en verificación', async () => {
    const pub = await encontrado();
    const r = await crear.ejecutar(pub.id, 'dueno', PRUEBA);

    expect(r).toMatchObject({ reclamanteId: 'dueno', estado: 'pendiente' });
    expect(Date.parse(r.creadoEn)).not.toBeNaN();
    expect(await reclamaciones.listarPorPublicacion(pub.id)).toHaveLength(1);
    expect(await estado(pub.id)).toBe('en_verificacion');
  });

  it('solo la aprobación de quien encontró el objeto lo lleva a "por_entregar" y rechaza las demás pendientes', async () => {
    const pub = await encontrado();
    const deAna = await crear.ejecutar(pub.id, 'dueno', PRUEBA);
    const deLeo = await crear.ejecutar(pub.id, 'otro', 'Es negro con una abolladura en la base');

    await expect(resolver.aprobar(deAna.id, 'dueno')).rejects.toBeInstanceOf(PermisoDenegadoError);
    expect(await estado(pub.id)).toBe('en_verificacion');

    await resolver.aprobar(deAna.id, 'quien-encontro');
    expect(await estado(pub.id)).toBe('por_entregar');
    expect((await reclamaciones.buscarPorId(deLeo.id))?.estado).toBe('rechazada');
  });

  it('rechazar todas devuelve el objeto a "publicado"', async () => {
    const pub = await encontrado();
    const r = await crear.ejecutar(pub.id, 'dueno', PRUEBA);
    await resolver.rechazar(r.id, 'quien-encontro', 'La descripción no coincide');
    expect(await estado(pub.id)).toBe('publicado');
  });

  it('con dos pendientes, rechazar una deja el objeto en verificación', async () => {
    const pub = await encontrado();
    const a = await crear.ejecutar(pub.id, 'dueno', PRUEBA);
    await crear.ejecutar(pub.id, 'otro', 'Es negro con una abolladura en la base');
    await resolver.rechazar(a.id, 'quien-encontro', 'No coincide');
    expect(await estado(pub.id)).toBe('en_verificacion');
  });

  it.each([
    ['un objeto perdido', async () => crearPublicacion.ejecutar({ tipo: 'perdido', descripcion: 'x', categoria: 'c', ubicacion: 'u' }, 'quien-encontro')],
    ['una publicación sin autor', async () => encontrado(null)],
  ])('no se puede reclamar %s', async (_caso, crearPub) => {
    const pub = await crearPub();
    await expect(crear.ejecutar(pub.id, 'dueno', PRUEBA)).rejects.toBeInstanceOf(ConflictoError);
  });

  it('no se puede reclamar la propia publicación, ni dos veces seguidas, ni un objeto ya entregado', async () => {
    const pub = await encontrado();
    await expect(crear.ejecutar(pub.id, 'quien-encontro', PRUEBA)).rejects.toBeInstanceOf(ConflictoError);

    const r = await crear.ejecutar(pub.id, 'dueno', PRUEBA);
    await expect(crear.ejecutar(pub.id, 'dueno', PRUEBA)).rejects.toBeInstanceOf(ConflictoError);

    await resolver.aprobar(r.id, 'quien-encontro');
    await expect(crear.ejecutar(pub.id, 'otro', 'Es negro con una abolladura en la base')).rejects.toBeInstanceOf(
      ConflictoError,
    );
  });

  it('una publicación inexistente responde no encontrado', async () => {
    await expect(crear.ejecutar('no-existe', 'dueno', PRUEBA)).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it('dos aprobaciones simultáneas de reclamaciones distintas: solo una gana', async () => {
    const pub = await encontrado();
    const a = await crear.ejecutar(pub.id, 'dueno', PRUEBA);
    const b = await crear.ejecutar(pub.id, 'otro', 'Es negro con una abolladura en la base');

    const resultados = await Promise.allSettled([
      resolver.aprobar(a.id, 'quien-encontro'),
      resolver.aprobar(b.id, 'quien-encontro'),
    ]);

    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await estado(pub.id)).toBe('por_entregar');
    const aprobadas = (await reclamaciones.listarPorPublicacion(pub.id)).filter((r) => r.estado === 'aprobada');
    expect(aprobadas).toHaveLength(1);
  });

  it('el contacto solo se comparte cuando la reclamación se aprueba', async () => {
    const pub = await encontrado();
    const r = await crear.ejecutar(pub.id, 'dueno', PRUEBA);

    expect((await consultar.dePublicacion(pub.id, 'quien-encontro'))[0].reclamante.correo).toBeUndefined();
    expect((await consultar.propias('dueno'))[0].contactoQuienEncontro).toBeUndefined();
    await expect(consultar.dePublicacion(pub.id, 'otro')).rejects.toBeInstanceOf(PermisoDenegadoError);

    await resolver.aprobar(r.id, 'quien-encontro');
    expect((await consultar.dePublicacion(pub.id, 'quien-encontro'))[0].reclamante.correo).toBe('dueno@utb.edu.co');
    expect((await consultar.propias('dueno'))[0].contactoQuienEncontro).toEqual({
      nombre: 'Bea',
      correo: 'quien-encontro@utb.edu.co',
    });
  });
});

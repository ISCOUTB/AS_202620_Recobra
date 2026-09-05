import { Publicacion } from '../entities/publicacion';

/**
 * Puerto de persistencia para publicaciones.
 * Se declara como clase abstracta (y no como `interface`) a propósito:
 * las interfaces de TypeScript desaparecen en tiempo de compilación y no
 * sirven como token de inyección de dependencias de NestJS, mientras que
 * una clase abstracta sí. Esto es lo que permite que `application/` (los
 * casos de uso) dependa únicamente de este puerto, y que Nest resuelva en
 * tiempo de ejecución qué adaptador concreto lo implementa (ver
 * PublicacionesModule).
 */
export abstract class PublicacionRepository {
  abstract guardar(publicacion: Publicacion): Promise<Publicacion>;
  abstract buscarPorId(id: string): Promise<Publicacion | null>;
}

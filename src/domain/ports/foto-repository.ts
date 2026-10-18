import { Foto } from '../entities/foto';

/** Puerto de persistencia de fotos (contexto Fotos, dueño único de `fotos`). Una foto por publicación. */
export abstract class FotoRepository {
  /** Inserta o reemplaza la foto de la publicación. */
  abstract guardar(foto: Foto): Promise<void>;
  abstract buscarPorPublicacion(publicacionId: string): Promise<Foto | null>;
  /** Borra la foto de la publicación y dice si había. */
  abstract eliminar(publicacionId: string): Promise<boolean>;
  /** Las publicaciones que tienen foto, las más antiguas primero (para la retención). */
  abstract listarPublicacionIds(limite: number): Promise<string[]>;
}

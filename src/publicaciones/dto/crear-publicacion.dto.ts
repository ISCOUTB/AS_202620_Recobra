import { TipoPublicacion } from '../../domain/entities/publicacion';

/**
 * Tipo de entrada del cuerpo de POST /publicaciones.
 * A propósito no lleva decoradores de validación (class-validator):
 * la regla de negocio vive en `Publicacion.validar` (dominio), no aquí.
 * Este DTO solo le da forma/tipado al `req.body` para el controlador;
 * quien realmente valida y puede rechazar la solicitud es el caso de uso.
 */
export interface CrearPublicacionDto {
  tipo: TipoPublicacion;
  descripcion: string;
  categoria: string;
  ubicacion: string;
}

import { Controller, Delete, Get, Headers, HttpCode, Param, Put, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ResolverSesion } from '../application/use-cases/identidad';
import { ObtenerFoto, QuitarFoto, SubirFoto, VarianteFoto } from '../application/use-cases/fotos';
import { Cuenta } from '../domain/entities/cuenta';
import { AutenticacionGuard, CuentaActual, tokenDe } from '../identidad/autenticacion.guard';
import { Limitar, LimiteGuard } from '../seguridad/limite-de-uso';

/**
 * Fotos de las publicaciones (ADR-0023). Subir y quitar exigen sesión y ser
 * quien publicó; la miniatura es pública y la foto completa depende de quién la
 * pide (ver `ObtenerFoto`).
 */
@Controller('publicaciones/:id/foto')
export class FotosController {
  constructor(
    private readonly subir: SubirFoto,
    private readonly quitar: QuitarFoto,
    private readonly obtener: ObtenerFoto,
    private readonly resolverSesion: ResolverSesion,
  ) {}

  /** Cuerpo: el JPEG (`Content-Type: image/jpeg`); cabecera `X-Miniatura`: un JPEG de hasta 32 px en base64. */
  @Put()
  @HttpCode(200)
  @UseGuards(AutenticacionGuard, LimiteGuard)
  @Limitar('foto')
  agregar(
    @Param('id') id: string,
    @Req() peticion: Request,
    @Headers('x-miniatura') miniatura: string | undefined,
    @CuentaActual() cuenta: Cuenta,
  ) {
    return this.subir.ejecutar(id, cuenta, peticion.body, miniatura);
  }

  @Delete()
  @HttpCode(200)
  @UseGuards(AutenticacionGuard, LimiteGuard)
  @Limitar('foto')
  eliminar(@Param('id') id: string, @CuentaActual() cuenta: Cuenta) {
    return this.quitar.ejecutar(id, cuenta);
  }

  /** La miniatura se registra antes que `:id/foto` para que no se confunda con otra ruta. */
  @Get('miniatura')
  async miniatura(@Param('id') id: string, @Res() respuesta: Response) {
    this.enviar(respuesta, await this.obtener.ejecutar(id, null, 'miniatura'), 'miniatura');
  }

  @Get()
  async completa(@Param('id') id: string, @Req() peticion: Request, @Res() respuesta: Response) {
    const cuenta = await this.cuentaOpcional(peticion);
    this.enviar(respuesta, await this.obtener.ejecutar(id, cuenta, 'completa'), 'completa');
  }

  /** Sin sesión, o con una vencida, se trata como visitante: la foto de un perdido es pública. */
  private async cuentaOpcional(peticion: Request): Promise<Cuenta | null> {
    const token = tokenDe(peticion);
    if (!token) return null;
    try {
      return await this.resolverSesion.ejecutar(token);
    } catch {
      return null;
    }
  }

  private enviar(respuesta: Response, bytes: Buffer, variante: VarianteFoto): void {
    respuesta
      .status(200)
      .set({
        'Content-Type': 'image/jpeg',
        'Content-Length': String(bytes.length),
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
        // La completa puede ser privada: que ningún intermediario la guarde.
        'Cache-Control': variante === 'miniatura' ? 'public, max-age=60' : 'private, no-store',
      })
      .send(bytes);
  }
}

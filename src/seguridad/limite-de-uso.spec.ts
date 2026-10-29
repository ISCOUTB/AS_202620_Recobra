import { Logger } from '@nestjs/common';
import { LimiteDeUsoExcedidoError } from '../domain/errors/errores-de-dominio';
import { LimiteDeUso, REGLAS_DE_LIMITE } from './limite-de-uso';

Logger.overrideLogger(false);

describe('Límites de uso (ADR-0028)', () => {
  let limite: LimiteDeUso;
  let ahora: number;

  beforeEach(() => {
    limite = new LimiteDeUso();
    ahora = 1_000_000;
    limite.reloj = () => ahora;
  });

  /** Gasta `n` usos de la regla `publicar` para una clave; devuelve cuántos pasaron. */
  function usar(clave: string, n: number): number {
    let pasaron = 0;
    for (let i = 0; i < n; i++) {
      try {
        limite.consumir('publicar', clave);
        pasaron++;
      } catch (e) {
        if (!(e instanceof LimiteDeUsoExcedidoError)) throw e;
      }
    }
    return pasaron;
  }

  it('deja hacer hasta el máximo de la regla y a partir del siguiente uso responde con cuánto esperar', () => {
    const { maximo, ventanaMs } = REGLAS_DE_LIMITE.publicar;
    expect(usar('cuenta:ana', maximo)).toBe(maximo);

    ahora += 10 * 60 * 1000; // pasaron 10 minutos de la hora
    let error: LimiteDeUsoExcedidoError | undefined;
    try {
      limite.consumir('publicar', 'cuenta:ana');
    } catch (e) {
      error = e as LimiteDeUsoExcedidoError;
    }

    expect(error).toBeInstanceOf(LimiteDeUsoExcedidoError);
    expect(error?.esperarSegundos).toBe((ventanaMs - 10 * 60 * 1000) / 1000); // lo que falta de la ventana
    expect(error?.message).toContain('demasiados publicaciones');
    expect(error?.message).toContain('50 minuto(s)');
  });

  it('cada cuenta y cada regla cuentan por separado: el exceso de una no frena a las demás', () => {
    const { maximo } = REGLAS_DE_LIMITE.publicar;
    usar('cuenta:ana', maximo + 5);
    expect(usar('cuenta:bea', maximo)).toBe(maximo); // otra cuenta, misma regla
    expect(() => limite.consumir('reportar', 'cuenta:ana')).not.toThrow(); // misma cuenta, otra regla
  });

  it('al terminar la ventana se vuelve a poder', () => {
    const { maximo, ventanaMs } = REGLAS_DE_LIMITE.publicar;
    usar('cuenta:ana', maximo + 1);
    ahora += ventanaMs;
    expect(usar('cuenta:ana', maximo)).toBe(maximo);
  });

  it('cuenta lo excedido para las métricas y deja un registro sin la clave en claro', () => {
    const avisos: unknown[] = [];
    const espia = jest.spyOn(Logger.prototype, 'warn').mockImplementation((m: unknown) => {
      avisos.push(m);
    });
    try {
      usar('origen:203.0.113.7', REGLAS_DE_LIMITE.publicar.maximo + 3);
    } finally {
      espia.mockRestore();
    }

    expect(limite.excedidos.publicar).toBe(3);
    const linea = avisos[0] as { evento: string; regla: string; origen: string };
    expect(linea).toMatchObject({ evento: 'seguridad.limite_excedido', regla: 'publicar' });
    expect(linea.origen).toMatch(/^[0-9a-f]{8}$/);
    expect(JSON.stringify(avisos)).not.toContain('203.0.113.7'); // la dirección no queda en el registro
  });

  it('no crece sin límite: al llenarse se podan las ventanas ya vencidas', () => {
    const { ventanaMs } = REGLAS_DE_LIMITE.publicar;
    for (let i = 0; i < 20_000; i++) limite.consumir('publicar', `cuenta:${i}`);
    ahora += ventanaMs + 1; // todas vencieron
    limite.consumir('publicar', 'cuenta:nueva'); // al llegar al tope, poda
    expect((limite as unknown as { ventanas: Map<string, unknown> }).ventanas.size).toBeLessThan(10);
  });

  it('los límites por origen son holgados (la red del campus comparte dirección) y los de cuenta, los estrictos', () => {
    expect(REGLAS_DE_LIMITE.cuentaNueva.maximo).toBeGreaterThanOrEqual(50);
    expect(REGLAS_DE_LIMITE.sesion.maximo).toBeGreaterThanOrEqual(200);
    expect(REGLAS_DE_LIMITE.publicar.por).toBe('cuenta');
    expect(REGLAS_DE_LIMITE.publicar.maximo).toBeLessThanOrEqual(30);
  });
});

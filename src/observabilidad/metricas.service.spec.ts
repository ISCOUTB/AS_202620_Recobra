import { MetricasService } from './metricas.service';

describe('MetricasService', () => {
  it('sin muestras no reporta percentiles ni cumplimiento', () => {
    const { busqueda } = new MetricasService().snapshot();
    expect(busqueda.n).toBe(0);
    expect(busqueda.p95Ms).toBeNull();
    expect(busqueda.cumpleObjetivo).toBeNull();
  });

  it('mantiene ventanas separadas para publicar y buscar', () => {
    const metricas = new MetricasService();
    metricas.registrarLatenciaPublicacion(10);
    metricas.registrarLatenciaBusqueda(300);
    metricas.registrarLatenciaBusqueda(500);

    const snap = metricas.snapshot();
    expect(snap.n).toBe(1);
    expect(snap.busqueda.n).toBe(2);
  });

  it('calcula el p95 de la búsqueda y lo contrasta con el umbral de 400 ms', () => {
    const metricas = new MetricasService();
    for (let i = 1; i <= 100; i++) metricas.registrarLatenciaBusqueda(i); // 1..100 ms
    expect(metricas.snapshot().busqueda.p95Ms).toBe(95);
    expect(metricas.snapshot().busqueda.cumpleObjetivo).toBe(true);

    for (let i = 0; i < 100; i++) metricas.registrarLatenciaBusqueda(900);
    expect(metricas.snapshot().busqueda.cumpleObjetivo).toBe(false);
  });

  it('cuenta los errores de búsqueda sin mezclarlos con la latencia', () => {
    const metricas = new MetricasService();
    metricas.registrarErrorBusqueda();
    metricas.registrarErrorBusqueda();
    const { busqueda } = metricas.snapshot();
    expect(busqueda.errores).toBe(2);
    expect(busqueda.n).toBe(0);
  });
});

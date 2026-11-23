import 'package:flutter/material.dart';

import '../api/recobra_api.dart';
import '../estado/sesion.dart';
import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';
import 'reportar.dart';

/// Moderación (ADR-0022): los reportes abiertos y, por cada uno, ocultar la
/// publicación o descartar el reporte. Solo aparece para administradores; el
/// servidor lo vuelve a verificar (403), así que esconderla es comodidad, no
/// seguridad.
class ModeracionPantalla extends StatefulWidget {
  const ModeracionPantalla({super.key});

  @override
  State<ModeracionPantalla> createState() => ModeracionPantallaState();
}

class ModeracionPantallaState extends State<ModeracionPantalla> {
  Future<List<ReporteParaModerar>>? _reportes;
  final _resolviendo = <String>{};

  /// Vuelve a pedir los reportes (al entrar a la sección o tras resolver uno).
  void recargar() {
    final sesion = AlcanceSesion.de(context);
    setState(() {
      _reportes = sesion.api.reportesAbiertos();
    });
  }

  Future<void> _resolver(ReporteParaModerar reporte, String decision) async {
    final sesion = AlcanceSesion.de(context);
    final mensajero = ScaffoldMessenger.of(context);
    setState(() => _resolviendo.add(reporte.id));
    try {
      await sesion.api.resolverReporte(reporte.id, decision);
      mensajero.showSnackBar(SnackBar(
        content:
            Text(decision == 'ocultar' ? 'Publicación ocultada; su autor recibe un aviso.' : 'Reporte descartado.'),
      ));
      recargar();
    } on RecobraApiException catch (e) {
      mensajero.showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _resolviendo.remove(reporte.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final sesion = AlcanceSesion.de(context);
    if (!sesion.activa || !sesion.cuenta!.esAdministrador) {
      return const Center(child: Text('Solo para administradores.'));
    }
    _reportes ??= sesion.api.reportesAbiertos();
    return RefreshIndicator(
      onRefresh: () async {
        recargar();
        await _reportes;
      },
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          const EncabezadoUtb(titulo: 'Moderación', subtitulo: 'Reportes de la comunidad por revisar'),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 120),
            child: FutureBuilder<List<ReporteParaModerar>>(
              future: _reportes,
              builder: (context, estado) {
                if (estado.connectionState != ConnectionState.done) return const EsqueletoTarjetas();
                if (estado.hasError) {
                  final e = estado.error;
                  return ErrorConReintento(alReintentar: recargar, texto: e is RecobraApiException ? e.message : null);
                }
                final reportes = estado.data!;
                if (reportes.isEmpty) {
                  return const EstadoVacio(
                    icono: Icons.verified_user_outlined,
                    titulo: 'No hay reportes por revisar',
                    texto: 'Cuando alguien reporte una publicación aparecerá aquí.',
                  );
                }
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final r in reportes)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: _TarjetaReporte(
                          reporte: r,
                          ocupado: _resolviendo.contains(r.id),
                          alResolver: (decision) => _resolver(r, decision),
                        ),
                      ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _TarjetaReporte extends StatelessWidget {
  const _TarjetaReporte({required this.reporte, required this.ocupado, required this.alResolver});

  final ReporteParaModerar reporte;
  final bool ocupado;
  final ValueChanged<String> alResolver;

  @override
  Widget build(BuildContext context) {
    final tipo = reporte.publicacionTipo;
    final titulo = reporte.publicacionDescripcion ?? 'Publicación no disponible';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (tipo != null) ...[
              Etiqueta(tipo == 'perdido' ? 'Perdido' : 'Encontrado', color: colorTipo(tipo)),
              const SizedBox(height: 8),
            ],
            Text(titulo, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            if (reporte.publicacionUbicacion != null)
              Text(reporte.publicacionUbicacion!, style: TextStyle(color: ColoresUtb.textoSuave)),
            const SizedBox(height: 10),
            Text(
              '${motivosReporte[reporte.motivo] ?? reporte.motivo} · ${fechaCorta(reporte.creadoEn)} · '
              '${reporte.reportesDeLaPublicacion} reporte(s) sobre esta publicación',
              style: TextStyle(color: ColoresUtb.textoSuave, fontSize: 13),
            ),
            if (reporte.detalle != null && reporte.detalle!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(reporte.detalle!),
            ],
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: ColoresUtb.rojo, foregroundColor: ColoresUtb.fondo),
                    onPressed: ocupado ? null : () => alResolver('ocultar'),
                    child: const Text('Ocultar'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton(
                    onPressed: ocupado ? null : () => alResolver('descartar'),
                    child: const Text('Descartar'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

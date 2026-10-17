import 'package:flutter/material.dart';

import '../api/recobra_api.dart';
import '../estado/avisos.dart';
import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';

const _chipAviso = {
  'coincidencia': 'Posible coincidencia',
  'reclamacion_nueva': 'Reclamación nueva',
  'reclamacion_aprobada': 'Reclamación aprobada',
  'reclamacion_rechazada': 'Reclamación rechazada',
};

Color colorAviso(String tipo) => switch (tipo) {
      'reclamacion_nueva' => ColoresUtb.naranja,
      'reclamacion_aprobada' => ColoresUtb.verde,
      'reclamacion_rechazada' => ColoresUtb.rojo,
      _ => ColoresUtb.azulClaro,
    };

Color _colorTextoAviso(String tipo) => switch (tipo) {
      'reclamacion_rechazada' => ColoresUtb.rojoTexto,
      'coincidencia' => ColoresUtb.azulTexto,
      _ => colorAviso(tipo),
    };

/// Campana del encabezado con el número de avisos sin leer (escenario S3,
/// ADR-0015). Tocarla abre la hoja de avisos; elegir uno lo devuelve.
class CampanaAvisos extends StatelessWidget {
  const CampanaAvisos({super.key, required this.alAbrirAviso});

  /// Qué hacer al tocar un aviso (abrir la publicación o ir a "Mis cosas").
  final void Function(Notificacion aviso) alAbrirAviso;

  Future<void> _abrirBandeja(BuildContext context, AvisosApp avisos) async {
    await avisos.cargar();
    if (!context.mounted) return;
    final elegido = await showModalBottomSheet<Notificacion>(
      context: context,
      isScrollControlled: true,
      builder: (_) => AlcanceAvisos(avisos: avisos, child: const HojaAvisos()),
    );
    if (elegido != null) alAbrirAviso(elegido);
  }

  @override
  Widget build(BuildContext context) {
    final avisos = AlcanceAvisos.de(context);
    final n = avisos.bandeja.noLeidas;
    return Semantics(
      container: true,
      button: true,
      label: n == 0 ? 'Avisos' : 'Avisos, $n sin leer',
      excludeSemantics: true,
      child: Material(
        color: Colors.white.withValues(alpha: 0.14),
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: () => _abrirBandeja(context, avisos),
          child: SizedBox(
            width: 48,
            height: 48,
            child: Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.center,
              children: [
                const Icon(Icons.notifications_none_rounded, color: Colors.white),
                if (n > 0) Positioned(top: 2, right: 0, child: Contador(n)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Lista de avisos, separada en nuevos y anteriores. Tocar uno lo marca como
/// leído y lo devuelve a quien abrió la hoja.
class HojaAvisos extends StatelessWidget {
  const HojaAvisos({super.key});

  @override
  Widget build(BuildContext context) {
    final avisos = AlcanceAvisos.de(context);
    final bandeja = avisos.bandeja;
    final nuevos = bandeja.notificaciones.where((n) => !n.leida).toList();
    final anteriores = bandeja.notificaciones.where((n) => n.leida).toList();

    Future<void> abrir(Notificacion aviso) async {
      final navegador = Navigator.of(context);
      await avisos.marcarLeida(aviso);
      navegador.pop(aviso);
    }

    Widget seccion(String titulo, List<Notificacion> lista) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 6, bottom: 10),
              child: Text(
                titulo,
                style: const TextStyle(
                  color: ColoresUtb.textoSuave,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.3,
                ),
              ),
            ),
            for (final aviso in lista)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: TarjetaAviso(aviso: aviso, onTap: () => abrir(aviso)),
              ),
          ],
        );

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      maxChildSize: 0.95,
      builder: (context, scroll) => ListView(
        controller: scroll,
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
        children: [
          EncabezadoHoja(
            titulo: 'Avisos',
            subtitulo: bandeja.noLeidas == 0 ? 'Todo al día' : '${bandeja.noLeidas} sin leer',
            accion: bandeja.noLeidas > 0
                ? TextButton(onPressed: avisos.marcarTodas, child: const Text('Marcar todo como leído'))
                : null,
          ),
          const SizedBox(height: 12),
          if (bandeja.notificaciones.isEmpty)
            const EstadoVacio(
              icono: Icons.notifications_off_outlined,
              titulo: 'Sin avisos',
              texto: 'Te contaremos aquí si aparece algo que perdiste o si reclaman lo que publicaste.',
            ),
          if (nuevos.isNotEmpty) seccion('NUEVOS', nuevos),
          if (anteriores.isNotEmpty) seccion('ANTERIORES', anteriores),
        ],
      ),
    );
  }
}

/// Tarjeta de un aviso: barra y etiqueta del color de su tipo; sin leer lleva
/// un punto naranja y el título en negrita, leído se atenúa al 65 %.
class TarjetaAviso extends StatelessWidget {
  const TarjetaAviso({super.key, required this.aviso, this.onTap});

  final Notificacion aviso;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: aviso.leida ? 0.65 : 1,
      child: Card(
        color: aviso.leida ? ColoresUtb.superficie : ColoresUtb.superficieAlta,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                BarraLateral(color: colorAviso(aviso.tipo)),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(0, 14, 0, 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          (_chipAviso[aviso.tipo] ?? 'Aviso').toUpperCase(),
                          style: TextStyle(
                            color: _colorTextoAviso(aviso.tipo),
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.9,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          aviso.titulo,
                          style: TextStyle(fontSize: 15, fontWeight: aviso.leida ? FontWeight.w600 : FontWeight.w700),
                        ),
                        const SizedBox(height: 2),
                        Text(aviso.mensaje, style: const TextStyle(color: ColoresUtb.textoSuave, fontSize: 13, height: 1.4)),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(10, 14, 14, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(fechaCorta(aviso.creadoEn).split(' · ').first,
                          style: const TextStyle(color: ColoresUtb.textoSuave, fontSize: 12)),
                      if (!aviso.leida) ...[
                        const SizedBox(height: 8),
                        Semantics(
                          label: 'Sin leer',
                          child: Container(
                            width: 10,
                            height: 10,
                            decoration: const BoxDecoration(color: ColoresUtb.naranja, shape: BoxShape.circle),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

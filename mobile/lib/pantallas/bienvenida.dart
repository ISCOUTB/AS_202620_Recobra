import 'package:flutter/material.dart';

import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';

/// Bienvenida de primer uso: explica en una pantalla el recorrido publicar →
/// coincidencia → reclamar → entrega.
class BienvenidaPantalla extends StatelessWidget {
  const BienvenidaPantalla({super.key, required this.alTerminar});

  /// `crearCuenta`: la persona eligió crear su cuenta en vez de solo buscar.
  final void Function({required bool crearCuenta}) alTerminar;

  static final _pasos = [
    (Icons.post_add_rounded, 'Publica', 'Lo que perdiste o lo que encontraste, en menos de un minuto.', ColoresUtb.azulClaro),
    (Icons.notifications_active_outlined, 'Te avisamos si coincide', 'Comparamos con lo publicado y te llega un aviso.', ColoresUtb.naranja),
    (Icons.back_hand_outlined, 'Reclama con una prueba', 'Un detalle que solo el dueño sabría. Quien lo encontró la revisa.', ColoresUtb.verde),
    (Icons.handshake_outlined, 'Acuerden la entrega', 'Si aprueba tu prueba, ves su correo institucional para coordinar.', ColoresUtb.azulTexto),
  ];

  @override
  Widget build(BuildContext context) {
    // En computador, una columna centrada (como el contenido del menú lateral) en vez de estirarse de borde a borde.
    return Scaffold(
      body: SafeArea(
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'BIENVENIDA',
                    style: TextoRecobra.etiqueta.copyWith(color: ColoresUtb.enlace),
                  ),
                ),
                TextButton(onPressed: () => alTerminar(crearCuenta: false), child: const Text('Saltar')),
              ],
            ),
            const SizedBox(height: 12),
            const Text(
              'Lo que se pierde en el campus, aparece aquí',
              style: TextStyle(fontSize: 34, fontWeight: FontWeight.w800, height: 40 / 34),
            ),
            const SizedBox(height: 10),
            Text(
              'Sin grupos de WhatsApp ni carteleras. Así funciona Recobra:',
              style: TextoRecobra.fila.copyWith(color: ColoresUtb.textoSuave),
            ),
            const SizedBox(height: 22),
            Card(
              child: Column(
                children: [
                  for (final (i, (icono, titulo, texto, _)) in _pasos.indexed) ...[
                    if (i > 0) const Divider(height: 1, indent: 66),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          IconoFila(icono),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(titulo, style: TextoRecobra.fila.copyWith(fontWeight: FontWeight.w600)),
                                const SizedBox(height: 2),
                                Text(texto, style: TextoRecobra.secundario.copyWith(color: ColoresUtb.textoSuave)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
            FilledButton(onPressed: () => alTerminar(crearCuenta: true), child: const Text('Crear cuenta con mi correo UTB')),
            const SizedBox(height: 8),
            OutlinedButton(onPressed: () => alTerminar(crearCuenta: false), child: const Text('Solo quiero buscar')),
            const SizedBox(height: 12),
            const CajaInfo(
              icono: Icons.lock_outline_rounded,
              child: Text('Tu correo solo se muestra a otra persona cuando aprueban una entrega entre ustedes.'),
            ),
          ],
            ),
          ),
        ),
      ),
    );
  }
}

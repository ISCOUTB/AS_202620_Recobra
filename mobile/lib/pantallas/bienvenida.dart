import 'package:flutter/material.dart';

import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';

/// Bienvenida de primer uso: explica en una pantalla el recorrido publicar →
/// coincidencia → reclamar → entrega.
class BienvenidaPantalla extends StatelessWidget {
  const BienvenidaPantalla({super.key, required this.alTerminar});

  /// `crearCuenta`: la persona eligió crear su cuenta en vez de solo buscar.
  final void Function({required bool crearCuenta}) alTerminar;

  static const _pasos = [
    (Icons.post_add_rounded, 'Publica', 'Lo que perdiste o lo que encontraste, en menos de un minuto.', ColoresUtb.azulClaro),
    (Icons.notifications_active_outlined, 'Te avisamos si coincide', 'Comparamos con lo publicado y te llega un aviso.', ColoresUtb.naranja),
    (Icons.back_hand_outlined, 'Reclama con una prueba', 'Un detalle que solo el dueño sabría. Quien lo encontró la revisa.', ColoresUtb.verde),
    (Icons.handshake_outlined, 'Acuerden la entrega', 'Si aprueba tu prueba, ves su correo institucional para coordinar.', ColoresUtb.azulTexto),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'BIENVENIDA',
                    style: TextStyle(color: ColoresUtb.azulTexto, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.3),
                  ),
                ),
                TextButton(onPressed: () => alTerminar(crearCuenta: false), child: const Text('Saltar')),
              ],
            ),
            const SizedBox(height: 12),
            const Text(
              'Lo que se pierde en el campus, aparece aquí',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, height: 1.15),
            ),
            const SizedBox(height: 10),
            const Text(
              'Sin grupos de WhatsApp ni carteleras. Así funciona Recobra:',
              style: TextStyle(color: ColoresUtb.textoSuave, fontSize: 15, height: 1.45),
            ),
            const SizedBox(height: 22),
            for (final (icono, titulo, texto, color) in _pasos)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(color: color.withValues(alpha: 0.16), shape: BoxShape.circle),
                          child: Icon(icono, color: color),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(titulo, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                              const SizedBox(height: 4),
                              Text(texto, style: const TextStyle(color: ColoresUtb.textoSuave, height: 1.45)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
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
    );
  }
}

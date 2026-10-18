import 'package:flutter/material.dart';

import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';

/// Qué estaba intentando hacer la persona cuando se le pidió la cuenta.
enum AccionConCuenta {
  publicar('Para publicar necesitas una cuenta', 'Puedes mirar cómo se publica sin cuenta; la necesitamos solo para enviarla.'),
  reclamar('Para reclamar necesitas una cuenta', 'Puedes ver todo lo publicado sin cuenta; la necesitamos solo para reclamar.'),
  avisar(
    'Para avisar que lo tienes necesitas una cuenta',
    'Puedes ver todo lo publicado sin cuenta; la necesitamos solo para avisarle a su dueño.',
  ),
  seguimiento('Inicia sesión para ver tus cosas', 'Aquí aparece lo que publicaste y lo que reclamaste, y tus avisos.');

  const AccionConCuenta(this.titulo, this.subtitulo);

  final String titulo;
  final String subtitulo;
}

/// Qué hace la app cuando alguien sin cuenta decide iniciar sesión o crearla.
/// `alVolver` se ejecuta cuando la sesión queda iniciada (por ejemplo, volver
/// al formulario de publicar o reabrir el objeto que quería reclamar).
typedef AlPedirCuenta = void Function({required bool crearCuenta, VoidCallback? alVolver});

/// Las razones por las que Recobra pide cuenta para publicar y reclamar.
/// Se muestra en la hoja de "necesitas una cuenta" y en la pantalla de acceso.
class RazonesCuenta extends StatelessWidget {
  const RazonesCuenta({super.key, this.accion});

  final AccionConCuenta? accion;

  static const _razones = [
    (
      Icons.verified_user_outlined,
      'Cada reclamo tiene un responsable',
      'Queda registrado quién reclamó y cuándo. Así nadie se queda con lo de otra persona.',
    ),
    (
      Icons.notifications_active_outlined,
      'Para avisarte',
      'Te contamos cuando aparece algo parecido a lo que perdiste o cuando responden tu reclamo.',
    ),
    (
      Icons.school_outlined,
      'Solo la comunidad UTB',
      'Entras con tu correo @utb.edu.co. Tu correo solo lo ve la otra persona cuando aprueban una entrega entre ustedes.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (icono, titulo, texto) in _razones)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(color: ColoresUtb.azulClaro.withValues(alpha: 0.14), shape: BoxShape.circle),
                  child: Icon(icono, size: 19, color: ColoresUtb.azulClaro),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(titulo, style: const TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 2),
                      Text(texto, style: const TextStyle(color: ColoresUtb.textoSuave, fontSize: 13, height: 1.45)),
                    ],
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// Lo que elige la persona en la hoja de "necesitas una cuenta".
enum EleccionCuenta { iniciarSesion, crearCuenta }

/// Explica por qué hace falta una cuenta para [accion] y deja iniciar sesión o
/// crearla. Devuelve `null` si prefiere seguir explorando.
Future<EleccionCuenta?> explicarCuenta(BuildContext context, AccionConCuenta accion) {
  return showModalBottomSheet<EleccionCuenta>(
    context: context,
    isScrollControlled: true,
    builder: (contexto) => SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            EncabezadoHoja(titulo: accion.titulo, subtitulo: accion.subtitulo),
            const SizedBox(height: 16),
            const RazonesCuenta(),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: () => Navigator.pop(contexto, EleccionCuenta.iniciarSesion),
              child: const Text('Iniciar sesión'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: () => Navigator.pop(contexto, EleccionCuenta.crearCuenta),
              child: const Text('Crear cuenta con mi correo UTB'),
            ),
            TextButton(onPressed: () => Navigator.pop(contexto), child: const Text('Seguir explorando')),
          ],
        ),
      ),
    ),
  );
}

/// Aviso fijo para quien está mirando sin cuenta ("Estás explorando…").
class AvisoExplorando extends StatelessWidget {
  const AvisoExplorando({super.key, required this.texto});

  final String texto;

  @override
  Widget build(BuildContext context) {
    return CajaInfo(icono: Icons.visibility_outlined, child: Text(texto));
  }
}

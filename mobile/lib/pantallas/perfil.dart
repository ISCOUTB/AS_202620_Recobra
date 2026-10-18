import 'package:flutter/material.dart';

import '../api/recobra_api.dart';
import '../estado/sesion.dart';
import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';
import 'acceso.dart';
import 'bienvenida.dart';
import 'privacidad.dart';

/// Pasos del recorrido, compartidos con la bienvenida.
const pasosRecobra = ['Publicas', 'Te avisamos si coincide', 'Reclamas con una prueba', 'Acuerdan la entrega'];

/// Perfil de la cuenta, con el estilo de la pantalla "Perfil" de la app UTB:
/// avatar sobre el degradado, chip de tipo de cuenta e indicadores.
class PerfilPantalla extends StatefulWidget {
  const PerfilPantalla({super.key, this.registroInicial = false});

  /// Sin sesión, abrir el acceso en "Crear cuenta" (desde la bienvenida).
  final bool registroInicial;

  @override
  State<PerfilPantalla> createState() => _PerfilPantallaState();
}

class _PerfilPantallaState extends State<PerfilPantalla> {
  Future<List<Publicacion>>? _mias;
  String? _cuentaCargada;

  @override
  Widget build(BuildContext context) {
    final sesion = AlcanceSesion.de(context);
    if (!sesion.activa) {
      _mias = null;
      _cuentaCargada = null;
      return AccesoPantalla(
        motivo: 'Entra con tu cuenta UTB para publicar, reclamar y recibir avisos.',
        registroInicial: widget.registroInicial,
      );
    }
    final cuenta = sesion.cuenta!;
    if (_cuentaCargada != cuenta.id) {
      _cuentaCargada = cuenta.id;
      _mias = sesion.api.misPublicaciones();
    }
    final arriba = MediaQuery.of(context).padding.top;
    return RefreshIndicator(
      onRefresh: () async {
        setState(() => _mias = sesion.api.misPublicaciones());
        await _mias;
      },
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          Container(
            decoration: const BoxDecoration(
              gradient: ColoresUtb.degradado,
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
            ),
            padding: EdgeInsets.fromLTRB(20, arriba + 24, 20, 28),
            child: Column(
              children: [
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Perfil', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800)),
                ),
                const SizedBox(height: 16),
                CircleAvatar(
                  radius: 44,
                  backgroundColor: Colors.white.withValues(alpha: 0.15),
                  child: Text(
                    iniciales(cuenta.nombre),
                    style: const TextStyle(fontSize: 30, color: Colors.white, fontWeight: FontWeight.w700),
                  ),
                ),
                const SizedBox(height: 12),
                Text(cuenta.nombre, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w700)),
                Text(cuenta.correo, style: const TextStyle(color: Color(0xFFDCE3FF))),
                const SizedBox(height: 10),
                const Etiqueta('Cuenta institucional', color: Colors.white),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 120),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                FutureBuilder<List<Publicacion>>(
                  future: _mias,
                  builder: (context, estado) {
                    final lista = estado.data ?? const <Publicacion>[];
                    final entregados = lista.where((p) => p.estado == 'reclamado').length;
                    return Row(
                      children: [
                        Expanded(child: _Indicador(valor: '${lista.length}', titulo: 'Publicadas', detalle: 'en total')),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _Indicador(
                            valor: '$entregados',
                            titulo: entregados == 1 ? 'Entregado' : 'Entregados',
                            detalle: 'de ${lista.length}',
                            progreso: lista.isEmpty ? 0 : entregados / lista.length,
                          ),
                        ),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 8),
                const TituloSeccion('Cómo funciona'),
                const Card(
                  child: Padding(padding: EdgeInsets.fromLTRB(16, 16, 16, 6), child: PasosNumerados(pasos: pasosRecobra)),
                ),
                const SizedBox(height: 4),
                TextButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => BienvenidaPantalla(alTerminar: ({required bool crearCuenta}) => Navigator.pop(context)),
                    ),
                  ),
                  child: const Text('Ver la bienvenida otra vez'),
                ),
                const TituloSeccion('Privacidad', subtitulo: 'Tus datos son tuyos'),
                Card(
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(Icons.policy_outlined, color: ColoresUtb.azulClaro),
                        title: const Text('Aviso de privacidad'),
                        trailing: const Icon(Icons.chevron_right_rounded),
                        onTap: () => abrirAvisoPrivacidad(context),
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.download_outlined, color: ColoresUtb.azulClaro),
                        title: const Text('Descargar mis datos'),
                        subtitle: const Text('Todo lo que Recobra guarda de tu cuenta'),
                        trailing: const Icon(Icons.chevron_right_rounded),
                        onTap: () => abrirMisDatos(context),
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.delete_outline_rounded, color: ColoresUtb.rojoTexto),
                        title: const Text('Eliminar mi cuenta', style: TextStyle(color: ColoresUtb.rojoTexto)),
                        trailing: const Icon(Icons.chevron_right_rounded),
                        onTap: () => abrirEliminarCuenta(context),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: ColoresUtb.rojoTexto,
                    side: BorderSide(color: ColoresUtb.rojo.withValues(alpha: 0.5)),
                  ),
                  icon: const Icon(Icons.logout_rounded),
                  label: const Text('Cerrar sesión'),
                  onPressed: () => sesion.salir(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Indicador con anillo, como "Promedio" y "Avance" en el perfil de la app UTB.
class _Indicador extends StatelessWidget {
  const _Indicador({required this.valor, required this.titulo, required this.detalle, this.progreso});

  final String valor;
  final String titulo;
  final String detalle;
  final double? progreso;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            SizedBox(
              width: 48,
              height: 48,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  SizedBox.expand(
                    child: CircularProgressIndicator(
                      value: progreso ?? 1,
                      strokeWidth: 5,
                      color: progreso == null ? ColoresUtb.azulClaro : ColoresUtb.verde,
                      backgroundColor: ColoresUtb.borde,
                    ),
                  ),
                  Text(valor, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(titulo, style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text(detalle, style: const TextStyle(color: ColoresUtb.textoSuave, fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

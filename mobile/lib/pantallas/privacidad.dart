import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api/recobra_api.dart';
import '../estado/sesion.dart';
import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';

/// Abre el aviso de privacidad (lo sirve la API, así la app y la vitrina dicen lo mismo).
Future<void> abrirAvisoPrivacidad(BuildContext context) {
  final sesion = AlcanceSesion.de(context);
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (_) => AlcanceSesion(sesion: sesion, child: const _HojaAviso()),
  );
}

class _HojaAviso extends StatefulWidget {
  const _HojaAviso();

  @override
  State<_HojaAviso> createState() => _HojaAvisoState();
}

class _HojaAvisoState extends State<_HojaAviso> {
  Future<AvisoPrivacidad>? _aviso;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _aviso ??= AlcanceSesion.de(context).api.avisoPrivacidad();
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      builder: (context, scroll) => FutureBuilder<AvisoPrivacidad>(
        future: _aviso,
        builder: (context, estado) {
          return ListView(
            controller: scroll,
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
            children: [
              EncabezadoHoja(titulo: 'Aviso de privacidad', subtitulo: estado.data == null ? null : 'Versión ${estado.data!.version}'),
              const SizedBox(height: 12),
              if (estado.connectionState != ConnectionState.done)
                const Center(child: CircularProgressIndicator())
              else if (estado.hasError)
                ErrorConReintento(
                  texto: 'No pudimos cargar el aviso. Revisa tu conexión.',
                  alReintentar: () => setState(() => _aviso = AlcanceSesion.de(context).api.avisoPrivacidad()),
                )
              else
                for (final s in estado.data!.secciones)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Semantics(
                          header: true,
                          child: Text(s.titulo, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                        ),
                        const SizedBox(height: 4),
                        Text(s.texto, style: const TextStyle(color: ColoresUtb.textoSuave, height: 1.5)),
                      ],
                    ),
                  ),
            ],
          );
        },
      ),
    );
  }
}

/// "Descargar mis datos": muestra todo lo que Recobra guarda de la cuenta y deja copiarlo.
Future<void> abrirMisDatos(BuildContext context) {
  final sesion = AlcanceSesion.de(context);
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    builder: (_) => AlcanceSesion(sesion: sesion, child: const _HojaDatos()),
  );
}

class _HojaDatos extends StatefulWidget {
  const _HojaDatos();

  @override
  State<_HojaDatos> createState() => _HojaDatosState();
}

class _HojaDatosState extends State<_HojaDatos> {
  Future<String>? _datos;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _datos ??= AlcanceSesion.de(context).api.misDatos();
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      builder: (context, scroll) => FutureBuilder<String>(
        future: _datos,
        builder: (context, estado) {
          return ListView(
            controller: scroll,
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
            children: [
              const EncabezadoHoja(
                titulo: 'Mis datos',
                subtitulo: 'Todo lo que Recobra guarda de tu cuenta, sin tu contraseña.',
              ),
              const SizedBox(height: 12),
              if (estado.connectionState != ConnectionState.done)
                const Center(child: CircularProgressIndicator())
              else if (estado.hasError)
                ErrorConReintento(
                  texto: '${estado.error}',
                  alReintentar: () => setState(() => _datos = AlcanceSesion.de(context).api.misDatos()),
                )
              else ...[
                FilledButton.icon(
                  icon: const Icon(Icons.copy_rounded, size: 18),
                  label: const Text('Copiar todo'),
                  onPressed: () async {
                    final mensajero = ScaffoldMessenger.of(context);
                    await Clipboard.setData(ClipboardData(text: estado.data!));
                    mensajero.showSnackBar(const SnackBar(content: Text('Tus datos se copiaron')));
                  },
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: ColoresUtb.fondoProfundo,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: ColoresUtb.borde),
                  ),
                  child: SelectableText(
                    estado.data!,
                    style: const TextStyle(fontFamily: 'monospace', fontSize: 12, height: 1.45, color: ColoresUtb.textoSuave),
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

/// "Eliminar mi cuenta": pide la contraseña, explica qué pasa y avisa si hay algo en curso.
Future<void> abrirEliminarCuenta(BuildContext context) async {
  final sesion = AlcanceSesion.de(context);
  final mensajero = ScaffoldMessenger.of(context);
  final eliminada = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    builder: (_) => AlcanceSesion(sesion: sesion, child: const _HojaEliminar()),
  );
  if (eliminada == true) {
    mensajero.showSnackBar(const SnackBar(content: Text('Tu cuenta fue eliminada. Gracias por haber usado Recobra.')));
  }
}

class _HojaEliminar extends StatefulWidget {
  const _HojaEliminar();

  @override
  State<_HojaEliminar> createState() => _HojaEliminarState();
}

class _HojaEliminarState extends State<_HojaEliminar> {
  final _contrasena = TextEditingController();
  bool _ocupado = false;
  String? _error;

  @override
  void dispose() {
    _contrasena.dispose();
    super.dispose();
  }

  Future<void> _eliminar() async {
    final sesion = AlcanceSesion.de(context);
    final navegador = Navigator.of(context);
    setState(() {
      _ocupado = true;
      _error = null;
    });
    try {
      await sesion.eliminarCuenta(_contrasena.text);
      navegador.pop(true);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _ocupado = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const EncabezadoHoja(titulo: '¿Eliminar tu cuenta?', subtitulo: 'Esta acción no se puede deshacer.'),
          const SizedBox(height: 12),
          const PasosNumerados(
            pasos: [
              'Retiramos lo que sigues teniendo publicado.',
              'Borramos tus avisos y cerramos tus sesiones.',
              'Quitamos tu nombre, tu correo y el texto de las pruebas que escribiste.',
              'No puedes tener reclamaciones ni entregas en curso: así no dejas a nadie esperando.',
            ],
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _contrasena,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Tu contraseña', prefixIcon: Icon(Icons.lock_outline)),
            onChanged: (_) => setState(() {}),
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: ColoresUtb.rojoTexto, height: 1.4)),
          ],
          const SizedBox(height: 16),
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: ColoresUtb.rojoTexto,
              side: BorderSide(color: ColoresUtb.rojo.withValues(alpha: 0.5)),
            ),
            onPressed: _ocupado || _contrasena.text.isEmpty ? null : _eliminar,
            child: Text(_ocupado ? 'Eliminando…' : 'Eliminar mi cuenta'),
          ),
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../api/recobra_api.dart';
import '../estado/sesion.dart';
import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';

const motivosReporte = {
  'falso': 'Parece falsa o una broma',
  'spam': 'Es spam o publicidad',
  'inapropiado': 'Contenido ofensivo o inapropiado',
  'datos_personales': 'Muestra datos personales de alguien',
  'otro': 'Otro motivo',
};

/// Reportar una publicación (moderación, ADR-0022). Exige sesión: el que llama
/// decide qué hacer con un visitante antes de abrir esta hoja.
Future<void> abrirReporte(BuildContext context, Publicacion publicacion) async {
  final sesion = AlcanceSesion.de(context);
  final mensajero = ScaffoldMessenger.of(context);
  final enviado = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    builder: (_) => AlcanceSesion(sesion: sesion, child: _HojaReporte(publicacion: publicacion)),
  );
  if (enviado == true) {
    mensajero.showSnackBar(const SnackBar(content: Text('Gracias, un administrador lo revisará.')));
  }
}

class _HojaReporte extends StatefulWidget {
  const _HojaReporte({required this.publicacion});

  final Publicacion publicacion;

  @override
  State<_HojaReporte> createState() => _HojaReporteState();
}

class _HojaReporteState extends State<_HojaReporte> {
  final _detalle = TextEditingController();
  String? _motivo;
  bool _ocupado = false;
  String? _error;

  @override
  void dispose() {
    _detalle.dispose();
    super.dispose();
  }

  bool get _completo => _motivo != null && (_motivo != 'otro' || _detalle.text.trim().length >= 5);

  Future<void> _enviar() async {
    final sesion = AlcanceSesion.de(context);
    final navegador = Navigator.of(context);
    setState(() {
      _ocupado = true;
      _error = null;
    });
    try {
      await sesion.api.reportarPublicacion(widget.publicacion.id, _motivo!, detalle: _detalle.text.trim());
      navegador.pop(true);
    } catch (e) {
      sesion.revisarError(e);
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
          EncabezadoHoja(titulo: 'Reportar publicación', subtitulo: widget.publicacion.descripcion),
          const SizedBox(height: 12),
          const Text(
            'Recobra es para devolver objetos: no se permiten publicaciones falsas, spam, contenido ofensivo ni datos '
            'personales de otras personas.',
            style: TextStyle(color: ColoresUtb.textoSuave, fontSize: 13, height: 1.45),
          ),
          const SizedBox(height: 12),
          RadioGroup<String>(
            groupValue: _motivo,
            onChanged: (v) => setState(() => _motivo = v),
            child: Column(
              children: [
                for (final e in motivosReporte.entries)
                  RadioListTile<String>(
                    contentPadding: EdgeInsets.zero,
                    value: e.key,
                    title: Text(e.value),
                  ),
              ],
            ),
          ),
          TextField(
            controller: _detalle,
            maxLines: 3,
            maxLength: 300,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              labelText: _motivo == 'otro' ? 'Cuéntanos qué pasa' : 'Detalle (opcional)',
              alignLabelWithHint: true,
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 6),
            Text(_error!, style: const TextStyle(color: ColoresUtb.rojoTexto)),
          ],
          const SizedBox(height: 10),
          FilledButton(
            onPressed: _completo && !_ocupado ? _enviar : null,
            child: Text(_ocupado ? 'Enviando…' : 'Enviar reporte'),
          ),
        ],
      ),
    );
  }
}

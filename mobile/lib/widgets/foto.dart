
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../api/recobra_api.dart';
import '../estado/fotos.dart';
import '../estado/sesion.dart';
import '../servicios/fotos.dart';
import '../tema/tema_utb.dart';

/// Miniatura pública de la foto de una publicación. Mide 24 px y se ve
/// ampliada, así que sale borrosa: da una idea del color y la forma sin
/// mostrar los detalles que sirven para probar que algo es tuyo (ADR-0023).
class MiniaturaFoto extends StatelessWidget {
  const MiniaturaFoto({super.key, required this.publicacionId, this.lado = 56});

  final String publicacionId;
  final double lado;

  @override
  Widget build(BuildContext context) {
    final api = AlcanceSesion.de(context).api;
    return Semantics(
      label: 'Miniatura de la foto del objeto',
      image: true,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Image.network(
          api.urlMiniatura(publicacionId),
          width: lado,
          height: lado,
          fit: BoxFit.cover,
          filterQuality: FilterQuality.medium,
          excludeFromSemantics: true,
          errorBuilder: (_, __, ___) => Container(
            width: lado,
            height: lado,
            color: ColoresUtb.superficieAlta,
            child: const Icon(Icons.image_outlined, color: ColoresUtb.textoApagado),
          ),
        ),
      ),
    );
  }
}

/// Elegir una foto para publicar: muestra la vista previa y deja cambiarla o
/// quitarla. En el celular ofrece cámara o galería; en web, el selector de archivos.
class CampoFoto extends StatelessWidget {
  const CampoFoto({super.key, required this.foto, required this.alElegida, required this.alQuitar, this.alError});

  final FotoPreparada? foto;
  final ValueChanged<FotoPreparada> alElegida;
  final VoidCallback alQuitar;
  final ValueChanged<String>? alError;

  Future<void> _elegir(BuildContext context) async {
    final selector = AlcanceFotos.de(context);
    final origen = await elegirOrigenFoto(context);
    if (origen == null) return;
    try {
      final elegida = await selector.elegir(origen);
      if (elegida != null) alElegida(elegida);
    } on FormatException catch (e) {
      alError?.call(e.message);
    } catch (_) {
      alError?.call('No se pudo abrir la foto. Intenta con otra.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Foto (opcional)', style: TextStyle(color: ColoresUtb.textoSuave, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        if (foto == null)
          OutlinedButton.icon(
            icon: const Icon(Icons.add_a_photo_outlined),
            onPressed: () => _elegir(context),
            label: const Text('Agregar una foto'),
          )
        else
          Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.memory(
                  foto!.completa,
                  width: 96,
                  height: 96,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const SizedBox(width: 96, height: 96, child: Icon(Icons.image_outlined)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Wrap(
                  spacing: 8,
                  children: [
                    TextButton(onPressed: () => _elegir(context), child: const Text('Cambiar')),
                    TextButton(onPressed: alQuitar, child: const Text('Quitar')),
                  ],
                ),
              ),
            ],
          ),
        const SizedBox(height: 6),
        const Text(
          'La reducimos en tu dispositivo y le quitamos los datos ocultos, como la ubicación. '
          'De un objeto encontrado, el público solo ve una miniatura borrosa.',
          style: TextStyle(color: ColoresUtb.textoSuave, fontSize: 12, height: 1.4),
        ),
      ],
    );
  }
}

/// En el celular pregunta cámara o galería; en web no hay cámara que ofrecer.
Future<OrigenFoto?> elegirOrigenFoto(BuildContext context) async {
  if (kIsWeb) return OrigenFoto.galeria;
  return showModalBottomSheet<OrigenFoto>(
    context: context,
    builder: (contexto) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(Icons.photo_camera_outlined),
            title: const Text('Tomar una foto'),
            onTap: () => Navigator.pop(contexto, OrigenFoto.camara),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_outlined),
            title: const Text('Elegir de la galería'),
            onTap: () => Navigator.pop(contexto, OrigenFoto.galeria),
          ),
        ],
      ),
    ),
  );
}

/// La foto en el detalle: miniatura y "Ver foto". La completa de un objeto
/// encontrado solo la ven su autor y quien tiene la reclamación aprobada; para
/// los demás el servidor responde 403 y se explica por qué. Quien publicó,
/// mientras nadie reclama, puede agregarla, cambiarla o quitarla.
class FotoDetalle extends StatefulWidget {
  const FotoDetalle({super.key, required this.publicacion, required this.esAutor, required this.alCambiar});

  final Publicacion publicacion;
  final bool esAutor;

  /// La publicación quedó con otra foto (o sin ella).
  final ValueChanged<Publicacion> alCambiar;

  @override
  State<FotoDetalle> createState() => _FotoDetalleState();
}

class _FotoDetalleState extends State<FotoDetalle> {
  Uint8List? _completa;
  String? _mensaje;
  bool _ocupado = false;

  bool get _editable => widget.esAutor && widget.publicacion.estado == 'publicado';

  @override
  void didUpdateWidget(FotoDetalle anterior) {
    super.didUpdateWidget(anterior);
    if (anterior.publicacion.tieneFoto != widget.publicacion.tieneFoto) _completa = null;
  }

  Future<void> _ver() async {
    final sesion = AlcanceSesion.de(context);
    setState(() {
      _ocupado = true;
      _mensaje = null;
    });
    try {
      final bytes = await sesion.api.fotoCompleta(widget.publicacion.id);
      if (mounted) setState(() => _completa = bytes);
    } on RecobraApiException catch (e) {
      sesion.revisarError(e);
      if (mounted) {
        setState(() => _mensaje = e.statusCode == 403
            ? 'La foto completa de un objeto encontrado la ven quien lo publicó y, cuando se aprueba su '
                'reclamación, quien lo reclamó. Así nadie lo reclama solo por haberlo visto.'
            : e.message);
      }
    } finally {
      if (mounted) setState(() => _ocupado = false);
    }
  }

  Future<void> _cambiar() async {
    final sesion = AlcanceSesion.de(context);
    final selector = AlcanceFotos.de(context);
    final origen = await elegirOrigenFoto(context);
    if (origen == null) return;
    setState(() {
      _ocupado = true;
      _mensaje = null;
    });
    try {
      final foto = await selector.elegir(origen);
      if (foto == null) return;
      final actualizada = await sesion.api.subirFoto(widget.publicacion.id, foto.completa, foto.miniatura);
      widget.alCambiar(actualizada);
    } on FormatException catch (e) {
      if (mounted) setState(() => _mensaje = e.message);
    } catch (e) {
      sesion.revisarError(e);
      if (mounted) setState(() => _mensaje = '$e');
    } finally {
      if (mounted) setState(() => _ocupado = false);
    }
  }

  Future<void> _quitar() async {
    final sesion = AlcanceSesion.de(context);
    setState(() {
      _ocupado = true;
      _mensaje = null;
    });
    try {
      widget.alCambiar(await sesion.api.quitarFoto(widget.publicacion.id));
    } catch (e) {
      sesion.revisarError(e);
      if (mounted) setState(() => _mensaje = '$e');
    } finally {
      if (mounted) setState(() => _ocupado = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.publicacion;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (p.tieneFoto)
          Row(
            children: [
              if (_completa == null)
                MiniaturaFoto(publicacionId: p.id, lado: 72)
              else
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.memory(
                      _completa!,
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => const Text('No se pudo mostrar la foto.'),
                    ),
                  ),
                ),
              if (_completa == null) ...[
                const SizedBox(width: 12),
                OutlinedButton(
                  // El tema estira los botones a todo el ancho; en una fila no cabe.
                  style: OutlinedButton.styleFrom(minimumSize: const Size(0, 44)),
                  onPressed: _ocupado ? null : _ver,
                  child: const Text('Ver foto'),
                ),
              ],
            ],
          ),
        if (_editable)
          Wrap(
            spacing: 8,
            children: [
              TextButton.icon(
                icon: const Icon(Icons.add_a_photo_outlined, size: 18),
                onPressed: _ocupado ? null : _cambiar,
                label: Text(p.tieneFoto ? 'Cambiar foto' : 'Agregar foto'),
              ),
              if (p.tieneFoto) TextButton(onPressed: _ocupado ? null : _quitar, child: const Text('Quitar foto')),
            ],
          ),
        if (_mensaje != null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(_mensaje!, style: const TextStyle(color: ColoresUtb.textoSuave, fontSize: 13, height: 1.4)),
          ),
      ],
    );
  }
}

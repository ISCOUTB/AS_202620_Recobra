import 'dart:math';

import 'package:flutter/material.dart';

import '../estado/sesion.dart';
import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';
import 'acceso.dart';
import 'inicio.dart';

const ubicacionesPredefinidas = [
  'Bloque A1',
  'Bloque A2',
  'Bloque A3',
  'Bloque A4',
  'Bloque A5',
  'Entrada principal',
  'Biblioteca',
  'Cafetería central',
];

/// Publicar un objeto perdido o encontrado. Exige sesión (ADR-0013).
class PublicarPantalla extends StatefulWidget {
  const PublicarPantalla({super.key, required this.alPublicar});

  final VoidCallback alPublicar;

  @override
  State<PublicarPantalla> createState() => PublicarPantallaState();
}

class PublicarPantallaState extends State<PublicarPantalla> {
  final _formKey = GlobalKey<FormState>();
  final _descripcion = TextEditingController();
  final _otraCategoria = TextEditingController();
  final _otraUbicacion = TextEditingController();
  String _tipo = 'perdido';
  String? _categoria;
  String? _ubicacion;
  bool _ocupado = false;

  /// Clave de idempotencia de la creación en curso: se reutiliza si el envío
  /// falla y se reintenta, y se renueva solo tras crear con éxito, para que un
  /// reintento no duplique la publicación (docs/modos-de-fallo.md).
  String _claveIdempotencia = _nuevaClave();

  static String _nuevaClave() {
    final azar = Random.secure();
    return List.generate(16, (_) => azar.nextInt(256).toRadixString(16).padLeft(2, '0')).join();
  }

  /// Deja el formulario listo con el tipo (y la categoría) elegidos en Inicio.
  void preparar(String tipo, {String? categoria}) {
    setState(() {
      _tipo = tipo;
      if (categoria != null) _categoria = categoria;
    });
  }

  @override
  void dispose() {
    _descripcion.dispose();
    _otraCategoria.dispose();
    _otraUbicacion.dispose();
    super.dispose();
  }

  Future<void> _publicar() async {
    if (!_formKey.currentState!.validate()) return;
    final sesion = AlcanceSesion.de(context);
    final mensajero = ScaffoldMessenger.of(context);
    setState(() => _ocupado = true);
    try {
      await sesion.api.crearPublicacion(
        tipo: _tipo,
        descripcion: _descripcion.text.trim(),
        categoria: _categoria == 'otros' && _otraCategoria.text.trim().isNotEmpty
            ? _otraCategoria.text.trim()
            : _categoria!,
        ubicacion: _ubicacion == null ? _otraUbicacion.text.trim() : _ubicacion!,
        claveIdempotencia: _claveIdempotencia,
      );
      _claveIdempotencia = _nuevaClave();
      _formKey.currentState!.reset();
      _descripcion.clear();
      _otraCategoria.clear();
      _otraUbicacion.clear();
      setState(() {
        _categoria = null;
        _ubicacion = null;
      });
      mensajero.showSnackBar(
        const SnackBar(content: Text('Publicación creada. Te avisamos si aparece una coincidencia.')),
      );
    } catch (e) {
      sesion.revisarError(e);
      mensajero.showSnackBar(SnackBar(content: Text('$e Puedes reintentar: no se duplicará.')));
      return;
    } finally {
      if (mounted) setState(() => _ocupado = false);
    }
    widget.alPublicar();
  }

  @override
  Widget build(BuildContext context) {
    final sesion = AlcanceSesion.de(context);
    if (!sesion.activa) return const AccesoPantalla(motivo: 'Para publicar un objeto necesitas tu cuenta institucional.');
    final perdido = _tipo == 'perdido';
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        const EncabezadoUtb(titulo: 'Publicar', subtitulo: 'Toma menos de un minuto.'),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 120),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ControlSegmentado<String>(
                  opciones: const [OpcionSegmento('perdido', 'Lo perdí'), OpcionSegmento('encontrado', 'Lo encontré')],
                  valor: _tipo,
                  alCambiar: (v) => setState(() => _tipo = v),
                ),
                const SizedBox(height: 20),
                TextFormField(
                  controller: _descripcion,
                  maxLength: 200,
                  decoration: InputDecoration(
                    labelText: '¿Qué es? Descríbelo',
                    hintText: 'Audífonos negros, estuche gris',
                    helperText: perdido
                        ? 'Cuéntalo como lo buscarías: color, marca, algo que lo distinga.'
                        : 'Describe lo que se ve. Guarda los detalles íntimos: con ellos el dueño probará que es suyo.',
                    helperMaxLines: 2,
                  ),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Cuéntanos qué es' : null,
                ),
                const SizedBox(height: 12),
                const Text('Categoría', style: TextStyle(color: ColoresUtb.textoSuave, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                FormField<String>(
                  validator: (_) => _categoria == null ? 'Elige una categoría' : null,
                  builder: (campo) => Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final c in categoriasPredefinidas)
                            ChoiceChip(
                              label: Text(nombresCategoria[c]!),
                              selected: _categoria == c,
                              onSelected: (_) => setState(() => _categoria = c),
                            ),
                        ],
                      ),
                      if (campo.hasError)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(campo.errorText!, style: const TextStyle(color: ColoresUtb.rojoTexto, fontSize: 12)),
                        ),
                    ],
                  ),
                ),
                if (_categoria == 'otros') ...[
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _otraCategoria,
                    decoration: const InputDecoration(labelText: '¿Cuál? (opcional)'),
                  ),
                ],
                const SizedBox(height: 20),
                DropdownButtonFormField<String?>(
                  initialValue: _ubicacion,
                  decoration: InputDecoration(
                    labelText: perdido ? '¿Dónde lo perdiste?' : '¿Dónde lo encontraste?',
                    prefixIcon: const Icon(Icons.place_outlined),
                  ),
                  items: [
                    for (final u in ubicacionesPredefinidas) DropdownMenuItem(value: u, child: Text(u)),
                    const DropdownMenuItem(value: null, child: Text('Otra…')),
                  ],
                  onChanged: (v) => setState(() => _ubicacion = v),
                ),
                if (_ubicacion == null) ...[
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _otraUbicacion,
                    decoration: const InputDecoration(labelText: 'Escribe el lugar'),
                    validator: (v) => (_ubicacion == null && (v == null || v.trim().isEmpty)) ? 'Dinos dónde' : null,
                  ),
                ],
                const SizedBox(height: 28),
                FilledButton(
                  onPressed: _ocupado ? null : _publicar,
                  child: Text(_ocupado ? 'Publicando…' : (perdido ? 'Publicar objeto perdido' : 'Publicar objeto encontrado')),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Al publicar buscamos coincidencias y te avisamos.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: ColoresUtb.textoSuave, fontSize: 12),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

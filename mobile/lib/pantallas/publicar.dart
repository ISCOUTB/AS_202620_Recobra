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
  State<PublicarPantalla> createState() => _PublicarPantallaState();
}

class _PublicarPantallaState extends State<PublicarPantalla> {
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
      mensajero.showSnackBar(const SnackBar(content: Text('Publicación creada')));
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
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        const EncabezadoUtb(titulo: 'Publicar', subtitulo: '¿Perdiste o encontraste algo en el campus?'),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 120),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'perdido', label: Text('Lo perdí'), icon: Icon(Icons.search)),
                    ButtonSegment(value: 'encontrado', label: Text('Lo encontré'), icon: Icon(Icons.inventory_2_outlined)),
                  ],
                  selected: {_tipo},
                  onSelectionChanged: (s) => setState(() => _tipo = s.first),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _descripcion,
                  decoration: const InputDecoration(labelText: 'Descripción', hintText: 'Mochila azul con laptop'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Obligatoria' : null,
                ),
                const SizedBox(height: 16),
                const Text('Categoría', style: TextStyle(color: ColoresUtb.textoSuave)),
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
                              label: Text(c),
                              selected: _categoria == c,
                              onSelected: (_) => setState(() => _categoria = c),
                            ),
                        ],
                      ),
                      if (campo.hasError)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(campo.errorText!, style: const TextStyle(color: ColoresUtb.rojo, fontSize: 12)),
                        ),
                    ],
                  ),
                ),
                if (_categoria == 'otros') ...[
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _otraCategoria,
                    decoration: const InputDecoration(labelText: 'Otra categoría (opcional)'),
                  ),
                ],
                const SizedBox(height: 16),
                DropdownButtonFormField<String?>(
                  initialValue: _ubicacion,
                  decoration: const InputDecoration(labelText: 'Ubicación', prefixIcon: Icon(Icons.place_outlined)),
                  items: [
                    for (final u in ubicacionesPredefinidas) DropdownMenuItem(value: u, child: Text(u)),
                    const DropdownMenuItem(value: null, child: Text('Otra…')),
                  ],
                  onChanged: (v) => setState(() => _ubicacion = v),
                ),
                if (_ubicacion == null) ...[
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _otraUbicacion,
                    decoration: const InputDecoration(labelText: 'Escribe la ubicación'),
                    validator: (v) => (_ubicacion == null && (v == null || v.trim().isEmpty)) ? 'Obligatoria' : null,
                  ),
                ],
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _ocupado ? null : _publicar,
                  child: Text(_ocupado ? 'Publicando…' : 'Publicar'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

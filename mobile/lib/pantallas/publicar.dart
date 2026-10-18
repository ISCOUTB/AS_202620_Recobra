import 'dart:math';

import 'package:flutter/material.dart';

import '../api/recobra_api.dart';
import '../estado/sesion.dart';
import '../servicios/fotos.dart';
import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';
import '../widgets/foto.dart';
import 'custodia.dart';
import 'inicio.dart';
import 'requiere_cuenta.dart';

const _cuatroPisos = ['Piso 1', 'Piso 2', 'Piso 3', 'Piso 4'];

/// Se usa solo si `GET /lugares` no responde: la fuente es el catálogo del
/// servidor (`src/domain/lugares/catalogo-lugares.ts`).
const lugaresDeRespaldo = [
  LugarCampus('Bloque A1', _cuatroPisos),
  LugarCampus('Bloque A2', [..._cuatroPisos, 'Piso 5']),
  LugarCampus('Bloque A3', _cuatroPisos),
  LugarCampus('Bloque A4', _cuatroPisos),
  LugarCampus('Bloque A5', _cuatroPisos),
  LugarCampus('Biblioteca', ['Hemeroteca', 'Piso 1', 'Piso 2', 'Piso 3 (sala de estudio)']),
  LugarCampus('Alcatraz', ['Piso 1', 'Piso 2']),
  LugarCampus('El Mesón', []),
  LugarCampus('Cafetería central', []),
  LugarCampus('Panadería', []),
  LugarCampus('Los Bohíos', []),
  LugarCampus('Entrada principal', []),
  LugarCampus('Gimnasio', []),
  LugarCampus('Canchas', []),
  LugarCampus('Parqueadero', []),
];

/// Publicar un objeto perdido o encontrado. Quien no tiene cuenta puede ver y
/// llenar el formulario para saber cómo funciona; al enviarlo se le explica por
/// qué hace falta una cuenta (ADR-0013) y, tras iniciar sesión, vuelve aquí con
/// lo que había escrito.
class PublicarPantalla extends StatefulWidget {
  const PublicarPantalla({super.key, required this.alPublicar, required this.alPedirCuenta});

  final VoidCallback alPublicar;
  final AlPedirCuenta alPedirCuenta;

  @override
  State<PublicarPantalla> createState() => PublicarPantallaState();
}

class PublicarPantallaState extends State<PublicarPantalla> {
  final _formKey = GlobalKey<FormState>();
  final _descripcion = TextEditingController();
  final _otraCategoria = TextEditingController();
  final _otraUbicacion = TextEditingController();
  final _referencia = TextEditingController();
  final _punto = TextEditingController();
  String _custodia = custodiaQuienLoEncontro;
  String _tipo = 'perdido';
  String? _categoria;
  String? _ubicacion;
  String? _piso;
  List<LugarCampus> _lugares = lugaresDeRespaldo;
  bool _lugaresPedidos = false;
  bool _ocupado = false;
  FotoPreparada? _foto;

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
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_lugaresPedidos) return;
    _lugaresPedidos = true;
    AlcanceSesion.de(context).api.lugares().then((lista) {
      if (mounted && lista.isNotEmpty) setState(() => _lugares = lista);
    }).catchError((_) {
      // Sin catálogo del servidor se usa la lista de respaldo.
    });
  }

  @override
  void dispose() {
    _descripcion.dispose();
    _otraCategoria.dispose();
    _otraUbicacion.dispose();
    _referencia.dispose();
    _punto.dispose();
    super.dispose();
  }

  List<String> get _niveles {
    for (final l in _lugares) {
      if (l.nombre == _ubicacion) return l.niveles;
    }
    return const [];
  }

  /// "Piso 2 · Salón 204": el piso elegido en el submenú y la referencia escrita.
  String get _detalle => [_piso, _referencia.text.trim()].whereType<String>().where((s) => s.isNotEmpty).join(' · ');

  /// Sin sesión no se envía: se explica por qué y se ofrece iniciar sesión o crear la cuenta.
  Future<void> _pedirCuenta() async {
    final eleccion = await explicarCuenta(context, AccionConCuenta.publicar);
    if (eleccion == null || !mounted) return;
    widget.alPedirCuenta(crearCuenta: eleccion == EleccionCuenta.crearCuenta);
  }

  Future<void> _publicar() async {
    if (!AlcanceSesion.de(context).activa) {
      await _pedirCuenta();
      return;
    }
    if (!_formKey.currentState!.validate()) return;
    final sesion = AlcanceSesion.de(context);
    final mensajero = ScaffoldMessenger.of(context);
    setState(() => _ocupado = true);
    var avisoFoto = '';
    try {
      final creada = await sesion.api.crearPublicacion(
        tipo: _tipo,
        descripcion: _descripcion.text.trim(),
        categoria: _categoria == 'otros' && _otraCategoria.text.trim().isNotEmpty
            ? _otraCategoria.text.trim()
            : _categoria!,
        ubicacion: _ubicacion == null ? _otraUbicacion.text.trim() : _ubicacion!,
        detalleUbicacion: _detalle,
        custodia: _tipo == 'encontrado' ? _custodia : null,
        puntoCustodia: _punto.text.trim(),
        claveIdempotencia: _claveIdempotencia,
      );
      _claveIdempotencia = _nuevaClave();
      final foto = _foto;
      if (foto != null) {
        try {
          await sesion.api.subirFoto(creada.id, foto.completa, foto.miniatura);
        } catch (e) {
          sesion.revisarError(e);
          avisoFoto = ' Pero la foto no se pudo subir ($e); agrégala desde el detalle en Mis cosas.';
        }
      }
      _formKey.currentState!.reset();
      _descripcion.clear();
      _otraCategoria.clear();
      _otraUbicacion.clear();
      _referencia.clear();
      _punto.clear();
      setState(() {
        _custodia = custodiaQuienLoEncontro;
        _categoria = null;
        _ubicacion = null;
        _piso = null;
        _foto = null;
      });
      mensajero.showSnackBar(
        SnackBar(content: Text('Publicación creada. Te avisamos si aparece una coincidencia.$avisoFoto')),
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
    final perdido = _tipo == 'perdido';
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        EncabezadoUtb(
          titulo: 'Publicar',
          subtitulo: sesion.activa ? 'Toma menos de un minuto.' : 'Así se publica en Recobra.',
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 120),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (!sesion.activa) ...[
                  const AvisoExplorando(
                    texto: 'Estás explorando sin cuenta. Llena el formulario para ver cómo funciona; '
                        'para enviarlo te pediremos iniciar sesión y te explicamos por qué.',
                  ),
                  const SizedBox(height: 16),
                ],
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
                    for (final l in _lugares) DropdownMenuItem(value: l.nombre, child: Text(l.nombre)),
                    const DropdownMenuItem(value: null, child: Text('Otra…')),
                  ],
                  onChanged: (v) => setState(() {
                    _ubicacion = v;
                    _piso = null;
                  }),
                ),
                if (_ubicacion == null) ...[
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _otraUbicacion,
                    decoration: const InputDecoration(labelText: 'Escribe el lugar'),
                    validator: (v) => (_ubicacion == null && (v == null || v.trim().isEmpty)) ? 'Dinos dónde' : null,
                  ),
                ],
                if (_niveles.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  const Text(
                    'Sugerencias de piso o zona (opcional)',
                    style: TextStyle(color: ColoresUtb.textoSuave, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final n in _niveles)
                        ChoiceChip(
                          label: Text(n),
                          selected: _piso == n,
                          onSelected: (sel) => setState(() => _piso = sel ? n : null),
                        ),
                    ],
                  ),
                ],
                const SizedBox(height: 12),
                TextFormField(
                  controller: _referencia,
                  maxLength: 80,
                  decoration: const InputDecoration(
                    labelText: 'Otro piso, salón o referencia (opcional)',
                    hintText: 'Piso 5, Salón 204, cerca de los baños…',
                  ),
                ),
                if (!perdido) ...[
                  const SizedBox(height: 8),
                  SelectorCustodia(custodia: _custodia, alCambiar: (v) => setState(() => _custodia = v), punto: _punto),
                ],
                const SizedBox(height: 20),
                CampoFoto(
                  foto: _foto,
                  alElegida: (f) => setState(() => _foto = f),
                  alQuitar: () => setState(() => _foto = null),
                  alError: (mensaje) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(mensaje))),
                ),
                const SizedBox(height: 28),
                FilledButton(
                  onPressed: _ocupado ? null : _publicar,
                  child: Text(_ocupado ? 'Publicando…' : (perdido ? 'Publicar objeto perdido' : 'Publicar objeto encontrado')),
                ),
                const SizedBox(height: 10),
                Text(
                  sesion.activa
                      ? 'Al publicar buscamos coincidencias y te avisamos.'
                      : 'Al tocar Publicar te pediremos iniciar sesión.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: ColoresUtb.textoSuave, fontSize: 12),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

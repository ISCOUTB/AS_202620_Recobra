import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'api/recobra_api.dart';

/// Se puede sobrescribir en tiempo de compilación con
/// `--dart-define=API_BASE_URL=https://recobra.iscoutb.dev` para
/// apuntar al backend desplegado en vez de local (ver README, sección
/// Despliegue). Sin ese flag, usa localhost (desarrollo).
const String _apiBaseUrlOverride = String.fromEnvironment('API_BASE_URL');

/// En web/desktop: localhost. En Android: 127.0.0.1 tras `adb reverse tcp:3000 tcp:3000`
/// (evita cleartext a 10.0.2.2, que Sonar marca como vulnerabilidad).
String defaultApiBaseUrl() {
  if (_apiBaseUrlOverride.isNotEmpty) return _apiBaseUrlOverride;
  if (kIsWeb) return 'http://localhost:3000';
  switch (defaultTargetPlatform) {
    case TargetPlatform.android:
      return 'http://127.0.0.1:3000';
    default:
      return 'http://localhost:3000';
  }
}

void main() {
  runApp(RecobraApp(api: RecobraApi(baseUrl: defaultApiBaseUrl())));
}

class RecobraApp extends StatelessWidget {
  const RecobraApp({super.key, required this.api});

  final RecobraApi api;

  @override
  Widget build(BuildContext context) {
    final colorScheme = ColorScheme.fromSeed(seedColor: const Color(0xFF093AD8));
    return MaterialApp(
      title: 'Recobra',
      theme: ThemeData(
        colorScheme: colorScheme,
        useMaterial3: true,
        cardTheme: const CardThemeData(
          elevation: 0,
          margin: EdgeInsets.zero,
        ),
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(),
          filled: true,
        ),
      ),
      home: PublicacionPage(api: api),
    );
  }
}

/// Colores por tipo de publicación: ayuda a distinguir de un vistazo "perdido"
/// de "encontrado" en la lista y en la tarjeta de detalle (objetivo de
/// usabilidad del README: "facilitar búsquedas y coincidencias").
Color _colorTipo(BuildContext context, String tipo) {
  return tipo == 'perdido' ? Colors.redAccent.shade200 : Colors.green.shade600;
}

class _ChipTipo extends StatelessWidget {
  const _ChipTipo({required this.tipo});

  final String tipo;

  @override
  Widget build(BuildContext context) {
    final color = _colorTipo(context, tipo);
    return Chip(
      label: Text(
        tipo == 'perdido' ? 'Perdido' : 'Encontrado',
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
      ),
      backgroundColor: color,
      side: BorderSide.none,
      visualDensity: VisualDensity.compact,
    );
  }
}

/// Desplegable con opciones frecuentes del campus + "Otro" para texto
/// libre. `controller` sigue siendo la fuente de verdad para el envío del
/// formulario (igual que antes, cuando era un TextFormField simple):
/// seleccionar una opción predefinida escribe su valor en el controller;
/// seleccionar "Otro" revela un campo de texto atado al mismo controller.
class _CampoConPredefinidos extends StatelessWidget {
  const _CampoConPredefinidos({
    required this.label,
    required this.icon,
    required this.opciones,
    required this.seleccionado,
    required this.controller,
    required this.enabled,
    required this.onSeleccionar,
  });

  final String label;
  final IconData icon;
  final List<String> opciones;
  final String? seleccionado;
  final TextEditingController controller;
  final bool enabled;
  final ValueChanged<String?> onSeleccionar;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DropdownButtonFormField<String>(
          initialValue: seleccionado,
          decoration: InputDecoration(labelText: label, prefixIcon: Icon(icon)),
          items: [
            ...opciones.map((o) => DropdownMenuItem(value: o, child: Text(o))),
            const DropdownMenuItem(value: _otroValor, child: Text('Otro…')),
          ],
          onChanged: enabled ? onSeleccionar : null,
          validator: (v) => v == null ? 'Selecciona una opción' : null,
        ),
        if (seleccionado == _otroValor) ...[
          const SizedBox(height: 8),
          TextFormField(
            controller: controller,
            enabled: enabled,
            decoration: InputDecoration(labelText: 'Escribe $label'.toLowerCase()),
            validator: (v) => (v == null || v.trim().isEmpty) ? 'Obligatoria' : null,
          ),
        ],
      ],
    );
  }
}

/// Valor centinela para "otra categoría/ubicación, la escribo yo" en los
/// desplegables de abajo. No es un valor real de negocio, solo de UI.
const _otroValor = '__otro__';

/// Categorías y ubicaciones típicas del campus, para que publicar sea más
/// rápido que escribir todo a mano. Siempre queda la opción "Otro" para no
/// limitar lo que de verdad se puede perder o encontrar.
const List<String> _categoriasPredefinidas = [
  'electronica',
  'mochilas',
  'llaves',
  'documentos',
  'ropa',
  'accesorios',
];

const List<String> _ubicacionesPredefinidas = [
  'Bloque A1',
  'Bloque A2',
  'Bloque A3',
  'Bloque A4',
  'Bloque A5',
  'Entrada principal',
  'Biblioteca',
  'Cafetería central',
];

class PublicacionPage extends StatefulWidget {
  const PublicacionPage({super.key, required this.api});

  final RecobraApi api;

  @override
  State<PublicacionPage> createState() => _PublicacionPageState();
}

class _PublicacionPageState extends State<PublicacionPage> {
  final _formKey = GlobalKey<FormState>();
  final _descripcionCtrl = TextEditingController();
  final _categoriaCtrl = TextEditingController();
  final _ubicacionCtrl = TextEditingController();
  final _idCtrl = TextEditingController();

  String _tipo = 'perdido';
  String? _categoriaSeleccionada;
  String? _ubicacionSeleccionada;
  bool _busy = false;
  bool _cargandoCoincidencias = false;
  String? _mensaje;
  Publicacion? _ultima;
  List<Coincidencia> _coincidencias = const [];

  @override
  void dispose() {
    _descripcionCtrl.dispose();
    _categoriaCtrl.dispose();
    _ubicacionCtrl.dispose();
    _idCtrl.dispose();
    super.dispose();
  }

  Future<void> _buscarCoincidencias(String publicacionId) async {
    setState(() => _cargandoCoincidencias = true);
    try {
      final coincidencias = await widget.api.listarCoincidencias(publicacionId);
      if (!mounted) return;
      setState(() => _coincidencias = coincidencias);
    } finally {
      if (mounted) setState(() => _cargandoCoincidencias = false);
    }
  }

  Future<void> _crear() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _mensaje = null;
      _coincidencias = const [];
    });
    try {
      final creada = await widget.api.crearPublicacion(
        tipo: _tipo,
        descripcion: _descripcionCtrl.text,
        categoria: _categoriaCtrl.text,
        ubicacion: _ubicacionCtrl.text,
      );
      setState(() {
        _ultima = creada;
        _idCtrl.text = creada.id;
        _mensaje = 'Publicación creada';
      });
      // El emparejamiento se calcula de forma asíncrona en el backend
      // (ADR-0004): puede que la primera consulta todavía no vea el
      // resultado; el usuario puede volver a consultar por id para
      // refrescar la sección de coincidencias.
      await _buscarCoincidencias(creada.id);
    } on RecobraApiException catch (e) {
      setState(() => _mensaje = e.message);
    } catch (e) {
      setState(() => _mensaje = 'Error de red: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _consultar() async {
    final id = _idCtrl.text.trim();
    if (id.isEmpty) {
      setState(() => _mensaje = 'Indica un id para consultar');
      return;
    }
    setState(() {
      _busy = true;
      _mensaje = null;
      _coincidencias = const [];
    });
    try {
      final encontrada = await widget.api.consultarPublicacion(id);
      setState(() {
        _ultima = encontrada;
        _mensaje = 'Publicación encontrada';
      });
      await _buscarCoincidencias(encontrada.id);
    } on RecobraApiException catch (e) {
      setState(() => _mensaje = e.message);
    } catch (e) {
      setState(() => _mensaje = 'Error de red: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Recobra'),
        centerTitle: false,
      ),
      body: SafeArea(
        // Ancho máximo centrado: en navegador de escritorio se ve como una
        // columna de app, no como un formulario estirado a todo el monitor.
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  'Objetos perdidos y encontrados en el campus',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
                const SizedBox(height: 16),
                Card(
                  color: Theme.of(context).colorScheme.surfaceContainerLow,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            'Publicar objeto perdido o encontrado',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 12),
                          SegmentedButton<String>(
                            segments: const [
                              ButtonSegment(value: 'perdido', label: Text('Perdido')),
                              ButtonSegment(value: 'encontrado', label: Text('Encontrado')),
                            ],
                            selected: {_tipo},
                            onSelectionChanged: _busy
                                ? null
                                : (seleccion) => setState(() => _tipo = seleccion.first),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _descripcionCtrl,
                            enabled: !_busy,
                            decoration: const InputDecoration(
                              labelText: 'Descripción',
                              prefixIcon: Icon(Icons.notes_outlined),
                            ),
                            validator: (v) =>
                                (v == null || v.trim().isEmpty) ? 'Obligatoria' : null,
                          ),
                          const SizedBox(height: 8),
                          _CampoConPredefinidos(
                            label: 'Categoría',
                            icon: Icons.category_outlined,
                            opciones: _categoriasPredefinidas,
                            seleccionado: _categoriaSeleccionada,
                            controller: _categoriaCtrl,
                            enabled: !_busy,
                            onSeleccionar: (valor) => setState(() {
                              _categoriaSeleccionada = valor;
                              if (valor != _otroValor) _categoriaCtrl.text = valor ?? '';
                            }),
                          ),
                          const SizedBox(height: 8),
                          _CampoConPredefinidos(
                            label: 'Ubicación',
                            icon: Icons.place_outlined,
                            opciones: _ubicacionesPredefinidas,
                            seleccionado: _ubicacionSeleccionada,
                            controller: _ubicacionCtrl,
                            enabled: !_busy,
                            onSeleccionar: (valor) => setState(() {
                              _ubicacionSeleccionada = valor;
                              if (valor != _otroValor) _ubicacionCtrl.text = valor ?? '';
                            }),
                          ),
                          const SizedBox(height: 16),
                          FilledButton.icon(
                            onPressed: _busy ? null : _crear,
                            icon: const Icon(Icons.add_circle_outline),
                            label: const Text('Crear publicación'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  color: Theme.of(context).colorScheme.surfaceContainerLow,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text('Consultar por id', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _idCtrl,
                          enabled: !_busy,
                          decoration: const InputDecoration(
                            labelText: 'Id',
                            prefixIcon: Icon(Icons.search),
                          ),
                        ),
                        const SizedBox(height: 8),
                        OutlinedButton.icon(
                          onPressed: _busy ? null : _consultar,
                          icon: const Icon(Icons.search),
                          label: const Text('Consultar'),
                        ),
                      ],
                    ),
                  ),
                ),
                if (_busy) ...[
                  const SizedBox(height: 16),
                  const Center(child: CircularProgressIndicator()),
                ],
                if (_mensaje != null) ...[
                  const SizedBox(height: 16),
                  Text(_mensaje!),
                ],
                if (_ultima != null) ...[
                  const SizedBox(height: 16),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              _ChipTipo(tipo: _ultima!.tipo),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _ultima!.descripcion,
                                  style: Theme.of(context).textTheme.titleSmall,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text('Id: ${_ultima!.id}'),
                          Text('Categoría: ${_ultima!.categoria}'),
                          Text('Ubicación: ${_ultima!.ubicacion}'),
                          Text('Estado: ${_ultima!.estado}'),
                          Text('Creado: ${_ultima!.creadoEn}'),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text('Coincidencias', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  if (_cargandoCoincidencias)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: LinearProgressIndicator(),
                    )
                  else if (_coincidencias.isEmpty)
                    const Text('Todavía no hay coincidencias para esta publicación.')
                  else
                    ..._coincidencias.map(
                      (c) => Card(
                        child: ListTile(
                          leading: const Icon(Icons.link),
                          title: Text('Publicación ${c.publicacionCoincidenteId}'),
                          subtitle: Text('Probabilidad: ${(c.score * 100).round()}%'),
                        ),
                      ),
                    ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'api/recobra_api.dart';

/// En web/desktop: localhost. En Android: 127.0.0.1 tras `adb reverse tcp:3000 tcp:3000`
/// (evita cleartext a 10.0.2.2, que Sonar marca como vulnerabilidad).
String defaultApiBaseUrl() {
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
    return MaterialApp(
      title: 'Recobra',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0B4F6C)),
        useMaterial3: true,
      ),
      home: PublicacionPage(api: api),
    );
  }
}

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
  bool _busy = false;
  String? _mensaje;
  Publicacion? _ultima;

  @override
  void dispose() {
    _descripcionCtrl.dispose();
    _categoriaCtrl.dispose();
    _ubicacionCtrl.dispose();
    _idCtrl.dispose();
    super.dispose();
  }

  Future<void> _crear() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _mensaje = null;
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
        _mensaje = 'Publicación creada (${creada.id})';
      });
    } on RecobraApiException catch (e) {
      setState(() => _mensaje = e.message);
    } catch (e) {
      setState(() => _mensaje = 'Error de red: $e');
    } finally {
      setState(() => _busy = false);
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
    });
    try {
      final encontrada = await widget.api.consultarPublicacion(id);
      setState(() {
        _ultima = encontrada;
        _mensaje = 'Publicación encontrada';
      });
    } on RecobraApiException catch (e) {
      setState(() => _mensaje = e.message);
    } catch (e) {
      setState(() => _mensaje = 'Error de red: $e');
    } finally {
      setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Recobra')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              'Publicar objeto perdido o encontrado',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            Form(
              key: _formKey,
              child: Column(
                children: [
                  DropdownMenu<String>(
                    initialSelection: _tipo,
                    enabled: !_busy,
                    label: const Text('Tipo'),
                    dropdownMenuEntries: const [
                      DropdownMenuEntry(value: 'perdido', label: 'Perdido'),
                      DropdownMenuEntry(
                        value: 'encontrado',
                        label: 'Encontrado',
                      ),
                    ],
                    onSelected: (value) {
                      if (value != null) setState(() => _tipo = value);
                    },
                  ),
                  TextFormField(
                    controller: _descripcionCtrl,
                    enabled: !_busy,
                    decoration: const InputDecoration(labelText: 'Descripción'),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Obligatoria' : null,
                  ),
                  TextFormField(
                    controller: _categoriaCtrl,
                    enabled: !_busy,
                    decoration: const InputDecoration(labelText: 'Categoría'),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Obligatoria' : null,
                  ),
                  TextFormField(
                    controller: _ubicacionCtrl,
                    enabled: !_busy,
                    decoration: const InputDecoration(labelText: 'Ubicación'),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Obligatoria' : null,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _busy ? null : _crear,
              child: const Text('Crear publicación'),
            ),
            const SizedBox(height: 24),
            Text(
              'Consultar por id',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            TextField(
              controller: _idCtrl,
              enabled: !_busy,
              decoration: const InputDecoration(labelText: 'Id'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: _busy ? null : _consultar,
              child: const Text('Consultar'),
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
                      Text('Id: ${_ultima!.id}'),
                      Text('Tipo: ${_ultima!.tipo}'),
                      Text('Descripción: ${_ultima!.descripcion}'),
                      Text('Categoría: ${_ultima!.categoria}'),
                      Text('Ubicación: ${_ultima!.ubicacion}'),
                      Text('Estado: ${_ultima!.estado}'),
                      Text('Creado: ${_ultima!.creadoEn}'),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

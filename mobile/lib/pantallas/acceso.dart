import 'package:flutter/material.dart';

import '../estado/sesion.dart';
import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';

/// Inicio de sesión y registro con correo institucional (ADR-0013). Se
/// muestra dentro de las pestañas que exigen cuenta.
class AccesoPantalla extends StatefulWidget {
  const AccesoPantalla({super.key, required this.motivo});

  /// Para qué se pide la cuenta ("Para publicar…").
  final String motivo;

  @override
  State<AccesoPantalla> createState() => _AccesoPantallaState();
}

class _AccesoPantallaState extends State<AccesoPantalla> {
  final _formKey = GlobalKey<FormState>();
  final _nombre = TextEditingController();
  final _correo = TextEditingController();
  final _contrasena = TextEditingController();
  bool _registro = false;
  bool _ocupado = false;
  String? _error;

  @override
  void dispose() {
    _nombre.dispose();
    _correo.dispose();
    _contrasena.dispose();
    super.dispose();
  }

  Future<void> _enviar() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _ocupado = true;
      _error = null;
    });
    final sesion = AlcanceSesion.de(context);
    try {
      if (_registro) {
        await sesion.registrarYEntrar(_nombre.text.trim(), _correo.text.trim(), _contrasena.text);
      } else {
        await sesion.entrar(_correo.text.trim(), _contrasena.text);
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _ocupado = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: EdgeInsets.zero,
      children: [
        EncabezadoUtb(titulo: 'Tu cuenta', subtitulo: widget.motivo),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 120),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SegmentedButton<bool>(
                  segments: const [
                    ButtonSegment(value: false, label: Text('Iniciar sesión')),
                    ButtonSegment(value: true, label: Text('Crear cuenta')),
                  ],
                  selected: {_registro},
                  showSelectedIcon: false,
                  onSelectionChanged: (s) => setState(() {
                    _registro = s.first;
                    _error = null;
                  }),
                ),
                const SizedBox(height: 20),
                if (_registro) ...[
                  TextFormField(
                    controller: _nombre,
                    decoration: const InputDecoration(labelText: 'Nombre', prefixIcon: Icon(Icons.person_outline)),
                    validator: (v) => (v == null || v.trim().length < 2) ? 'Escribe tu nombre' : null,
                  ),
                  const SizedBox(height: 12),
                ],
                TextFormField(
                  controller: _correo,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Correo institucional',
                    hintText: 'nombre@utb.edu.co',
                    prefixIcon: Icon(Icons.alternate_email),
                  ),
                  validator: (v) => (v == null || !v.trim().toLowerCase().endsWith('@utb.edu.co'))
                      ? 'Usa tu correo @utb.edu.co'
                      : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _contrasena,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Contraseña', prefixIcon: Icon(Icons.lock_outline)),
                  validator: (v) => (v == null || v.length < 8) ? 'Mínimo 8 caracteres' : null,
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: _ocupado ? null : _enviar,
                  child: Text(_registro ? 'Crear cuenta' : 'Entrar'),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: ColoresUtb.rojo)),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

import 'package:flutter/material.dart';

import '../estado/sesion.dart';
import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';

/// Inicio de sesión y registro con correo institucional (ADR-0013). Se
/// muestra dentro de las pestañas que exigen cuenta.
class AccesoPantalla extends StatefulWidget {
  const AccesoPantalla({super.key, required this.motivo, this.registroInicial = false});

  /// Para qué se pide la cuenta ("Para publicar…").
  final String motivo;

  /// Abrir directamente en "Crear cuenta" (desde la bienvenida).
  final bool registroInicial;

  @override
  State<AccesoPantalla> createState() => _AccesoPantallaState();
}

class _AccesoPantallaState extends State<AccesoPantalla> {
  final _formKey = GlobalKey<FormState>();
  final _nombre = TextEditingController();
  final _correo = TextEditingController();
  final _contrasena = TextEditingController();
  late bool _registro = widget.registroInicial;
  bool _ocupado = false;
  bool _verContrasena = false;
  String? _error;

  @override
  void didUpdateWidget(AccesoPantalla anterior) {
    super.didUpdateWidget(anterior);
    if (widget.registroInicial != anterior.registroInicial) _registro = widget.registroInicial;
  }

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
        EncabezadoUtb(
          sobretitulo: fechaLarga(DateTime.now()),
          titulo: 'Tu cuenta',
          subtitulo: '${widget.motivo} Buscar no necesita cuenta.',
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 120),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ControlSegmentado<bool>(
                  opciones: const [OpcionSegmento(false, 'Iniciar sesión'), OpcionSegmento(true, 'Crear cuenta')],
                  valor: _registro,
                  alCambiar: (v) => setState(() {
                    _registro = v;
                    _error = null;
                  }),
                ),
                const SizedBox(height: 20),
                if (_registro) ...[
                  TextFormField(
                    controller: _nombre,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(labelText: 'Nombre', prefixIcon: Icon(Icons.person_outline)),
                    validator: (v) => (v == null || v.trim().length < 2) ? 'Escribe tu nombre' : null,
                  ),
                  const SizedBox(height: 12),
                ],
                TextFormField(
                  controller: _correo,
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  decoration: const InputDecoration(
                    labelText: 'Correo institucional',
                    hintText: 'nombre@utb.edu.co',
                    helperText: 'Usa tu correo que termina en @utb.edu.co',
                    prefixIcon: Icon(Icons.alternate_email),
                  ),
                  validator: (v) => (v == null || !v.trim().toLowerCase().endsWith('@utb.edu.co'))
                      ? 'Usa tu correo que termina en @utb.edu.co'
                      : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _contrasena,
                  obscureText: !_verContrasena,
                  decoration: InputDecoration(
                    labelText: 'Contraseña',
                    helperText: _registro ? 'Entre 8 y 128 caracteres' : null,
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      tooltip: _verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña',
                      icon: Icon(_verContrasena ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                      onPressed: () => setState(() => _verContrasena = !_verContrasena),
                    ),
                  ),
                  validator: (v) => (v == null || v.length < 8) ? 'Mínimo 8 caracteres' : null,
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: _ocupado ? null : _enviar,
                  child: Text(_registro ? 'Crear cuenta' : 'Entrar'),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: ColoresUtb.rojoTexto)),
                ],
                const SizedBox(height: 16),
                const CajaInfo(
                  icono: Icons.lock_outline_rounded,
                  child: Text('Tu correo solo se muestra a otra persona cuando aprueban una entrega entre ustedes.'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

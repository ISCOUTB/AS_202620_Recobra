import 'package:flutter/material.dart';

import '../api/recobra_api.dart';
import '../estado/sesion.dart';
import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';

const pruebaMinima = 20;
const pruebaMaxima = 1000;

/// Reclamar (ADR-0014): explica en el momento qué es la prueba y qué pasa
/// después. El botón se habilita al llegar a 20 caracteres. Devuelve `true`
/// si la reclamación se envió.
class ReclamarPantalla extends StatefulWidget {
  const ReclamarPantalla({super.key, required this.publicacion});

  final Publicacion publicacion;

  @override
  State<ReclamarPantalla> createState() => _ReclamarPantallaState();
}

class _ReclamarPantallaState extends State<ReclamarPantalla> {
  final _prueba = TextEditingController();
  final _foco = FocusNode();
  bool _ocupado = false;
  String? _error;

  static const _ideas = {
    'Marca o modelo': 'Marca o modelo: ',
    'Qué tenía dentro': 'Tenía dentro: ',
    'Una seña o raya': 'Tiene una seña: ',
  };

  @override
  void dispose() {
    _prueba.dispose();
    _foco.dispose();
    super.dispose();
  }

  void _agregarIdea(String inicio) {
    final actual = _prueba.text.trimRight();
    _prueba.text = actual.isEmpty ? inicio : '$actual. $inicio';
    _prueba.selection = TextSelection.collapsed(offset: _prueba.text.length);
    _foco.requestFocus();
    setState(() {});
  }

  Future<void> _enviar() async {
    final sesion = AlcanceSesion.de(context);
    final navegador = Navigator.of(context);
    final mensajero = ScaffoldMessenger.of(context);
    setState(() {
      _ocupado = true;
      _error = null;
    });
    try {
      await sesion.api.reclamar(widget.publicacion.id, _prueba.text.trim());
      mensajero.showSnackBar(
        const SnackBar(content: Text('Reclamación enviada. Te avisamos cuando la revisen.')),
      );
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
    final largo = _prueba.text.trim().length;
    final suficiente = largo >= pruebaMinima;
    return Scaffold(
      appBar: AppBar(
        backgroundColor: ColoresUtb.fondo,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Reclamar', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            Text(
              widget.publicacion.descripcion,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, color: ColoresUtb.textoSuave),
            ),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: ColoresUtb.superficie,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: ColoresUtb.borde),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '¿QUÉ ES LA PRUEBA?',
                  style: TextStyle(color: ColoresUtb.azulTexto, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.3),
                ),
                const SizedBox(height: 6),
                const Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(text: 'Algo que '),
                      TextSpan(text: 'solo el dueño sabría', style: TextStyle(fontWeight: FontWeight.w700)),
                      TextSpan(text: ' y que no se ve en la publicación. Toca una idea para empezar:'),
                    ],
                  ),
                  style: TextStyle(fontSize: 14, height: 1.5),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final idea in _ideas.entries)
                      ActionChip(label: Text(idea.key), onPressed: () => _agregarIdea(idea.value)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _prueba,
            focusNode: _foco,
            maxLines: 5,
            maxLength: pruebaMaxima,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              labelText: 'Tu prueba',
              alignLabelWithHint: true,
              hintText: 'Ej.: el estuche tiene un sticker de un gato y la almohadilla izquierda está pelada.',
              counterText: '',
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Icon(
                suficiente ? Icons.check_circle_rounded : Icons.edit_note_rounded,
                size: 16,
                color: suficiente ? ColoresUtb.verde : ColoresUtb.textoSuave,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  suficiente ? 'Suficiente (mínimo $pruebaMinima)' : 'Faltan ${pruebaMinima - largo} caracteres (mínimo $pruebaMinima)',
                  style: TextStyle(fontSize: 12, color: suficiente ? ColoresUtb.verde : ColoresUtb.textoSuave),
                ),
              ),
              Text('$largo / $pruebaMaxima', style: const TextStyle(fontSize: 12, color: ColoresUtb.textoSuave)),
            ],
          ),
          const SizedBox(height: 12),
          const CajaInfo(
            icono: Icons.shield_outlined,
            color: ColoresUtb.naranja,
            child: Text('No escribas contraseñas, números de documento ni de tarjeta.'),
          ),
          const SizedBox(height: 20),
          const Text('Qué pasa después', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          const PasosNumerados(
            pasos: [
              'Quien lo encontró lee tu prueba. Mientras tanto el objeto queda en verificación.',
              'Te llega un aviso cuando la apruebe o la rechace.',
              'Si la aprueba, verás su correo en Mis cosas para acordar la entrega.',
            ],
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: const TextStyle(color: ColoresUtb.rojoTexto)),
          ],
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
          decoration: const BoxDecoration(
            color: ColoresUtb.fondo,
            border: Border(top: BorderSide(color: ColoresUtb.borde)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              FilledButton(
                onPressed: suficiente && !_ocupado ? _enviar : null,
                child: Text(_ocupado ? 'Enviando…' : 'Enviar reclamación'),
              ),
              const SizedBox(height: 6),
              const Text(
                'Solo puedes tener una reclamación pendiente por objeto.',
                style: TextStyle(fontSize: 12, color: ColoresUtb.textoSuave),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

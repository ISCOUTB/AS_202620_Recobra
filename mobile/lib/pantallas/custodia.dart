import 'package:flutter/material.dart';

import '../api/recobra_api.dart';
import '../estado/sesion.dart';
import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';
import 'publicar.dart';

const custodiaQuienLoEncontro = 'quien_lo_encontro';
const custodiaPunto = 'punto_de_entrega';

/// "Lo tiene quien lo encontró" o "Está en: Portería…" (ADR-0019).
String textoCustodia(Publicacion p) =>
    p.custodia == custodiaPunto ? 'Está en: ${p.puntoCustodia}' : 'Lo tiene quien lo encontró';

String? validarPunto(String custodia, String? valor) {
  if (custodia != custodiaPunto) return null;
  final largo = (valor ?? '').trim().length;
  return largo < 3 || largo > 120 ? 'Dinos dónde lo dejaste' : null;
}

/// ¿Dónde está ahora? "Lo tengo yo" o "Lo dejé en un punto" (portería, oficina…).
class SelectorCustodia extends StatelessWidget {
  const SelectorCustodia({super.key, required this.custodia, required this.alCambiar, required this.punto});

  final String custodia;
  final ValueChanged<String> alCambiar;
  final TextEditingController punto;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('¿Dónde está ahora?', style: TextStyle(color: ColoresUtb.textoSuave, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        ControlSegmentado<String>(
          opciones: const [
            OpcionSegmento(custodiaQuienLoEncontro, 'Lo tengo yo'),
            OpcionSegmento(custodiaPunto, 'Lo dejé en un punto'),
          ],
          valor: custodia,
          alCambiar: alCambiar,
        ),
        if (custodia == custodiaPunto) ...[
          const SizedBox(height: 12),
          TextFormField(
            controller: punto,
            maxLength: 120,
            decoration: const InputDecoration(
              labelText: '¿Dónde lo dejaste?',
              hintText: 'Portería de la entrada principal',
              prefixIcon: Icon(Icons.storefront_outlined),
            ),
            validator: (v) => validarPunto(custodia, v),
          ),
        ],
      ],
    );
  }
}

/// Hoja para que quien encontró el objeto actualice dónde está.
Future<void> editarCustodia(BuildContext context, Publicacion publicacion, {required VoidCallback alCambiar}) async {
  final sesion = AlcanceSesion.de(context);
  final mensajero = ScaffoldMessenger.of(context);
  final guardado = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    builder: (_) => AlcanceSesion(sesion: sesion, child: _HojaCustodia(publicacion: publicacion)),
  );
  if (guardado == true) {
    mensajero.showSnackBar(const SnackBar(content: Text('Listo: actualizamos dónde está.')));
    alCambiar();
  }
}

class _HojaCustodia extends StatefulWidget {
  const _HojaCustodia({required this.publicacion});

  final Publicacion publicacion;

  @override
  State<_HojaCustodia> createState() => _HojaCustodiaState();
}

class _HojaCustodiaState extends State<_HojaCustodia> {
  final _form = GlobalKey<FormState>();
  late String _custodia = widget.publicacion.custodia ?? custodiaQuienLoEncontro;
  late final _punto = TextEditingController(text: widget.publicacion.puntoCustodia ?? '');
  String? _error;

  @override
  void dispose() {
    _punto.dispose();
    super.dispose();
  }

  Future<void> _guardar() async {
    if (!_form.currentState!.validate()) return;
    final sesion = AlcanceSesion.de(context);
    final navegador = Navigator.of(context);
    try {
      await sesion.api.cambiarCustodia(widget.publicacion.id, _custodia, _punto.text.trim());
      navegador.pop(true);
    } catch (e) {
      sesion.revisarError(e);
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: Form(
        key: _form,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            EncabezadoHoja(titulo: 'Dónde está', subtitulo: widget.publicacion.descripcion),
            const SizedBox(height: 16),
            SelectorCustodia(custodia: _custodia, alCambiar: (v) => setState(() => _custodia = v), punto: _punto),
            const SizedBox(height: 16),
            FilledButton(onPressed: _guardar, child: const Text('Guardar')),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: const TextStyle(color: ColoresUtb.rojoTexto)),
            ],
          ],
        ),
      ),
    );
  }
}

/// "Lo tengo yo" sobre un objeto perdido (ADR-0019): crea un encontrado
/// enlazado y le avisa al dueño, que igual lo reclama con su prueba.
/// Devuelve `true` si se envió.
class ReportarHallazgoPantalla extends StatefulWidget {
  const ReportarHallazgoPantalla({super.key, required this.perdido});

  final Publicacion perdido;

  @override
  State<ReportarHallazgoPantalla> createState() => _ReportarHallazgoPantallaState();
}

class _ReportarHallazgoPantallaState extends State<ReportarHallazgoPantalla> {
  final _form = GlobalKey<FormState>();
  final _descripcion = TextEditingController();
  final _otroLugar = TextEditingController();
  final _referencia = TextEditingController();
  final _punto = TextEditingController();
  List<LugarCampus> _lugares = lugaresDeRespaldo;
  String? _lugar;
  String _custodia = custodiaQuienLoEncontro;
  bool _ocupado = false;
  bool _lugaresPedidos = false;
  String? _error;

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
    _otroLugar.dispose();
    _referencia.dispose();
    _punto.dispose();
    super.dispose();
  }

  Future<void> _enviar() async {
    if (!_form.currentState!.validate()) return;
    final sesion = AlcanceSesion.de(context);
    final navegador = Navigator.of(context);
    final mensajero = ScaffoldMessenger.of(context);
    setState(() {
      _ocupado = true;
      _error = null;
    });
    try {
      await sesion.api.reportarHallazgo(
        widget.perdido.id,
        descripcion: _descripcion.text.trim(),
        ubicacion: _lugar ?? _otroLugar.text.trim(),
        detalleUbicacion: _referencia.text.trim(),
        custodia: _custodia,
        puntoCustodia: _punto.text.trim(),
      );
      mensajero.showSnackBar(
        const SnackBar(content: Text('Le avisamos a quien lo perdió. Si es suyo, lo reclamará con una prueba.')),
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
    return Scaffold(
      appBar: AppBar(
        backgroundColor: ColoresUtb.fondo,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Lo tengo yo', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            Text(
              widget.perdido.descripcion,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, color: ColoresUtb.textoSuave),
            ),
          ],
        ),
      ),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            const CajaInfo(
              child: Text(
                'Le avisaremos a quien lo perdió. Para que se lo entregues, tendrá que reclamarlo con algo que '
                'solo el dueño sabría; tú decides si es suyo.',
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _descripcion,
              maxLength: 200,
              decoration: const InputDecoration(
                labelText: '¿Qué tienes?',
                hintText: 'Audífonos negros en estuche',
                helperText: 'Describe lo que se ve. Guarda los detalles íntimos para verificar al dueño.',
                helperMaxLines: 2,
              ),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Cuéntanos qué tienes' : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String?>(
              initialValue: _lugar,
              decoration: const InputDecoration(labelText: '¿Dónde lo encontraste?', prefixIcon: Icon(Icons.place_outlined)),
              items: [
                for (final l in _lugares) DropdownMenuItem(value: l.nombre, child: Text(l.nombre)),
                const DropdownMenuItem(value: null, child: Text('Otra…')),
              ],
              onChanged: (v) => setState(() => _lugar = v),
            ),
            if (_lugar == null) ...[
              const SizedBox(height: 12),
              TextFormField(
                controller: _otroLugar,
                decoration: const InputDecoration(labelText: 'Escribe el lugar'),
                validator: (v) => (_lugar == null && (v == null || v.trim().isEmpty)) ? 'Dinos dónde' : null,
              ),
            ],
            const SizedBox(height: 12),
            TextFormField(
              controller: _referencia,
              maxLength: 80,
              decoration: const InputDecoration(labelText: 'Piso, salón o referencia (opcional)'),
            ),
            const SizedBox(height: 8),
            SelectorCustodia(custodia: _custodia, alCambiar: (v) => setState(() => _custodia = v), punto: _punto),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: ColoresUtb.rojoTexto)),
            ],
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
          decoration: const BoxDecoration(
            color: ColoresUtb.fondo,
            border: Border(top: BorderSide(color: ColoresUtb.borde)),
          ),
          child: FilledButton(
            onPressed: _ocupado ? null : _enviar,
            child: Text(_ocupado ? 'Enviando…' : 'Avisar que lo tengo'),
          ),
        ),
      ),
    );
  }
}

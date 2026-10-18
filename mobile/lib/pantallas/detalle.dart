import 'package:flutter/material.dart';

import '../api/recobra_api.dart';
import '../estado/sesion.dart';
import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';
import 'custodia.dart';
import 'reclamar.dart';

/// Lo que pasó en el detalle: se envió una reclamación o un "Lo tengo yo".
enum ResultadoDetalle { reclamo, hallazgo }

/// Abre el detalle de una publicación en una hoja inferior.
Future<ResultadoDetalle?> abrirDetalle(BuildContext context, Publicacion p, {required VoidCallback alPedirCuenta}) {
  final sesion = AlcanceSesion.de(context);
  return showModalBottomSheet<ResultadoDetalle>(
    context: context,
    isScrollControlled: true,
    builder: (_) => AlcanceSesion(
      sesion: sesion,
      child: DetallePublicacion(publicacion: p, alPedirCuenta: alPedirCuenta),
    ),
  );
}

/// Detalle: datos, coincidencias lado a lado ("lo que perdiste / lo que
/// encontraron") y, si es un objeto encontrado ajeno, reclamarlo.
class DetallePublicacion extends StatefulWidget {
  const DetallePublicacion({super.key, required this.publicacion, required this.alPedirCuenta});

  final Publicacion publicacion;
  final VoidCallback alPedirCuenta;

  @override
  State<DetallePublicacion> createState() => _DetallePublicacionState();
}

class _DetallePublicacionState extends State<DetallePublicacion> {
  late Future<List<Coincidencia>> _coincidencias;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _coincidencias = AlcanceSesion.de(context).api.listarCoincidencias(widget.publicacion.id);
  }

  bool _puedeReclamar(SesionApp sesion) {
    final p = widget.publicacion;
    return p.tipo == 'encontrado' &&
        estadosReclamables.contains(p.estado) &&
        p.autorId != null &&
        sesion.cuenta?.id != p.autorId;
  }

  Future<void> _reclamar(SesionApp sesion) async {
    if (!sesion.activa) {
      Navigator.pop(context);
      widget.alPedirCuenta();
      return;
    }
    final navegador = Navigator.of(context);
    final enviada = await navegador.push<bool>(
      MaterialPageRoute(
        builder: (_) => AlcanceSesion(sesion: sesion, child: ReclamarPantalla(publicacion: widget.publicacion)),
      ),
    );
    if (enviada == true && mounted) navegador.pop(ResultadoDetalle.reclamo);
  }

  /// "Lo tengo yo": solo sobre un perdido ajeno que todavía no apareció.
  bool _puedeDecirLoTengo(SesionApp sesion) {
    final p = widget.publicacion;
    return p.tipo == 'perdido' &&
        estadosReclamables.contains(p.estado) &&
        p.autorId != null &&
        sesion.cuenta?.id != p.autorId;
  }

  Future<void> _loTengo(SesionApp sesion) async {
    if (!sesion.activa) {
      Navigator.pop(context);
      widget.alPedirCuenta();
      return;
    }
    final navegador = Navigator.of(context);
    final enviado = await navegador.push<bool>(
      MaterialPageRoute(
        builder: (_) => AlcanceSesion(sesion: sesion, child: ReportarHallazgoPantalla(perdido: widget.publicacion)),
      ),
    );
    if (enviado == true && mounted) navegador.pop(ResultadoDetalle.hallazgo);
  }

  @override
  Widget build(BuildContext context) {
    final sesion = AlcanceSesion.de(context);
    final p = widget.publicacion;
    final ayuda = ayudaDe(p);
    final esEncontradoAjeno = p.tipo == 'encontrado' && sesion.cuenta?.id != p.autorId;
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      builder: (context, scroll) => Column(
        children: [
          Expanded(
            child: ListView(
              controller: scroll,
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [Etiqueta(p.tipo, color: colorTipo(p.tipo)), EtiquetaEstado(p.estado)],
                      ),
                    ),
                    BotonCerrar(alCerrar: () => Navigator.pop(context)),
                  ],
                ),
                const SizedBox(height: 8),
                Semantics(
                  header: true,
                  child: Text(p.descripcion, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, height: 1.25)),
                ),
                if (ayuda != null) ...[
                  const SizedBox(height: 6),
                  Text(ayuda, style: const TextStyle(color: ColoresUtb.textoSuave, fontSize: 13)),
                ],
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: _Dato('Categoría', p.categoria)),
                    const SizedBox(width: 8),
                    Expanded(child: _Dato('Lugar', p.lugarCompleto)),
                    const SizedBox(width: 8),
                    Expanded(child: _Dato('Fecha', fechaCorta(p.creadoEn))),
                  ],
                ),
                if (p.tipo == 'encontrado') ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Icon(
                        p.custodia == custodiaPunto ? Icons.storefront_outlined : Icons.person_pin_outlined,
                        size: 18,
                        color: ColoresUtb.azulTexto,
                      ),
                      const SizedBox(width: 8),
                      Expanded(child: Text(textoCustodia(p), style: const TextStyle(fontSize: 14))),
                    ],
                  ),
                ],
                const SizedBox(height: 22),
                FutureBuilder<List<Coincidencia>>(
                  future: _coincidencias,
                  builder: (context, estado) {
                    if (estado.connectionState != ConnectionState.done) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    final lista = estado.data ?? const <Coincidencia>[];
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Expanded(
                              child: Text('Coincidencias', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                            ),
                            if (lista.isNotEmpty)
                              Text('${lista.length}', style: const TextStyle(color: ColoresUtb.textoSuave, fontSize: 12)),
                          ],
                        ),
                        const SizedBox(height: 10),
                        if (lista.isEmpty)
                          const Text(
                            'Todavía no hay coincidencias. Te avisamos cuando aparezca algo parecido.',
                            style: TextStyle(color: ColoresUtb.textoSuave),
                          )
                        else
                          for (final c in lista)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: _Comparacion(publicacion: p, coincidencia: c, miCuentaId: sesion.cuenta?.id),
                            ),
                      ],
                    );
                  },
                ),
                if (_puedeReclamar(sesion) || (esEncontradoAjeno && !sesion.activa)) ...[
                  const SizedBox(height: 16),
                  const CajaInfo(
                    child: Text(
                      'Si es tuyo, te pediremos algo que solo el dueño sabría. Quien lo encontró lo revisa y, '
                      'si lo aprueba, verás su correo para acordar la entrega.',
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (_puedeReclamar(sesion) || (esEncontradoAjeno && !sesion.activa && estadosReclamables.contains(p.estado)))
            Container(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
              decoration: const BoxDecoration(border: Border(top: BorderSide(color: ColoresUtb.borde))),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  FilledButton(
                    onPressed: () => _reclamar(sesion),
                    child: Text(sesion.activa ? 'Es mío: reclamar' : 'Inicia sesión para reclamar'),
                  ),
                  TextButton(onPressed: () => Navigator.pop(context), child: const Text('No es mío')),
                ],
              ),
            ),
          if (_puedeDecirLoTengo(sesion) || (p.tipo == 'perdido' && !sesion.activa && estadosReclamables.contains(p.estado)))
            Container(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
              decoration: const BoxDecoration(border: Border(top: BorderSide(color: ColoresUtb.borde))),
              child: FilledButton.icon(
                icon: const Icon(Icons.volunteer_activism_outlined),
                onPressed: () => _loTengo(sesion),
                label: Text(sesion.activa ? 'Lo tengo yo' : 'Inicia sesión para avisar que lo tienes'),
              ),
            ),
        ],
      ),
    );
  }
}

class _Dato extends StatelessWidget {
  const _Dato(this.etiqueta, this.valor);

  final String etiqueta;
  final String valor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(color: ColoresUtb.superficieAlta, borderRadius: BorderRadius.circular(14)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(etiqueta, style: const TextStyle(fontSize: 11, color: ColoresUtb.textoSuave)),
          const SizedBox(height: 2),
          Text(valor, maxLines: 2, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

/// Las dos publicaciones de una coincidencia lado a lado, con el porcentaje
/// en un anillo y las razones del parecido.
class _Comparacion extends StatelessWidget {
  const _Comparacion({required this.publicacion, required this.coincidencia, required this.miCuentaId});

  final Publicacion publicacion;
  final Coincidencia coincidencia;
  final String? miCuentaId;

  @override
  Widget build(BuildContext context) {
    final api = AlcanceSesion.de(context).api;
    final otraId = coincidencia.publicacionOrigenId == publicacion.id
        ? coincidencia.publicacionCoincidenteId
        : coincidencia.publicacionOrigenId;
    return FutureBuilder<Publicacion>(
      future: api.consultarPublicacion(otraId),
      builder: (context, estado) {
        final otra = estado.data;
        if (otra == null) {
          return const SizedBox(height: 120, child: Center(child: CircularProgressIndicator()));
        }
        final perdido = publicacion.tipo == 'perdido' ? publicacion : otra;
        final encontrado = publicacion.tipo == 'perdido' ? otra : publicacion;
        final esMio = miCuentaId != null && perdido.autorId == miCuentaId;
        final mismoLugar = perdido.ubicacion.toLowerCase() == encontrado.ubicacion.toLowerCase();
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: ColoresUtb.fondoProfundo,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: ColoresUtb.borde),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(child: _Lado(esMio ? 'Lo que perdiste' : 'Perdido', perdido)),
                    const SizedBox(width: 10),
                    Expanded(child: _Lado('Lo que encontraron', encontrado)),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  AnilloParecido(score: coincidencia.score),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const _Razon(Icons.check_rounded, ColoresUtb.verde, 'Misma categoría'),
                        const SizedBox(height: 4),
                        _Razon(
                          Icons.place_outlined,
                          ColoresUtb.azulTexto,
                          mismoLugar ? 'Mismo lugar' : 'Lugares distintos (${perdido.ubicacion} y ${encontrado.ubicacion})',
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

class _Lado extends StatelessWidget {
  const _Lado(this.titulo, this.p);

  final String titulo;
  final Publicacion p;

  @override
  Widget build(BuildContext context) {
    final color = colorTipo(p.tipo);
    return Container(
      decoration: BoxDecoration(color: ColoresUtb.superficieAlta, borderRadius: BorderRadius.circular(14)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ExcludeSemantics(
            child: Container(
              width: 4,
              margin: const EdgeInsets.fromLTRB(9, 12, 9, 12),
              decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2)),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(0, 12, 10, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    titulo.toUpperCase(),
                    style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.8),
                  ),
                  const SizedBox(height: 6),
                  Text(p.descripcion, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, height: 1.3)),
                  const SizedBox(height: 6),
                  Text(
                    '${p.categoria}\n${p.lugarCompleto}\n${fechaCorta(p.creadoEn)}',
                    style: const TextStyle(fontSize: 12, color: ColoresUtb.textoSuave, height: 1.4),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Razon extends StatelessWidget {
  const _Razon(this.icono, this.color, this.texto);

  final IconData icono;
  final Color color;
  final String texto;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icono, size: 16, color: color),
        const SizedBox(width: 6),
        Expanded(child: Text(texto, style: const TextStyle(fontSize: 13))),
      ],
    );
  }
}

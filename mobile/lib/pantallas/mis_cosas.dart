import 'package:flutter/material.dart';

import '../api/recobra_api.dart';
import '../estado/sesion.dart';
import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';
import 'acceso.dart';

/// Lo que publiqué (con sus reclamaciones, para aprobar o rechazar) y lo que
/// reclamé (con su estado y, si se aprobó, el contacto). ADR-0014.
class MisCosasPantalla extends StatefulWidget {
  const MisCosasPantalla({super.key});

  @override
  State<MisCosasPantalla> createState() => MisCosasPantallaState();
}

class MisCosasPantallaState extends State<MisCosasPantalla> {
  bool _reclame = false;
  int _version = 0;

  void _recargar() => setState(() => _version++);

  /// Abre una de las dos listas ya recargada (al tocar un aviso de reclamación).
  void mostrar({required bool reclame}) => setState(() {
        _reclame = reclame;
        _version++;
      });

  @override
  Widget build(BuildContext context) {
    final sesion = AlcanceSesion.de(context);
    if (!sesion.activa) {
      return const AccesoPantalla(motivo: 'Inicia sesión para ver lo que publicaste y lo que reclamaste.');
    }
    return RefreshIndicator(
      onRefresh: () async => _recargar(),
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          const EncabezadoUtb(titulo: 'Mis cosas', subtitulo: 'Tus publicaciones y tus reclamaciones'),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 120),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SegmentedButton<bool>(
                  segments: const [
                    ButtonSegment(value: false, label: Text('Lo que publiqué')),
                    ButtonSegment(value: true, label: Text('Lo que reclamé')),
                  ],
                  selected: {_reclame},
                  showSelectedIcon: false,
                  onSelectionChanged: (s) => setState(() => _reclame = s.first),
                ),
                const SizedBox(height: 16),
                if (_reclame)
                  _MisReclamaciones(key: ValueKey('r$_version'))
                else
                  _MisPublicaciones(key: ValueKey('p$_version'), alCambiar: _recargar),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MisPublicaciones extends StatefulWidget {
  const _MisPublicaciones({super.key, required this.alCambiar});

  final VoidCallback alCambiar;

  @override
  State<_MisPublicaciones> createState() => _MisPublicacionesState();
}

class _MisPublicacionesState extends State<_MisPublicaciones> {
  late Future<List<Publicacion>> _carga;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _carga = AlcanceSesion.de(context).api.misPublicaciones();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Publicacion>>(
      future: _carga,
      builder: (context, estado) {
        if (estado.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        if (estado.hasError) {
          final sesion = AlcanceSesion.de(context);
          final error = estado.error!;
          WidgetsBinding.instance.addPostFrameCallback((_) => sesion.revisarError(error));
          return EstadoVacio(icono: Icons.cloud_off, titulo: 'No se pudo cargar', texto: '${estado.error}');
        }
        final lista = estado.data!;
        if (lista.isEmpty) {
          return const EstadoVacio(
            icono: Icons.post_add,
            titulo: 'Aún no has publicado nada',
            texto: 'Lo que publiques aparecerá aquí, con quién lo reclama.',
          );
        }
        return Column(
          children: [
            for (final p in lista)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: TarjetaPublicacion(
                  publicacion: p,
                  pie: p.tipo == 'encontrado' ? _Reclamaciones(publicacion: p, alCambiar: widget.alCambiar) : null,
                ),
              ),
          ],
        );
      },
    );
  }
}

class _Reclamaciones extends StatefulWidget {
  const _Reclamaciones({required this.publicacion, required this.alCambiar});

  final Publicacion publicacion;
  final VoidCallback alCambiar;

  @override
  State<_Reclamaciones> createState() => _ReclamacionesState();
}

class _ReclamacionesState extends State<_Reclamaciones> {
  late Future<List<ReclamacionParaAutor>> _carga;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _carga = AlcanceSesion.de(context).api.reclamacionesDe(widget.publicacion.id);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<ReclamacionParaAutor>>(
      future: _carga,
      builder: (context, estado) {
        if (estado.connectionState != ConnectionState.done) return const LinearProgressIndicator();
        final lista = estado.data ?? const [];
        if (lista.isEmpty) {
          return const Text('Nadie lo ha reclamado todavía.', style: TextStyle(color: ColoresUtb.textoSuave));
        }
        return Column(children: [for (final r in lista) _TarjetaReclamacion(reclamacion: r, alCambiar: widget.alCambiar)]);
      },
    );
  }
}

class _TarjetaReclamacion extends StatelessWidget {
  const _TarjetaReclamacion({required this.reclamacion, required this.alCambiar});

  final ReclamacionParaAutor reclamacion;
  final VoidCallback alCambiar;

  Future<void> _resolver(BuildContext context, bool aprobar) async {
    final sesion = AlcanceSesion.de(context);
    final mensajero = ScaffoldMessenger.of(context);
    String? motivo;
    if (aprobar) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (_) => AlertDialog(
          backgroundColor: ColoresUtb.superficie,
          title: const Text('¿Es el dueño?'),
          content: const Text('El objeto quedará como entregado y cada uno verá el correo del otro para coordinar.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
            TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Aprobar')),
          ],
        ),
      );
      if (ok != true) return;
    } else {
      motivo = await showDialog<String>(context: context, builder: (_) => const _DialogoMotivo());
      if (motivo == null) return;
    }
    try {
      if (aprobar) {
        await sesion.api.aprobar(reclamacion.id);
      } else {
        await sesion.api.rechazar(reclamacion.id, motivo!);
      }
      mensajero.showSnackBar(SnackBar(content: Text(aprobar ? 'Reclamación aprobada' : 'Reclamación rechazada')));
      alCambiar();
    } catch (e) {
      sesion.revisarError(e);
      mensajero.showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = reclamacion;
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: ColoresUtb.superficieAlta,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: ColoresUtb.borde),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(r.reclamanteNombre, style: const TextStyle(fontWeight: FontWeight.w700))),
              Etiqueta(r.estado, color: colorEstadoReclamacion(r.estado)),
            ],
          ),
          const SizedBox(height: 6),
          Text('«${r.prueba}»', style: const TextStyle(fontStyle: FontStyle.italic)),
          if (r.reclamanteCorreo != null) ...[
            const SizedBox(height: 6),
            Text('Contacto para la entrega: ${r.reclamanteCorreo}', style: const TextStyle(color: ColoresUtb.verde)),
          ],
          if (r.motivoRechazo != null) ...[
            const SizedBox(height: 6),
            Text('Motivo: ${r.motivoRechazo}', style: const TextStyle(color: ColoresUtb.textoSuave)),
          ],
          if (r.estado == 'pendiente') ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(42)),
                    onPressed: () => _resolver(context, true),
                    child: const Text('Aprobar'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(foregroundColor: ColoresUtb.rojo, minimumSize: const Size.fromHeight(42)),
                    onPressed: () => _resolver(context, false),
                    child: const Text('Rechazar'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

Color colorEstadoReclamacion(String estado) => switch (estado) {
      'aprobada' => ColoresUtb.verde,
      'rechazada' => ColoresUtb.rojo,
      _ => ColoresUtb.naranja,
    };

class _DialogoMotivo extends StatefulWidget {
  const _DialogoMotivo();

  @override
  State<_DialogoMotivo> createState() => _DialogoMotivoState();
}

class _DialogoMotivoState extends State<_DialogoMotivo> {
  final _texto = TextEditingController();

  @override
  void dispose() {
    _texto.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: ColoresUtb.superficie,
      title: const Text('Motivo del rechazo'),
      content: TextField(
        controller: _texto,
        onChanged: (_) => setState(() {}),
        decoration: const InputDecoration(hintText: 'La descripción no coincide'),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
        TextButton(
          onPressed: _texto.text.trim().length >= 3 ? () => Navigator.pop(context, _texto.text.trim()) : null,
          child: const Text('Rechazar'),
        ),
      ],
    );
  }
}

class _MisReclamaciones extends StatefulWidget {
  const _MisReclamaciones({super.key});

  @override
  State<_MisReclamaciones> createState() => _MisReclamacionesState();
}

class _MisReclamacionesState extends State<_MisReclamaciones> {
  late Future<List<ReclamacionPropia>> _carga;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _carga = AlcanceSesion.de(context).api.misReclamaciones();
  }

  @override
  Widget build(BuildContext context) {
    final api = AlcanceSesion.de(context).api;
    return FutureBuilder<List<ReclamacionPropia>>(
      future: _carga,
      builder: (context, estado) {
        if (estado.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        final lista = estado.data ?? const [];
        if (lista.isEmpty) {
          return const EstadoVacio(
            icono: Icons.back_hand_outlined,
            titulo: 'No has reclamado nada',
            texto: 'Si ves un objeto encontrado que es tuyo, ábrelo en Inicio y pulsa "Es mío".',
          );
        }
        return Column(
          children: [
            for (final r in lista)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: FutureBuilder<Publicacion>(
                                future: api.consultarPublicacion(r.publicacionId),
                                builder: (context, p) => Text(
                                  p.data?.descripcion ?? 'Publicación',
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                                ),
                              ),
                            ),
                            Etiqueta(r.estado, color: colorEstadoReclamacion(r.estado)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text('Enviada el ${fechaCorta(r.creadoEn)}', style: const TextStyle(color: ColoresUtb.textoSuave)),
                        if (r.motivoRechazo != null)
                          Text('Motivo: ${r.motivoRechazo}', style: const TextStyle(color: ColoresUtb.textoSuave)),
                        if (r.contactoCorreo != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            'Aprobada. Coordina la entrega con ${r.contactoNombre}: ${r.contactoCorreo}',
                            style: const TextStyle(color: ColoresUtb.verde),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

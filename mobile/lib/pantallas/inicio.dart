import 'package:flutter/material.dart';

import '../api/recobra_api.dart';
import '../estado/sesion.dart';
import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';

const categoriasPredefinidas = ['electronica', 'mochilas', 'llaves', 'documentos', 'ropa', 'accesorios', 'otros'];

/// Inicio: buscar publicaciones con filtros (escenario S1) y abrir el detalle.
class InicioPantalla extends StatefulWidget {
  const InicioPantalla({super.key, required this.alPedirCuenta});

  /// Lleva a la pestaña de cuenta cuando hace falta iniciar sesión.
  final VoidCallback alPedirCuenta;

  @override
  State<InicioPantalla> createState() => InicioPantallaState();
}

class InicioPantallaState extends State<InicioPantalla> {
  String? _tipo;
  String? _categoria;
  Future<List<Publicacion>>? _carga;
  late RecobraApi _api;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _api = AlcanceSesion.de(context).api;
    _carga ??= _cargar();
  }

  Future<List<Publicacion>> _cargar() => _api.buscarPublicaciones(tipo: _tipo, categoria: _categoria);

  /// Vuelve a pedir la lista (por ejemplo, tras publicar).
  void recargar() {
    setState(() {
      _carga = _cargar();
    });
  }

  @override
  Widget build(BuildContext context) {
    final sesion = AlcanceSesion.de(context);
    final ahora = DateTime.now();
    return RefreshIndicator(
      onRefresh: () async {
        recargar();
        await _carga;
      },
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          EncabezadoUtb(
            sobretitulo: fechaLarga(ahora),
            titulo: sesion.activa ? '${saludo(ahora)}, ${sesion.cuenta!.nombre.split(' ').first}' : 'Recobra',
            subtitulo: 'Objetos perdidos y encontrados en el campus',
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 120),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SegmentedButton<String?>(
                  segments: const [
                    ButtonSegment(value: null, label: Text('Todos')),
                    ButtonSegment(value: 'perdido', label: Text('Perdidos')),
                    ButtonSegment(value: 'encontrado', label: Text('Encontrados')),
                  ],
                  selected: {_tipo},
                  showSelectedIcon: false,
                  onSelectionChanged: (s) {
                    _tipo = s.first;
                    recargar();
                  },
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 38,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      for (final c in [null, ...categoriasPredefinidas])
                        Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(c ?? 'Todas'),
                            selected: _categoria == c,
                            onSelected: (_) {
                              _categoria = c;
                              recargar();
                            },
                          ),
                        ),
                    ],
                  ),
                ),
                const TituloSeccion('Publicaciones', subtitulo: 'Las más recientes primero'),
                FutureBuilder<List<Publicacion>>(
                  future: _carga,
                  builder: (context, estado) {
                    if (estado.connectionState != ConnectionState.done) {
                      return const Padding(
                        padding: EdgeInsets.all(24),
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }
                    if (estado.hasError) {
                      return EstadoVacio(
                        icono: Icons.cloud_off,
                        titulo: 'No se pudo cargar',
                        texto: '${estado.error}. Desliza hacia abajo para reintentar.',
                      );
                    }
                    final lista = estado.data!;
                    if (lista.isEmpty) {
                      return const EstadoVacio(
                        icono: Icons.search_off,
                        titulo: 'Sin resultados',
                        texto: 'No hay publicaciones con esos filtros.',
                      );
                    }
                    return Column(
                      children: [
                        for (final p in lista)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: TarjetaPublicacion(publicacion: p, onTap: () => _abrirDetalle(p)),
                          ),
                      ],
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _abrirDetalle(Publicacion p) async {
    final reclamado = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: ColoresUtb.fondo,
      showDragHandle: true,
      builder: (_) => AlcanceSesion(
        sesion: AlcanceSesion.de(context),
        child: DetallePublicacion(publicacion: p, alPedirCuenta: widget.alPedirCuenta),
      ),
    );
    if (reclamado == true) recargar();
  }
}

/// Detalle: coincidencias detectadas y, si es un objeto encontrado ajeno, reclamarlo.
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
        p.estado != 'reclamado' &&
        p.autorId != null &&
        sesion.cuenta?.id != p.autorId;
  }

  @override
  Widget build(BuildContext context) {
    final sesion = AlcanceSesion.de(context);
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      maxChildSize: 0.95,
      builder: (context, scroll) => ListView(
        controller: scroll,
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
        children: [
          TarjetaPublicacion(publicacion: widget.publicacion),
          const TituloSeccion('Coincidencias', subtitulo: 'Publicaciones que podrían ser el mismo objeto'),
          FutureBuilder<List<Coincidencia>>(
            future: _coincidencias,
            builder: (context, estado) {
              if (estado.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              final lista = estado.data ?? const [];
              if (lista.isEmpty) {
                return const Text(
                  'Todavía no hay coincidencias para esta publicación.',
                  style: TextStyle(color: ColoresUtb.textoSuave),
                );
              }
              return Column(
                children: [
                  for (final c in lista)
                    Card(
                      child: ListTile(
                        leading: const Icon(Icons.link, color: ColoresUtb.azulClaro),
                        title: Text('Coincidencia del ${(c.score * 100).round()} %'),
                        subtitle: const Text('Misma categoría; la ubicación ajusta el puntaje'),
                      ),
                    ),
                ],
              );
            },
          ),
          const SizedBox(height: 20),
          if (_puedeReclamar(sesion))
            FilledButton.icon(
              icon: const Icon(Icons.back_hand_outlined),
              label: const Text('Es mío: reclamar'),
              onPressed: () => _reclamar(sesion),
            )
          else if (widget.publicacion.tipo == 'encontrado' && !sesion.activa)
            OutlinedButton(
              onPressed: () {
                Navigator.pop(context);
                widget.alPedirCuenta();
              },
              child: const Text('Inicia sesión para reclamar'),
            ),
        ],
      ),
    );
  }

  Future<void> _reclamar(SesionApp sesion) async {
    if (!sesion.activa) {
      Navigator.pop(context);
      widget.alPedirCuenta();
      return;
    }
    final prueba = await showDialog<String>(context: context, builder: (_) => const _DialogoPrueba());
    if (prueba == null || !mounted) return;
    final mensajero = ScaffoldMessenger.of(context);
    try {
      await sesion.api.reclamar(widget.publicacion.id, prueba);
      if (!mounted) return;
      Navigator.pop(context, true);
      mensajero.showSnackBar(
        const SnackBar(content: Text('Reclamación enviada. Verás la respuesta en "Mis cosas".')),
      );
    } catch (e) {
      sesion.revisarError(e);
      mensajero.showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }
}

class _DialogoPrueba extends StatefulWidget {
  const _DialogoPrueba();

  @override
  State<_DialogoPrueba> createState() => _DialogoPruebaState();
}

class _DialogoPruebaState extends State<_DialogoPrueba> {
  final _texto = TextEditingController();

  @override
  void dispose() {
    _texto.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final valido = _texto.text.trim().length >= 20;
    return AlertDialog(
      backgroundColor: ColoresUtb.superficie,
      title: const Text('¿Cómo sabemos que es tuyo?'),
      content: TextField(
        controller: _texto,
        maxLines: 4,
        maxLength: 1000,
        onChanged: (_) => setState(() {}),
        decoration: const InputDecoration(
          hintText: 'Algo que solo el dueño sabría: marca, contenido, señas…',
          helperText: 'Mínimo 20 caracteres. Quien lo encontró lo leerá.',
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
        TextButton(
          onPressed: valido ? () => Navigator.pop(context, _texto.text.trim()) : null,
          child: const Text('Enviar reclamación'),
        ),
      ],
    );
  }
}

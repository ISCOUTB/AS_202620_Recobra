import 'dart:async';

import 'package:flutter/material.dart';

import '../api/recobra_api.dart';
import '../estado/avisos.dart';
import '../estado/sesion.dart';
import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';
import 'avisos.dart';
import 'detalle.dart';

const categoriasPredefinidas = ['electronica', 'mochilas', 'llaves', 'documentos', 'ropa', 'accesorios', 'otros'];

const nombresCategoria = {
  'electronica': 'Electrónica',
  'mochilas': 'Mochilas',
  'llaves': 'Llaves',
  'documentos': 'Documentos',
  'ropa': 'Ropa',
  'accesorios': 'Accesorios',
  'otros': 'Otros',
};

/// Inicio: accesos rápidos ("Perdí algo / Encontré algo"), la coincidencia
/// sin leer destacada y lo último del campus con filtros (escenario S1).
class InicioPantalla extends StatefulWidget {
  const InicioPantalla({
    super.key,
    required this.alPedirCuenta,
    required this.alIrAMisCosas,
    required this.alPublicar,
  });

  /// Lleva a la pestaña de cuenta cuando hace falta iniciar sesión.
  final VoidCallback alPedirCuenta;

  /// Lleva a "Mis cosas": `reclame` elige "Lo que reclamé" en vez de "Lo que publiqué".
  final void Function({required bool reclame}) alIrAMisCosas;

  /// Abre Publicar con el tipo ya elegido ("perdido" o "encontrado").
  final void Function(String tipo, {String? categoria}) alPublicar;

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

  void _quitarFiltros() {
    _tipo = null;
    _categoria = null;
    recargar();
  }

  /// Una coincidencia abre la publicación encontrada; una reclamación lleva a "Mis cosas".
  Future<void> _abrirAviso(Notificacion aviso) async {
    if (aviso.tipo != 'coincidencia') {
      widget.alIrAMisCosas(reclame: aviso.tipo != 'reclamacion_nueva');
      return;
    }
    final mensajero = ScaffoldMessenger.of(context);
    try {
      final publicacion = await _api.consultarPublicacion(aviso.publicacionId);
      if (mounted) await _abrirDetalle(publicacion);
    } catch (e) {
      mensajero.showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _abrirDetalle(Publicacion p) async {
    final resultado = await abrirDetalle(context, p, alPedirCuenta: widget.alPedirCuenta);
    if (resultado == null) return;
    recargar();
    widget.alIrAMisCosas(reclame: resultado == ResultadoDetalle.reclamo);
  }

  @override
  Widget build(BuildContext context) {
    final sesion = AlcanceSesion.de(context);
    final avisos = AlcanceAvisos.de(context);
    final destacada = avisos.coincidenciaSinLeer;
    final ahora = DateTime.now();
    return RefreshIndicator(
      onRefresh: () async {
        recargar();
        await avisos.cargar();
        await _carga;
      },
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          EncabezadoUtb(
            sobretitulo: fechaLarga(ahora),
            saludo: sesion.activa ? '${saludo(ahora)},' : null,
            titulo: sesion.activa ? sesion.cuenta!.nombre.split(' ').first : 'Recobra',
            subtitulo: sesion.activa ? null : 'Objetos perdidos y encontrados en el campus',
            accion: sesion.activa ? CampanaAvisos(alAbrirAviso: _abrirAviso) : null,
            inferior: destacada == null
                ? null
                : _TarjetaDestacada(
                    aviso: destacada,
                    alTocar: () {
                      // Abrir sin esperar a que se marque como leído.
                      unawaited(avisos.marcarLeida(destacada));
                      _abrirAviso(destacada);
                    },
                  ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 22, 20, 120),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const TituloSeccion('¿Qué pasó?'),
                IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Expanded(
                        child: _AccesoRapido(
                          icono: Icons.manage_search_rounded,
                          color: ColoresUtb.naranja,
                          titulo: 'Perdí algo',
                          texto: 'Publícalo y te avisamos si aparece',
                          alTocar: () => widget.alPublicar('perdido'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _AccesoRapido(
                          icono: Icons.inventory_2_outlined,
                          color: ColoresUtb.verde,
                          titulo: 'Encontré algo',
                          texto: 'Ayuda a que vuelva a su dueño',
                          alTocar: () => widget.alPublicar('encontrado'),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                const TituloSeccion('En el campus', subtitulo: 'Lo último que se perdió y se encontró'),
                ControlSegmentado<String?>(
                  opciones: const [
                    OpcionSegmento(null, 'Todos'),
                    OpcionSegmento('perdido', 'Perdidos'),
                    OpcionSegmento('encontrado', 'Encontrados'),
                  ],
                  valor: _tipo,
                  alCambiar: (v) {
                    _tipo = v;
                    recargar();
                  },
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: 48,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      for (final c in [null, ...categoriasPredefinidas])
                        Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(c == null ? 'Todas' : nombresCategoria[c]!),
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
                const SizedBox(height: 12),
                FutureBuilder<List<Publicacion>>(
                  future: _carga,
                  builder: (context, estado) {
                    if (estado.connectionState != ConnectionState.done) return const EsqueletoTarjetas();
                    if (estado.hasError) return ErrorConReintento(alReintentar: recargar);
                    final lista = estado.data!;
                    if (lista.isEmpty) return _vacio();
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

  /// El vacío con filtros convierte la búsqueda fallida en una publicación.
  Widget _vacio() {
    final hayFiltros = _tipo != null || _categoria != null;
    if (!hayFiltros) {
      return EstadoVacio(
        icono: Icons.travel_explore_rounded,
        titulo: 'Todavía no hay publicaciones',
        texto: 'Sé el primero: publica lo que perdiste o lo que encontraste.',
        acciones: [FilledButton(onPressed: () => widget.alPublicar('perdido'), child: const Text('Publicar algo'))],
      );
    }
    final nombre = _categoria == null ? 'objetos' : nombresCategoria[_categoria]!.toLowerCase();
    return EstadoVacio(
      icono: Icons.search_off_rounded,
      titulo: 'No hay $nombre con esos filtros',
      texto: 'Publica lo tuyo como perdido y te avisamos apenas alguien encuentre algo parecido.',
      acciones: [
        FilledButton(
          onPressed: () => widget.alPublicar('perdido', categoria: _categoria),
          child: Text(_categoria == null ? 'Publicar lo que perdí' : 'Publicar mis $nombre'),
        ),
        OutlinedButton(onPressed: _quitarFiltros, child: const Text('Quitar filtros')),
      ],
    );
  }
}

/// Coincidencia sin leer, dentro del degradado: lo primero que se ve.
class _TarjetaDestacada extends StatelessWidget {
  const _TarjetaDestacada({required this.aviso, required this.alTocar});

  final Notificacion aviso;
  final VoidCallback alTocar;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: alTocar,
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const BarraLateral(color: ColoresUtb.azulClaro),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(0, 14, 0, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'POSIBLE COINCIDENCIA',
                        style: TextStyle(
                          color: ColoresUtb.azulTexto,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.3,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(aviso.titulo, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 2),
                      Text(
                        aviso.mensaje,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: ColoresUtb.textoSuave, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 12),
                child: Icon(Icons.chevron_right_rounded, color: ColoresUtb.textoSuave),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AccesoRapido extends StatelessWidget {
  const _AccesoRapido({
    required this.icono,
    required this.color,
    required this.titulo,
    required this.texto,
    required this.alTocar,
  });

  final IconData icono;
  final Color color;
  final String titulo;
  final String texto;
  final VoidCallback alTocar;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: alTocar,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: color.withValues(alpha: 0.16), shape: BoxShape.circle),
                child: Icon(icono, color: color, size: 22),
              ),
              const SizedBox(height: 10),
              Text(titulo, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text(texto, style: const TextStyle(fontSize: 12, color: ColoresUtb.textoSuave, height: 1.4)),
            ],
          ),
        ),
      ),
    );
  }
}

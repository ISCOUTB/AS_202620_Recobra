import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api/recobra_api.dart';
import '../estado/sesion.dart';
import '../tema/tema_utb.dart';
import '../widgets/comunes.dart';
import 'acceso.dart';
import 'detalle.dart';

/// Una publicación propia con las reclamaciones que recibió.
class PublicacionConReclamaciones {
  const PublicacionConReclamaciones(this.publicacion, this.reclamaciones);

  final Publicacion publicacion;
  final List<ReclamacionParaAutor> reclamaciones;

  int get pendientes => reclamaciones.where((r) => r.estado == 'pendiente').length;
}

/// Una reclamación propia con la publicación a la que se refiere.
class ReclamacionConPublicacion {
  const ReclamacionConPublicacion(this.reclamacion, this.publicacion);

  final ReclamacionPropia reclamacion;
  final Publicacion? publicacion;
}

ButtonStyle get _estiloDestructivo => OutlinedButton.styleFrom(
      foregroundColor: ColoresUtb.rojoTexto,
      side: BorderSide(color: ColoresUtb.rojo.withValues(alpha: 0.5)),
    );

const _estiloSobretitulo = TextStyle(
  color: ColoresUtb.textoSuave,
  fontSize: 11,
  fontWeight: FontWeight.w700,
  letterSpacing: 1.3,
);

/// "Mis cosas": lo que publiqué (con las reclamaciones por revisar) y lo que reclamé.
class MisCosasPantalla extends StatefulWidget {
  const MisCosasPantalla({super.key});

  @override
  State<MisCosasPantalla> createState() => MisCosasPantallaState();
}

class MisCosasPantallaState extends State<MisCosasPantalla> {
  bool _reclame = false;
  Future<List<PublicacionConReclamaciones>>? _publicadas;
  Future<List<ReclamacionConPublicacion>>? _reclamadas;
  late SesionApp _sesion;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sesion = AlcanceSesion.de(context);
  }

  void _cargar() {
    final api = _sesion.api;
    _publicadas = api.misPublicaciones().then(
          (lista) => Future.wait(
            lista.map(
              (p) async => PublicacionConReclamaciones(
                p,
                p.tipo == 'encontrado' ? await api.reclamacionesDe(p.id) : const [],
              ),
            ),
          ),
        );
    _reclamadas = api.misReclamaciones().then(
          (lista) => Future.wait(
            lista.map((r) async {
              try {
                return ReclamacionConPublicacion(r, await api.consultarPublicacion(r.publicacionId));
              } catch (_) {
                return ReclamacionConPublicacion(r, null);
              }
            }),
          ),
        );
  }

  void _recargar() => setState(_cargar);

  /// Abre una de las dos listas ya recargada (al tocar un aviso de reclamación).
  void mostrar({required bool reclame}) => setState(() {
        _reclame = reclame;
        if (_sesion.activa) _cargar();
      });

  @override
  Widget build(BuildContext context) {
    if (!_sesion.activa) {
      _publicadas = null;
      _reclamadas = null;
      return const AccesoPantalla(motivo: 'Inicia sesión para ver lo que publicaste y lo que reclamaste.');
    }
    if (_publicadas == null) _cargar();
    return FutureBuilder<List<PublicacionConReclamaciones>>(
      future: _publicadas,
      builder: (context, publicadas) {
        final porRevisar = (publicadas.data ?? const []).fold<int>(0, (s, p) => s + p.pendientes);
        return RefreshIndicator(
          onRefresh: () async {
            _recargar();
            await _publicadas;
          },
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              EncabezadoUtb(
                titulo: 'Mis cosas',
                subtitulo: porRevisar > 0
                    ? 'Tienes $porRevisar ${porRevisar == 1 ? 'reclamación' : 'reclamaciones'} por revisar'
                    : 'Lo que publicaste y lo que reclamaste',
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 120),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    ControlSegmentado<bool>(
                      opciones: [
                        OpcionSegmento(
                          false,
                          'Lo que publiqué',
                          contador: porRevisar,
                          descripcionContador: '$porRevisar por revisar',
                        ),
                        const OpcionSegmento(true, 'Lo que reclamé'),
                      ],
                      valor: _reclame,
                      alCambiar: (v) => setState(() => _reclame = v),
                    ),
                    const SizedBox(height: 16),
                    if (_reclame) _listaReclamadas() else _listaPublicadas(publicadas),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _listaPublicadas(AsyncSnapshot<List<PublicacionConReclamaciones>> estado) {
    if (estado.connectionState != ConnectionState.done) return const EsqueletoTarjetas(cantidad: 2);
    if (estado.hasError) {
      final error = estado.error!;
      WidgetsBinding.instance.addPostFrameCallback((_) => _sesion.revisarError(error));
      return ErrorConReintento(alReintentar: _recargar);
    }
    final lista = estado.data!;
    if (lista.isEmpty) {
      return const EstadoVacio(
        icono: Icons.post_add_rounded,
        titulo: 'Aún no has publicado nada',
        texto: 'Cuando publiques algo perdido o encontrado, lo verás aquí con quién lo reclama.',
      );
    }
    return Column(
      children: [
        for (final item in lista)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: TarjetaPublicacion(
              publicacion: item.publicacion,
              onTap: () => abrirDetalle(context, item.publicacion, alPedirCuenta: () {}),
              pie: _pie(item),
            ),
          ),
      ],
    );
  }

  Widget? _pie(PublicacionConReclamaciones item) {
    if (item.publicacion.tipo != 'encontrado') return null;
    if (item.reclamaciones.isEmpty) {
      return const Text('Nadie lo ha reclamado todavía.', style: TextStyle(color: ColoresUtb.textoSuave, fontSize: 13));
    }
    final total = item.reclamaciones.length;
    return Column(
      children: [
        for (var i = 0; i < total; i++)
          _TarjetaReclamacion(
            publicacion: item.publicacion,
            reclamacion: item.reclamaciones[i],
            posicion: i + 1,
            total: total,
            otrasPendientes: item.reclamaciones
                .where((o) => o.estado == 'pendiente' && o.id != item.reclamaciones[i].id)
                .toList(),
            alCambiar: _recargar,
          ),
      ],
    );
  }

  Widget _listaReclamadas() {
    return FutureBuilder<List<ReclamacionConPublicacion>>(
      future: _reclamadas,
      builder: (context, estado) {
        if (estado.connectionState != ConnectionState.done) return const EsqueletoTarjetas(cantidad: 2);
        if (estado.hasError) return ErrorConReintento(alReintentar: _recargar);
        final lista = estado.data!;
        if (lista.isEmpty) {
          return const EstadoVacio(
            icono: Icons.back_hand_outlined,
            titulo: 'No has reclamado nada',
            texto: 'Si ves un objeto encontrado que es tuyo, ábrelo en Inicio y toca "Es mío: reclamar".',
          );
        }
        return Column(
          children: [
            for (final item in lista)
              Padding(padding: const EdgeInsets.only(bottom: 12), child: _TarjetaReclamoPropio(item)),
          ],
        );
      },
    );
  }
}

/// Una reclamación recibida: quién y su prueba como cita, para compararla con
/// el objeto que se tiene en la mano.
class _TarjetaReclamacion extends StatelessWidget {
  const _TarjetaReclamacion({
    required this.publicacion,
    required this.reclamacion,
    required this.posicion,
    required this.total,
    required this.otrasPendientes,
    required this.alCambiar,
  });

  final Publicacion publicacion;
  final ReclamacionParaAutor reclamacion;
  final int posicion;
  final int total;
  final List<ReclamacionParaAutor> otrasPendientes;
  final VoidCallback alCambiar;

  Future<void> _aprobar(BuildContext context) async {
    final sesion = AlcanceSesion.de(context);
    final mensajero = ScaffoldMessenger.of(context);
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => ConfirmarEntrega(publicacion: publicacion, reclamacion: reclamacion, otras: otrasPendientes),
    );
    if (ok != true) return;
    try {
      await sesion.api.aprobar(reclamacion.id);
      mensajero.showSnackBar(
        SnackBar(content: Text('Entregado a ${reclamacion.reclamanteNombre}. Ya puede ver tu correo.')),
      );
      alCambiar();
    } catch (e) {
      sesion.revisarError(e);
      mensajero.showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _rechazar(BuildContext context) async {
    final sesion = AlcanceSesion.de(context);
    final mensajero = ScaffoldMessenger.of(context);
    final motivo = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (_) => RechazarConMotivo(nombre: reclamacion.reclamanteNombre),
    );
    if (motivo == null) return;
    try {
      await sesion.api.rechazar(reclamacion.id, motivo);
      mensajero.showSnackBar(const SnackBar(content: Text('Reclamación rechazada')));
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
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: ColoresUtb.superficieAlta,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ColoresUtb.borde),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              AvatarIniciales(r.reclamanteNombre, radio: 18),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${r.reclamanteNombre} dice que es suyo', style: const TextStyle(fontWeight: FontWeight.w700)),
                    Text('Reclamación $posicion de $total', style: const TextStyle(color: ColoresUtb.textoSuave, fontSize: 12)),
                  ],
                ),
              ),
              Etiqueta(r.estado, color: colorEstadoReclamacion(r.estado)),
            ],
          ),
          const SizedBox(height: 12),
          const Text('SU PRUEBA', style: _estiloSobretitulo),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.only(left: 12),
            decoration: const BoxDecoration(border: Border(left: BorderSide(color: ColoresUtb.azulClaro, width: 2))),
            child: Text('“${r.prueba}”', style: const TextStyle(fontSize: 14, height: 1.5)),
          ),
          if (r.estado == 'pendiente') ...[
            const SizedBox(height: 8),
            const Text(
              'Compárala con el objeto que tienes. ¿Coinciden las señas?',
              style: TextStyle(color: ColoresUtb.textoSuave, fontSize: 12),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    style: _estiloDestructivo,
                    onPressed: () => _rechazar(context),
                    child: const Text('Rechazar'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(child: FilledButton(onPressed: () => _aprobar(context), child: const Text('Aprobar entrega'))),
              ],
            ),
          ],
          if (r.reclamanteCorreo != null) ...[
            const SizedBox(height: 10),
            _Contacto(texto: 'Coordina la entrega con ${r.reclamanteNombre}.', correo: r.reclamanteCorreo!),
          ],
          if (r.motivoRechazo != null) ...[
            const SizedBox(height: 8),
            Text('Motivo: ${r.motivoRechazo}', style: const TextStyle(color: ColoresUtb.textoSuave, fontSize: 13)),
          ],
        ],
      ),
    );
  }
}

/// Aprobar es irreversible: hoja que dice a quién se entrega y qué pasa con
/// las demás reclamaciones, con un botón que repite el nombre.
class ConfirmarEntrega extends StatelessWidget {
  const ConfirmarEntrega({super.key, required this.publicacion, required this.reclamacion, required this.otras});

  final Publicacion publicacion;
  final ReclamacionParaAutor reclamacion;
  final List<ReclamacionParaAutor> otras;

  @override
  Widget build(BuildContext context) {
    final nombre = reclamacion.reclamanteNombre.split(' ').first;
    final consecuencias = [
      'El objeto pasa a Entregado.',
      '$nombre verá tu correo para acordar la entrega.',
      if (otras.length == 1) 'La reclamación de ${otras.single.reclamanteNombre.split(' ').first} se rechaza automáticamente.',
      if (otras.length > 1) 'Las otras ${otras.length} reclamaciones se rechazan automáticamente.',
      'Esta acción no se puede deshacer.',
    ];
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            EncabezadoHoja(titulo: '¿Entregar «${publicacion.descripcion}» a $nombre?'),
            const SizedBox(height: 16),
            Row(
              children: [
                AvatarIniciales(reclamacion.reclamanteNombre, radio: 22),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(reclamacion.reclamanteNombre, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                      Text(
                        'Su prueba: “${reclamacion.prueba}”',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: ColoresUtb.textoSuave, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            const Text('AL CONFIRMAR', style: _estiloSobretitulo),
            const SizedBox(height: 8),
            for (final c in consecuencias)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.arrow_right_rounded, color: ColoresUtb.azulClaro),
                    const SizedBox(width: 4),
                    Expanded(child: Text(c, style: const TextStyle(height: 1.45))),
                  ],
                ),
              ),
            const SizedBox(height: 12),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: Text('Sí, entregar a $nombre')),
            const SizedBox(height: 8),
            OutlinedButton(onPressed: () => Navigator.pop(context, false), child: const Text('Todavía no')),
          ],
        ),
      ),
    );
  }
}

/// Rechazar con motivo: motivos rápidos que rellenan el campo, que sigue editable.
class RechazarConMotivo extends StatefulWidget {
  const RechazarConMotivo({super.key, required this.nombre});

  final String nombre;

  @override
  State<RechazarConMotivo> createState() => _RechazarConMotivoState();
}

class _RechazarConMotivoState extends State<RechazarConMotivo> {
  final _texto = TextEditingController();
  static const _rapidos = ['Las señas no coinciden', 'Falta información', 'Ya apareció su dueño'];

  @override
  void dispose() {
    _texto.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final nombre = widget.nombre.split(' ').first;
    final valido = _texto.text.trim().length >= 3;
    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          EncabezadoHoja(
            titulo: 'Rechazar la reclamación de $nombre',
            subtitulo: '$nombre verá este motivo. Sé claro y amable.',
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final r in _rapidos)
                ActionChip(
                  label: Text(r),
                  onPressed: () => setState(() {
                    _texto.text = '$r: ';
                    _texto.selection = TextSelection.collapsed(offset: _texto.text.length);
                  }),
                ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _texto,
            maxLines: 3,
            maxLength: 300,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(labelText: 'Motivo', alignLabelWithHint: true),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            style: _estiloDestructivo,
            onPressed: valido ? () => Navigator.pop(context, _texto.text.trim()) : null,
            child: const Text('Rechazar reclamación'),
          ),
          const SizedBox(height: 8),
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
        ],
      ),
    );
  }
}

/// Una reclamación propia: su estado en tres pasos y, si se aprobó, el contacto.
class _TarjetaReclamoPropio extends StatelessWidget {
  const _TarjetaReclamoPropio(this.item);

  final ReclamacionConPublicacion item;

  @override
  Widget build(BuildContext context) {
    final r = item.reclamacion;
    final p = item.publicacion;
    final Widget cuerpo;
    if (r.estado == 'aprobada' && r.contactoCorreo != null) {
      cuerpo = _Contacto(
        texto: '${r.contactoNombre ?? 'Quien lo encontró'} aprobó tu reclamación. '
            'Escríbele para acordar dónde y cuándo te lo entrega.',
        correo: r.contactoCorreo!,
      );
    } else if (r.estado == 'rechazada') {
      cuerpo = Text('Motivo: “${r.motivoRechazo ?? 'sin motivo'}”', style: const TextStyle(color: ColoresUtb.textoSuave));
    } else {
      cuerpo = const Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Pasos(actual: 1),
          SizedBox(height: 10),
          Text(
            'Quien lo encontró aún no revisa tu prueba. Te avisamos apenas responda.',
            style: TextStyle(color: ColoresUtb.textoSuave, fontSize: 13),
          ),
        ],
      );
    }
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(p?.descripcion ?? 'Publicación', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 2),
                      Text(
                        [if (p != null) p.lugarCompleto, 'Enviada el ${fechaCorta(r.creadoEn)}'].join(' · '),
                        style: const TextStyle(color: ColoresUtb.textoSuave, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Etiqueta(r.estado, color: colorEstadoReclamacion(r.estado)),
              ],
            ),
            const SizedBox(height: 12),
            cuerpo,
          ],
        ),
      ),
    );
  }
}

/// Enviada → En revisión → Entrega.
class _Pasos extends StatelessWidget {
  const _Pasos({required this.actual});

  final int actual;

  Color _color(int i) {
    if (i < actual) return ColoresUtb.verde;
    if (i == actual) return ColoresUtb.naranja;
    return ColoresUtb.borde;
  }

  @override
  Widget build(BuildContext context) {
    const nombres = ['Enviada', 'En revisión', 'Entrega'];
    return Semantics(
      label: 'Paso ${actual + 1} de 3: ${nombres[actual]}',
      excludeSemantics: true,
      child: Row(
        children: [
          for (var i = 0; i < nombres.length; i++) ...[
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    height: 4,
                    decoration: BoxDecoration(color: _color(i), borderRadius: BorderRadius.circular(2)),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    nombres[i],
                    style: TextStyle(
                      fontSize: 12,
                      color: i <= actual ? ColoresUtb.texto : ColoresUtb.textoSuave,
                      fontWeight: i == actual ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            if (i < nombres.length - 1) const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }
}

/// Contacto que se muestra solo después de aprobar, con botón para copiarlo.
class _Contacto extends StatelessWidget {
  const _Contacto({required this.texto, required this.correo});

  final String texto;
  final String correo;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: ColoresUtb.verde.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ColoresUtb.verde.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(texto, style: const TextStyle(height: 1.45)),
          const SizedBox(height: 8),
          SelectableText(correo, style: const TextStyle(fontWeight: FontWeight.w700, color: ColoresUtb.verde)),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            icon: const Icon(Icons.copy_rounded, size: 18),
            label: const Text('Copiar correo'),
            onPressed: () async {
              final mensajero = ScaffoldMessenger.of(context);
              await Clipboard.setData(ClipboardData(text: correo));
              mensajero.showSnackBar(const SnackBar(content: Text('Correo copiado')));
            },
          ),
        ],
      ),
    );
  }
}

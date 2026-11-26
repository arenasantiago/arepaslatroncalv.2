import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { FechaPipe, PrecioPipe, inicioDelDiaBogota } from '../../core/formato';
import { ESTADOS_PEDIDO, EstadoPedido } from '../../models/pedido.model';
import { SupabaseAdminService } from '../supabase-admin.service';

interface FilaPedido {
  id: string;
  numero: number;
  codigo: string;
  cliente_nombre: string;
  cliente_telefono: string;
  tipo_entrega: 'domicilio' | 'recoger';
  direccion: string | null;
  notas: string | null;
  total: number;
  estado: EstadoPedido;
  creado_en: string;
  pedido_items: { id: number; producto_nombre: string; cantidad: number; precio_unitario: number; subtotal: number }[];
}

type Filtro = 'activos' | 'hoy' | 'todos';

const ACTIVOS: EstadoPedido[] = ['nuevo', 'confirmado', 'preparando', 'listo'];

/** Respaldo si el tiempo real se cae (wifi, suspension): recarga cada minuto. */
const RECARGA_RESPALDO_MS = 60_000;

export const ETIQUETAS_ESTADO: Record<EstadoPedido, string> = {
  nuevo: 'Nuevo',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const COLORES_ESTADO: Record<EstadoPedido, string> = {
  nuevo: 'bg-yellow-100 text-yellow-900 ring-yellow-300',
  confirmado: 'bg-blue-100 text-blue-900 ring-blue-300',
  preparando: 'bg-orange-100 text-orange-900 ring-orange-300',
  listo: 'bg-green-100 text-green-900 ring-green-300',
  entregado: 'bg-gray-100 text-gray-700 ring-gray-300',
  cancelado: 'bg-red-100 text-red-800 ring-red-300',
};

/** Pedidos en vivo: llegan solos por Realtime y se cambia su estado con un clic. */
@Component({
  selector: 'app-pedidos-admin',
  imports: [PrecioPipe, FechaPipe],
  templateUrl: './pedidos-admin.component.html',
})
export class PedidosAdminComponent implements OnInit, OnDestroy {
  private readonly admin = inject(SupabaseAdminService);

  readonly estados = ESTADOS_PEDIDO;
  readonly etiquetas = ETIQUETAS_ESTADO;
  readonly colores = COLORES_ESTADO;
  readonly filtros: { valor: Filtro; texto: string }[] = [
    { valor: 'activos', texto: 'En curso' },
    { valor: 'hoy', texto: 'Hoy' },
    { valor: 'todos', texto: 'Todos' },
  ];

  readonly filtro = signal<Filtro>('activos');
  readonly pedidos = signal<FilaPedido[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly enVivo = signal(false);
  readonly resumenHoy = signal({ cantidad: 0, total: 0 });
  readonly nuevos = computed(() => this.pedidos().filter((p) => p.estado === 'nuevo').length);

  private canal: RealtimeChannel | null = null;
  private recarga: ReturnType<typeof setTimeout> | undefined;
  private respaldo: ReturnType<typeof setInterval> | undefined;
  /** Descarta respuestas viejas si dos cargas se cruzan. */
  private secuencia = 0;
  private readonly alVolver = () => {
    if (document.visibilityState === 'visible') void this.cargar();
  };

  ngOnInit(): void {
    void this.cargar();
    this.escuchar();
    // Al volver a la pestana (o despertar el equipo) se recarga por si algo se perdio.
    document.addEventListener('visibilitychange', this.alVolver);
    this.respaldo = setInterval(() => {
      if (!this.enVivo()) void this.cargar();
    }, RECARGA_RESPALDO_MS);
  }

  ngOnDestroy(): void {
    clearTimeout(this.recarga);
    clearInterval(this.respaldo);
    document.removeEventListener('visibilitychange', this.alVolver);
    if (this.canal) void this.admin.cliente.removeChannel(this.canal);
  }

  cambiarFiltro(filtro: Filtro): void {
    this.filtro.set(filtro);
    void this.cargar();
  }

  async cargar(): Promise<void> {
    const n = ++this.secuencia;
    this.cargando.set(true);
    this.error.set(null);
    const hoy = inicioDelDiaBogota();
    let consulta = this.admin.cliente
      .from('pedidos')
      .select('id,numero,codigo,cliente_nombre,cliente_telefono,tipo_entrega,direccion,notas,total,estado,creado_en,pedido_items(id,producto_nombre,cantidad,precio_unitario,subtotal)')
      .order('creado_en', { ascending: false })
      .limit(100);
    if (this.filtro() === 'activos') consulta = consulta.in('estado', ACTIVOS);
    if (this.filtro() === 'hoy') consulta = consulta.gte('creado_en', hoy);

    const [lista, resumen] = await Promise.all([
      consulta,
      this.admin.cliente.from('pedidos').select('total').gte('creado_en', hoy).neq('estado', 'cancelado').limit(1000),
    ]);
    if (n !== this.secuencia) return;
    this.cargando.set(false);
    if (lista.error) {
      this.error.set('No se pudieron cargar los pedidos. Revisa tu conexión.');
      return;
    }
    this.pedidos.set((lista.data ?? []) as unknown as FilaPedido[]);
    const filas = (resumen.data ?? []) as { total: number }[];
    this.resumenHoy.set({ cantidad: filas.length, total: filas.reduce((s, f) => s + f.total, 0) });
  }

  async cambiarEstado(pedido: FilaPedido, estado: EstadoPedido): Promise<void> {
    if (pedido.estado === estado) return;
    const anterior = pedido.estado;
    this.pedidos.update((lista) => lista.map((p) => (p.id === pedido.id ? { ...p, estado } : p)));
    const { error } = await this.admin.cliente.from('pedidos').update({ estado }).eq('id', pedido.id);
    if (error) {
      this.pedidos.update((lista) => lista.map((p) => (p.id === pedido.id ? { ...p, estado: anterior } : p)));
      this.error.set(`No se pudo cambiar el estado del pedido ${pedido.codigo}.`);
    }
  }

  enlaceCliente(p: FilaPedido): string {
    const texto = `¡Hola ${p.cliente_nombre}! Te escribimos de Arepas La Troncal por tu pedido ${p.codigo}.`;
    return `https://wa.me/${p.cliente_telefono}?text=${encodeURIComponent(texto)}`;
  }

  private escuchar(): void {
    this.canal = this.admin.cliente
      .channel('panel-pedidos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos' }, (cambio) => {
        const nuevo = cambio.new as Partial<FilaPedido>;
        this.aviso.set(`Nuevo pedido #${nuevo.numero ?? ''} de ${nuevo.cliente_nombre ?? 'un cliente'}`);
        sonarAviso();
        this.programarRecarga();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos' }, () => this.programarRecarga())
      // "En vivo" solo cuando Supabase confirma la suscripcion a la BD: el canal responde
      // antes y los pedidos que llegan en ese intervalo no se notifican. Al confirmarse
      // (tambien tras una reconexion) se recarga la lista para no perder ninguno.
      .on('system', {}, (msg: { extension?: string; status?: string }) => {
        if (msg?.extension !== 'postgres_changes') return;
        const ok = msg.status === 'ok';
        this.enVivo.set(ok);
        if (ok) void this.cargar();
      })
      .subscribe((estado) => {
        if (estado !== 'SUBSCRIBED') this.enVivo.set(false);
      });
  }

  /** Un pedido nuevo genera INSERT + UPDATE (total): se agrupan en una sola recarga. */
  private programarRecarga(): void {
    clearTimeout(this.recarga);
    this.recarga = setTimeout(() => void this.cargar(), 500);
  }
}

/** Pitido corto para avisar de un pedido nuevo (el navegador lo permite tras interactuar con la pagina). */
function sonarAviso(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const volumen = ctx.createGain();
    osc.frequency.value = 880;
    volumen.gain.value = 0.15;
    osc.connect(volumen).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => void ctx.close();
  } catch {
    // Sin audio disponible: el aviso visual es suficiente.
  }
}

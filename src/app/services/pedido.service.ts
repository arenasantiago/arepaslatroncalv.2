import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { businessName, whatsappLink } from '../config/business';
import { formatearPrecio } from '../core/formato';
import { SupabaseRestService, interpretarErrorApi } from '../core/supabase-rest.service';
import { normalizarTelefono } from '../core/telefono';
import { DatosCliente, PedidoRegistrado } from '../models/pedido.model';
import { LineaCarrito } from './cart.service';

interface RespuestaCrearPedido {
  codigo: string;
  numero: number;
  total: number;
  items: { nombre: string; cantidad: number; precio_unitario: number; subtotal: number }[];
}

/**
 * Registra el pedido en Supabase (RPC crear_pedido: la BD valida y calcula el total
 * con sus propios precios) y arma el mensaje de WhatsApp con el codigo del pedido.
 * Si la BD no responde, el pedido igual se puede enviar por WhatsApp (sin codigo).
 */
@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly rest = inject(SupabaseRestService);

  crear(datos: DatosCliente, lineas: LineaCarrito[]): Observable<PedidoRegistrado> {
    const disponibles = lineas.filter((l) => l.disponible);
    const sinGuardar = (): PedidoRegistrado => ({
      codigo: null,
      guardado: false,
      total: disponibles.reduce((s, l) => s + l.subtotal, 0),
      lineas: disponibles.map((l) => ({ nombre: l.nombre, cantidad: l.cantidad, precioUnitario: l.precio, subtotal: l.subtotal })),
    });
    if (!this.rest.configurado) return of(sinGuardar());

    return this.rest
      .rpc<RespuestaCrearPedido>('crear_pedido', {
        p_cliente_nombre: datos.nombre.trim(),
        p_cliente_telefono: normalizarTelefono(datos.telefono),
        p_tipo_entrega: datos.tipoEntrega,
        p_direccion: datos.tipoEntrega === 'domicilio' ? datos.direccion.trim() : null,
        p_notas: datos.notas.trim() || null,
        p_items: disponibles.map((l) => ({ producto_id: l.id, cantidad: l.cantidad })),
        p_acepta_tratamiento_datos: datos.aceptaDatos,
      })
      .pipe(
        map((r): PedidoRegistrado => ({
          codigo: r.codigo,
          guardado: true,
          total: r.total,
          lineas: r.items.map((i) => ({
            nombre: i.nombre,
            cantidad: i.cantidad,
            precioUnitario: i.precio_unitario,
            subtotal: i.subtotal,
          })),
        })),
        catchError((err) => {
          const error = interpretarErrorApi(err);
          // Sin conexion con la BD: no se pierde la venta, se envia por WhatsApp sin codigo.
          return error.tipo === 'sin_conexion' ? of(sinGuardar()) : throwError(() => error);
        }),
      );
  }

  enlaceWhatsapp(datos: DatosCliente, pedido: PedidoRegistrado): string {
    return whatsappLink(construirMensajePedido(datos, pedido));
  }
}

/** Texto del mensaje de WhatsApp (funcion pura: facil de probar). */
export function construirMensajePedido(datos: DatosCliente, pedido: PedidoRegistrado): string {
  const lineas = pedido.lineas.map((l) => `• ${l.cantidad} x ${l.nombre}: ${formatearPrecio(l.subtotal)}`);
  const entrega =
    datos.tipoEntrega === 'domicilio' ? `Entrega a domicilio: ${datos.direccion.trim()}` : 'Paso a recoger el pedido';
  const notas = datos.notas.trim();
  return [
    `¡Hola! Quiero hacer este pedido en ${businessName} 🫓`,
    pedido.codigo ? `Pedido: *${pedido.codigo}*` : null,
    '',
    ...lineas,
    '',
    `*Total: ${formatearPrecio(pedido.total)}*`,
    '',
    `Nombre: ${datos.nombre.trim()}`,
    entrega,
    notas ? `Notas: ${notas}` : null,
  ]
    .filter((linea): linea is string => linea !== null)
    .join('\n');
}

export type TipoEntrega = 'domicilio' | 'recoger';

/** Datos que el cliente escribe en el formulario del carrito. */
export interface DatosCliente {
  nombre: string;
  telefono: string;
  tipoEntrega: TipoEntrega;
  direccion: string;
  notas: string;
  aceptaDatos: boolean;
}

export interface LineaPedido {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

/** Resultado de enviar el pedido. */
export interface PedidoRegistrado {
  /** Codigo corto (ej. AT-7K2M9Q). null si no se pudo guardar en la BD. */
  codigo: string | null;
  total: number;
  lineas: LineaPedido[];
  /** true = quedo guardado en la BD con precios calculados por el servidor. */
  guardado: boolean;
}

export const ESTADOS_PEDIDO = ['nuevo', 'confirmado', 'preparando', 'listo', 'entregado', 'cancelado'] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

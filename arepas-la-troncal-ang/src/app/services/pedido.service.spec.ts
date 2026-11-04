import { DatosCliente, PedidoRegistrado } from '../models/pedido.model';
import { construirMensajePedido } from './pedido.service';

const datos = (extra: Partial<DatosCliente> = {}): DatosCliente => ({
  nombre: '  Ana Pérez ',
  telefono: '300 123 4567',
  tipoEntrega: 'recoger',
  direccion: '',
  notas: '',
  aceptaDatos: true,
  ...extra,
});

const pedido = (extra: Partial<PedidoRegistrado> = {}): PedidoRegistrado => ({
  codigo: 'AT-7K2M9Q',
  guardado: true,
  total: 2400,
  lineas: [
    { nombre: 'Telas', cantidad: 2, precioUnitario: 1000, subtotal: 2000 },
    { nombre: 'Redonda', cantidad: 1, precioUnitario: 400, subtotal: 400 },
  ],
  ...extra,
});

const limpio = (texto: string) => texto.replace(/\u00a0/g, ' ');

describe('construirMensajePedido', () => {
  it('incluye codigo, lineas, total y nombre del cliente', () => {
    const m = limpio(construirMensajePedido(datos(), pedido()));
    expect(m).toContain('Pedido: *AT-7K2M9Q*');
    expect(m).toContain('• 2 x Telas: $ 2.000');
    expect(m).toContain('• 1 x Redonda: $ 400');
    expect(m).toContain('*Total: $ 2.400*');
    expect(m).toContain('Nombre: Ana Pérez');
    expect(m).toContain('Paso a recoger el pedido');
  });

  it('con domicilio incluye la direccion y las notas', () => {
    const m = construirMensajePedido(datos({ tipoEntrega: 'domicilio', direccion: 'Cra 20 #8-64', notas: 'Sin cebolla' }), pedido());
    expect(m).toContain('Entrega a domicilio: Cra 20 #8-64');
    expect(m).toContain('Notas: Sin cebolla');
  });

  it('sin codigo (no se pudo guardar) omite la linea del pedido', () => {
    const m = construirMensajePedido(datos(), pedido({ codigo: null, guardado: false }));
    expect(m).not.toContain('Pedido:');
    expect(m).not.toContain('null');
  });
});

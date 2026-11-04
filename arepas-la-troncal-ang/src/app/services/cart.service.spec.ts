import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Producto } from '../models/producto.model';
import { CartService, MAX_POR_PRODUCTO, validarGuardado } from './cart.service';

const producto = (id: number, precio: number): Producto => ({
  id,
  slug: `p-${id}`,
  nombre: `Producto ${id}`,
  descripcion: '',
  precio,
  imagenUrl: null,
  categoriaId: null,
  disponible: true,
  orden: id,
});

describe('CartService', () => {
  let carrito: CartService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    carrito = TestBed.inject(CartService);
  });

  it('agrega productos, suma cantidades y calcula el total', () => {
    carrito.agregar(producto(1, 1000));
    carrito.agregar(producto(1, 1000));
    carrito.agregar(producto(2, 400));
    expect(carrito.cantidadTotal()).toBe(3);
    expect(carrito.total()).toBe(2400);
    expect(carrito.lineas().length).toBe(2);
  });

  it('no pasa del maximo por producto', () => {
    carrito.agregar(producto(1, 1000), 500);
    expect(carrito.cantidadDe(1)).toBe(MAX_POR_PRODUCTO);
    carrito.cambiarCantidad(1, 1000);
    expect(carrito.cantidadDe(1)).toBe(MAX_POR_PRODUCTO);
  });

  it('cambiar la cantidad a 0 quita el producto', () => {
    carrito.agregar(producto(1, 1000));
    carrito.cambiarCantidad(1, 0);
    expect(carrito.lineas().length).toBe(0);
  });

  it('vaciar deja el carrito en cero', () => {
    carrito.agregar(producto(1, 1000));
    carrito.vaciar();
    expect(carrito.total()).toBe(0);
    expect(carrito.cantidadTotal()).toBe(0);
  });
});

describe('validarGuardado (datos de localStorage)', () => {
  it('acepta un carrito bien formado', () => {
    const items = validarGuardado({ v: 1, items: [{ id: 1, nombre: 'Telas', precio: 1000, imagen: null, cantidad: 2 }] });
    expect(items).toEqual([{ id: 1, nombre: 'Telas', precio: 1000, imagen: null, cantidad: 2 }]);
  });

  it('descarta basura, duplicados y cantidades invalidas', () => {
    const items = validarGuardado({
      v: 1,
      items: [
        { id: 1, nombre: 'A', precio: 10, cantidad: 1 },
        { id: 1, nombre: 'A repetido', precio: 10, cantidad: 1 },
        { id: 2, nombre: 'B', precio: 10, cantidad: 0 },
        { id: '3', nombre: 'C', precio: 10, cantidad: 1 },
        { id: 4, nombre: 'D', precio: -5, cantidad: 1 },
        null,
      ],
    });
    expect(items.map((i) => i.id)).toEqual([1]);
  });

  it('limita la cantidad al maximo', () => {
    expect(validarGuardado({ items: [{ id: 1, nombre: 'A', precio: 1, cantidad: 5000 }] })[0].cantidad).toBe(MAX_POR_PRODUCTO);
  });

  it('devuelve vacio si no hay arreglo de items', () => {
    expect(validarGuardado(null)).toEqual([]);
    expect(validarGuardado('texto')).toEqual([]);
    expect(validarGuardado({ items: 'x' })).toEqual([]);
  });
});

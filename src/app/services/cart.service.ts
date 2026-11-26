import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, afterNextRender, computed, effect, inject, signal } from '@angular/core';
import { Producto } from '../models/producto.model';
import { CatalogoService } from './catalogo.service';

/** Lo que se guarda en el navegador (localStorage). */
export interface ItemCarrito {
  id: number;
  nombre: string;
  precio: number;
  imagen: string | null;
  cantidad: number;
}

/** Linea lista para mostrar: precio vigente del catalogo y disponibilidad. */
export interface LineaCarrito extends ItemCarrito {
  subtotal: number;
  disponible: boolean;
}

export const MAX_POR_PRODUCTO = 99;
export const CLAVE_CARRITO = 'arepas.carrito.v1';

/**
 * Carrito con signals. Se guarda en localStorage para no perderlo al recargar o al
 * volver otro dia, y se sincroniza entre pestanas.
 *
 * Se restaura DESPUES de la primera renderizacion: el HTML prerenderizado siempre
 * trae el carrito vacio y restaurarlo antes romperia la hidratacion.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly catalogo = inject(CatalogoService);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly items = signal<ItemCarrito[]>([]);

  /** true cuando ya se leyo lo guardado en el navegador. */
  readonly restaurado = signal(false);

  readonly lineas = computed<LineaCarrito[]>(() => {
    const catalogoFiable = this.catalogo.origen() === 'bd';
    return this.items().map((item) => {
      const producto = this.catalogo.porId(item.id);
      const precio = producto?.precio ?? item.precio;
      return {
        ...item,
        nombre: producto?.nombre ?? item.nombre,
        imagen: producto?.imagenUrl ?? item.imagen,
        precio,
        subtotal: precio * item.cantidad,
        // Con el menu de respaldo no sabemos si algo se agoto: la BD lo valida al pedir.
        disponible: catalogoFiable ? Boolean(producto) : true,
      };
    });
  });

  /** Unidades totales (lo que muestra el globo del carrito). */
  readonly cantidadTotal = computed(() => this.items().reduce((suma, i) => suma + i.cantidad, 0));
  readonly total = computed(() => this.lineas().filter((l) => l.disponible).reduce((suma, l) => suma + l.subtotal, 0));
  readonly hayNoDisponibles = computed(() => this.lineas().some((l) => !l.disponible));

  constructor() {
    if (!this.esNavegador) return;
    afterNextRender(() => {
      this.restaurar();
      this.restaurado.set(true);
    });
    effect(() => {
      const items = this.items();
      if (this.restaurado()) this.guardar(items);
    });
    window.addEventListener('storage', (evento) => {
      if (evento.key === CLAVE_CARRITO) this.restaurar();
    });
  }

  agregar(producto: Producto, cantidad = 1): void {
    this.items.update((items) => {
      const existente = items.find((i) => i.id === producto.id);
      if (existente) {
        return items.map((i) =>
          i.id === producto.id ? { ...i, cantidad: Math.min(MAX_POR_PRODUCTO, i.cantidad + cantidad) } : i,
        );
      }
      return [
        ...items,
        {
          id: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          imagen: producto.imagenUrl,
          cantidad: Math.min(MAX_POR_PRODUCTO, Math.max(1, cantidad)),
        },
      ];
    });
  }

  cambiarCantidad(id: number, cantidad: number): void {
    if (cantidad < 1) {
      this.quitar(id);
      return;
    }
    const valor = Math.min(MAX_POR_PRODUCTO, Math.floor(cantidad));
    this.items.update((items) => items.map((i) => (i.id === id ? { ...i, cantidad: valor } : i)));
  }

  quitar(id: number): void {
    this.items.update((items) => items.filter((i) => i.id !== id));
  }

  vaciar(): void {
    this.items.set([]);
  }

  quitarNoDisponibles(): void {
    const disponibles = new Set(this.lineas().filter((l) => l.disponible).map((l) => l.id));
    this.items.update((items) => items.filter((i) => disponibles.has(i.id)));
  }

  cantidadDe(id: number): number {
    return this.items().find((i) => i.id === id)?.cantidad ?? 0;
  }

  private restaurar(): void {
    try {
      const crudo = localStorage.getItem(CLAVE_CARRITO);
      this.items.set(crudo ? validarGuardado(JSON.parse(crudo)) : []);
    } catch {
      this.items.set([]);
    }
  }

  private guardar(items: ItemCarrito[]): void {
    try {
      if (items.length) localStorage.setItem(CLAVE_CARRITO, JSON.stringify({ v: 1, items }));
      else localStorage.removeItem(CLAVE_CARRITO);
    } catch {
      // Almacenamiento lleno o bloqueado (modo privado): el carrito sigue en memoria.
    }
  }
}

/** Acepta solo datos con la forma esperada (localStorage lo puede editar cualquiera). */
export function validarGuardado(dato: unknown): ItemCarrito[] {
  const items = (dato as { v?: number; items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  const vistos = new Set<number>();
  const validos: ItemCarrito[] = [];
  for (const i of items) {
    // Una entrada corrupta (null, texto...) se descarta sin perder el resto del carrito.
    if (!i || typeof i !== 'object') continue;
    const item = i as Partial<ItemCarrito>;
    if (
      Number.isInteger(item.id) && (item.id as number) > 0 && !vistos.has(item.id as number) &&
      Number.isInteger(item.cantidad) && (item.cantidad as number) >= 1 &&
      typeof item.nombre === 'string' && typeof item.precio === 'number' && item.precio >= 0
    ) {
      vistos.add(item.id as number);
      validos.push({
        id: item.id as number,
        nombre: item.nombre.slice(0, 80),
        precio: item.precio,
        imagen: typeof item.imagen === 'string' ? item.imagen : null,
        cantidad: Math.min(MAX_POR_PRODUCTO, item.cantidad as number),
      });
    }
  }
  return validos;
}

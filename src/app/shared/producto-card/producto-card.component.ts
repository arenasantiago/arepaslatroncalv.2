import { Component, computed, inject, input, signal } from '@angular/core';
import { PrecioPipe } from '../../core/formato';
import { Producto } from '../../models/producto.model';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-producto-card',
  imports: [PrecioPipe],
  templateUrl: './producto-card.component.html',
})
export class ProductoCardComponent {
  private readonly carrito = inject(CartService);
  readonly producto = input.required<Producto>();
  readonly recienAgregado = signal(false);
  readonly enCarrito = computed(() => this.carrito.cantidadDe(this.producto().id));
  private temporizador: ReturnType<typeof setTimeout> | undefined;

  agregar(): void {
    this.carrito.agregar(this.producto());
    this.recienAgregado.set(true);
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.recienAgregado.set(false), 1500);
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Arepa } from '../models/arepa.model';

// Definimos un tipo para los ítems del carrito para incluir la cantidad
export interface CartItem extends Arepa {
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private items: CartItem[] = [];
  private items$ = new BehaviorSubject<CartItem[]>([]);

  agregarCarrito(arepa: Arepa): void {
    // 1. Busca si el producto ya existe en el carrito
    const existingItem = this.items.find(item => item.id === arepa.id);

    if (existingItem) {
      // 2. Si existe, solo incrementa la cantidad
      existingItem.quantity += 1;
    } else {
      // 3. Si no existe, agrégalo como un nuevo ítem con cantidad 1
      this.items.push({ ...arepa, quantity: 1 });
    }

    // Notifica a todos los suscriptores del cambio
    this.items$.next(this.items);
  }

  // Puedes agregar más métodos para manipular el carrito
  removeItem(itemId: number): void {
    this.items = this.items.filter(item => item.id !== itemId);
    this.items$.next(this.items);
  }

  getCarrito(): Observable<CartItem[]> {
    return this.items$.asObservable();
  }

  limpiarCarrito(): void {
    this.items = [];
    this.items$.next(this.items);
  }
}

import { Component, OnInit } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Arepa } from '../../models/arepa.model';
import { CartItem, CartService } from '../../services/cart.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cart',
  templateUrl: './carrito.component.html',
  imports: [CommonModule],
})
export class CartComponent implements OnInit {
  items$!: Observable<CartItem[]>;
  total$!: Observable<number>;

  constructor(private cartService: CartService) {}

  ngOnInit() {
    this.items$ = this.cartService.getCarrito();
    //Observable para calcular el total del carrito
    this.total$ = this.cartService.getCarrito().pipe(
      map(items => items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    ));
  }
  removeItem(itemId: number) {
    this.cartService.removeItem(itemId);
  }

  clearCart() {
    this.cartService.limpiarCarrito();
  }
}

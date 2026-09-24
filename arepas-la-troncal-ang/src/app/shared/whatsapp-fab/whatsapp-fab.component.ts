import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { map, Observable } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { whatsappLink } from '../../config/business';

/**
 * Botón flotante de WhatsApp.
 * Lee el carrito y arma en tiempo real el enlace con el pedido pre-cargado,
 * de modo que al pulsarlo el mensaje ya lleva los productos y el total.
 */
@Component({
  selector: 'app-whatsapp-fab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './whatsapp-fab.component.html',
})
export class WhatsappFabComponent {
  private cartService = inject(CartService);

  /** Enlace de WhatsApp que se recalcula cada vez que cambia el carrito. */
  readonly link$: Observable<string> = this.cartService
    .getCarrito()
    .pipe(map(() => whatsappLink(this.cartService.construirMensajePedido())));
}

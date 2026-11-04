import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PrecioPipe } from '../../core/formato';
import { CartService } from '../../services/cart.service';
import { CatalogoService } from '../../services/catalogo.service';
import { ProductoCardComponent } from '../../shared/producto-card/producto-card.component';

@Component({
  selector: 'app-productos-page',
  imports: [ProductoCardComponent, RouterLink, PrecioPipe],
  templateUrl: './productos-page.component.html',
})
export class ProductosPageComponent {
  protected readonly catalogo = inject(CatalogoService);
  protected readonly carrito = inject(CartService);
}

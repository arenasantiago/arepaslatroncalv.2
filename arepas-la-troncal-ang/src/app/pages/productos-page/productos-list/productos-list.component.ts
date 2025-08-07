import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../../services/cart.service';
import { ProductService } from '../../../services/product.service'; // <-- Importamos el nuevo servicio
import { Arepa } from '../../../models/arepa.model';
import { Observable } from 'rxjs'; // <-- Importamos Observable

@Component({
  selector: 'app-productos-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './productos-list.component.html',
})
export class ProductosListComponent implements OnInit {

  // Usamos un Observable para manejar los datos de forma reactiva
  arepas$!: Observable<Arepa[]>;

  // Inyectamos el ProductService en el constructor
  constructor(private cartService: CartService, private productService: ProductService) { }

  ngOnInit(): void {
    // Asignamos el Observable del servicio a la propiedad 'arepas$'
    this.arepas$ = this.productService.getArepas();
  }

  agregarCarrito(arepa: Arepa) {
    this.cartService.agregarCarrito(arepa);
  }
}

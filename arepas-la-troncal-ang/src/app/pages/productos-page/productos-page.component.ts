import { Component } from '@angular/core';
import { NavbarComponent } from "../../components/navbar/navbar.component";
import { FooterComponent } from "../../components/footer/footer.component";
import { ProductosListComponent } from "./productos-list/productos-list.component";

@Component({
  selector: 'app-productos-page',
  imports: [NavbarComponent, FooterComponent, ProductosListComponent],
  templateUrl: './productos-page.component.html'
})
export class ProductosPageComponent { }

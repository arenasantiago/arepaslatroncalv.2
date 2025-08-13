import { Component } from '@angular/core';
import { NavbarComponent } from "../../components/navbar/navbar.component";
import { FooterComponent } from "../../components/footer/footer.component";
import { ProductosListComponent } from "./productos-list/productos-list.component";
import { WhatsappFabComponent } from "../../shared/whatsapp-fab/whatsapp-fab.component";

@Component({
  selector: 'app-productos-page',
  imports: [NavbarComponent, FooterComponent, ProductosListComponent, WhatsappFabComponent],
  templateUrl: './productos-page.component.html'
})
export class ProductosPageComponent { }

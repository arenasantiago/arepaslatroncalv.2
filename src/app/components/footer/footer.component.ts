import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { negocio, whatsappDisplay, whatsappLink } from '../../config/business';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.component.html',
})
export class FooterComponent {
  /** Todo sale de la config central (config/business.ts). */
  readonly negocio = negocio;
  readonly telefono = whatsappDisplay;
  readonly whatsappHref = whatsappLink('¡Hola! Quiero hacer un pedido.');
  readonly anio = new Date().getFullYear();
}

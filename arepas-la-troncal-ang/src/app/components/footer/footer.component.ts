import { Component } from '@angular/core';
import { whatsappDisplay, whatsappLink } from '../../config/business';

@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './footer.component.html'
})
export class FooterComponent {
  /** Telefono visible y enlace de WhatsApp: salen de la config central (config/business.ts). */
  readonly telefono = whatsappDisplay;
  readonly whatsappHref = whatsappLink('Hola, deseo comprar!');
}

import { Component } from '@angular/core';
import { whatsappLink } from '../../config/business';

/** Boton flotante para escribir por WhatsApp (preguntas o pedidos rapidos). */
@Component({
  selector: 'app-whatsapp-fab',
  templateUrl: './whatsapp-fab.component.html',
})
export class WhatsappFabComponent {
  readonly enlace = whatsappLink('¡Hola! Tengo una pregunta sobre las arepas.');
}

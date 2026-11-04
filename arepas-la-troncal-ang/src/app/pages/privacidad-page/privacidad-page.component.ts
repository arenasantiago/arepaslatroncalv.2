import { Component } from '@angular/core';
import { negocio } from '../../config/business';

@Component({
  selector: 'app-privacidad-page',
  templateUrl: './privacidad-page.component.html',
})
export class PrivacidadPageComponent {
  readonly negocio = negocio;
}

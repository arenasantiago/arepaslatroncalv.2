import { Component } from '@angular/core';
import { MisionVisionComponent } from './mision-vision/mision-vision.component';
import { QuienesSomosComponent } from './quienes-somos/quienes-somos.component';

@Component({
  selector: 'app-nosotros-page',
  imports: [QuienesSomosComponent, MisionVisionComponent],
  templateUrl: './nosotros-page.component.html',
})
export class NosotrosPageComponent {}

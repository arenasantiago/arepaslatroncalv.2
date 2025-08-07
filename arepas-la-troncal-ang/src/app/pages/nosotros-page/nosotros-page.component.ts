import { Component } from '@angular/core';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { QuienesSomosComponent } from "./quienes-somos/quienes-somos.component";
import { MisionVisionComponent } from './mision-vision/mision-vision.component';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'app-nosotros-page',
  imports: [NavbarComponent, QuienesSomosComponent, MisionVisionComponent, FooterComponent],
  templateUrl: './nosotros-page.component.html'
})
export class NosotrosPageComponent { }

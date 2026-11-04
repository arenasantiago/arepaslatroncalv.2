import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeroComponent } from '../../components/hero/hero.component';
import { negocio } from '../../config/business';
import { CatalogoService } from '../../services/catalogo.service';
import { ProductoCardComponent } from '../../shared/producto-card/producto-card.component';

@Component({
  selector: 'app-inicio-page',
  imports: [HeroComponent, ProductoCardComponent, RouterLink],
  templateUrl: './inicio-page.component.html',
})
export class InicioPageComponent {
  private readonly catalogo = inject(CatalogoService);
  readonly destacados = computed(() => this.catalogo.productos().slice(0, 4));
  readonly negocio = negocio;
  readonly pasos = [
    { titulo: 'Elige tus arepas', texto: 'Agrega al pedido lo que quieras del menú.' },
    { titulo: 'Confirma tus datos', texto: 'Nombre, celular y si es a domicilio o para recoger.' },
    { titulo: 'Envíalo por WhatsApp', texto: 'Te llega un código de pedido y lo confirmamos por chat.' },
  ];
}

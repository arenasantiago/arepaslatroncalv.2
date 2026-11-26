import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, Data, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { FooterComponent } from '../components/footer/footer.component';
import { NavbarComponent } from '../components/navbar/navbar.component';
import { CatalogoService } from '../services/catalogo.service';
import { WhatsappFabComponent } from '../shared/whatsapp-fab/whatsapp-fab.component';

/**
 * Une el `data` de la cadena de rutas activa. Se lee del estado del router (no de
 * ActivatedRoute.firstChild.snapshot): mientras se construye este layout la ruta hija
 * todavia no tiene snapshot y leerlo rompe el prerender.
 */
function datosActivos(router: Router): Data {
  let ruta: ActivatedRouteSnapshot | null = router.routerState.snapshot.root;
  let datos: Data = {};
  while (ruta) {
    datos = { ...datos, ...ruta.data };
    ruta = ruta.firstChild;
  }
  return datos;
}

/** Estructura comun de la web publica: aviso, menu, contenido, WhatsApp y pie de pagina. */
@Component({
  selector: 'app-layout-publico',
  imports: [RouterOutlet, NavbarComponent, FooterComponent, WhatsappFabComponent],
  templateUrl: './layout-publico.component.html',
})
export class LayoutPublicoComponent {
  private readonly catalogo = inject(CatalogoService);
  private readonly router = inject(Router);

  readonly aviso = computed(() => this.catalogo.ajustes().aviso);

  private readonly datos = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => datosActivos(this.router)),
    ),
    { initialValue: datosActivos(this.router) },
  );
  readonly mostrarWhatsapp = computed(() => !this.datos()['ocultarWhatsapp']);

  constructor() {
    this.catalogo.iniciar();
  }
}

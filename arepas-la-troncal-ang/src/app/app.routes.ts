import { Routes } from '@angular/router';
import { InicioPageComponent } from './pages/inicio-page/inicio-page.component';
import { NosotrosPageComponent } from './pages/nosotros-page/nosotros-page.component';
import { ProductosPageComponent } from './pages/productos-page/productos-page.component';
import { CartComponent } from './pages/carrito/carrito.component';
import { ContactoPageComponent } from './pages/contacto-page/contacto-page.component';

export const routes: Routes = [
  // Raiz explicita: con el prerender se genera un index.html que redirige a /inicio
  // (antes '/' solo caia en el comodin '**' y no existia pagina estatica para la raiz).
  {
    path: '',
    redirectTo: 'inicio',
    pathMatch: 'full'
  },
  {
    path: 'inicio',
    component: InicioPageComponent
  },
  {
    path: 'nosotros',
    component: NosotrosPageComponent
  },
  {
    path: 'productos',
    component: ProductosPageComponent
  },
  {
    path: 'contacto',
    component: ContactoPageComponent
  },
  {
    path: 'carrito',
    component: CartComponent
  },
  {
    path: '**',
    redirectTo: 'inicio'
  }
];

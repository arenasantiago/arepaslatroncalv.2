import { Routes } from '@angular/router';
import { InicioPageComponent } from './pages/inicio-page/inicio-page.component';
import { NosotrosPageComponent } from './pages/nosotros-page/nosotros-page.component';
import { ProductosPageComponent } from './pages/productos-page/productos-page.component';
import { CartComponent } from './pages/carrito/carrito.component';
import { ContactoPageComponent } from './pages/contacto-page/contacto-page.component';

export const routes: Routes = [
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

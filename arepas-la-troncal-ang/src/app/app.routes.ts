import { Routes } from '@angular/router';
import { LayoutPublicoComponent } from './layout/layout-publico.component';
import { InicioPageComponent } from './pages/inicio-page/inicio-page.component';
import { NosotrosPageComponent } from './pages/nosotros-page/nosotros-page.component';
import { ProductosPageComponent } from './pages/productos-page/productos-page.component';

/**
 * `title` y `data.descripcion` alimentan el SEO de cada pagina (core/seo.service.ts).
 * `data.indexar: false` agrega noindex (carrito y panel no van a Google).
 * Las paginas con formularios se cargan bajo demanda: el paquete inicial queda mas liviano.
 */
export const routes: Routes = [
  // Raiz explicita: el prerender genera un index.html que redirige a /inicio.
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  {
    path: '',
    component: LayoutPublicoComponent,
    children: [
      {
        path: 'inicio',
        component: InicioPageComponent,
        data: {
          descripcion:
            'Fábrica de arepas al carbón en Caucasia, Antioquia. Arepas de maíz, telas y arepas preparadas. Haz tu pedido en línea y confírmalo por WhatsApp.',
        },
      },
      {
        path: 'productos',
        title: 'Menú y precios',
        component: ProductosPageComponent,
        data: {
          descripcion:
            'Menú y precios de Arepas La Troncal: telas, arepas redondas, arepa con pollo y arepa con todo. Arma tu pedido y envíalo por WhatsApp.',
        },
      },
      {
        path: 'nosotros',
        title: 'Nuestra historia',
        component: NosotrosPageComponent,
        data: {
          descripcion:
            'Conoce la historia de Arepas La Troncal, la fábrica de arepas al carbón fundada por Marleny Valoye en Caucasia, Antioquia.',
        },
      },
      {
        path: 'contacto',
        title: 'Contacto, horario y ubicación',
        loadComponent: () => import('./pages/contacto-page/contacto-page.component').then((m) => m.ContactoPageComponent),
        data: {
          descripcion:
            'Horario, dirección y contacto de Arepas La Troncal en Caucasia, Antioquia. Escríbenos por WhatsApp o déjanos un mensaje.',
        },
      },
      {
        path: 'privacidad',
        title: 'Tratamiento de datos personales',
        loadComponent: () => import('./pages/privacidad-page/privacidad-page.component').then((m) => m.PrivacidadPageComponent),
        data: { descripcion: 'Política de tratamiento de datos personales de Arepas La Troncal (Ley 1581 de 2012).' },
      },
      {
        path: 'carrito',
        title: 'Tu pedido',
        loadComponent: () => import('./pages/carrito/carrito.component').then((m) => m.CartComponent),
        data: { indexar: false, ocultarWhatsapp: true },
      },
    ],
  },
  {
    path: 'admin',
    data: { indexar: false },
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  { path: '**', redirectTo: 'inicio' },
];

import { Routes } from '@angular/router';
import { adminGuard, invitadoGuard } from './admin.guard';
import { AjustesAdminComponent } from './ajustes/ajustes-admin.component';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { LoginComponent } from './login/login.component';
import { MensajesAdminComponent } from './mensajes/mensajes-admin.component';
import { PedidosAdminComponent } from './pedidos/pedidos-admin.component';
import { ProductosAdminComponent } from './productos/productos-admin.component';

/** Panel del dueno (carga diferida: la web publica no descarga este codigo). */
export const ADMIN_ROUTES: Routes = [
  { path: 'ingresar', title: 'Ingresar al panel', component: LoginComponent, canActivate: [invitadoGuard] },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'pedidos' },
      { path: 'pedidos', title: 'Pedidos', component: PedidosAdminComponent },
      { path: 'productos', title: 'Productos', component: ProductosAdminComponent },
      { path: 'mensajes', title: 'Mensajes', component: MensajesAdminComponent },
      { path: 'ajustes', title: 'Ajustes', component: AjustesAdminComponent },
    ],
  },
];

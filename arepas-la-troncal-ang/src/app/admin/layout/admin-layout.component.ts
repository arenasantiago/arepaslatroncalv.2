import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SupabaseAdminService } from '../supabase-admin.service';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
})
export class AdminLayoutComponent {
  protected readonly admin = inject(SupabaseAdminService);
  private readonly router = inject(Router);

  readonly secciones = [
    { ruta: 'pedidos', texto: 'Pedidos' },
    { ruta: 'productos', texto: 'Productos' },
    { ruta: 'mensajes', texto: 'Mensajes' },
    { ruta: 'ajustes', texto: 'Ajustes' },
  ];

  async salir(): Promise<void> {
    await this.admin.salir();
    await this.router.navigateByUrl('/admin/ingresar');
  }
}

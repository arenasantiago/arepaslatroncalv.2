import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseAdminService } from './supabase-admin.service';

/** Solo deja entrar al panel si hay sesion y el usuario es administrador. */
export const adminGuard: CanActivateFn = async () => {
  const admin = inject(SupabaseAdminService);
  const router = inject(Router);
  return (await admin.verificar()) ? true : router.createUrlTree(['/admin/ingresar']);
};

/** En la pantalla de ingreso: si ya hay sesion de administrador, directo al panel. */
export const invitadoGuard: CanActivateFn = async () => {
  const admin = inject(SupabaseAdminService);
  const router = inject(Router);
  return (await admin.verificar()) ? router.createUrlTree(['/admin/pedidos']) : true;
};

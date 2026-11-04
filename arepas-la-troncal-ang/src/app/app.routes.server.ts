import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Salida estatica (angular.json: outputMode "static").
 * - Paginas publicas: se prerenderizan en el build (HTML listo para Google).
 * - Carrito y panel: dependen del navegador (localStorage / sesion), se renderizan en
 *   el cliente a partir de index.csr.html (ver vercel.json).
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'carrito', renderMode: RenderMode.Client },
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Prerender },
];

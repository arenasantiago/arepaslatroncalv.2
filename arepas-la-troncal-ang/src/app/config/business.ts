/**
 * Configuración central del negocio.
 * Un único lugar para datos que se repiten en toda la app (teléfono, redes,
 * textos de contacto). Cambiar aquí actualiza toda la aplicación.
 *
 * NÚMERO DE WHATSAPP:
 *   - Producción real: 3122493344
 *   - Pruebas: numero configurado en .env local (no se versiona)
 *   Para publicar, cambiar `whatsappPhone` al número real.
 */

/** Teléfono de WhatsApp en formato internacional SIN '+' (requerido por wa.me). */
export const whatsappPhone = '573122493344';

/** Teléfono mostrable al usuario (formato legible). */
export const whatsappDisplay = '+57 312 249 3344';

/** Marca / negocio. */
export const businessName = 'Arepas La Troncal';

/**
 * Construye un enlace de WhatsApp (wa.me) con un mensaje opcional pre-cargado.
 * @param message Texto del mensaje (se codifica automáticamente).
 */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${whatsappPhone}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

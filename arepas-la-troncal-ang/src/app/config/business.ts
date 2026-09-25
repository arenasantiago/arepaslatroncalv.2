/**
 * Configuración central del negocio.
 * Un único lugar para datos que se repiten en toda la app (teléfono, redes,
 * textos de contacto). Cambiar aquí actualiza toda la aplicación.
 *
 * NÚMERO DE WHATSAPP:
 *   - Producción real: 3122493344
 *   - Pruebas: numero configurado en .env local (no se versiona)
 *   Para publicar, cambiar `whatsappPhone` al número real (el formato visible
 *   se deriva solo). Lo usan el footer y el botón flotante de WhatsApp.
 *   OJO: el JSON-LD de src/index.html (datos para Google) lleva el número real
 *   escrito a mano; si el número real cambia, actualizarlo también ahí.
 */

/** Teléfono de WhatsApp en formato internacional SIN '+' (requerido por wa.me). */
export const whatsappPhone = '573122493344';

/** Teléfono mostrable al usuario, derivado de `whatsappPhone` (ej. "+57 312 249 3344"). */
export const whatsappDisplay = `+${whatsappPhone.slice(0, 2)} ${whatsappPhone.slice(2, 5)} ${whatsappPhone.slice(5, 8)} ${whatsappPhone.slice(8)}`;

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

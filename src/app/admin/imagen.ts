/**
 * Reduce una foto antes de subirla: lado mayor maximo 900 px y formato WebP.
 * Una foto de celular (3-5 MB) queda en ~60-150 KB, lo que acelera el menu.
 */
export async function comprimirImagen(archivo: File, ladoMaximo = 900, calidad = 0.82): Promise<Blob> {
  if (!archivo.type.startsWith('image/')) throw new Error('El archivo no es una imagen.');
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.round(bitmap.width * escala);
  const alto = Math.round(bitmap.height * escala);
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no pudo procesar la imagen.');
  ctx.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', calidad));
  if (!blob) throw new Error('El navegador no pudo convertir la imagen.');
  return blob;
}

/**
 * Si la URL es una foto subida desde el panel al bucket `productos`, devuelve su ruta
 * dentro del bucket; si es una imagen del propio sitio (assets/...) devuelve null.
 */
export function rutaEnBucket(url: string | null, supabaseUrl: string): string | null {
  if (!url || !supabaseUrl) return null;
  const prefijo = `${supabaseUrl}/storage/v1/object/public/productos/`;
  if (!url.startsWith(prefijo)) return null;
  const ruta = decodeURIComponent(url.slice(prefijo.length).split('?')[0]);
  return ruta && !ruta.includes('..') ? ruta : null;
}

/** "Arepa con Queso!" -> "arepa-con-queso" */
export function crearSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'producto';
}

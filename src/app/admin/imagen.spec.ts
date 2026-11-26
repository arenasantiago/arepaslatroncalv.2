import { crearSlug, rutaEnBucket } from './imagen';

describe('rutaEnBucket', () => {
  const base = 'https://abc.supabase.co';

  it('extrae la ruta de una foto subida al bucket productos', () => {
    expect(rutaEnBucket(`${base}/storage/v1/object/public/productos/telas-123.webp`, base)).toBe('telas-123.webp');
  });

  it('ignora imagenes del sitio, de otros buckets o vacias', () => {
    expect(rutaEnBucket('assets/img/contodo.webp', base)).toBeNull();
    expect(rutaEnBucket(`${base}/storage/v1/object/public/otro/x.webp`, base)).toBeNull();
    expect(rutaEnBucket(null, base)).toBeNull();
    expect(rutaEnBucket(`${base}/storage/v1/object/public/productos/x.webp`, '')).toBeNull();
  });

  it('no acepta rutas con ..', () => {
    expect(rutaEnBucket(`${base}/storage/v1/object/public/productos/../secreto`, base)).toBeNull();
  });
});

describe('crearSlug', () => {
  it('quita tildes, mayusculas y simbolos', () => {
    expect(crearSlug('Arepa con Queso!')).toBe('arepa-con-queso');
    expect(crearSlug('  Ñame & Plátano  ')).toBe('name-platano');
  });

  it('nunca devuelve un slug vacio', () => {
    expect(crearSlug('¡¡¡')).toBe('producto');
  });
});

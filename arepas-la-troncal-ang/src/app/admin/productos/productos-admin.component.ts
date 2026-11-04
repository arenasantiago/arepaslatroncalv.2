import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PrecioPipe } from '../../core/formato';
import { Categoria } from '../../models/producto.model';
import { ENV } from '../../config/env.generated';
import { comprimirImagen, crearSlug, rutaEnBucket } from '../imagen';
import { SupabaseAdminService } from '../supabase-admin.service';

interface FilaProductoAdmin {
  id: number;
  slug: string;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen_url: string | null;
  categoria_id: number | null;
  disponible: boolean;
  orden: number;
}

const TAMANO_MAXIMO_ORIGINAL = 15 * 1024 * 1024;

/** Menu editable: precios, disponibilidad, fotos, productos nuevos. */
@Component({
  selector: 'app-productos-admin',
  imports: [ReactiveFormsModule, PrecioPipe],
  templateUrl: './productos-admin.component.html',
})
export class ProductosAdminComponent implements OnInit {
  private readonly admin = inject(SupabaseAdminService);

  readonly productos = signal<FilaProductoAdmin[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly editando = signal<FilaProductoAdmin | 'nuevo' | null>(null);
  readonly archivo = signal<File | null>(null);
  readonly vistaPrevia = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly cargando = signal(true);
  readonly mensaje = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly form = inject(NonNullableFormBuilder).group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    descripcion: ['', [Validators.maxLength(500)]],
    precio: [0, [Validators.required, Validators.min(0), Validators.max(10_000_000)]],
    categoriaId: [null as number | null],
    disponible: [true],
    orden: [0, [Validators.required]],
  });

  ngOnInit(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    const [p, c] = await Promise.all([
      this.admin.cliente
        .from('productos')
        .select('id,slug,nombre,descripcion,precio,imagen_url,categoria_id,disponible,orden')
        .order('orden')
        .order('id'),
      this.admin.cliente.from('categorias').select('id,slug,nombre,orden').order('orden'),
    ]);
    this.cargando.set(false);
    if (p.error || c.error) {
      this.error.set('No se pudo cargar el menú. Revisa tu conexión.');
      return;
    }
    this.productos.set(p.data as FilaProductoAdmin[]);
    this.categorias.set(c.data as Categoria[]);
  }

  nombreCategoria(id: number | null): string {
    return this.categorias().find((c) => c.id === id)?.nombre ?? 'Sin categoría';
  }

  nuevo(): void {
    this.limpiarMensajes();
    const siguienteOrden = Math.max(0, ...this.productos().map((p) => p.orden)) + 1;
    this.form.reset({ nombre: '', descripcion: '', precio: 0, categoriaId: this.categorias()[0]?.id ?? null, disponible: true, orden: siguienteOrden });
    this.archivo.set(null);
    this.vistaPrevia.set(null);
    this.editando.set('nuevo');
  }

  editar(p: FilaProductoAdmin): void {
    this.limpiarMensajes();
    this.form.reset({ nombre: p.nombre, descripcion: p.descripcion, precio: p.precio, categoriaId: p.categoria_id, disponible: p.disponible, orden: p.orden });
    this.archivo.set(null);
    this.vistaPrevia.set(p.imagen_url);
    this.editando.set(p);
  }

  cancelar(): void {
    this.editando.set(null);
  }

  elegirArchivo(evento: Event): void {
    const archivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
    this.error.set(null);
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
      this.error.set('Elige una imagen (JPG, PNG o WebP).');
      return;
    }
    if (archivo.size > TAMANO_MAXIMO_ORIGINAL) {
      this.error.set('La imagen es demasiado grande (máximo 15 MB).');
      return;
    }
    this.archivo.set(archivo);
    this.vistaPrevia.set(URL.createObjectURL(archivo));
  }

  async guardar(): Promise<void> {
    const actual = this.editando();
    if (!actual) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.limpiarMensajes();
    this.guardando.set(true);
    let subida: string | null = null;
    try {
      const v = this.form.getRawValue();
      const slug = actual === 'nuevo' ? crearSlug(v.nombre) : actual.slug;
      let imagenUrl = actual === 'nuevo' ? null : actual.imagen_url;

      const archivo = this.archivo();
      if (archivo) {
        const blob = await comprimirImagen(archivo);
        const ruta = `${slug}-${Date.now()}.webp`;
        const bucket = this.admin.cliente.storage.from('productos');
        const { error } = await bucket.upload(ruta, blob, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
        if (error) throw new Error('No se pudo subir la imagen.');
        subida = ruta;
        imagenUrl = bucket.getPublicUrl(ruta).data.publicUrl;
      }

      const fila = {
        nombre: v.nombre.trim(),
        descripcion: v.descripcion.trim(),
        precio: Math.round(v.precio),
        categoria_id: v.categoriaId,
        disponible: v.disponible,
        orden: Math.round(v.orden),
        imagen_url: imagenUrl,
      };
      if (actual === 'nuevo') {
        let { error } = await this.admin.cliente.from('productos').insert({ ...fila, slug });
        if (error?.code === '23505') {
          // Ya existe un producto con ese slug: se agrega un sufijo unico.
          ({ error } = await this.admin.cliente.from('productos').insert({ ...fila, slug: `${slug}-${Date.now().toString(36)}` }));
        }
        if (error) throw new Error('No se pudo crear el producto.');
      } else {
        const { error } = await this.admin.cliente.from('productos').update(fila).eq('id', actual.id);
        if (error) throw new Error('No se pudo guardar el producto.');
      }
      this.mensaje.set(`"${fila.nombre}" guardado. Ya se ve en la web.`);
      this.editando.set(null);
      await this.cargar();
      // La foto anterior ya no la usa nadie: se borra (despues de refrescar la lista) para no acumular archivos.
      const anterior = actual === 'nuevo' ? null : rutaEnBucket(actual.imagen_url, ENV.supabaseUrl);
      if (subida && anterior && anterior !== subida) void this.borrarImagen(anterior);
    } catch (e) {
      // Si la foto se subio pero el producto no se guardo, no debe quedar huerfana.
      if (subida) void this.borrarImagen(subida);
      this.error.set(e instanceof Error ? e.message : 'No se pudo guardar el producto.');
    } finally {
      this.guardando.set(false);
    }
  }

  async alternarDisponible(p: FilaProductoAdmin): Promise<void> {
    this.limpiarMensajes();
    const { error } = await this.admin.cliente.from('productos').update({ disponible: !p.disponible }).eq('id', p.id);
    if (error) {
      this.error.set('No se pudo cambiar la disponibilidad.');
      return;
    }
    this.productos.update((lista) => lista.map((x) => (x.id === p.id ? { ...x, disponible: !p.disponible } : x)));
  }

  async eliminar(p: FilaProductoAdmin): Promise<void> {
    if (!confirm(`¿Eliminar "${p.nombre}"? Los pedidos anteriores conservan su nombre y precio. Si solo se agotó, mejor márcalo como no disponible.`)) return;
    this.limpiarMensajes();
    const { error } = await this.admin.cliente.from('productos').delete().eq('id', p.id);
    if (error) {
      this.error.set('No se pudo eliminar el producto.');
      return;
    }
    this.mensaje.set(`"${p.nombre}" eliminado.`);
    await this.cargar();
    const foto = rutaEnBucket(p.imagen_url, ENV.supabaseUrl);
    if (foto) void this.borrarImagen(foto);
  }

  /** Borrado de mejor esfuerzo: si falla, solo queda un archivo sin usar en Storage. */
  private async borrarImagen(ruta: string): Promise<void> {
    const { error } = await this.admin.cliente.storage.from('productos').remove([ruta]);
    if (error) console.warn('[panel] No se pudo borrar la imagen', ruta, error.message);
  }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[campo];
    return c.invalid && (c.touched || c.dirty);
  }

  private limpiarMensajes(): void {
    this.mensaje.set(null);
    this.error.set(null);
  }
}

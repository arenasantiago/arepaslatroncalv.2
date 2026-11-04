import { isPlatformBrowser } from '@angular/common';
import { ApplicationRef, Injectable, PLATFORM_ID, TransferState, computed, inject, makeStateKey, signal } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { SupabaseRestService } from '../core/supabase-rest.service';
import { CATALOGO_RESPALDO } from '../data/catalogo-respaldo';
import { Ajustes, Categoria, EstadoCatalogo, Producto, SeccionMenu } from '../models/producto.model';

interface FilaProducto {
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
interface FilaAjustes {
  acepta_pedidos: boolean;
  aviso: string | null;
}

const CLAVE_ESTADO = makeStateKey<EstadoCatalogo>('catalogo');

/**
 * Catalogo publico (productos, categorias y ajustes del negocio).
 *
 * - En el prerender (build) se lee de Supabase y queda escrito en el HTML de cada
 *   pagina (bueno para Google) y en TransferState.
 * - En el navegador se reutiliza ese estado para hidratar sin parpadeos y, cuando la
 *   app queda estable, se vuelve a pedir a Supabase para mostrar precios al dia.
 * - Si Supabase no responde (o no esta configurado) se usa el menu de respaldo.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly rest = inject(SupabaseRestService);
  private readonly transferState = inject(TransferState);
  private readonly appRef = inject(ApplicationRef);
  private readonly esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly estado = signal<EstadoCatalogo | null>(null);
  private iniciado = false;

  readonly cargado = computed(() => this.estado() !== null);
  readonly origen = computed(() => this.estado()?.origen ?? null);
  readonly productos = computed<Producto[]>(() => this.estado()?.productos ?? []);
  readonly categorias = computed<Categoria[]>(() => this.estado()?.categorias ?? []);
  readonly ajustes = computed<Ajustes>(() => this.estado()?.ajustes ?? CATALOGO_RESPALDO.ajustes);

  /** Productos agrupados por categoria, en el orden definido en la BD. */
  readonly secciones = computed<SeccionMenu[]>(() => {
    const productos = this.productos();
    const secciones: SeccionMenu[] = this.categorias()
      .map((categoria) => ({ categoria, productos: productos.filter((p) => p.categoriaId === categoria.id) }))
      .filter((s) => s.productos.length > 0);
    const idsConCategoria = new Set(this.categorias().map((c) => c.id));
    const sinCategoria = productos.filter((p) => p.categoriaId === null || !idsConCategoria.has(p.categoriaId));
    if (sinCategoria.length) secciones.push({ categoria: null, productos: sinCategoria });
    return secciones;
  });

  /** Idempotente: la primera llamada carga el catalogo. */
  iniciar(): void {
    if (this.iniciado) return;
    this.iniciado = true;

    const previo = this.transferState.get(CLAVE_ESTADO, null);
    if (previo) {
      // Pagina prerenderizada: mismos datos que el HTML (hidratacion sin diferencias).
      this.estado.set(previo);
      if (this.esNavegador) {
        void this.appRef.whenStable().then(() => this.refrescar());
      }
      return;
    }

    this.consultar().subscribe((estado) => {
      this.estado.set(estado);
      if (!this.esNavegador) this.transferState.set(CLAVE_ESTADO, estado);
    });
  }

  /** Vuelve a pedir el catalogo; solo reemplaza lo mostrado si la BD respondio. */
  refrescar(): void {
    this.consultar().subscribe((estado) => {
      if (estado.origen === 'bd') this.estado.set(estado);
    });
  }

  porId(id: number): Producto | undefined {
    return this.productos().find((p) => p.id === id);
  }

  private consultar(): Observable<EstadoCatalogo> {
    if (!this.rest.configurado) return of(CATALOGO_RESPALDO);
    return forkJoin({
      productos: this.rest.leer<FilaProducto[]>(
        'productos?select=id,slug,nombre,descripcion,precio,imagen_url,categoria_id,disponible,orden&disponible=is.true&order=orden.asc,id.asc',
      ),
      categorias: this.rest.leer<Categoria[]>('categorias?select=id,slug,nombre,orden&order=orden.asc,id.asc'),
      ajustes: this.rest.leer<FilaAjustes[]>('ajustes?select=acepta_pedidos,aviso&limit=1'),
    }).pipe(
      map(({ productos, categorias, ajustes }): EstadoCatalogo => ({
        origen: 'bd',
        categorias,
        productos: productos.map((p) => ({
          id: p.id,
          slug: p.slug,
          nombre: p.nombre,
          descripcion: p.descripcion,
          precio: p.precio,
          imagenUrl: p.imagen_url,
          categoriaId: p.categoria_id,
          disponible: p.disponible,
          orden: p.orden,
        })),
        ajustes: {
          aceptaPedidos: ajustes[0]?.acepta_pedidos ?? true,
          aviso: ajustes[0]?.aviso?.trim() || null,
        },
      })),
      catchError((err) => {
        console.warn('[catalogo] Supabase no respondio; se usa el menu de respaldo.', err?.message ?? err);
        return of(CATALOGO_RESPALDO);
      }),
    );
  }
}

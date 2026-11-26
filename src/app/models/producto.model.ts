/** Modelos del catalogo publico (en camelCase; la BD usa snake_case). */
export interface Categoria {
  id: number;
  slug: string;
  nombre: string;
  orden: number;
}

export interface Producto {
  id: number;
  slug: string;
  nombre: string;
  descripcion: string;
  /** Pesos colombianos enteros. */
  precio: number;
  imagenUrl: string | null;
  categoriaId: number | null;
  disponible: boolean;
  orden: number;
}

export interface Ajustes {
  aceptaPedidos: boolean;
  aviso: string | null;
}

export interface SeccionMenu {
  categoria: Categoria | null;
  productos: Producto[];
}

/** Estado completo del catalogo que viaja del prerender al navegador (TransferState). */
export interface EstadoCatalogo {
  productos: Producto[];
  categorias: Categoria[];
  ajustes: Ajustes;
  /** 'bd' = datos de Supabase; 'respaldo' = menu local (sin conexion o sin configurar). */
  origen: 'bd' | 'respaldo';
}

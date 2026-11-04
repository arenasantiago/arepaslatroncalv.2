import { EstadoCatalogo } from '../models/producto.model';

/**
 * Menu de respaldo: el mismo que siembra la migracion 20260925060100_datos_iniciales.sql.
 * Se usa si Supabase no esta configurado o no responde (ej. proyecto pausado), para
 * que la web nunca quede sin menu. Los precios reales siempre los calcula la BD al
 * registrar el pedido.
 */
export const CATALOGO_RESPALDO: EstadoCatalogo = {
  origen: 'respaldo',
  ajustes: { aceptaPedidos: true, aviso: null },
  categorias: [
    { id: 1, slug: 'arepas-para-asar', nombre: 'Arepas para asar', orden: 1 },
    { id: 2, slug: 'arepas-preparadas', nombre: 'Arepas preparadas', orden: 2 },
  ],
  productos: [
    {
      id: 1, slug: 'telas', nombre: 'Telas', descripcion: 'Arepa tela de maíz blanco.', precio: 1000,
      imagenUrl: 'assets/img/arepapaquete.webp', categoriaId: 1, disponible: true, orden: 1,
    },
    {
      id: 2, slug: 'redonda', nombre: 'Redonda', descripcion: 'Arepa pequeña redonda.', precio: 400,
      imagenUrl: 'assets/img/arepitaredondav2.webp', categoriaId: 1, disponible: true, orden: 2,
    },
    {
      id: 3, slug: 'arepa-con-pollo', nombre: 'Arepa con Pollo', descripcion: 'Una arepa clásica con pollo desmechado.',
      precio: 8000, imagenUrl: 'assets/img/arepascontodorehecha.webp', categoriaId: 2, disponible: true, orden: 3,
    },
    {
      id: 4, slug: 'arepa-con-todo', nombre: 'Arepa con todo',
      descripcion: 'La famosa arepa costeña con un huevo frito en su interior.', precio: 8000,
      imagenUrl: 'assets/img/contodo.webp', categoriaId: 2, disponible: true, orden: 4,
    },
  ],
};

-- Datos iniciales del menu (los mismos que tenia la web en product.service.ts).
-- Los ids se fijan para que coincidan con el menu de respaldo del frontend.
insert into public.categorias (id, slug, nombre, orden) overriding system value values
  (1, 'arepas-para-asar', 'Arepas para asar', 1),
  (2, 'arepas-preparadas', 'Arepas preparadas', 2);
select setval(pg_get_serial_sequence('public.categorias', 'id'), (select max(id) from public.categorias));

insert into public.productos (id, slug, nombre, descripcion, precio, imagen_url, categoria_id, orden) overriding system value values
  (1, 'telas', 'Telas', 'Arepa tela de maíz blanco.', 1000, 'assets/img/arepapaquete.webp', 1, 1),
  (2, 'redonda', 'Redonda', 'Arepa pequeña redonda.', 400, 'assets/img/arepitaredondav2.webp', 1, 2),
  (3, 'arepa-con-pollo', 'Arepa con Pollo', 'Una arepa clásica con pollo desmechado.', 8000, 'assets/img/arepascontodorehecha.webp', 2, 3),
  (4, 'arepa-con-todo', 'Arepa con todo', 'La famosa arepa costeña con un huevo frito en su interior.', 8000, 'assets/img/contodo.webp', 2, 4);
select setval(pg_get_serial_sequence('public.productos', 'id'), (select max(id) from public.productos));

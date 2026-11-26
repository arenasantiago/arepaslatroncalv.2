-- Borra los datos creados por scripts/probar-api-supabase.mjs (marcados "PRUEBA AUTOMATICA").
-- Ejecutar con: npx supabase db query --linked -f supabase/limpiar-datos-prueba.sql
delete from public.pedidos where cliente_nombre = 'PRUEBA AUTOMATICA';
delete from public.mensajes_contacto where nombre = 'PRUEBA AUTOMATICA';
-- Si ya no queda ningun pedido (antes del lanzamiento), la numeracion vuelve a empezar en 1.
select setval(pg_get_serial_sequence('public.pedidos', 'numero'), 1, false)
where not exists (select 1 from public.pedidos);
select
  (select count(*) from public.pedidos where cliente_nombre = 'PRUEBA AUTOMATICA') as pedidos_prueba_restantes,
  (select count(*) from public.mensajes_contacto where nombre = 'PRUEBA AUTOMATICA') as mensajes_prueba_restantes,
  (select count(*) from public.pedidos) as pedidos_totales;

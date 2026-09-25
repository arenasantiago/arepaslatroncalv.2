-- =====================================================================
-- Arepas La Troncal - esquema inicial
-- =====================================================================
-- Convenciones
--  * Tablas y columnas en espanol: el dueno las ve en el panel de Supabase.
--  * Dinero en pesos colombianos ENTEROS (COP no usa centavos en la practica).
--  * Toda tabla expuesta tiene RLS. El publico (anon) solo LEE el catalogo y
--    escribe mediante funciones (RPC) que validan y calculan precios en el
--    servidor: el navegador nunca decide cuanto cuesta un pedido.
--  * Las funciones auxiliares viven en el esquema "privado" (no expuesto por la API).
-- =====================================================================

create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------
create table public.categorias (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre text not null check (char_length(nombre) between 2 and 60),
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);
comment on table public.categorias is 'Agrupaciones del menu (ej. arepas para asar, arepas preparadas).';

create table public.productos (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre text not null check (char_length(nombre) between 2 and 80),
  descripcion text not null default '' check (char_length(descripcion) <= 500),
  precio integer not null check (precio between 0 and 10000000),
  imagen_url text check (imagen_url is null or char_length(imagen_url) <= 500),
  categoria_id bigint references public.categorias (id) on delete set null,
  disponible boolean not null default true,
  orden integer not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
comment on table public.productos is 'Menu publico. precio en COP enteros. disponible=false lo oculta de la web.';
create index productos_categoria_id_idx on public.productos (categoria_id);

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  codigo text not null unique,
  cliente_nombre text not null check (char_length(cliente_nombre) between 2 and 80),
  cliente_telefono text not null check (cliente_telefono ~ '^[0-9]{7,15}$'),
  tipo_entrega text not null check (tipo_entrega in ('domicilio', 'recoger')),
  direccion text check (direccion is null or char_length(direccion) between 5 and 200),
  notas text check (notas is null or char_length(notas) <= 500),
  total integer not null default 0 check (total >= 0),
  estado text not null default 'nuevo'
    check (estado in ('nuevo', 'confirmado', 'preparando', 'listo', 'entregado', 'cancelado')),
  canal text not null default 'web' check (canal in ('web', 'whatsapp', 'local')),
  acepta_tratamiento_datos boolean not null check (acepta_tratamiento_datos),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint pedidos_domicilio_requiere_direccion check (tipo_entrega <> 'domicilio' or direccion is not null)
);
comment on table public.pedidos is 'Pedidos hechos desde la web. codigo = referencia que viaja en el mensaje de WhatsApp.';
comment on column public.pedidos.acepta_tratamiento_datos is 'Autorizacion del titular (Ley 1581 de 2012).';
create index pedidos_creado_en_idx on public.pedidos (creado_en desc);
create index pedidos_estado_creado_en_idx on public.pedidos (estado, creado_en desc);
create index pedidos_telefono_creado_en_idx on public.pedidos (cliente_telefono, creado_en desc);

create table public.pedido_items (
  id bigint generated always as identity primary key,
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  producto_id bigint references public.productos (id) on delete set null,
  producto_nombre text not null,
  precio_unitario integer not null check (precio_unitario >= 0),
  cantidad integer not null check (cantidad between 1 and 99),
  subtotal integer generated always as (precio_unitario * cantidad) stored
);
comment on table public.pedido_items is 'Lineas del pedido. Guarda nombre y precio del momento de la compra.';
create index pedido_items_pedido_id_idx on public.pedido_items (pedido_id);
create index pedido_items_producto_id_idx on public.pedido_items (producto_id);

create table public.mensajes_contacto (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 2 and 80),
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  whatsapp text check (whatsapp is null or whatsapp ~ '^[0-9]{7,15}$'),
  mensaje text not null check (char_length(mensaje) between 10 and 2000),
  leido boolean not null default false,
  acepta_tratamiento_datos boolean not null check (acepta_tratamiento_datos),
  creado_en timestamptz not null default now()
);
comment on table public.mensajes_contacto is 'Formulario de contacto de la web.';
create index mensajes_contacto_creado_en_idx on public.mensajes_contacto (creado_en desc);
create index mensajes_contacto_email_creado_en_idx on public.mensajes_contacto (email, creado_en desc);

create table public.administradores (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nombre text,
  creado_en timestamptz not null default now()
);
comment on table public.administradores is 'Usuarios con acceso al panel /admin. Se agregan a mano (ver README).';

create table public.ajustes (
  id boolean primary key default true check (id),
  acepta_pedidos boolean not null default true,
  aviso text check (aviso is null or char_length(aviso) <= 200),
  actualizado_en timestamptz not null default now()
);
comment on table public.ajustes is 'Fila unica con ajustes del negocio editables desde el panel.';
insert into public.ajustes default values;

-- ---------------------------------------------------------------------
-- Funciones auxiliares (esquema privado)
-- ---------------------------------------------------------------------
create or replace function privado.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.administradores a where a.user_id = (select auth.uid())
  );
$$;
revoke all on function privado.es_admin() from public;
grant execute on function privado.es_admin() to authenticated, service_role;

create or replace function privado.tocar_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;
revoke all on function privado.tocar_actualizado_en() from public;

create trigger productos_actualizado_en before update on public.productos
  for each row execute function privado.tocar_actualizado_en();
create trigger pedidos_actualizado_en before update on public.pedidos
  for each row execute function privado.tocar_actualizado_en();
create trigger ajustes_actualizado_en before update on public.ajustes
  for each row execute function privado.tocar_actualizado_en();

-- ---------------------------------------------------------------------
-- RPC publica: crear un pedido
--   p_items: [{"producto_id": 1, "cantidad": 2}, ...]
--   Devuelve {codigo, numero, total, items:[{nombre, cantidad, precio_unitario, subtotal}]}
-- ---------------------------------------------------------------------
create or replace function public.crear_pedido(
  p_cliente_nombre text,
  p_cliente_telefono text,
  p_tipo_entrega text,
  p_direccion text,
  p_notas text,
  p_items jsonb,
  p_acepta_tratamiento_datos boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre text := btrim(coalesce(p_cliente_nombre, ''));
  v_telefono text := regexp_replace(coalesce(p_cliente_telefono, ''), '\D', '', 'g');
  v_direccion text := nullif(btrim(coalesce(p_direccion, '')), '');
  v_notas text := nullif(btrim(coalesce(p_notas, '')), '');
  v_alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_codigo text;
  v_pedido_id uuid;
  v_numero bigint;
  v_total integer;
begin
  if not coalesce((select a.acepta_pedidos from public.ajustes a limit 1), true) then
    raise exception 'En este momento no estamos recibiendo pedidos en linea. Escribenos por WhatsApp.'
      using hint = 'pedidos_pausados';
  end if;

  if coalesce(p_acepta_tratamiento_datos, false) is not true then
    raise exception 'Debes aceptar el tratamiento de datos para enviar el pedido.' using hint = 'validacion';
  end if;
  if char_length(v_nombre) not between 2 and 80 then
    raise exception 'Escribe tu nombre (entre 2 y 80 caracteres).' using hint = 'validacion';
  end if;
  -- Celular colombiano sin indicativo (10 digitos que empiezan por 3) -> se agrega 57.
  if char_length(v_telefono) = 10 and left(v_telefono, 1) = '3' then
    v_telefono := '57' || v_telefono;
  end if;
  if v_telefono !~ '^[0-9]{7,15}$' then
    raise exception 'Escribe un numero de telefono valido.' using hint = 'validacion';
  end if;
  if p_tipo_entrega is null or p_tipo_entrega not in ('domicilio', 'recoger') then
    raise exception 'Elige si es a domicilio o para recoger.' using hint = 'validacion';
  end if;
  if p_tipo_entrega = 'domicilio' and (v_direccion is null or char_length(v_direccion) not between 5 and 200) then
    raise exception 'Escribe la direccion de entrega (entre 5 y 200 caracteres).' using hint = 'validacion';
  end if;
  if p_tipo_entrega = 'recoger' then
    v_direccion := null;
  end if;
  if v_notas is not null and char_length(v_notas) > 500 then
    raise exception 'Las notas no pueden superar 500 caracteres.' using hint = 'validacion';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido esta vacio.' using hint = 'validacion';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'El pedido tiene demasiadas lineas.' using hint = 'validacion';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_items) e
    where coalesce(jsonb_typeof(e -> 'producto_id'), '') <> 'number'
       or coalesce(jsonb_typeof(e -> 'cantidad'), '') <> 'number'
       or (e ->> 'cantidad')::numeric <> trunc((e ->> 'cantidad')::numeric)
       or (e ->> 'producto_id')::numeric <> trunc((e ->> 'producto_id')::numeric)
       or (e ->> 'cantidad')::numeric not between 1 and 99
  ) then
    raise exception 'Formato de productos invalido.' using hint = 'validacion';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_items) e
    group by (e ->> 'producto_id')::bigint
    having sum((e ->> 'cantidad')::int) > 99
  ) then
    raise exception 'Maximo 99 unidades por producto. Para pedidos grandes escribenos por WhatsApp.'
      using hint = 'validacion';
  end if;
  if exists (
    select 1
    from (select distinct (e ->> 'producto_id')::bigint as pid from jsonb_array_elements(p_items) e) x
    left join public.productos pr on pr.id = x.pid and pr.disponible
    where pr.id is null
  ) then
    raise exception 'Alguno de los productos ya no esta disponible. Actualiza la pagina e intentalo de nuevo.'
      using hint = 'producto_no_disponible';
  end if;

  -- Limites anti-abuso: por telefono y global.
  if (select count(*) from public.pedidos p
      where p.cliente_telefono = v_telefono and p.creado_en > now() - interval '1 hour') >= 5 then
    raise exception 'Ya recibimos varios pedidos de este numero. Escribenos por WhatsApp.' using hint = 'limite';
  end if;
  if (select count(*) from public.pedidos p where p.creado_en > now() - interval '1 hour') >= 200 then
    raise exception 'Estamos recibiendo muchos pedidos. Escribenos por WhatsApp.' using hint = 'limite';
  end if;

  loop
    v_codigo := 'AT-' || (
      select string_agg(substr(v_alfabeto, 1 + floor(random() * char_length(v_alfabeto))::int, 1), '')
      from generate_series(1, 6)
    );
    exit when not exists (select 1 from public.pedidos p where p.codigo = v_codigo);
  end loop;

  insert into public.pedidos (codigo, cliente_nombre, cliente_telefono, tipo_entrega, direccion, notas, acepta_tratamiento_datos)
  values (v_codigo, v_nombre, v_telefono, p_tipo_entrega, v_direccion, v_notas, true)
  returning id, numero into v_pedido_id, v_numero;

  insert into public.pedido_items (pedido_id, producto_id, producto_nombre, precio_unitario, cantidad)
  select v_pedido_id, pr.id, pr.nombre, pr.precio, x.cantidad
  from (
    select (e ->> 'producto_id')::bigint as pid, sum((e ->> 'cantidad')::int)::int as cantidad
    from jsonb_array_elements(p_items) e
    group by 1
  ) x
  join public.productos pr on pr.id = x.pid
  order by pr.orden, pr.id;

  select coalesce(sum(i.subtotal), 0)::int into v_total from public.pedido_items i where i.pedido_id = v_pedido_id;
  update public.pedidos p set total = v_total where p.id = v_pedido_id;

  return jsonb_build_object(
    'codigo', v_codigo,
    'numero', v_numero,
    'total', v_total,
    'items', (
      select jsonb_agg(jsonb_build_object(
        'nombre', i.producto_nombre,
        'cantidad', i.cantidad,
        'precio_unitario', i.precio_unitario,
        'subtotal', i.subtotal) order by i.id)
      from public.pedido_items i where i.pedido_id = v_pedido_id
    )
  );
end;
$$;
revoke all on function public.crear_pedido(text, text, text, text, text, jsonb, boolean) from public;
grant execute on function public.crear_pedido(text, text, text, text, text, jsonb, boolean) to anon, authenticated;

-- ---------------------------------------------------------------------
-- RPC publica: enviar un mensaje de contacto
-- ---------------------------------------------------------------------
create or replace function public.enviar_mensaje_contacto(
  p_nombre text,
  p_email text,
  p_whatsapp text,
  p_mensaje text,
  p_acepta_tratamiento_datos boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_whatsapp text := nullif(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g'), '');
  v_mensaje text := btrim(coalesce(p_mensaje, ''));
begin
  if coalesce(p_acepta_tratamiento_datos, false) is not true then
    raise exception 'Debes aceptar el tratamiento de datos para enviar el mensaje.' using hint = 'validacion';
  end if;
  if char_length(v_nombre) not between 2 and 80 then
    raise exception 'Escribe tu nombre (entre 2 y 80 caracteres).' using hint = 'validacion';
  end if;
  if char_length(v_email) > 254 or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Escribe un correo valido.' using hint = 'validacion';
  end if;
  if v_whatsapp is not null and char_length(v_whatsapp) = 10 and left(v_whatsapp, 1) = '3' then
    v_whatsapp := '57' || v_whatsapp;
  end if;
  if v_whatsapp is not null and v_whatsapp !~ '^[0-9]{7,15}$' then
    raise exception 'El WhatsApp no es valido.' using hint = 'validacion';
  end if;
  if char_length(v_mensaje) not between 10 and 2000 then
    raise exception 'El mensaje debe tener entre 10 y 2000 caracteres.' using hint = 'validacion';
  end if;

  if (select count(*) from public.mensajes_contacto m
      where m.email = v_email and m.creado_en > now() - interval '1 hour') >= 3 then
    raise exception 'Ya recibimos tus mensajes. Te responderemos pronto.' using hint = 'limite';
  end if;
  if (select count(*) from public.mensajes_contacto m where m.creado_en > now() - interval '1 hour') >= 60 then
    raise exception 'Estamos recibiendo muchos mensajes. Intenta mas tarde o escribenos por WhatsApp.'
      using hint = 'limite';
  end if;

  insert into public.mensajes_contacto (nombre, email, whatsapp, mensaje, acepta_tratamiento_datos)
  values (v_nombre, v_email, v_whatsapp, v_mensaje, true);
end;
$$;
revoke all on function public.enviar_mensaje_contacto(text, text, text, text, boolean) from public;
grant execute on function public.enviar_mensaje_contacto(text, text, text, text, boolean) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Privilegios (defensa en profundidad: ademas de RLS, anon no tiene
-- privilegios sobre datos privados)
-- ---------------------------------------------------------------------
revoke all on public.pedidos, public.pedido_items, public.mensajes_contacto, public.administradores from anon;
revoke all on public.categorias, public.productos, public.ajustes from anon;
grant select on public.categorias, public.productos, public.ajustes to anon;

revoke all on public.pedidos, public.pedido_items, public.mensajes_contacto, public.administradores,
  public.categorias, public.productos, public.ajustes from authenticated;
grant select, insert, update, delete on public.categorias, public.productos to authenticated;
grant select, delete on public.pedidos to authenticated;
grant update (estado) on public.pedidos to authenticated;
grant select on public.pedido_items to authenticated;
grant select, delete on public.mensajes_contacto to authenticated;
grant update (leido) on public.mensajes_contacto to authenticated;
grant select on public.administradores to authenticated;
grant select on public.ajustes to authenticated;
grant update (acepta_pedidos, aviso) on public.ajustes to authenticated;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.categorias enable row level security;
alter table public.productos enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_items enable row level security;
alter table public.mensajes_contacto enable row level security;
alter table public.administradores enable row level security;
alter table public.ajustes enable row level security;

-- Catalogo: lectura publica; el panel ve tambien lo no disponible.
create policy categorias_lectura_publica on public.categorias for select to anon using (true);
create policy categorias_lectura_autenticados on public.categorias for select to authenticated using (true);
create policy categorias_admin_insertar on public.categorias for insert to authenticated with check ((select privado.es_admin()));
create policy categorias_admin_actualizar on public.categorias for update to authenticated
  using ((select privado.es_admin())) with check ((select privado.es_admin()));
create policy categorias_admin_borrar on public.categorias for delete to authenticated using ((select privado.es_admin()));

create policy productos_lectura_publica on public.productos for select to anon using (disponible);
create policy productos_lectura_autenticados on public.productos for select to authenticated
  using (disponible or (select privado.es_admin()));
create policy productos_admin_insertar on public.productos for insert to authenticated with check ((select privado.es_admin()));
create policy productos_admin_actualizar on public.productos for update to authenticated
  using ((select privado.es_admin())) with check ((select privado.es_admin()));
create policy productos_admin_borrar on public.productos for delete to authenticated using ((select privado.es_admin()));

-- Pedidos y mensajes: solo el panel (los crea el publico via RPC).
create policy pedidos_admin_leer on public.pedidos for select to authenticated using ((select privado.es_admin()));
create policy pedidos_admin_actualizar on public.pedidos for update to authenticated
  using ((select privado.es_admin())) with check ((select privado.es_admin()));
create policy pedidos_admin_borrar on public.pedidos for delete to authenticated using ((select privado.es_admin()));

create policy pedido_items_admin_leer on public.pedido_items for select to authenticated using ((select privado.es_admin()));

create policy mensajes_admin_leer on public.mensajes_contacto for select to authenticated using ((select privado.es_admin()));
create policy mensajes_admin_actualizar on public.mensajes_contacto for update to authenticated
  using ((select privado.es_admin())) with check ((select privado.es_admin()));
create policy mensajes_admin_borrar on public.mensajes_contacto for delete to authenticated using ((select privado.es_admin()));

-- Cada usuario puede ver si el mismo es administrador (asi el panel sabe si dejarlo entrar).
create policy administradores_ver_propio on public.administradores for select to authenticated
  using (user_id = (select auth.uid()));

create policy ajustes_lectura_publica on public.ajustes for select to anon using (true);
create policy ajustes_lectura_autenticados on public.ajustes for select to authenticated using (true);
create policy ajustes_admin_actualizar on public.ajustes for update to authenticated
  using ((select privado.es_admin())) with check ((select privado.es_admin()));

-- ---------------------------------------------------------------------
-- Realtime: el panel recibe los pedidos nuevos en vivo (respeta RLS).
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.pedidos;

-- ---------------------------------------------------------------------
-- Storage: imagenes de productos (lectura publica, escritura solo admin)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy productos_imagenes_admin_leer on storage.objects for select to authenticated
  using (bucket_id = 'productos' and (select privado.es_admin()));
create policy productos_imagenes_admin_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and (select privado.es_admin()));
create policy productos_imagenes_admin_actualizar on storage.objects for update to authenticated
  using (bucket_id = 'productos' and (select privado.es_admin()))
  with check (bucket_id = 'productos' and (select privado.es_admin()));
create policy productos_imagenes_admin_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'productos' and (select privado.es_admin()));

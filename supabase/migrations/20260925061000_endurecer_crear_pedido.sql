-- Endurece la validacion de lineas de crear_pedido (casts seguros) y documenta
-- por que las dos RPC publicas son SECURITY DEFINER a proposito.

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
  -- Validacion de cada linea. Los casts van protegidos con CASE: Postgres no garantiza
  -- el orden de evaluacion de un OR, y un texto como "2" o "abc" no debe romper el cast.
  if exists (
    select 1
    from (
      select
        case when jsonb_typeof(e -> 'producto_id') = 'number' then (e ->> 'producto_id')::numeric end as pid,
        case when jsonb_typeof(e -> 'cantidad') = 'number' then (e ->> 'cantidad')::numeric end as cant
      from jsonb_array_elements(p_items) e
    ) x
    where x.pid is null or x.cant is null
       or x.pid <> trunc(x.pid) or x.cant <> trunc(x.cant)
       or x.pid not between 1 and 1e15
       or x.cant not between 1 and 99
  ) then
    raise exception 'Formato de productos invalido.' using hint = 'validacion';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_items) e
    group by (e ->> 'producto_id')::numeric::bigint
    having sum((e ->> 'cantidad')::numeric::int) > 99
  ) then
    raise exception 'Maximo 99 unidades por producto. Para pedidos grandes escribenos por WhatsApp.'
      using hint = 'validacion';
  end if;
  if exists (
    select 1
    from (select distinct (e ->> 'producto_id')::numeric::bigint as pid from jsonb_array_elements(p_items) e) x
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
    select (e ->> 'producto_id')::numeric::bigint as pid, sum((e ->> 'cantidad')::numeric::int)::int as cantidad
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

comment on function public.crear_pedido(text, text, text, text, text, jsonb, boolean) is
  'RPC PUBLICA INTENCIONAL (anon). Unica via para crear pedidos: valida datos, toma precios de la tabla productos (nunca del cliente), aplica limites anti-abuso y devuelve solo el pedido creado. SECURITY DEFINER porque anon no tiene privilegios sobre pedidos.';
comment on function public.enviar_mensaje_contacto(text, text, text, text, boolean) is
  'RPC PUBLICA INTENCIONAL (anon). Unica via para guardar mensajes de contacto: valida y limita frecuencia. SECURITY DEFINER porque anon no tiene privilegios sobre mensajes_contacto.';

-- ============================================================
-- Clientes unificados: un "cliente" es la componente conexa de
-- contactos normalizados (mismo email/teléfono, o contactos que
-- coaparecen en el mismo pedido). Sin tabla CRM.
-- ============================================================

-- listado agregado por ventana temporal
create or replace function public.panel_clientes(
  p_tenant uuid,
  p_desde timestamptz,
  p_hasta timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not public.app_can_access_tenant(p_tenant) then
    raise exception 'no autorizado';
  end if;

  with recursive base as (
    select
      o.id as order_id,
      o.importe_total,
      o.paid_at,
      d.destino,
      d.canal,
      d.created_at,
      case
        when d.canal = 'email' then 'e:' || lower(trim(d.destino))
        else 'p:+' || regexp_replace(d.destino, '[^0-9]', '', 'g')
      end as clave
    from public.order_deliveries d
    join public.orders o on o.id = d.order_id
    where o.tenant_id = p_tenant
      and o.estado = 'paid'
      and d.destino is not null
      and d.canal <> 'print'
      and length(trim(d.destino)) > 0
  ),
  claves as (
    select distinct clave from base where clave is not null and clave not in ('e:', 'p:+')
  ),
  -- Aristas: autoenlace + coaparición en el mismo pedido
  pares as (
    select clave as c1, clave as c2 from claves
    union
    select a.clave, b.clave
    from base a
    join base b on a.order_id = b.order_id and a.clave < b.clave
  ),
  undirected as (
    select c1, c2 from pares
    union
    select c2, c1 from pares
  ),
  connected as (
    select c1 as clave, c2 as linked from undirected
    union
    select c.clave, u.c2
    from connected c
    join undirected u on u.c1 = c.linked
  ),
  components as (
    select clave, min(linked) as root
    from connected
    group by clave
  ),
  customer_ids as (
    select
      root,
      left(md5(string_agg(clave, '|' order by clave)), 32) as customer_id
    from components
    group by root
  ),
  -- Pedidos del rango, atribuidos al cliente vía cualquiera de sus claves
  order_cliente as (
    select distinct
      ci.customer_id,
      b.order_id,
      b.importe_total,
      b.paid_at
    from base b
    join components c on c.clave = b.clave
    join customer_ids ci on ci.root = c.root
    where b.paid_at >= p_desde and b.paid_at < p_hasta
  ),
  agg as (
    select
      customer_id,
      count(*)::int as pedidos,
      sum(importe_total)::numeric as gasto,
      max(paid_at) as ultima
    from order_cliente
    group by customer_id
  ),
  -- Alias (destino/canal) más recientes por clave, solo de clientes del rango
  alias_raw as (
    select distinct on (ci.customer_id, b.clave)
      ci.customer_id,
      b.destino,
      b.canal,
      b.paid_at,
      b.created_at
    from base b
    join components c on c.clave = b.clave
    join customer_ids ci on ci.root = c.root
    join agg a on a.customer_id = ci.customer_id
    order by ci.customer_id, b.clave, b.created_at desc
  ),
  alias_agg as (
    select
      customer_id,
      jsonb_agg(
        jsonb_build_object('destino', destino, 'canal', canal)
        order by paid_at desc nulls last, created_at desc
      ) as contactos,
      (array_agg(destino order by paid_at desc nulls last, created_at desc))[1] as destino,
      (array_agg(canal order by paid_at desc nulls last, created_at desc))[1] as canal,
      (
        select jsonb_agg(distinct x.canal)
        from alias_raw x
        where x.customer_id = ar.customer_id
      ) as canales
    from alias_raw ar
    group by customer_id
  ),
  filas as (
    select
      a.customer_id as id,
      aa.destino,
      aa.canal,
      aa.canales,
      aa.contactos,
      a.pedidos,
      a.gasto,
      a.ultima
    from agg a
    join alias_agg aa on aa.customer_id = a.customer_id
  ),
  por_canal as (
    select canal, count(distinct id)::int as c
    from filas, jsonb_array_elements_text(canales) as canal
    group by canal
  )
  select jsonb_build_object(
    'contactos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'destino', destino,
        'canal', canal,
        'canales', canales,
        'contactos', contactos,
        'pedidos', pedidos,
        'gasto', gasto,
        'ultima', ultima
      ) order by gasto desc, ultima desc)
      from filas
    ), '[]'::jsonb),
    'total', (select count(*)::int from filas),
    'recurrentes', (select count(*)::int from filas where pedidos > 1),
    'nuevos', (select count(*)::int from filas where pedidos = 1),
    'por_canal', coalesce((
      select jsonb_object_agg(canal, c) from por_canal
    ), '{}'::jsonb)
  ) into v;

  return v;
end;
$$;

revoke all on function public.panel_clientes(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.panel_clientes(uuid, timestamptz, timestamptz) to authenticated;

-- ficha de un cliente unificado (historial completo del tenant)
create or replace function public.panel_cliente_detalle(
  p_tenant uuid,
  p_cliente_id text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not public.app_can_access_tenant(p_tenant) then
    raise exception 'no autorizado';
  end if;

  if p_cliente_id is null or length(trim(p_cliente_id)) < 8 then
    return null;
  end if;

  with recursive base as (
    select
      o.id as order_id,
      o.referencia,
      o.importe_total,
      o.moneda,
      o.estado,
      o.paid_at,
      o.created_at,
      o.recibo_token,
      o.location_id,
      d.destino,
      d.canal,
      d.created_at as delivery_at,
      case
        when d.canal = 'email' then 'e:' || lower(trim(d.destino))
        else 'p:+' || regexp_replace(d.destino, '[^0-9]', '', 'g')
      end as clave
    from public.order_deliveries d
    join public.orders o on o.id = d.order_id
    where o.tenant_id = p_tenant
      and o.estado = 'paid'
      and d.destino is not null
      and d.canal <> 'print'
      and length(trim(d.destino)) > 0
  ),
  claves as (
    select distinct clave from base where clave is not null and clave not in ('e:', 'p:+')
  ),
  pares as (
    select clave as c1, clave as c2 from claves
    union
    select a.clave, b.clave
    from base a
    join base b on a.order_id = b.order_id and a.clave < b.clave
  ),
  undirected as (
    select c1, c2 from pares
    union
    select c2, c1 from pares
  ),
  connected as (
    select c1 as clave, c2 as linked from undirected
    union
    select c.clave, u.c2
    from connected c
    join undirected u on u.c1 = c.linked
  ),
  components as (
    select clave, min(linked) as root
    from connected
    group by clave
  ),
  customer_ids as (
    select
      root,
      left(md5(string_agg(clave, '|' order by clave)), 32) as customer_id
    from components
    group by root
  ),
  target as (
    select root, customer_id
    from customer_ids
    where customer_id = p_cliente_id
  ),
  alias_raw as (
    select distinct on (b.clave)
      b.destino,
      b.canal,
      b.paid_at,
      b.delivery_at
    from base b
    join components c on c.clave = b.clave
    join target t on t.root = c.root
    order by b.clave, b.delivery_at desc
  ),
  alias_agg as (
    select
      jsonb_agg(
        jsonb_build_object('destino', destino, 'canal', canal)
        order by paid_at desc nulls last, delivery_at desc
      ) as contactos,
      (array_agg(destino order by paid_at desc nulls last, delivery_at desc))[1] as destino,
      (array_agg(canal order by paid_at desc nulls last, delivery_at desc))[1] as canal,
      (
        select coalesce(jsonb_agg(distinct x.canal), '[]'::jsonb) from alias_raw x
      ) as canales
    from alias_raw
  ),
  order_ids as (
    select distinct b.order_id
    from base b
    join components c on c.clave = b.clave
    join target t on t.root = c.root
  ),
  pedidos as (
    select
      o.id,
      o.referencia,
      o.paid_at,
      o.created_at,
      o.importe_total,
      o.moneda,
      o.estado,
      o.recibo_token,
      l.nombre as kiosko,
      coalesce((
        select jsonb_agg(distinct d.canal order by d.canal)
        from public.order_deliveries d
        where d.order_id = o.id and d.destino is not null and d.canal <> 'print'
      ), '[]'::jsonb) as canales
    from public.orders o
    join order_ids oi on oi.order_id = o.id
    left join public.locations l on l.id = o.location_id
  ),
  metrics as (
    select
      count(*)::int as pedidos,
      coalesce(sum(importe_total), 0)::numeric as gasto,
      max(paid_at) as ultima
    from pedidos
  )
  select case when exists (select 1 from target) then
    jsonb_build_object(
      'id', (select customer_id from target),
      'destino', (select destino from alias_agg),
      'canal', (select canal from alias_agg),
      'canales', coalesce((select canales from alias_agg), '[]'::jsonb),
      'contactos', coalesce((select contactos from alias_agg), '[]'::jsonb),
      'pedidos', (select pedidos from metrics),
      'gasto', (select gasto from metrics),
      'ultima', (select ultima from metrics),
      'historial', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', id,
          'referencia', referencia,
          'paid_at', paid_at,
          'created_at', created_at,
          'importe_total', importe_total,
          'moneda', moneda,
          'estado', estado,
          'recibo_token', recibo_token,
          'kiosko', kiosko,
          'canales', canales
        ) order by coalesce(paid_at, created_at) desc)
        from pedidos
      ), '[]'::jsonb)
    )
  else null end
  into v;

  return v;
end;
$$;

revoke all on function public.panel_cliente_detalle(uuid, text) from public, anon;
grant execute on function public.panel_cliente_detalle(uuid, text) to authenticated;

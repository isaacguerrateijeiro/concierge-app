-- ============================================================
-- FASE 3b.7: clientes y segmentos. Un "cliente" es un contacto (email/telefono)
-- que recibio un comprobante. La PII vive en order_deliveries; esta RPC agrega
-- por contacto, tenant-scoped y con comprobacion de acceso (no depende de RLS).
-- ============================================================
create or replace function public.panel_clientes(p_tenant uuid, p_desde timestamptz, p_hasta timestamptz)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not public.app_can_access_tenant(p_tenant) then
    raise exception 'no autorizado';
  end if;

  with pares as (
    select o.id oid, d.destino, d.canal, o.importe_total, o.paid_at, d.created_at
    from public.order_deliveries d
    join public.orders o on o.id = d.order_id
    where o.tenant_id = p_tenant and o.estado = 'paid'
      and o.paid_at >= p_desde and o.paid_at < p_hasta
      and d.destino is not null and d.canal <> 'print'
  ),
  por_orden as (
    select destino, oid, max(importe_total) importe, max(paid_at) paid_at,
           (array_agg(canal order by created_at desc))[1] canal
    from pares group by destino, oid
  ),
  agg as (
    select destino,
           (array_agg(canal order by paid_at desc))[1] canal,
           count(*) pedidos,
           sum(importe) gasto,
           max(paid_at) ultima
    from por_orden group by destino
  )
  select jsonb_build_object(
    'contactos', (select coalesce(jsonb_agg(jsonb_build_object(
        'destino', destino, 'canal', canal, 'pedidos', pedidos, 'gasto', gasto, 'ultima', ultima
      ) order by gasto desc), '[]'::jsonb) from agg),
    'total', (select count(*) from agg),
    'recurrentes', (select count(*) from agg where pedidos > 1),
    'nuevos', (select count(*) from agg where pedidos = 1),
    'por_canal', (select coalesce(jsonb_object_agg(canal, c), '{}'::jsonb)
                  from (select canal, count(*) c from agg group by canal) z)
  ) into v;

  return v;
end; $$;

revoke all on function public.panel_clientes(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.panel_clientes(uuid, timestamptz, timestamptz) to authenticated;

-- Agregaciones del Resumen del panel, tenant-scoped y eficientes en BD.
-- security definer + comprobacion de acceso para no depender de RLS en agregados.
create or replace function public.panel_metrics(p_tenant uuid, p_desde timestamptz, p_hasta timestamptz)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_ingresos numeric;
  v_pedidos int;
  v_items numeric;
  v_serie jsonb;
begin
  if not public.app_can_access_tenant(p_tenant) then
    raise exception 'no autorizado';
  end if;

  select coalesce(sum(importe_total), 0), count(*)
    into v_ingresos, v_pedidos
  from public.orders
  where tenant_id = p_tenant and estado = 'paid'
    and paid_at >= p_desde and paid_at < p_hasta;

  select coalesce(sum(oi.cantidad), 0)
    into v_items
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.tenant_id = p_tenant and o.estado = 'paid'
    and o.paid_at >= p_desde and o.paid_at < p_hasta;

  select coalesce(jsonb_agg(jsonb_build_object('dia', to_char(d, 'YYYY-MM-DD'), 'ingresos', ing, 'pedidos', ped) order by d), '[]'::jsonb)
    into v_serie
  from (
    select date_trunc('day', paid_at) d, sum(importe_total) ing, count(*) ped
    from public.orders
    where tenant_id = p_tenant and estado = 'paid'
      and paid_at >= p_desde and paid_at < p_hasta
    group by 1
  ) s;

  return jsonb_build_object('ingresos', v_ingresos, 'pedidos', v_pedidos, 'items', v_items, 'serie', v_serie);
end; $$;

revoke all on function public.panel_metrics(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.panel_metrics(uuid, timestamptz, timestamptz) to authenticated;

-- Top servicios por ingresos en el rango (para el Resumen y Ventas).
create or replace function public.panel_top_servicios(p_tenant uuid, p_desde timestamptz, p_hasta timestamptz, p_limite int default 6)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not public.app_can_access_tenant(p_tenant) then
    raise exception 'no autorizado';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('titulo', titulo, 'ingresos', ing, 'unidades', uds) order by ing desc), '[]'::jsonb)
    into v
  from (
    select oi.titulo, sum(oi.importe) ing, sum(oi.cantidad) uds
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.tenant_id = p_tenant and o.estado = 'paid'
      and o.paid_at >= p_desde and o.paid_at < p_hasta
    group by oi.titulo
    order by ing desc
    limit p_limite
  ) s;
  return v;
end; $$;

revoke all on function public.panel_top_servicios(uuid, timestamptz, timestamptz, int) from public, anon;
grant execute on function public.panel_top_servicios(uuid, timestamptz, timestamptz, int) to authenticated;

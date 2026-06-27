-- ============================================================
-- FASE 3b.6: instrumentacion de sesiones del kiosko + analitica de ventas.
-- El kiosko (publico/anon) NO escribe tablas directamente: envia eventos a
-- traves de un endpoint de servidor que invoca track_kiosk_event con la clave
-- de servicio. La logica de sesion (flags de embudo) vive en la BD, atomica.
-- ============================================================

-- Sesion = una visita al kiosko. El id lo genera el cliente (uuid v4).
create table public.kiosk_sessions (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  locale text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  reached_cart boolean not null default false,
  reached_checkout boolean not null default false,
  converted boolean not null default false,
  order_id uuid references public.orders(id) on delete set null
);
comment on table public.kiosk_sessions is 'Visita al kiosko. Flags de embudo derivados de los eventos. Sin PII.';
create index idx_kiosk_sessions_tenant on public.kiosk_sessions(tenant_id, started_at);
alter table public.kiosk_sessions enable row level security;

-- Eventos crudos de la sesion (para embudo, mapa de calor y depuracion).
create table public.kiosk_events (
  id bigserial primary key,
  session_id uuid not null references public.kiosk_sessions(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tipo text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
comment on table public.kiosk_events is 'Eventos de interaccion del kiosko. Escritos solo via track_kiosk_event.';
create index idx_kiosk_events_tenant on public.kiosk_events(tenant_id, created_at);
create index idx_kiosk_events_session on public.kiosk_events(session_id);
alter table public.kiosk_events enable row level security;

-- Lectura: miembros del tenant (o plataforma). Escritura: solo service_role.
create policy kiosk_sessions_sel on public.kiosk_sessions for select to authenticated
  using (public.app_can_access_tenant(tenant_id));
create policy kiosk_events_sel on public.kiosk_events for select to authenticated
  using (public.app_can_access_tenant(tenant_id));

grant select on public.kiosk_sessions to authenticated;
grant select on public.kiosk_events to authenticated;

-- ---------- Registro de eventos (security definer) ----------
-- Resuelve el tenant por slug, hace upsert de la sesion, inserta el evento y
-- actualiza los flags de embudo. Solo acepta tipos conocidos.
create or replace function public.track_kiosk_event(
  p_tenant_slug text,
  p_session uuid,
  p_tipo text,
  p_locale text default null,
  p_payload jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_order uuid;
begin
  if p_tipo not in (
    'session_start','attract_shown','screen_view','add_to_cart','view_cart',
    'checkout_start','payment_success','delivery_sent'
  ) then
    raise exception 'tipo de evento no valido: %', p_tipo;
  end if;

  select id into v_tenant from public.tenants where slug = p_tenant_slug and activo = true;
  if v_tenant is null then
    raise exception 'tenant no valido';
  end if;

  insert into public.kiosk_sessions (id, tenant_id, locale)
  values (p_session, v_tenant, p_locale)
  on conflict (id) do update set
    last_seen_at = now(),
    locale = coalesce(excluded.locale, public.kiosk_sessions.locale);

  insert into public.kiosk_events (session_id, tenant_id, tipo, payload)
  values (p_session, v_tenant, p_tipo, coalesce(p_payload, '{}'::jsonb));

  if p_tipo in ('add_to_cart','view_cart') then
    update public.kiosk_sessions set reached_cart = true where id = p_session;
  elsif p_tipo = 'checkout_start' then
    update public.kiosk_sessions set reached_cart = true, reached_checkout = true where id = p_session;
  elsif p_tipo = 'payment_success' then
    v_order := nullif(p_payload->>'order_id','')::uuid;
    update public.kiosk_sessions
      set reached_cart = true, reached_checkout = true, converted = true,
          order_id = coalesce(v_order, order_id)
      where id = p_session;
  end if;
end; $$;

-- Solo el backend (service_role) puede registrar eventos.
revoke all on function public.track_kiosk_event(text, uuid, text, text, jsonb) from public, anon, authenticated;

-- ---------- Embudo + mapa de calor (security definer) ----------
create or replace function public.panel_funnel(p_tenant uuid, p_desde timestamptz, p_hasta timestamptz)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_sesiones int; v_carrito int; v_checkout int; v_conv int;
  v_dur numeric; v_hora jsonb;
begin
  if not public.app_can_access_tenant(p_tenant) then
    raise exception 'no autorizado';
  end if;

  select count(*),
         count(*) filter (where reached_cart),
         count(*) filter (where reached_checkout),
         count(*) filter (where converted),
         coalesce(avg(extract(epoch from (last_seen_at - started_at))) filter (where last_seen_at > started_at), 0)
    into v_sesiones, v_carrito, v_checkout, v_conv, v_dur
  from public.kiosk_sessions
  where tenant_id = p_tenant and started_at >= p_desde and started_at < p_hasta;

  select coalesce(jsonb_agg(jsonb_build_object('dow', dow, 'hora', hora, 'n', n)), '[]'::jsonb)
    into v_hora
  from (
    select extract(dow from (started_at at time zone 'Europe/Madrid'))::int dow,
           extract(hour from (started_at at time zone 'Europe/Madrid'))::int hora,
           count(*) n
    from public.kiosk_sessions
    where tenant_id = p_tenant and started_at >= p_desde and started_at < p_hasta
    group by 1, 2
  ) s;

  return jsonb_build_object(
    'sesiones', v_sesiones, 'carrito', v_carrito, 'checkout', v_checkout,
    'conversiones', v_conv, 'duracion_media_seg', round(v_dur)::int, 'por_hora', v_hora
  );
end; $$;

revoke all on function public.panel_funnel(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.panel_funnel(uuid, timestamptz, timestamptz) to authenticated;

-- ---------- Ventas por categoria y proveedor (security definer) ----------
create or replace function public.panel_ventas(p_tenant uuid, p_desde timestamptz, p_hasta timestamptz)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_cat jsonb; v_prov jsonb;
begin
  if not public.app_can_access_tenant(p_tenant) then
    raise exception 'no autorizado';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('nombre', nombre, 'ingresos', ing, 'unidades', uds) order by ing desc), '[]'::jsonb)
    into v_cat
  from (
    select coalesce(c.nombre_i18n->>'es', c.slug, 'Sin categoría') nombre,
           sum(oi.importe) ing, sum(oi.cantidad) uds
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    left join public.services sv on sv.id = oi.service_id
    left join public.categories c on c.id = sv.category_id
    where o.tenant_id = p_tenant and o.estado = 'paid'
      and o.paid_at >= p_desde and o.paid_at < p_hasta
    group by 1
  ) s;

  select coalesce(jsonb_agg(jsonb_build_object('nombre', nombre, 'color', color, 'ingresos', ing, 'unidades', uds) order by ing desc), '[]'::jsonb)
    into v_prov
  from (
    select coalesce(p.nombre, 'Sin proveedor') nombre, p.color_marca color,
           sum(oi.importe) ing, sum(oi.cantidad) uds
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    left join public.services sv on sv.id = oi.service_id
    left join public.providers p on p.id = sv.provider_id
    where o.tenant_id = p_tenant and o.estado = 'paid'
      and o.paid_at >= p_desde and o.paid_at < p_hasta
    group by 1, 2
  ) s;

  return jsonb_build_object('categorias', v_cat, 'proveedores', v_prov);
end; $$;

revoke all on function public.panel_ventas(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.panel_ventas(uuid, timestamptz, timestamptz) to authenticated;

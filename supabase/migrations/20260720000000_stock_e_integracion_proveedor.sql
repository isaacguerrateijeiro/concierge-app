-- ============================================================
-- FASE 5: Stock e integración de proveedores.
--
--  Motor de stock LOCAL funcional + seams para la API real de Big Bus.
--
--  - providers.integracion_config: adaptador de integración por proveedor
--    ('local' por defecto, 'bigbus' cuando se configure su API).
--  - services.capacidad_diaria: capacidad por defecto por día (stock local)
--    cuando no hay una fila específica por fecha. NULL = sin control de stock.
--  - service_availability: capacidad y reservas por (servicio, fecha).
--  - order_bookings: confirmación de reserva por (pedido, proveedor),
--    idempotente (mismo patrón que order_transfers).
--  - get_disponibilidad(slug, desde, hasta): disponibilidad por fecha (kiosko).
--  - reservar_stock(service_id, fecha, cantidad): descuento atómico de stock.
-- ============================================================

-- ---------- providers: configuración del adaptador de integración ----------
alter table public.providers
  add column if not exists integracion_config jsonb not null default '{}'::jsonb;
comment on column public.providers.integracion_config is
  'Config del adaptador de integración del proveedor: {"tipo":"local"|"bigbus","endpoint":...,"api_key_ref":...}. tipo=local usa stock interno.';

-- ---------- services: capacidad diaria por defecto (stock local) ----------
alter table public.services
  add column if not exists capacidad_diaria int check (capacidad_diaria is null or capacidad_diaria >= 0);
comment on column public.services.capacidad_diaria is
  'Capacidad por defecto por día para el stock local. NULL = sin control de stock (ilimitado).';

-- ---------- service_availability: stock por servicio y fecha ----------
create table if not exists public.service_availability (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.services(id) on delete cascade,
  fecha       date not null,
  capacidad   int not null default 0 check (capacidad >= 0),
  reservados  int not null default 0 check (reservados >= 0),
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (service_id, fecha)
);
comment on table public.service_availability is
  'Stock local por (servicio, fecha): capacidad total y plazas reservadas. Fuente del calendario del kiosko.';
comment on column public.service_availability.reservados is
  'Plazas ya reservadas (pagadas). Se incrementa de forma atómica vía reservar_stock.';

create index if not exists idx_service_availability_svc
  on public.service_availability(service_id, fecha);

alter table public.service_availability enable row level security;

create policy "sa_service_role_all" on public.service_availability
  as permissive for all to service_role using (true) with check (true);

create policy "sa_auth_select" on public.service_availability
  as permissive for select to authenticated
  using (
    service_id in (
      select s.id from public.services s
      where public.app_can_access_tenant(s.tenant_id)
    )
  );

create policy "sa_auth_insert" on public.service_availability
  as permissive for insert to authenticated
  with check (
    service_id in (
      select s.id from public.services s
      where public.app_can_access_tenant(s.tenant_id)
    )
  );

create policy "sa_auth_update" on public.service_availability
  as permissive for update to authenticated
  using (
    service_id in (
      select s.id from public.services s
      where public.app_can_access_tenant(s.tenant_id)
    )
  );

create policy "sa_auth_delete" on public.service_availability
  as permissive for delete to authenticated
  using (
    service_id in (
      select s.id from public.services s
      where public.app_can_access_tenant(s.tenant_id)
    )
  );

-- ---------- order_bookings: confirmación de reserva por proveedor ----------
create table if not exists public.order_bookings (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders(id) on delete cascade,
  provider_id        uuid not null references public.providers(id) on delete cascade,
  estado             text not null default 'pending' check (estado in ('pending','confirmed','failed')),
  adaptador          text,
  referencia_externa text,
  error              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (order_id, provider_id)
);
comment on table public.order_bookings is
  'Confirmación de reserva de un pedido con un proveedor. Idempotente por (order_id, provider_id).';
comment on column public.order_bookings.referencia_externa is
  'Localizador/referencia devuelto por el proveedor (p.ej. Big Bus) tras confirmar la reserva.';

create index if not exists idx_order_bookings_order on public.order_bookings(order_id);

alter table public.order_bookings enable row level security;

create policy "ob_service_role_all" on public.order_bookings
  as permissive for all to service_role using (true) with check (true);

create policy "ob_auth_select" on public.order_bookings
  as permissive for select to authenticated
  using (
    order_id in (
      select o.id from public.orders o
      where public.app_can_access_tenant(o.tenant_id)
    )
  );

-- ---------- get_disponibilidad: disponibilidad por fecha para el kiosko ----------
-- Devuelve un objeto { "YYYY-MM-DD": { restante, agotado } } SOLO para las
-- fechas con fila explícita en service_availability. Las fechas sin fila se
-- consideran disponibles (capacidad por defecto / ilimitada).
create or replace function public.get_disponibilidad(
  p_service_slug text,
  p_desde date,
  p_hasta date
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with svc as (
    select id from public.services where slug = p_service_slug and activo = true limit 1
  )
  select coalesce(jsonb_object_agg(
    a.fecha::text,
    jsonb_build_object(
      'restante', greatest(a.capacidad - a.reservados, 0),
      'agotado', (a.activo = false) or ((a.capacidad - a.reservados) <= 0)
    )
  ), '{}'::jsonb)
  from public.service_availability a
  join svc on svc.id = a.service_id
  where a.fecha between p_desde and p_hasta;
$$;

revoke all on function public.get_disponibilidad(text, date, date) from public;
grant execute on function public.get_disponibilidad(text, date, date) to anon, authenticated;

-- ---------- reservar_stock: descuento atómico de plazas ----------
-- Devuelve true si hay stock suficiente y se reservan las plazas (o si el
-- servicio no tiene control de stock). Devuelve false si no hay disponibilidad.
-- Idempotencia real la garantiza order_bookings a nivel de pedido/proveedor.
create or replace function public.reservar_stock(
  p_service_id uuid,
  p_fecha date,
  p_cantidad int
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_default int;
  v_existe  boolean;
  v_ok      boolean := false;
begin
  if p_cantidad is null or p_cantidad <= 0 then
    return true;
  end if;
  if p_fecha is null then
    return true; -- servicio sin fecha: sin control de stock por fecha
  end if;

  select capacidad_diaria into v_default from public.services where id = p_service_id;
  select exists(
    select 1 from public.service_availability
    where service_id = p_service_id and fecha = p_fecha
  ) into v_existe;

  -- Sin fila específica y sin capacidad por defecto => stock ilimitado.
  if not v_existe and v_default is null then
    return true;
  end if;

  -- Garantizar que exista la fila del día (a partir de la capacidad por defecto).
  insert into public.service_availability (service_id, fecha, capacidad, reservados)
    values (p_service_id, p_fecha, coalesce(v_default, 0), 0)
    on conflict (service_id, fecha) do nothing;

  -- Reserva atómica: solo si quedan plazas y el día está activo.
  update public.service_availability
     set reservados = reservados + p_cantidad
   where service_id = p_service_id
     and fecha = p_fecha
     and activo = true
     and (capacidad - reservados) >= p_cantidad
  returning true into v_ok;

  return coalesce(v_ok, false);
end;
$$;

revoke all on function public.reservar_stock(uuid, date, int) from public, anon, authenticated;
grant execute on function public.reservar_stock(uuid, date, int) to service_role;

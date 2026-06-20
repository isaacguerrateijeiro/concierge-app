-- ============================================================
-- MODELO DE PEDIDOS (Fase 2): pedidos, líneas y desglose de comisiones.
-- Importes en unidades de moneda (euros) con 2 decimales, igual que services.
-- RLS activado SIN políticas públicas: el público (anon) no puede leer ni
-- escribir. Las escrituras se hacen desde el servidor con la clave de servicio
-- (service_role), que omite RLS. La lectura de estado se hace por una RPC
-- mínima y segura (get_order_status).
-- ============================================================

-- ORDERS: una compra (carrito) pagada en una sola operación
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  estado text not null default 'pending' check (estado in ('pending','paid','failed','expired')),
  moneda text not null default 'EUR',
  importe_total numeric(10,2) not null check (importe_total >= 0),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  idioma text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);
comment on table public.orders is 'Pedidos del kiosko. Un pedido agrupa varios servicios pagados juntos.';
create index idx_orders_tenant on public.orders(tenant_id);
create index idx_orders_session on public.orders(stripe_checkout_session_id);
create trigger trg_orders_updated_at before update on public.orders for each row execute function public.set_updated_at();

-- ORDER_ITEMS: cada servicio del pedido, con SNAPSHOT del precio y título
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_slug text not null,
  titulo text not null,
  precio_unitario numeric(10,2) not null check (precio_unitario >= 0),
  cantidad int not null check (cantidad > 0),
  importe numeric(10,2) not null check (importe >= 0),
  created_at timestamptz not null default now()
);
comment on table public.order_items is 'Líneas de un pedido. Guardan snapshot de precio y título en el momento de compra.';
create index idx_order_items_order on public.order_items(order_id);

-- ORDER_COMMISSIONS: desglose a 3 vías por línea (para futura liquidación)
create table public.order_commissions (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  beneficiario text not null check (beneficiario in ('plataforma','operador','proveedor')),
  tipo_calculo text check (tipo_calculo in ('porcentaje','fijo')),
  valor numeric(12,4),
  importe numeric(10,2) not null,
  created_at timestamptz not null default now()
);
comment on table public.order_commissions is 'Reparto a 3 vías por línea de pedido. Registro contable; el movimiento real de dinero (Connect) llega en Fase 3.';
create index idx_order_commissions_item on public.order_commissions(order_item_id);

-- RLS: activar en las tres, sin políticas públicas (deny por defecto a anon).
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_commissions enable row level security;

-- get_order_status: lectura pública MÍNIMA por id de sesión de Stripe.
-- No es sensible ni forjable (solo lee el estado), así el kiosko anónimo
-- puede confirmar el resultado del pago.
create or replace function public.get_order_status(p_session_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'estado', o.estado,
    'importe_total', o.importe_total,
    'moneda', o.moneda
  )
  from public.orders o
  where o.stripe_checkout_session_id = p_session_id;
$$;
revoke all on function public.get_order_status(text) from public;
grant execute on function public.get_order_status(text) to anon, authenticated;

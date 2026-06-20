-- ============================================================
-- FASE 3a.2: Comprobante/voucher con QR + entregas multicanal.
-- order_vouchers: un voucher por linea (codigo + token para QR/canje).
-- orders.recibo_token: token de la pagina publica de recibo del pedido.
-- order_deliveries: registro de cada envio (email/sms/whatsapp/print).
-- RLS sin politicas publicas; lectura publica solo via RPC get_recibo.
-- ============================================================

alter table public.orders
  add column if not exists recibo_token text unique;
comment on column public.orders.recibo_token is 'Token aleatorio para la pagina publica de recibo (/r/[token]).';

create table public.order_vouchers (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  provider_id uuid references public.providers(id) on delete set null,
  codigo text not null,
  token text not null unique,
  estado text not null default 'issued' check (estado in ('issued','redeemed','void')),
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_item_id)
);
comment on table public.order_vouchers is 'Voucher por linea de pedido: codigo legible + token para QR/canje. Idempotente por order_item_id.';
create index idx_order_vouchers_order on public.order_vouchers(order_id);
create trigger trg_order_vouchers_updated_at before update on public.order_vouchers for each row execute function public.set_updated_at();

create table public.order_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  canal text not null check (canal in ('email','sms','whatsapp','print')),
  destino text,
  estado text not null default 'pending' check (estado in ('pending','sent','failed')),
  proveedor_msg_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.order_deliveries is 'Registro de entregas del comprobante por canal. destino (PII) solo aqui, con proposito de entrega.';
create index idx_order_deliveries_order on public.order_deliveries(order_id);
create trigger trg_order_deliveries_updated_at before update on public.order_deliveries for each row execute function public.set_updated_at();

-- RLS: activar sin politicas publicas (deny a anon).
alter table public.order_vouchers enable row level security;
alter table public.order_deliveries enable row level security;

-- get_recibo: lectura publica del recibo por token (solo pedidos pagados).
-- No expone datos sensibles (ni comisiones ni PII de entrega).
create or replace function public.get_recibo(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'estado', o.estado,
    'importe_total', o.importe_total,
    'moneda', o.moneda,
    'created_at', o.created_at,
    'idioma', o.idioma,
    'tenant', jsonb_build_object(
      'slug', t.slug,
      'nombre', t.nombre,
      'branding', t.branding
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'titulo', oi.titulo,
        'cantidad', oi.cantidad,
        'precio_unitario', oi.precio_unitario,
        'importe', oi.importe,
        'voucher', (
          select jsonb_build_object('codigo', v.codigo, 'token', v.token, 'estado', v.estado)
          from public.order_vouchers v where v.order_item_id = oi.id limit 1
        )
      ) order by oi.created_at)
      from public.order_items oi where oi.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  join public.tenants t on t.id = o.tenant_id
  where o.recibo_token = p_token and o.estado = 'paid';
$$;
revoke all on function public.get_recibo(text) from public;
grant execute on function public.get_recibo(text) to anon, authenticated;

-- ============================================================
-- FASE 3a: Stripe Connect. Datos de la cuenta conectada por proveedor y
-- registro de transferencias (payouts) por pedido y proveedor.
-- ============================================================

-- Cuenta conectada de Stripe por proveedor (recipient, recibe transferencias).
alter table public.providers
  add column if not exists stripe_account_id text,
  add column if not exists stripe_payouts_activos boolean not null default false,
  add column if not exists stripe_onboarding_estado text;
comment on column public.providers.stripe_account_id is 'ID de la cuenta conectada v2 (recipient) en Stripe.';
comment on column public.providers.stripe_payouts_activos is 'true cuando la cuenta puede recibir transferencias (onboarding completo).';

-- Transferencias a proveedores tras un pago. Una fila por (pedido, proveedor).
create table public.order_transfers (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete restrict,
  stripe_account_id text,
  importe numeric(10,2) not null check (importe >= 0),
  moneda text not null default 'EUR',
  estado text not null default 'pending' check (estado in ('pending','paid','failed')),
  stripe_transfer_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, provider_id)
);
comment on table public.order_transfers is 'Reparto real: transferencia de la parte del proveedor por pedido. Idempotente por (order_id, provider_id).';
create index idx_order_transfers_order on public.order_transfers(order_id);
create index idx_order_transfers_estado on public.order_transfers(estado);
create trigger trg_order_transfers_updated_at before update on public.order_transfers for each row execute function public.set_updated_at();

-- RLS: sin políticas públicas (solo servidor con service_role escribe/lee).
alter table public.order_transfers enable row level security;

-- ============================================================
-- FASE 3b.8: campanas de reactivacion (email / SMS / WhatsApp).
-- Definicion + estadisticas de envio. El envio real usa la infra de canales
-- existente (Resend / Twilio). RLS: lectura para miembros; gestion owner/admin.
-- ============================================================
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nombre text not null,
  canal text not null check (canal in ('email','sms','whatsapp')),
  segmento text not null default 'todos' check (segmento in ('todos','recurrentes','nuevos')),
  asunto text,
  mensaje text not null,
  estado text not null default 'borrador' check (estado in ('borrador','enviada')),
  audiencia int not null default 0,
  enviados int not null default 0,
  fallidos int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  enviada_at timestamptz
);
comment on table public.campaigns is 'Campanas de marketing del tenant. Estadisticas agregadas de envio.';
create index idx_campaigns_tenant on public.campaigns(tenant_id, created_at desc);
alter table public.campaigns enable row level security;

create trigger trg_campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.campaigns to authenticated;

create policy campaigns_sel on public.campaigns for select to authenticated
  using (public.app_can_access_tenant(tenant_id));
create policy campaigns_ins on public.campaigns for insert to authenticated
  with check (public.app_has_tenant_role(tenant_id, array['owner','admin']));
create policy campaigns_upd on public.campaigns for update to authenticated
  using (public.app_has_tenant_role(tenant_id, array['owner','admin']))
  with check (public.app_has_tenant_role(tenant_id, array['owner','admin']));
create policy campaigns_del on public.campaigns for delete to authenticated
  using (public.app_has_tenant_role(tenant_id, array['owner','admin']));

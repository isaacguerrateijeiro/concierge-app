-- ============================================================
-- FASE 3b.1: identidad (profiles + memberships) y RLS por tenant.
-- El panel usa el cliente autenticado (anon + sesion), asi que TODO acceso
-- pasa por estas politicas. El service_role (webhook, RPC publicos) las omite.
-- ============================================================

-- Perfil de cada usuario (espejo de auth.users) + flag de admin de plataforma.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nombre text,
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Perfil de usuario del panel. is_platform_admin = personal de Kioma (acceso a todos los tenants).';
alter table public.profiles enable row level security;

-- Pertenencia usuario<->tenant con rol.
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  rol text not null check (rol in ('owner','admin','editor','analista')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tenant_id)
);
comment on table public.memberships is 'Pertenencia de un usuario a un tenant con un rol. Aisla el acceso al panel.';
create index idx_memberships_user on public.memberships(user_id);
create index idx_memberships_tenant on public.memberships(tenant_id);
alter table public.memberships enable row level security;

-- Crear perfil automaticamente al registrarse un usuario en Supabase Auth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, nombre)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'nombre', new.raw_user_meta_data->>'name', new.email))
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- Helpers (security definer: omiten RLS de memberships/profiles) ----------
create or replace function public.app_is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select is_platform_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.app_can_access_tenant(p_tenant uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.app_is_platform_admin()
      or exists (select 1 from public.memberships m where m.user_id = auth.uid() and m.tenant_id = p_tenant);
$$;

create or replace function public.app_has_tenant_role(p_tenant uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select public.app_is_platform_admin()
      or exists (select 1 from public.memberships m
                 where m.user_id = auth.uid() and m.tenant_id = p_tenant and m.rol = any(p_roles));
$$;

revoke all on function public.app_is_platform_admin() from public, anon;
revoke all on function public.app_can_access_tenant(uuid) from public, anon;
revoke all on function public.app_has_tenant_role(uuid, text[]) from public, anon;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.app_is_platform_admin() to authenticated;
grant execute on function public.app_can_access_tenant(uuid) to authenticated;
grant execute on function public.app_has_tenant_role(uuid, text[]) to authenticated;

-- ---------- Grants base para el rol authenticated ----------
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.memberships to authenticated;

-- ---------- Politicas: profiles ----------
create policy profiles_sel on public.profiles for select to authenticated using (
  id = auth.uid() or public.app_is_platform_admin() or exists (
    select 1 from public.memberships m1 join public.memberships m2 on m1.tenant_id = m2.tenant_id
    where m1.user_id = auth.uid() and m2.user_id = public.profiles.id)
);
create policy profiles_upd_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_all_platform on public.profiles for all to authenticated
  using (public.app_is_platform_admin()) with check (public.app_is_platform_admin());

-- ---------- Politicas: memberships ----------
create policy memberships_sel on public.memberships for select to authenticated
  using (public.app_can_access_tenant(tenant_id));
create policy memberships_ins on public.memberships for insert to authenticated
  with check (public.app_has_tenant_role(tenant_id, array['owner','admin']));
create policy memberships_upd on public.memberships for update to authenticated
  using (public.app_has_tenant_role(tenant_id, array['owner','admin']))
  with check (public.app_has_tenant_role(tenant_id, array['owner','admin']));
create policy memberships_del on public.memberships for delete to authenticated
  using (public.app_has_tenant_role(tenant_id, array['owner','admin']));

-- ---------- Politicas: tenants ----------
create policy tenants_sel on public.tenants for select to authenticated using (public.app_can_access_tenant(id));
create policy tenants_upd on public.tenants for update to authenticated
  using (public.app_has_tenant_role(id, array['owner','admin','editor']))
  with check (public.app_has_tenant_role(id, array['owner','admin','editor']));
create policy tenants_ins on public.tenants for insert to authenticated with check (public.app_is_platform_admin());
create policy tenants_del on public.tenants for delete to authenticated using (public.app_is_platform_admin());

-- ---------- RLS resto de tablas ----------
-- Lectura: cualquier miembro del tenant (o plataforma).
-- Escritura desde panel: owner/admin/editor (analista = solo lectura).
-- orders y sus hijas se escriben via service_role (webhook); aqui solo SELECT.

create policy locations_sel on public.locations for select to authenticated using (public.app_can_access_tenant(tenant_id));
create policy locations_ins on public.locations for insert to authenticated with check (public.app_has_tenant_role(tenant_id, array['owner','admin','editor']));
create policy locations_upd on public.locations for update to authenticated using (public.app_has_tenant_role(tenant_id, array['owner','admin','editor'])) with check (public.app_has_tenant_role(tenant_id, array['owner','admin','editor']));
create policy locations_del on public.locations for delete to authenticated using (public.app_has_tenant_role(tenant_id, array['owner','admin','editor']));

create policy providers_sel on public.providers for select to authenticated using (public.app_can_access_tenant(tenant_id));
create policy providers_ins on public.providers for insert to authenticated with check (public.app_has_tenant_role(tenant_id, array['owner','admin','editor']));
create policy providers_upd on public.providers for update to authenticated using (public.app_has_tenant_role(tenant_id, array['owner','admin','editor'])) with check (public.app_has_tenant_role(tenant_id, array['owner','admin','editor']));
create policy providers_del on public.providers for delete to authenticated using (public.app_has_tenant_role(tenant_id, array['owner','admin']));

create policy categories_sel on public.categories for select to authenticated using (public.app_can_access_tenant(tenant_id));
create policy categories_ins on public.categories for insert to authenticated with check (public.app_has_tenant_role(tenant_id, array['owner','admin','editor']));
create policy categories_upd on public.categories for update to authenticated using (public.app_has_tenant_role(tenant_id, array['owner','admin','editor'])) with check (public.app_has_tenant_role(tenant_id, array['owner','admin','editor']));
create policy categories_del on public.categories for delete to authenticated using (public.app_has_tenant_role(tenant_id, array['owner','admin','editor']));

create policy services_sel on public.services for select to authenticated using (public.app_can_access_tenant(tenant_id));
create policy services_ins on public.services for insert to authenticated with check (public.app_has_tenant_role(tenant_id, array['owner','admin','editor']));
create policy services_upd on public.services for update to authenticated using (public.app_has_tenant_role(tenant_id, array['owner','admin','editor'])) with check (public.app_has_tenant_role(tenant_id, array['owner','admin','editor']));
create policy services_del on public.services for delete to authenticated using (public.app_has_tenant_role(tenant_id, array['owner','admin','editor']));

create policy commission_rules_sel on public.commission_rules for select to authenticated using (public.app_can_access_tenant(tenant_id));
create policy commission_rules_ins on public.commission_rules for insert to authenticated with check (public.app_has_tenant_role(tenant_id, array['owner','admin']));
create policy commission_rules_upd on public.commission_rules for update to authenticated using (public.app_has_tenant_role(tenant_id, array['owner','admin'])) with check (public.app_has_tenant_role(tenant_id, array['owner','admin']));
create policy commission_rules_del on public.commission_rules for delete to authenticated using (public.app_has_tenant_role(tenant_id, array['owner','admin']));

create policy orders_sel on public.orders for select to authenticated using (public.app_can_access_tenant(tenant_id));

create policy order_items_sel on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = public.order_items.order_id and public.app_can_access_tenant(o.tenant_id)));
create policy order_commissions_sel on public.order_commissions for select to authenticated using (exists (select 1 from public.order_items oi join public.orders o on o.id = oi.order_id where oi.id = public.order_commissions.order_item_id and public.app_can_access_tenant(o.tenant_id)));
create policy order_transfers_sel on public.order_transfers for select to authenticated using (exists (select 1 from public.orders o where o.id = public.order_transfers.order_id and public.app_can_access_tenant(o.tenant_id)));
create policy order_vouchers_sel on public.order_vouchers for select to authenticated using (exists (select 1 from public.orders o where o.id = public.order_vouchers.order_id and public.app_can_access_tenant(o.tenant_id)));
create policy order_deliveries_sel on public.order_deliveries for select to authenticated using (exists (select 1 from public.orders o where o.id = public.order_deliveries.order_id and public.app_can_access_tenant(o.tenant_id)));
create policy order_invoices_sel on public.order_invoices for select to authenticated using (exists (select 1 from public.orders o where o.id = public.order_invoices.order_id and public.app_can_access_tenant(o.tenant_id)));

create policy provider_invoice_counters_sel on public.provider_invoice_counters for select to authenticated using (exists (select 1 from public.providers p where p.id = public.provider_invoice_counters.provider_id and public.app_can_access_tenant(p.tenant_id)));

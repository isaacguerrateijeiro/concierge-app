-- =========================================================
-- LOCATIONS: ubicaciones físicas donde se instalan los kioscos
-- =========================================================
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  nombre text not null,
  tipo_i18n jsonb not null default '{}'::jsonb,
  orden int not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.locations is 'Ubicaciones físicas donde se instalan los kioscos de un tenant.';
create index idx_locations_tenant on public.locations(tenant_id);
create trigger trg_locations_updated_at before update on public.locations for each row execute function public.set_updated_at();

-- =========================================================
-- PROVIDERS: proveedores de servicios (Bolt, Julia Travel...)
-- =========================================================
create table public.providers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null,
  nombre text not null,
  color_marca text,
  logo text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);
comment on table public.providers is 'Proveedores que prestan los servicios. Aislados por tenant.';
create index idx_providers_tenant on public.providers(tenant_id);
create trigger trg_providers_updated_at before update on public.providers for each row execute function public.set_updated_at();

-- =========================================================
-- CATEGORIES: agrupaciones del frontal (Live Madrid, Financieros)
-- =========================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null,
  nombre_i18n jsonb not null default '{}'::jsonb,
  subtitulo_i18n jsonb not null default '{}'::jsonb,
  orden int not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);
comment on table public.categories is 'Categorías para agrupar servicios en el frontal. Textos bilingües en JSON.';
create index idx_categories_tenant on public.categories(tenant_id);
create trigger trg_categories_updated_at before update on public.categories for each row execute function public.set_updated_at();

-- =========================================================
-- SERVICES: lo que se vende. Integrado (Stripe) o derivado (redirige)
-- =========================================================
create table public.services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  provider_id uuid not null references public.providers(id) on delete restrict,
  slug text not null,
  titulo_i18n jsonb not null default '{}'::jsonb,
  subtitulo_i18n jsonb not null default '{}'::jsonb,
  -- 'integrado' = se paga en el kiosko; 'derivado' = redirige al tercero
  tipo_pago text not null check (tipo_pago in ('integrado','derivado')),
  precio_desde numeric(10,2),
  moneda text not null default 'EUR',
  url_redireccion text,
  icono text,
  orden int not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);
comment on table public.services is 'Servicios vendibles del catálogo. tipo_pago distingue integrado vs derivado.';
create index idx_services_tenant on public.services(tenant_id);
create index idx_services_category on public.services(category_id);
create index idx_services_provider on public.services(provider_id);
create trigger trg_services_updated_at before update on public.services for each row execute function public.set_updated_at();

-- =========================================================
-- COMMISSION_RULES: reparto a 3 vías (plataforma/operador/proveedor)
-- Regla por proveedor (general) o por servicio (excepción).
-- =========================================================
create table public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  -- 'proveedor' = regla general; 'servicio' = excepción que tiene prioridad
  ambito text not null check (ambito in ('proveedor','servicio')),
  provider_id uuid references public.providers(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  -- Las 3 partes del reparto
  beneficiario text not null check (beneficiario in ('plataforma','operador','proveedor')),
  -- '%' o cantidad fija
  tipo_calculo text not null check (tipo_calculo in ('porcentaje','fijo')),
  valor numeric(12,4) not null,
  moneda text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Coherencia: si es regla de proveedor, debe haber provider_id (y no service_id), y viceversa
  constraint chk_ambito_coherente check (
    (ambito = 'proveedor' and provider_id is not null and service_id is null)
    or (ambito = 'servicio' and service_id is not null and provider_id is null)
  )
);
comment on table public.commission_rules is 'Reglas de comisión a 3 vías. Por proveedor (general) o por servicio (excepción).';
create index idx_commission_tenant on public.commission_rules(tenant_id);
create index idx_commission_provider on public.commission_rules(provider_id);
create index idx_commission_service on public.commission_rules(service_id);
create trigger trg_commission_updated_at before update on public.commission_rules for each row execute function public.set_updated_at();

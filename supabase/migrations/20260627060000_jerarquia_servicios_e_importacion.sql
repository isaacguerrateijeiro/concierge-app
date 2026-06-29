-- ============================================================
-- FASE 3c: jerarquía de catálogo (árbol de N niveles) + importación web.
--
--  - services.parent_id: auto-referencia para anidar nodos (Producto → Grupo
--    → Servicio). NULL = nodo de nivel superior dentro de su categoría.
--  - services.tipo_nodo: 'grupo' (agrupa hijos, NO se vende) o 'servicio'
--    (hoja vendible con precio y tipo_pago, comportamiento actual).
--  - services.estado: 'publicado' (visible en kiosko) o 'borrador' (lo deja el
--    importador para revisión; nunca se muestra en el kiosko).
--  - services.imagen_url: imagen del producto (la web fuente suele traer una).
--  - services.fuente_ref: identificador del item en la web origen (idempotencia).
--  - providers.fuente_url / fuente_config: de dónde y cómo importar por proveedor.
--  - import_runs: auditoría de cada ejecución del importador.
-- ============================================================

-- ---------- services: columnas de jerarquía / estado / importación ----------
alter table public.services
  add column if not exists parent_id uuid references public.services(id) on delete cascade,
  add column if not exists tipo_nodo text not null default 'servicio' check (tipo_nodo in ('grupo','servicio')),
  add column if not exists estado text not null default 'publicado' check (estado in ('borrador','publicado')),
  add column if not exists imagen_url text,
  add column if not exists fuente_ref text;

comment on column public.services.parent_id is 'Nodo padre (auto-referencia). NULL = nivel superior dentro de la categoría.';
comment on column public.services.tipo_nodo is 'grupo = agrupador no vendible; servicio = hoja vendible.';
comment on column public.services.estado is 'publicado = visible en kiosko; borrador = pendiente de revisión (importador).';
comment on column public.services.imagen_url is 'URL de imagen del producto (puede venir de la web fuente).';
comment on column public.services.fuente_ref is 'Identificador del item en la web origen, para importación idempotente.';

-- Un 'grupo' no necesita tipo_pago; un 'servicio' sí. Relajamos NOT NULL y
-- añadimos una comprobación de coherencia por tipo de nodo.
alter table public.services alter column tipo_pago drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_nodo_coherente' and conrelid = 'public.services'::regclass
  ) then
    alter table public.services add constraint chk_nodo_coherente check (
      tipo_nodo <> 'servicio' or tipo_pago is not null
    );
  end if;
end $$;

create index if not exists idx_services_parent on public.services(parent_id);
create index if not exists idx_services_estado on public.services(tenant_id, estado);
create unique index if not exists uq_services_fuente
  on public.services(tenant_id, provider_id, fuente_ref) where fuente_ref is not null;

-- ---------- providers: configuración de la fuente de importación ----------
alter table public.providers
  add column if not exists fuente_url text,
  add column if not exists fuente_config jsonb not null default '{}'::jsonb;
comment on column public.providers.fuente_url is 'URL pública desde la que el importador lee el catálogo del proveedor.';
comment on column public.providers.fuente_config is 'Opciones del importador (selectores CSS, categoría/destino por defecto, etc.).';

-- ---------- import_runs: auditoría de importaciones ----------
create table if not exists public.import_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  fuente_url text,
  estado text not null default 'ok' check (estado in ('ok','parcial','error')),
  detectados int not null default 0,
  creados int not null default 0,
  actualizados int not null default 0,
  errores int not null default 0,
  detalle jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
comment on table public.import_runs is 'Registro de cada ejecución del importador web por proveedor.';
create index if not exists idx_import_runs_tenant on public.import_runs(tenant_id, created_at desc);
alter table public.import_runs enable row level security;

grant select, insert on public.import_runs to authenticated;

create policy import_runs_sel on public.import_runs for select to authenticated
  using (public.app_can_access_tenant(tenant_id));
create policy import_runs_ins on public.import_runs for insert to authenticated
  with check (public.app_has_tenant_role(tenant_id, array['owner','admin','editor']));

-- ---------- get_catalog: incluir árbol y filtrar por estado publicado ----------
create or replace function public.get_catalog(p_tenant_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'tenant', (
      select jsonb_build_object(
        'slug', t.slug,
        'nombre', t.nombre,
        'branding', t.branding,
        'locales', t.locales,
        'locale_default', t.locale_default
      )
      from public.tenants t
      where t.slug = p_tenant_slug and t.activo = true
    ),
    'locations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nombre', l.nombre, 'tipo_i18n', l.tipo_i18n, 'orden', l.orden
      ) order by l.orden)
      from public.locations l
      join public.tenants t on t.id = l.tenant_id
      where t.slug = p_tenant_slug and l.activo = true
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', c.slug, 'nombre_i18n', c.nombre_i18n,
        'subtitulo_i18n', c.subtitulo_i18n, 'orden', c.orden
      ) order by c.orden)
      from public.categories c
      join public.tenants t on t.id = c.tenant_id
      where t.slug = p_tenant_slug and c.activo = true
    ), '[]'::jsonb),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', s.slug,
        'titulo_i18n', s.titulo_i18n,
        'subtitulo_i18n', s.subtitulo_i18n,
        'tipo_pago', s.tipo_pago,
        'tipo_nodo', s.tipo_nodo,
        'parent', (select ps.slug from public.services ps where ps.id = s.parent_id),
        'precio_desde', s.precio_desde,
        'moneda', s.moneda,
        'url_redireccion', s.url_redireccion,
        'icono', s.icono,
        'imagen_url', s.imagen_url,
        'orden', s.orden,
        'categoria', c.slug,
        'proveedor', jsonb_build_object(
          'slug', p.slug, 'nombre', p.nombre,
          'color_marca', p.color_marca, 'logo', p.logo
        )
      ) order by c.orden, s.orden)
      from public.services s
      join public.tenants t on t.id = s.tenant_id
      join public.categories c on c.id = s.category_id
      join public.providers p on p.id = s.provider_id
      where t.slug = p_tenant_slug and s.activo = true and s.estado = 'publicado'
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_catalog(text) from public;
grant execute on function public.get_catalog(text) to anon, authenticated;

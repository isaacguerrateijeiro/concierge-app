-- ============================================================
-- FASE 4: Tarifas por tipo de pasajero (adulto/niño/senior…),
-- extensión de order_items con fecha y variante, y actualización
-- acumulada de get_catalog para exponer price_tiers por servicio.
-- ============================================================

-- 1. Tabla de tarifas por tipo de pasajero -------------------
create table if not exists public.service_price_tiers (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.services(id) on delete cascade,
  tipo        text not null check (length(tipo) > 0),
  label_i18n  jsonb not null default '{}'::jsonb,
  precio      numeric(10,2) not null check (precio >= 0),
  orden       int not null default 0,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (service_id, tipo)
);

comment on table public.service_price_tiers is
  'Tarifas por tipo de pasajero (adulto, niño, senior…) para servicios integrados con precio variable.';
comment on column public.service_price_tiers.tipo is
  'Clave de tipo: adulto, nino, senior, estudiante… Única por servicio.';
comment on column public.service_price_tiers.label_i18n is
  'Etiqueta por idioma: {"es":"Adulto","en":"Adult"}.';

alter table public.service_price_tiers enable row level security;

-- service_role: acceso total (servidor, sin bypassear RLS de otras tablas)
create policy "spt_service_role_all" on public.service_price_tiers
  as permissive for all to service_role using (true) with check (true);

-- Autenticados: acceso solo a tiers de servicios de su tenant
create policy "spt_auth_select" on public.service_price_tiers
  as permissive for select to authenticated
  using (
    service_id in (
      select s.id from public.services s
      where public.app_can_access_tenant(s.tenant_id)
    )
  );

create policy "spt_auth_insert" on public.service_price_tiers
  as permissive for insert to authenticated
  with check (
    service_id in (
      select s.id from public.services s
      where public.app_can_access_tenant(s.tenant_id)
    )
  );

create policy "spt_auth_update" on public.service_price_tiers
  as permissive for update to authenticated
  using (
    service_id in (
      select s.id from public.services s
      where public.app_can_access_tenant(s.tenant_id)
    )
  );

create policy "spt_auth_delete" on public.service_price_tiers
  as permissive for delete to authenticated
  using (
    service_id in (
      select s.id from public.services s
      where public.app_can_access_tenant(s.tenant_id)
    )
  );

-- 2. Extender order_items (backward compatible, todos nullable) ----
alter table public.order_items
  add column if not exists fecha_servicio  date,
  add column if not exists variant_tipo    text,
  add column if not exists variant_label   text;

comment on column public.order_items.fecha_servicio is
  'Fecha del servicio elegida por el cliente (solo informativa, sin control de disponibilidad real).';
comment on column public.order_items.variant_tipo is
  'Tipo de pasajero (adulto, nino, senior…). Null para servicios sin variantes.';
comment on column public.order_items.variant_label is
  'Etiqueta del tipo de pasajero en el idioma del pedido.';

-- 3. get_catalog — versión acumulada con price_tiers + ui + entrega ---
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
        'slug',           t.slug,
        'nombre',         t.nombre,
        'branding',       t.branding,
        'locales',        t.locales,
        'locale_default', t.locale_default,
        'ui',             coalesce(t.ui_textos, '{}'::jsonb),
        'entrega', jsonb_build_object(
          'canales',        coalesce(t.entrega_config->'canales', '[]'::jsonb),
          'consentimiento', coalesce(t.entrega_config->'consentimiento', '{}'::jsonb)
        )
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
        'slug',          s.slug,
        'titulo_i18n',   s.titulo_i18n,
        'subtitulo_i18n',s.subtitulo_i18n,
        'duracion_i18n', s.duracion_i18n,
        'tipo_pago',     s.tipo_pago,
        'tipo_nodo',     s.tipo_nodo,
        'parent',        (select ps.slug from public.services ps where ps.id = s.parent_id),
        'precio_desde',  s.precio_desde,
        'moneda',        s.moneda,
        'url_redireccion', s.url_redireccion,
        'icono',         s.icono,
        'imagen_url',    s.imagen_url,
        'orden',         s.orden,
        'categoria',     c.slug,
        'price_tiers', coalesce((
          select jsonb_agg(jsonb_build_object(
            'tipo',       pt.tipo,
            'label_i18n', pt.label_i18n,
            'precio',     pt.precio,
            'orden',      pt.orden
          ) order by pt.orden, pt.tipo)
          from public.service_price_tiers pt
          where pt.service_id = s.id and pt.activo = true
        ), '[]'::jsonb),
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

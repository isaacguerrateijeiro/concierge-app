-- ============================================================
-- FASE 6: Campos dedicados de descripción larga y punto de
-- encuentro por servicio (reutilizables para cualquier proveedor,
-- p.ej. free tours a pie con lugar de salida), y actualización
-- acumulada de get_catalog para exponerlos al kiosko.
-- ============================================================

-- 1. Nuevas columnas i18n en services -------------------------
alter table public.services
  add column if not exists descripcion_i18n     jsonb not null default '{}'::jsonb,
  add column if not exists punto_encuentro_i18n jsonb not null default '{}'::jsonb;

comment on column public.services.descripcion_i18n is
  'Descripción larga por idioma: {"es":"…","en":"…"}. Texto rico del detalle del producto.';
comment on column public.services.punto_encuentro_i18n is
  'Punto de encuentro / lugar de salida por idioma: {"es":"Plaza Mayor, Centro","en":"…"}.';

-- 2. get_catalog — versión acumulada con descripcion + punto_encuentro
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
        'descripcion_i18n', s.descripcion_i18n,
        'punto_encuentro_i18n', s.punto_encuentro_i18n,
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

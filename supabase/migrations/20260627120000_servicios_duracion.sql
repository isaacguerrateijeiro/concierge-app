-- ============================================================
-- FASE 3c (cont.): metadato de duración del servicio + exponer detalle al kiosko.
--
--  - services.duracion_i18n: etiqueta de duración por idioma ("Medio día",
--    "1 Día", "24 Horas"…). Información de primera clase para tours/experiencias.
--  - get_catalog ahora expone `duracion` además de `imagen_url` y
--    `url_redireccion` (ya presentes) para que la pantalla de detalle del
--    kiosko muestre foto, texto, duración, precio y enlace reales.
-- ============================================================

alter table public.services
  add column if not exists duracion_i18n jsonb not null default '{}'::jsonb;
comment on column public.services.duracion_i18n is 'Etiqueta de duración por idioma (ej. {"es":"1 Día"}). Vacío si no aplica.';

-- ---------- get_catalog: incluir duracion en cada servicio ----------
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
        'duracion_i18n', s.duracion_i18n,
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

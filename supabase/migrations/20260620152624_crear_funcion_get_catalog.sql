-- ============================================================
-- get_catalog(tenant_slug): única vía de lectura pública del kiosko.
-- Devuelve SOLO el catálogo activo del tenant indicado, en un JSON.
-- NUNCA expone commission_rules (datos sensibles de margen).
-- security definer: corre con privilegios del dueño, así puede leer
-- aunque RLS bloquee al público, pero solo devuelve lo que aquí decidimos.
-- ============================================================
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
        'precio_desde', s.precio_desde,
        'moneda', s.moneda,
        'url_redireccion', s.url_redireccion,
        'icono', s.icono,
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
      where t.slug = p_tenant_slug and s.activo = true
    ), '[]'::jsonb)
  );
$$;

-- Permisos: el kiosko (anon) puede ejecutar la función, nada más.
revoke all on function public.get_catalog(text) from public;
grant execute on function public.get_catalog(text) to anon, authenticated;

-- ============================================================
-- Micro-textos de INTERFAZ configurables por tenant e idioma.
-- Hasta ahora vivían en el código (data.ts). Se mueven a la base para
-- que cada cliente pueda personalizarlos. El código mantiene unos textos
-- por defecto como fallback si el tenant no define alguna clave.
-- Estructura: { "<idioma>": { "<clave>": "<texto>" } }
-- ============================================================
alter table public.tenants
  add column if not exists ui_textos jsonb not null default '{}'::jsonb;

-- Sembrar los textos actuales de Prosegur (es / en).
update public.tenants
set ui_textos = '{
  "es": {
    "concierge": "Concierge digital",
    "hello": "Hola",
    "tap": "Toca para empezar",
    "listening": "Escuchando",
    "explore": "¿Qué te apetece hacer?",
    "exploreSub": "Tu concierge digital. Reserva, paga y disfruta — todo en un solo lugar.",
    "attractDesc": "Tours, taxis, museos, divisa…\nUn único asistente para tu visita.",
    "free": "Gratis",
    "from": "desde",
    "view": "Ver",
    "poweredBy": "powered by"
  },
  "en": {
    "concierge": "Digital concierge",
    "hello": "Hola",
    "tap": "Tap to start",
    "listening": "Listening",
    "explore": "What would you like to do?",
    "exploreSub": "Your digital concierge. Book, pay and enjoy — all in one place.",
    "attractDesc": "Tours, taxis, museums, currency…\nOne assistant for your whole visit.",
    "free": "Free",
    "from": "from",
    "view": "View",
    "poweredBy": "powered by"
  }
}'::jsonb
where slug = 'prosegur';

-- Actualizar get_catalog para incluir los textos de interfaz en el tenant.
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
        'locale_default', t.locale_default,
        'ui', t.ui_textos
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

revoke all on function public.get_catalog(text) from public;
grant execute on function public.get_catalog(text) to anon, authenticated;

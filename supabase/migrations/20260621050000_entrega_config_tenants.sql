-- ============================================================
-- FASE 3a.2: configuracion de ENTREGA del comprobante por tenant.
-- Mismo patron que branding/ui_textos: JSONB configurable por cliente.
--  - canales: lista de canales habilitados (email|sms|whatsapp|print)
--  - remitente: identidades de envio del tenant (email from/nombre, numeros)
--  - consentimiento: texto por idioma mostrado al pedir el contacto
-- Las CLAVES de proveedor (Resend/Twilio) viven en entorno (plataforma),
-- no aqui. Aqui solo identidades/preferencias del tenant.
-- ============================================================
alter table public.tenants
  add column if not exists entrega_config jsonb not null default '{}'::jsonb;
comment on column public.tenants.entrega_config is 'Config de entrega del comprobante por tenant: canales, remitente y consentimiento.';

update public.tenants
set entrega_config = '{
  "canales": ["email", "sms", "whatsapp", "print"],
  "remitente": {
    "email_from": "onboarding@resend.dev",
    "email_nombre": "Prosegur Concierge",
    "sms_from": null,
    "whatsapp_from": null
  },
  "consentimiento": {
    "es": "Usaremos tu contacto solo para enviarte este comprobante. No lo guardamos para fines comerciales.",
    "en": "We will use your contact only to send you this receipt. We do not store it for marketing."
  }
}'::jsonb
where slug = 'prosegur';

-- get_catalog: exponer SOLO la parte publica de entrega (canales + consentimiento).
-- El remitente y demas se leen en servidor (service_role), nunca al anon.
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
        'ui', t.ui_textos,
        'entrega', jsonb_build_object(
          'canales', coalesce(t.entrega_config->'canales', '[]'::jsonb),
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

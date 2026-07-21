-- ============================================================
-- Identidad del kiosko (location) en catálogo y analítica.
-- get_catalog expone el id de cada location para que el frontal
-- pueda fijar qué dispositivo físico es; track_kiosk_event acepta
-- p_location_id para asociar la sesión al kiosko.
-- ============================================================

-- 1) get_catalog: incluir id de location -----------------------------
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
        'id', l.id, 'nombre', l.nombre, 'tipo_i18n', l.tipo_i18n, 'orden', l.orden
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

-- 2) track_kiosk_event: asociar sesión a un kiosko (location) --------
-- Recreamos la función con la nueva firma (añade p_location_id).
drop function if exists public.track_kiosk_event(text, uuid, text, text, jsonb);

create or replace function public.track_kiosk_event(
  p_tenant_slug text,
  p_session uuid,
  p_tipo text,
  p_locale text default null,
  p_payload jsonb default '{}'::jsonb,
  p_location_id uuid default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_tenant uuid;
  v_order uuid;
  v_location uuid;
begin
  if p_tipo not in (
    'session_start','attract_shown','screen_view','add_to_cart','view_cart',
    'checkout_start','payment_success','delivery_sent'
  ) then
    raise exception 'tipo de evento no valido: %', p_tipo;
  end if;

  select id into v_tenant from public.tenants where slug = p_tenant_slug and activo = true;
  if v_tenant is null then
    raise exception 'tenant no valido';
  end if;

  -- Solo aceptamos un location del mismo tenant y activo.
  v_location := null;
  if p_location_id is not null then
    select l.id into v_location
      from public.locations l
     where l.id = p_location_id
       and l.tenant_id = v_tenant
       and l.activo = true;
  end if;

  insert into public.kiosk_sessions (id, tenant_id, locale, location_id)
  values (p_session, v_tenant, p_locale, v_location)
  on conflict (id) do update set
    last_seen_at = now(),
    locale = coalesce(excluded.locale, public.kiosk_sessions.locale),
    -- Una vez fijado el kiosko de la sesión, no lo pisamos con null.
    location_id = coalesce(public.kiosk_sessions.location_id, excluded.location_id);

  insert into public.kiosk_events (session_id, tenant_id, tipo, payload)
  values (p_session, v_tenant, p_tipo, coalesce(p_payload, '{}'::jsonb));

  if p_tipo in ('add_to_cart','view_cart') then
    update public.kiosk_sessions set reached_cart = true where id = p_session;
  elsif p_tipo = 'checkout_start' then
    update public.kiosk_sessions set reached_cart = true, reached_checkout = true where id = p_session;
  elsif p_tipo = 'payment_success' then
    v_order := nullif(p_payload->>'order_id','')::uuid;
    update public.kiosk_sessions
      set reached_cart = true, reached_checkout = true, converted = true,
          order_id = coalesce(v_order, order_id)
      where id = p_session;
  end if;
end; $$;

revoke all on function public.track_kiosk_event(text, uuid, text, text, jsonb, uuid)
  from public, anon, authenticated;

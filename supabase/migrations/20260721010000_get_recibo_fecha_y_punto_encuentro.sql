-- ============================================================
-- Enriquecer el recibo público (get_recibo) con la fecha del servicio
-- y el punto de encuentro por línea. Clave para free tours / actividades
-- con hora y lugar de salida: el guía escanea el QR y ve fecha + punto.
-- ============================================================
create or replace function public.get_recibo(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'estado', o.estado,
    'importe_total', o.importe_total,
    'moneda', o.moneda,
    'created_at', o.created_at,
    'idioma', o.idioma,
    'referencia', o.referencia,
    'tenant', jsonb_build_object('slug', t.slug, 'nombre', t.nombre, 'branding', t.branding),
    'legal', t.legal_config,
    'proveedores', coalesce((
      select jsonb_agg(prov_obj order by prov_obj->>'nombre')
      from (
        select jsonb_build_object(
          'slug', p.slug,
          'nombre', p.nombre,
          'color_marca', p.color_marca,
          'emisor', coalesce(inv.emisor, jsonb_build_object(
              'razon_social', p.fiscal_config->>'razon_social',
              'nif', p.fiscal_config->>'nif',
              'domicilio', p.fiscal_config->>'domicilio')),
          'factura', case when inv.id is not null then jsonb_build_object(
              'serie', inv.serie, 'anio', inv.anio, 'numero', inv.numero,
              'referencia', inv.serie || '-' || inv.anio::text || '-' || lpad(inv.numero::text, 6, '0'),
              'fecha', inv.fecha,
              'base_imponible', inv.base_imponible,
              'cuota_iva', inv.cuota_iva,
              'total', inv.total,
              'desglose_iva', inv.desglose_iva
            ) else null end,
          'soporte', jsonb_build_object(
              'email', coalesce(p.fiscal_config->>'soporte_email', t.legal_config->>'soporte_email'),
              'telefono', coalesce(p.fiscal_config->>'soporte_telefono', t.legal_config->>'soporte_telefono')),
          'cancelacion', p.fiscal_config->'cancelacion',
          'terminos_url', coalesce(p.fiscal_config->>'terminos_url', t.legal_config->>'terminos_url'),
          'privacidad_url', coalesce(p.fiscal_config->>'privacidad_url', t.legal_config->>'privacidad_url'),
          'items', coalesce((
            select jsonb_agg(jsonb_build_object(
              'titulo', oi.titulo, 'cantidad', oi.cantidad,
              'precio_unitario', oi.precio_unitario, 'importe', oi.importe,
              'iva_tipo', oi.iva_tipo,
              'fecha_servicio', oi.fecha_servicio,
              'punto_encuentro', s2.punto_encuentro_i18n,
              'voucher', (select jsonb_build_object('codigo', v.codigo, 'token', v.token, 'estado', v.estado)
                          from public.order_vouchers v where v.order_item_id = oi.id limit 1)
            ) order by oi.created_at)
            from public.order_items oi
            join public.services s2 on s2.id = oi.service_id
            where oi.order_id = o.id and s2.provider_id = p.id
          ), '[]'::jsonb)
        ) as prov_obj
        from (
          select distinct s.provider_id as pid
          from public.order_items oi join public.services s on s.id = oi.service_id
          where oi.order_id = o.id
        ) g
        join public.providers p on p.id = g.pid
        left join public.order_invoices inv on inv.order_id = o.id and inv.provider_id = p.id
      ) sub
    ), '[]'::jsonb)
  )
  from public.orders o
  join public.tenants t on t.id = o.tenant_id
  where o.recibo_token = p_token and o.estado = 'paid';
$$;
revoke all on function public.get_recibo(text) from public;
grant execute on function public.get_recibo(text) to anon, authenticated;

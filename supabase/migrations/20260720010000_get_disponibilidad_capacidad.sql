-- ============================================================
-- get_disponibilidad v2: además del stock por fecha (excepciones), devuelve la
-- capacidad diaria por defecto del servicio. Así el kiosko puede limitar la
-- selección de pasajeros a la capacidad configurada AUNQUE no exista todavía
-- una fila de excepción en service_availability para esa fecha.
--
-- Forma de retorno:
--   { "capacidad_diaria": <int|null>,
--     "dias": { "YYYY-MM-DD": { "restante": <int>, "agotado": <bool> }, ... } }
-- capacidad_diaria = null  => sin límite por defecto (ilimitado).
-- ============================================================

create or replace function public.get_disponibilidad(
  p_service_slug text,
  p_desde date,
  p_hasta date
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with svc as (
    select id, capacidad_diaria
    from public.services
    where slug = p_service_slug and activo = true
    limit 1
  )
  select jsonb_build_object(
    'capacidad_diaria', (select capacidad_diaria from svc),
    'dias', coalesce((
      select jsonb_object_agg(
        a.fecha::text,
        jsonb_build_object(
          'restante', greatest(a.capacidad - a.reservados, 0),
          'agotado', (a.activo = false) or ((a.capacidad - a.reservados) <= 0)
        )
      )
      from public.service_availability a
      join svc on svc.id = a.service_id
      where a.fecha between p_desde and p_hasta
    ), '{}'::jsonb)
  );
$$;

revoke all on function public.get_disponibilidad(text, date, date) from public;
grant execute on function public.get_disponibilidad(text, date, date) to anon, authenticated;

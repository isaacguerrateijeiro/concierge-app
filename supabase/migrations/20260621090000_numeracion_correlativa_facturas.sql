-- ============================================================
-- FASE 3a.3: numeracion correlativa de facturas por (proveedor, serie, anio).
-- La ley exige numeracion correlativa sin huecos dentro de cada serie.
-- El contador se incrementa de forma atomica (upsert con bloqueo de fila).
-- ============================================================
create table public.provider_invoice_counters (
  provider_id uuid not null references public.providers(id) on delete cascade,
  serie text not null,
  anio int not null,
  ultimo_numero int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (provider_id, serie, anio)
);
comment on table public.provider_invoice_counters is 'Contador correlativo de factura simplificada por proveedor/serie/anio.';
alter table public.provider_invoice_counters enable row level security;

-- Devuelve el siguiente numero correlativo (1, 2, 3, ...) de forma atomica.
create or replace function public.siguiente_numero_factura(
  p_provider_id uuid, p_serie text, p_anio int
) returns int
language plpgsql
security definer
set search_path = ''
as $$
declare v_num int;
begin
  insert into public.provider_invoice_counters (provider_id, serie, anio, ultimo_numero)
  values (p_provider_id, p_serie, p_anio, 1)
  on conflict (provider_id, serie, anio)
  do update set ultimo_numero = public.provider_invoice_counters.ultimo_numero + 1,
                updated_at = now()
  returning ultimo_numero into v_num;
  return v_num;
end;
$$;
-- Solo el servidor (service_role) la usa; nunca el publico ni la API REST.
revoke all on function public.siguiente_numero_factura(uuid, text, int) from public;
revoke all on function public.siguiente_numero_factura(uuid, text, int) from anon, authenticated;

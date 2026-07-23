-- Fecha/hora de la última importación batch/scrape por servicio.
alter table public.services
  add column if not exists importado_at timestamptz;

comment on column public.services.importado_at is
  'Última vez que el batch/import desde web tocó este servicio (null si es manual).';

-- Backfill: si vino de fuente externa, usar created_at como aproximación.
update public.services
set importado_at = created_at
where importado_at is null
  and fuente_ref is not null;

create index if not exists idx_services_importado_at
  on public.services (tenant_id, importado_at desc nulls last);

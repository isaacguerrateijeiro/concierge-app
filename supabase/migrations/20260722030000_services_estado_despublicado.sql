-- Permite despublicar automáticamente servicios que desaparecen de la fuente.
alter table public.services drop constraint if exists services_estado_check;

alter table public.services
  add constraint services_estado_check
  check (estado in ('borrador', 'publicado', 'despublicado'));

comment on column public.services.estado is
  'publicado = visible en kiosko; borrador = revisión manual; despublicado = retirado de la fuente / oculto.';

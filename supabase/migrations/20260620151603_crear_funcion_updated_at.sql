-- Función reutilizable: pone 'updated_at' a la hora actual cada vez
-- que se modifica una fila. La usarán todas las tablas vía trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Aplicamos el trigger también a la tabla tenants ya creada
create trigger trg_tenants_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

-- Activamos Row Level Security en las 6 tablas.
-- Sin políticas públicas: nadie con la clave pública (anon) puede leer
-- ni escribir directamente. El único acceso de lectura público será
-- la función get_catalog(). Nuestro backend (service_role) sí accede.
alter table public.tenants          enable row level security;
alter table public.locations        enable row level security;
alter table public.providers        enable row level security;
alter table public.categories       enable row level security;
alter table public.services         enable row level security;
alter table public.commission_rules enable row level security;

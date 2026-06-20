-- Tabla raíz del modelo multi-tenant.
-- Un tenant = un cliente del SaaS (operador de kioscos). El primero es Prosegur.
-- De esta tabla cuelga absolutamente todo lo demás.
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  -- Identificador legible y único para usar en código/URLs, ej. 'prosegur'
  slug text not null unique,
  -- Nombre comercial mostrable, ej. 'Prosegur'
  nombre text not null,
  -- Personalización de marca del frontal (colores, logo, tipografías).
  -- Se guarda como JSON para no hardcodear nada en el código del kiosko.
  branding jsonb not null default '{}'::jsonb,
  -- Idiomas activos del tenant. Ampliable sin tocar la estructura, ej. {es,en,fr}
  locales text[] not null default array['es','en'],
  -- Idioma por defecto cuando el kiosko arranca
  locale_default text not null default 'es',
  -- Permite desactivar un tenant sin borrarlo
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tenants is 'Clientes del SaaS (operadores de kioscos). Raíz del modelo multi-tenant.';

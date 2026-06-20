-- ============================================================
-- FASE 3a.3: datos fiscales para factura simplificada.
--  - providers.fiscal_config: identidad fiscal del emisor (cada proveedor
--    es el vendedor en el marketplace) + soporte/cancelacion/legales.
--  - tenants.legal_config: datos del operador/plataforma como RESPALDO y
--    el IVA por defecto del tenant.
--  - services.iva_tipo y order_items.iva_tipo: tipo de IVA (precio IVA incluido).
-- Los valores sembrados son EJEMPLO (sustituibles por los reales del cliente).
-- ============================================================

alter table public.providers
  add column if not exists fiscal_config jsonb not null default '{}'::jsonb;
comment on column public.providers.fiscal_config is 'Identidad fiscal del emisor (factura simplificada): razon_social, nif, domicilio, serie, soporte y enlaces legales. Configurable por proveedor.';

alter table public.tenants
  add column if not exists legal_config jsonb not null default '{}'::jsonb;
comment on column public.tenants.legal_config is 'Datos legales del operador/plataforma (respaldo) e iva_default del tenant.';

alter table public.services
  add column if not exists iva_tipo numeric(5,2);
comment on column public.services.iva_tipo is 'Tipo de IVA del servicio (porcentaje). Si null, se usa el iva_default del tenant.';

alter table public.order_items
  add column if not exists iva_tipo numeric(5,2) not null default 21;
comment on column public.order_items.iva_tipo is 'Snapshot del tipo de IVA aplicado a la linea en el momento de la compra.';

-- Respaldo legal de la plataforma (EJEMPLO).
update public.tenants
set legal_config = '{
  "razon_social": "Kioma Labs S.L.",
  "nif": "B00000000",
  "domicilio": "Calle Ejemplo 1, 28001 Madrid, España",
  "soporte_email": "soporte@kioma.example",
  "soporte_telefono": "+34 900 000 000",
  "terminos_url": "https://kioma.example/terminos",
  "privacidad_url": "https://kioma.example/privacidad",
  "iva_default": 21
}'::jsonb
where slug = 'prosegur';

-- Identidad fiscal de EJEMPLO por proveedor que vende (servicios integrados).
update public.providers p set fiscal_config = d.cfg
from (values
  ('julia', '{
    "razon_social": "Julia Travel S.L.",
    "nif": "B85412300",
    "domicilio": "Calle Capitán Haya 60, 28020 Madrid, España",
    "serie": "JULIA",
    "soporte_email": "atencion@juliatravel.example",
    "soporte_telefono": "+34 911 234 567",
    "cancelacion": {
      "es": "Cancelación gratuita hasta 24 h antes de la actividad. Después, no reembolsable. Escríbenos para gestionarla.",
      "en": "Free cancellation up to 24h before the activity. Non-refundable afterwards. Contact us to manage it."
    },
    "terminos_url": "https://juliatravel.example/terminos",
    "privacidad_url": "https://juliatravel.example/privacidad"
  }'::jsonb),
  ('bolt', '{
    "razon_social": "Bolt Services ES S.L.",
    "nif": "B86753099",
    "domicilio": "Calle Gran Vía 28, 28013 Madrid, España",
    "serie": "BOLT",
    "soporte_email": "soporte@bolt.example",
    "soporte_telefono": "+34 911 000 222",
    "cancelacion": {
      "es": "Puedes cancelar el trayecto sin coste hasta 5 minutos después de la reserva.",
      "en": "You can cancel the ride at no cost up to 5 minutes after booking."
    },
    "terminos_url": "https://bolt.example/terminos",
    "privacidad_url": "https://bolt.example/privacidad"
  }'::jsonb),
  ('bigbus', '{
    "razon_social": "Big Bus Tours Spain S.L.",
    "nif": "B66012345",
    "domicilio": "Calle Atocha 10, 28012 Madrid, España",
    "serie": "BIGBUS",
    "soporte_email": "info@bigbus.example",
    "soporte_telefono": "+34 911 333 444",
    "cancelacion": {
      "es": "Billete válido 24 h. Cancelación gratuita hasta el inicio del servicio.",
      "en": "Ticket valid for 24h. Free cancellation until service start."
    },
    "terminos_url": "https://bigbus.example/terminos",
    "privacidad_url": "https://bigbus.example/privacidad"
  }'::jsonb),
  ('madridapie', '{
    "razon_social": "Madrid a Pie Tours S.L.",
    "nif": "B87654321",
    "domicilio": "Plaza Mayor 1, 28012 Madrid, España",
    "serie": "MAPIE",
    "soporte_email": "hola@madridapie.example",
    "soporte_telefono": "+34 911 555 666",
    "cancelacion": {
      "es": "Free tour sin coste: si no puedes asistir, avísanos para liberar tu plaza.",
      "en": "Free tour at no cost: if you cannot attend, let us know to release your spot."
    },
    "terminos_url": "https://madridapie.example/terminos",
    "privacidad_url": "https://madridapie.example/privacidad"
  }'::jsonb)
) as d(slug, cfg)
where p.slug = d.slug and p.tenant_id = (select id from public.tenants where slug='prosegur');

-- Tipos de IVA de EJEMPLO por servicio integrado.
update public.services s set iva_tipo = d.tipo
from (values
  ('free-tour', 10::numeric),
  ('football', 21::numeric),
  ('taxi', 10::numeric),
  ('museum', 10::numeric),
  ('bus', 10::numeric),
  ('flamenco', 10::numeric)
) as d(slug, tipo)
where s.slug = d.slug and s.tenant_id = (select id from public.tenants where slug='prosegur');

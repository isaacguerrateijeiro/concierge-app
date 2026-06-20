-- ============================================================
-- DATOS INICIALES DE PROSEGUR (cargados a mano para Fase 0)
-- Las comisiones son VALORES DE EJEMPLO, pendientes de ajustar.
-- ============================================================

-- 1) TENANT
insert into public.tenants (slug, nombre, branding, locales, locale_default)
values (
  'prosegur',
  'Prosegur',
  '{"colors":{"bone":"#F4F1EA","ink":"#16140F","accent":"#F2C200"},"fonts":{"serif":"DM Serif Display","sans":"Inter"}}'::jsonb,
  array['es','en'],
  'es'
);

-- 2) LOCATIONS
with t as (select id from public.tenants where slug = 'prosegur')
insert into public.locations (tenant_id, nombre, tipo_i18n, orden)
select t.id, v.nombre, v.tipo::jsonb, v.orden
from t join (values
  ('Gran Vía',    '{"es":"Hotel · Madrid centro","en":"Hotel · Madrid centre"}', 1),
  ('Barajas T4',  '{"es":"Aeropuerto · Llegadas","en":"Airport · Arrivals"}', 2),
  ('Atocha',      '{"es":"Estación AVE","en":"AVE Station"}', 3),
  ('Castellana',  '{"es":"Centro comercial","en":"Shopping centre"}', 4)
) as v(nombre, tipo, orden) on true;

-- 3) PROVIDERS
with t as (select id from public.tenants where slug = 'prosegur')
insert into public.providers (tenant_id, slug, nombre, color_marca)
select t.id, v.slug, v.nombre, v.color
from t join (values
  ('madridapie',   'Madrid a Pie',           '#C04A2A'),
  ('julia',        'Julia Travel',           '#0E2A4A'),
  ('bolt',         'Bolt',                   '#34D186'),
  ('bigbus',       'Big Bus · Yellow Tours', '#FFD400'),
  ('prosegur',     'Prosegur',               '#0033A0'),
  ('prestapuffin', 'Prestapuffin',           '#0F4C8A'),
  ('changegroup',  'ChangeGroup',            '#E30613'),
  ('race',         'RACE',                   '#FFCD00')
) as v(slug, nombre, color) on true;

-- 4) CATEGORIES
with t as (select id from public.tenants where slug = 'prosegur')
insert into public.categories (tenant_id, slug, nombre_i18n, subtitulo_i18n, orden)
select t.id, v.slug, v.nombre::jsonb, v.subtitulo::jsonb, v.orden
from t join (values
  ('live',    '{"es":"Live Madrid","en":"Live Madrid"}',                 '{"es":"Tours, traslados y espectáculos","en":"Tours, transfers & shows"}', 1),
  ('finance', '{"es":"Servicios financieros","en":"Financial services"}', '{"es":"Divisa, oro, crédito y seguros","en":"Currency, gold, credit & insurance"}', 2)
) as v(slug, nombre, subtitulo, orden) on true;

-- 5) SERVICES
with t as (select id from public.tenants where slug = 'prosegur')
insert into public.services
  (tenant_id, category_id, provider_id, slug, titulo_i18n, subtitulo_i18n, tipo_pago, precio_desde, moneda, url_redireccion, icono, orden)
select t.id, c.id, p.id, v.slug, v.titulo::jsonb, v.subtitulo::jsonb, v.tipo_pago, v.precio, 'EUR', v.url, v.icono, v.orden
from t
join (values
  ('free-tour',    'live',    'madridapie',   '{"es":"Madrid a Pie · Free Tour","en":"Madrid a Pie · Free Tour"}',          '{"es":"Casco antiguo · 2h 30 min con guía local","en":"Old town · 2h 30 min with local guide"}', 'integrado', 0::numeric,   null::text,                          'tour',      1),
  ('football',     'live',    'julia',        '{"es":"Julia Travel · Fútbol Bernabéu","en":"Julia Travel · Bernabéu football"}', '{"es":"Entradas Real Madrid · sin colas","en":"Real Madrid tickets · skip the line"}', 'integrado', 65::numeric,  null::text,                          'football',  2),
  ('taxi',         'live',    'bolt',         '{"es":"Bolt al Aeropuerto","en":"Bolt to the Airport"}',                       '{"es":"Coche premium · precio fijo","en":"Premium ride · fixed fare"}', 'integrado', 14::numeric,  null::text,                          'taxi',      3),
  ('museum',       'live',    'julia',        '{"es":"Julia Travel · Museos","en":"Julia Travel · Museums"}',                '{"es":"Prado · Reina Sofía · Thyssen","en":"Prado · Reina Sofía · Thyssen"}', 'integrado', 18::numeric,  null::text,                          'museum',    4),
  ('bus',          'live',    'bigbus',       '{"es":"Big Bus Madrid","en":"Big Bus Madrid"}',                               '{"es":"24h hop-on / hop-off por la ciudad","en":"24h hop-on / hop-off"}', 'integrado', 28::numeric,  null::text,                          'bus',       5),
  ('flamenco',     'live',    'julia',        '{"es":"Julia Travel · Tablao Flamenco","en":"Julia Travel · Flamenco show"}',  '{"es":"Cena + espectáculo en vivo","en":"Dinner & live show"}', 'integrado', 49::numeric,  null::text,                          'flamenco',  6),
  ('gold',         'finance', 'prosegur',     '{"es":"Prosegur · Oro Digital","en":"Prosegur · Digital Gold"}',              '{"es":"Compra y venta al precio del mercado","en":"Buy & sell at market price"}', 'derivado',  null::numeric, 'https://prosegurdigitalgold.com',  'gold',      1),
  ('prestapuffin', 'finance', 'prestapuffin', '{"es":"Prestapuffin · Microcrédito","en":"Prestapuffin · Microloan"}',        '{"es":"Hasta 600 € al instante · sin papeleo","en":"Up to €600 instantly · no paperwork"}', 'derivado',  50::numeric,  'https://prestapuffin.com',         'puffin',    2),
  ('fx',           'finance', 'changegroup',  '{"es":"ChangeGroup · Divisa","en":"ChangeGroup · Currency"}',                  '{"es":"Mejor cambio del día · sin comisión","en":"Best rate today · zero commission"}', 'derivado',  0::numeric,   'https://changegroup.com',          'fx',        3),
  ('insurance',    'finance', 'race',         '{"es":"RACE · Seguro de viaje","en":"RACE · Travel insurance"}',               '{"es":"Cobertura inmediata desde 9 €/día","en":"Instant coverage from €9/day"}', 'derivado',  9::numeric,   'https://race.es',                  'insurance', 4)
) as v(slug, cat_slug, prov_slug, titulo, subtitulo, tipo_pago, precio, url, icono, orden) on true
join public.categories c on c.tenant_id = t.id and c.slug = v.cat_slug
join public.providers  p on p.tenant_id = t.id and p.slug = v.prov_slug;

-- 6) COMMISSION_RULES (EJEMPLO - ajustar con valores reales)
-- Integrados: plataforma 8% + operador 5%. Derivados: plataforma 10% (rev-share).
with t as (select id from public.tenants where slug = 'prosegur')
insert into public.commission_rules (tenant_id, ambito, provider_id, beneficiario, tipo_calculo, valor)
select t.id, 'proveedor', p.id, v.beneficiario, v.tipo_calculo, v.valor
from t
join (values
  ('madridapie',   'plataforma', 'porcentaje', 8::numeric),
  ('madridapie',   'operador',   'porcentaje', 5::numeric),
  ('julia',        'plataforma', 'porcentaje', 8::numeric),
  ('julia',        'operador',   'porcentaje', 5::numeric),
  ('bolt',         'plataforma', 'porcentaje', 8::numeric),
  ('bolt',         'operador',   'porcentaje', 5::numeric),
  ('bigbus',       'plataforma', 'porcentaje', 8::numeric),
  ('bigbus',       'operador',   'porcentaje', 5::numeric),
  ('prosegur',     'plataforma', 'porcentaje', 10::numeric),
  ('prestapuffin', 'plataforma', 'porcentaje', 10::numeric),
  ('changegroup',  'plataforma', 'porcentaje', 10::numeric),
  ('race',         'plataforma', 'porcentaje', 10::numeric)
) as v(prov_slug, beneficiario, tipo_calculo, valor) on true
join public.providers p on p.tenant_id = t.id and p.slug = v.prov_slug;

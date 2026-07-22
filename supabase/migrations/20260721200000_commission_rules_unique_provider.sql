-- ============================================================
-- Índice único para reglas de comisión por proveedor/beneficiario.
-- Evita duplicados al guardar desde el panel (upsert estable).
-- ============================================================

-- Si hubiera duplicados históricos, nos quedamos con la más reciente.
with dups as (
  select id,
         row_number() over (
           partition by tenant_id, provider_id, beneficiario
           order by updated_at desc nulls last, created_at desc
         ) as rn
  from public.commission_rules
  where ambito = 'proveedor'
    and provider_id is not null
)
delete from public.commission_rules cr
using dups
where cr.id = dups.id
  and dups.rn > 1;

create unique index if not exists uq_commission_provider_benef
  on public.commission_rules (tenant_id, provider_id, beneficiario)
  where ambito = 'proveedor' and provider_id is not null;

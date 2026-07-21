-- ============================================================
-- Cron nocturno de actualización del catálogo.
-- Programa un POST diario a la API de la app (/api/cron/actualizar-catalogo),
-- que re-escanea las fuentes de todos los tenants. La URL y el secreto se leen
-- de Vault (no se hardcodean en la migración).
--
-- REQUISITO (una sola vez por proyecto, en producción):
--   select vault.create_secret('https://TU_DOMINIO', 'app_url');
--   select vault.create_secret('EL_MISMO_VALOR_QUE_CRON_SECRET', 'cron_secret');
-- Estos deben coincidir con APP_URL y CRON_SECRET del entorno de la app.
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Reprogramar de forma idempotente: quitar el job anterior si existe.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'actualizar-catalogo-nocturno') then
    perform cron.unschedule('actualizar-catalogo-nocturno');
  end if;
end;
$$;

-- Todas las noches a las 03:15 (hora del servidor de la base de datos).
select cron.schedule(
  'actualizar-catalogo-nocturno',
  '15 3 * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'app_url')
           || '/api/cron/actualizar-catalogo',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 280000
  );
  $cron$
);

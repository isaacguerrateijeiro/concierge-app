-- get_order_status: anadir recibo_token para que el kiosko pueda mostrar el QR
-- del recibo y permitir el envio del comprobante tras el pago. Solo se rellena
-- cuando ya existe (tras 'paid' + generacion de vouchers). No es sensible.
create or replace function public.get_order_status(p_session_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'estado', o.estado,
    'importe_total', o.importe_total,
    'moneda', o.moneda,
    'recibo_token', o.recibo_token
  )
  from public.orders o
  where o.stripe_checkout_session_id = p_session_id;
$$;
revoke all on function public.get_order_status(text) from public;
grant execute on function public.get_order_status(text) to anon, authenticated;

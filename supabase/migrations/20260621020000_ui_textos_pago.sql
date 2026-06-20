-- ============================================================
-- Micro-textos de carrito / pago / confirmación para el tenant Prosegur.
-- Se FUSIONAN dentro de ui_textos (merge profundo por idioma) sin perder los
-- textos ya existentes. El código tiene estos mismos textos como respaldo, así
-- que esto solo hace que la base sea la fuente configurable por tenant.
-- ============================================================
update public.tenants
set ui_textos = jsonb_set(
  jsonb_set(
    ui_textos,
    '{es}',
    coalesce(ui_textos->'es', '{}'::jsonb) || '{
      "viewCart": "Ver carrito",
      "cart": "Tu carrito",
      "cartEmpty": "Tu carrito está vacío",
      "total": "Total",
      "pay": "Pagar",
      "remove": "Quitar",
      "back": "Volver",
      "items": "artículos",
      "checkoutTitle": "Pago seguro",
      "paying": "Procesando el pago…",
      "paid": "¡Pago completado!",
      "paidDesc": "Gracias por tu compra. Recoge los detalles en el mostrador.",
      "paymentError": "No se pudo iniciar el pago",
      "tryAgain": "Reintentar",
      "newOrder": "Nueva compra"
    }'::jsonb
  ),
  '{en}',
  coalesce(ui_textos->'en', '{}'::jsonb) || '{
    "viewCart": "View cart",
    "cart": "Your cart",
    "cartEmpty": "Your cart is empty",
    "total": "Total",
    "pay": "Pay",
    "remove": "Remove",
    "back": "Back",
    "items": "items",
    "checkoutTitle": "Secure payment",
    "paying": "Processing payment…",
    "paid": "Payment complete!",
    "paidDesc": "Thanks for your purchase. Collect the details at the desk.",
    "paymentError": "Couldn''t start the payment",
    "tryAgain": "Try again",
    "newOrder": "New order"
  }'::jsonb
)
where slug = 'prosegur';

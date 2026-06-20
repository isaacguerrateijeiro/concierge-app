-- Micro-textos de ENTREGA del comprobante (Fase 3a.2). Merge profundo en
-- ui_textos sin perder los existentes. El codigo tiene estos como respaldo.
update public.tenants
set ui_textos = jsonb_set(
  jsonb_set(
    ui_textos,
    '{es}',
    coalesce(ui_textos->'es', '{}'::jsonb) || '{
      "deliveryTitle": "¿Cómo quieres tu comprobante?",
      "deliverySub": "Escanea el QR o envíatelo. También puedes imprimirlo.",
      "channelEmail": "Email",
      "channelSms": "SMS",
      "channelWhatsapp": "WhatsApp",
      "channelPrint": "Imprimir",
      "emailPlaceholder": "tucorreo@ejemplo.com",
      "phonePlaceholder": "+34 600 000 000",
      "send": "Enviar",
      "sending": "Enviando…",
      "sent": "¡Enviado!",
      "deliveryError": "No se pudo enviar",
      "scanQr": "Escanea para ver tu comprobante",
      "openReceipt": "Abrir comprobante"
    }'::jsonb
  ),
  '{en}',
  coalesce(ui_textos->'en', '{}'::jsonb) || '{
    "deliveryTitle": "How would you like your receipt?",
    "deliverySub": "Scan the QR or send it to yourself. You can also print it.",
    "channelEmail": "Email",
    "channelSms": "SMS",
    "channelWhatsapp": "WhatsApp",
    "channelPrint": "Print",
    "emailPlaceholder": "you@example.com",
    "phonePlaceholder": "+34 600 000 000",
    "send": "Send",
    "sending": "Sending…",
    "sent": "Sent!",
    "deliveryError": "Couldn''t send",
    "scanQr": "Scan to view your receipt",
    "openReceipt": "Open receipt"
  }'::jsonb
)
where slug = 'prosegur';

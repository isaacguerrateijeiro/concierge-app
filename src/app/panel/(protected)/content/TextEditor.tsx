"use client";

import { useActionState, useState } from "react";
import { guardarTextos, type FormState } from "./actions";
import { LanguageManager } from "./LanguageManager";

const initial: FormState = {};

// Agrupación de claves para facilitar la edición. Las claves desconocidas
// (añadidas en el futuro) caen automáticamente en "Otros".
const GRUPOS: { titulo: string; claves: string[] }[] = [
  { titulo: "Atracción e inicio", claves: ["tap", "concierge", "poweredBy", "attractDesc", "explore", "exploreSub", "hello", "listening"] },
  { titulo: "Catálogo y carrito", claves: ["from", "free", "view", "viewCart", "cart", "items", "total", "remove", "cartEmpty", "newOrder"] },
  { titulo: "Pago", claves: ["pay", "paying", "checkoutTitle", "paymentError", "paid", "paidDesc", "tryAgain"] },
  { titulo: "Entrega del comprobante", claves: ["deliveryTitle", "deliverySub", "send", "sending", "sent", "deliveryError", "openReceipt", "scanQr", "channelEmail", "channelSms", "channelWhatsapp", "channelPrint", "emailPlaceholder", "phonePlaceholder"] },
  { titulo: "General", claves: ["back"] },
];

const NOMBRE_IDIOMA: Record<string, string> = {
  es: "Español",
  en: "English",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
};

function nombreIdioma(code: string) {
  return NOMBRE_IDIOMA[code] ?? code.toUpperCase();
}

export function TextEditor({
  locales,
  localeDefault,
  uiTextos,
  claves,
}: {
  locales: string[];
  localeDefault: string;
  uiTextos: Record<string, Record<string, string>>;
  claves: string[];
}) {
  const [state, formAction, pending] = useActionState(guardarTextos, initial);
  const [locale, setLocale] = useState(locales[0] ?? localeDefault);

  const textos = uiTextos[locale] ?? {};
  const usadas = new Set(GRUPOS.flatMap((g) => g.claves));
  const otras = claves.filter((k) => !usadas.has(k));
  const grupos = otras.length ? [...GRUPOS, { titulo: "Otros", claves: otras }] : GRUPOS;

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <LanguageManager locales={locales} localeDefault={localeDefault} />

      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Micro-textos del kiosko</h3>
            <p>Edita los textos de interfaz por idioma. Se publican al guardar.</p>
          </div>
        </div>

        <div className="seg" style={{ marginBottom: 20 }}>
          {locales.map((l) => (
            <button
              key={l}
              type="button"
              className={l === locale ? "on" : ""}
              onClick={() => setLocale(l)}
            >
              {nombreIdioma(l)}
              {l === localeDefault ? " ·" : ""}
            </button>
          ))}
        </div>

        {/* key del form fuerza el remount al cambiar de idioma para refrescar inputs */}
        <form action={formAction} key={locale}>
          <input type="hidden" name="locale" value={locale} />

          {state.error && <div className="err" style={{ marginBottom: 14 }}>{state.error}</div>}
          {state.ok && <div className="ok-note" style={{ marginBottom: 14 }}>Textos publicados.</div>}

          {grupos.map((g) => {
            const presentes = g.claves.filter((k) => k in textos || claves.includes(k));
            if (presentes.length === 0) return null;
            return (
              <div className="form-section" key={g.titulo}>
                <div className="fs-title">{g.titulo}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {presentes.map((k) => (
                    <div className="field" key={k} style={{ marginBottom: 0 }}>
                      <label>
                        <span className="mono" style={{ fontSize: 11 }}>{k}</span>
                      </label>
                      <textarea
                        className="input"
                        name={`t__${k}`}
                        defaultValue={textos[k] ?? ""}
                        rows={textos[k] && textos[k].length > 40 ? 2 : 1}
                        style={{ minHeight: 0 }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Publicando…" : `Publicar ${nombreIdioma(locale)}`}
          </button>
        </form>
      </div>
    </div>
  );
}

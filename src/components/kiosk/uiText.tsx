"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_UI } from "./data";

// Mapa de micro-textos: { idioma: { clave: texto } }.
export type UiTexts = Record<string, Record<string, string>>;

// Mezcla los textos del tenant SOBRE los de respaldo (el tenant gana).
// Así cada cliente personaliza lo que quiera y el resto cae al valor por defecto.
function mergeUiTexts(defaults: UiTexts, tenant: UiTexts): UiTexts {
  const langs = new Set([...Object.keys(defaults), ...Object.keys(tenant)]);
  const merged: UiTexts = {};
  for (const lang of langs) {
    merged[lang] = { ...(defaults[lang] ?? {}), ...(tenant[lang] ?? {}) };
  }
  return merged;
}

const UiTextContext = createContext<UiTexts>(DEFAULT_UI);

// Provee los micro-textos resueltos (tenant + respaldo) a todo el kiosko.
export function UiTextProvider({
  texts,
  children,
}: {
  texts?: UiTexts;
  children: ReactNode;
}) {
  const value = useMemo(() => mergeUiTexts(DEFAULT_UI, texts ?? {}), [texts]);
  return <UiTextContext.Provider value={value}>{children}</UiTextContext.Provider>;
}

// Hook que devuelve un resolutor t(idioma, clave) con respaldos en cascada:
// idioma pedido -> español -> defecto del idioma -> defecto español -> la clave.
export function useUiText() {
  const texts = useContext(UiTextContext);
  return (lang: string, key: string): string =>
    texts[lang]?.[key] ??
    texts.es?.[key] ??
    DEFAULT_UI[lang]?.[key] ??
    DEFAULT_UI.es?.[key] ??
    key;
}

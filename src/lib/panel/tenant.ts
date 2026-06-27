import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface BrandingColors {
  ink?: string;
  bone?: string;
  accent?: string;
}
export interface BrandingFonts {
  serif?: string;
  sans?: string;
}
export interface Branding {
  colors?: BrandingColors;
  fonts?: BrandingFonts;
  mark?: string;
  [k: string]: unknown;
}

export interface TenantConfig {
  id: string;
  slug: string;
  nombre: string;
  branding: Branding;
  uiTextos: Record<string, Record<string, string>>;
  locales: string[];
  localeDefault: string;
  entregaConfig: Record<string, unknown>;
  legalConfig: Record<string, unknown>;
}

export async function getTenantConfig(tenantId: string): Promise<TenantConfig> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenants")
    .select(
      "id, slug, nombre, branding, ui_textos, locales, locale_default, entrega_config, legal_config"
    )
    .eq("id", tenantId)
    .single();
  if (error) throw new Error(`getTenantConfig: ${error.message}`);
  return {
    id: data.id,
    slug: data.slug,
    nombre: data.nombre,
    branding: (data.branding as Branding) ?? {},
    uiTextos: (data.ui_textos as Record<string, Record<string, string>>) ?? {},
    locales: data.locales ?? ["es"],
    localeDefault: data.locale_default ?? "es",
    entregaConfig: (data.entrega_config as Record<string, unknown>) ?? {},
    legalConfig: (data.legal_config as Record<string, unknown>) ?? {},
  };
}

"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePanelContext, assertCapacidad } from "@/lib/auth/context";
import { catalogCacheTag } from "@/lib/catalog";

export interface FormState {
  error?: string;
}

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const schema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  slug: z.string().regex(slugRe, "Slug inválido (minúsculas, guiones)"),
  provider_id: z.string().uuid("Proveedor no válido"),
  category_id: z.string().uuid("Categoría no válida"),
  tipo_nodo: z.enum(["grupo", "servicio"]).default("servicio"),
  parent_id: z.string().uuid().optional().or(z.literal("")),
  estado: z.enum(["borrador", "publicado", "despublicado"]).default("publicado"),
  tipo_pago: z.enum(["integrado", "derivado"]).optional().or(z.literal("")),
  precio_desde: z.string().optional(),
  iva_tipo: z.string().optional(),
  url_redireccion: z.string().url("URL no válida").optional().or(z.literal("")),
  icono: z.string().optional(),
  imagen_url: z.string().url("URL de imagen no válida").optional().or(z.literal("")),
  orden: z.string().optional(),
  activo: z.string().optional(),
  capacidad_diaria: z.string().optional(),
});

function parseNum(v: string | undefined): number | null {
  if (!v || v.trim() === "") return null;
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseIntNull(v: string | undefined | null): number | null {
  if (v == null || String(v).trim() === "") return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function localesTenant(tenantId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("tenants")
    .select("locales")
    .eq("id", tenantId)
    .maybeSingle();
  return data?.locales ?? ["es"];
}

function i18nDesdeForm(formData: FormData, prefijo: string, locales: string[]) {
  const out: Record<string, string> = {};
  for (const l of locales) {
    const v = (formData.get(`${prefijo}_${l}`) as string | null)?.trim();
    if (v) out[l] = v;
  }
  return out;
}

export async function guardarServicio(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");
  const tenantId = ctx.currentTenant.id;

  const parsed = schema.safeParse({
    id: formData.get("id") ?? "",
    slug: formData.get("slug"),
    provider_id: formData.get("provider_id"),
    category_id: formData.get("category_id"),
    tipo_nodo: formData.get("tipo_nodo") ?? "servicio",
    parent_id: formData.get("parent_id") ?? "",
    estado: formData.get("estado") ?? "publicado",
    tipo_pago: formData.get("tipo_pago") ?? "",
    precio_desde: formData.get("precio_desde") ?? undefined,
    iva_tipo: formData.get("iva_tipo") ?? undefined,
    url_redireccion: formData.get("url_redireccion") ?? "",
    icono: formData.get("icono") ?? undefined,
    imagen_url: formData.get("imagen_url") ?? "",
    orden: formData.get("orden") ?? undefined,
    activo: formData.get("activo") ?? undefined,
    capacidad_diaria: formData.get("capacidad_diaria") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  }
  const d = parsed.data;

  // Un nodo 'servicio' (hoja vendible) necesita modelo de pago; un 'grupo' no.
  const esGrupo = d.tipo_nodo === "grupo";
  if (!esGrupo && (d.tipo_pago === "" || !d.tipo_pago)) {
    return { error: "Un servicio vendible necesita un modelo de pago." };
  }
  // No permitir que un nodo sea su propio padre.
  if (d.id && d.parent_id && d.id === d.parent_id) {
    return { error: "Un nodo no puede ser su propio padre." };
  }

  const supabase = await createSupabaseServerClient();

  // Validar que proveedor y categoría pertenecen al tenant activo (RLS ya lo
  // limita en lectura, esto evita además referencias cruzadas en la escritura).
  const [{ data: prov }, { data: cat }] = await Promise.all([
    supabase.from("providers").select("id").eq("id", d.provider_id).eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("categories").select("id").eq("id", d.category_id).eq("tenant_id", tenantId).maybeSingle(),
  ]);
  if (!prov) return { error: "El proveedor no pertenece a este cliente." };
  if (!cat) return { error: "La categoría no pertenece a este cliente." };

  // Validar el padre (si lo hay): debe ser un nodo del tenant y de tipo 'grupo'.
  if (d.parent_id) {
    const { data: padre } = await supabase
      .from("services")
      .select("id, tipo_nodo")
      .eq("id", d.parent_id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!padre) return { error: "El nodo padre no pertenece a este cliente." };
    if (padre.tipo_nodo !== "grupo") {
      return { error: "El padre debe ser un grupo (no un servicio vendible)." };
    }
  }

  const locales = await localesTenant(tenantId);
  const titulo = i18nDesdeForm(formData, "titulo", locales);
  const subtitulo = i18nDesdeForm(formData, "subtitulo", locales);
  const descripcion = i18nDesdeForm(formData, "descripcion", locales);
  const puntoEncuentro = i18nDesdeForm(formData, "punto_encuentro", locales);
  const instrucciones = i18nDesdeForm(formData, "instrucciones", locales);
  if (!titulo[locales[0]] && Object.keys(titulo).length === 0) {
    return { error: "El título es obligatorio." };
  }

  const fila = {
    tenant_id: tenantId,
    slug: d.slug,
    provider_id: d.provider_id,
    category_id: d.category_id,
    tipo_nodo: d.tipo_nodo,
    parent_id: d.parent_id || null,
    estado: d.estado,
    // Un grupo no tiene modelo de pago ni precio.
    tipo_pago: esGrupo ? null : (d.tipo_pago || null),
    precio_desde: esGrupo ? null : parseNum(d.precio_desde),
    iva_tipo: esGrupo ? null : parseNum(d.iva_tipo),
    url_redireccion: esGrupo ? null : (d.url_redireccion || null),
    icono: d.icono || null,
    imagen_url: d.imagen_url || null,
    orden: parseNum(d.orden) ?? 0,
    activo: d.activo === "on" || d.activo === "true",
    capacidad_diaria: esGrupo ? null : parseIntNull(d.capacidad_diaria),
    titulo_i18n: titulo,
    subtitulo_i18n: subtitulo,
    descripcion_i18n: descripcion,
    punto_encuentro_i18n: puntoEncuentro,
    instrucciones_i18n: instrucciones,
  };

  let serviceId: string;
  if (d.id && d.id !== "") {
    serviceId = d.id;
    const { error } = await supabase
      .from("services")
      .update(fila)
      .eq("id", serviceId)
      .eq("tenant_id", tenantId);
    if (error) return { error: `No se pudo guardar: ${error.message}` };
  } else {
    const { data: newService, error } = await supabase
      .from("services")
      .insert(fila)
      .select("id")
      .single();
    if (error || !newService)
      return { error: `No se pudo crear: ${error?.message}` };
    serviceId = newService.id;
  }

  // Guardar tarifas por tipo de pasajero (solo para servicios integrados)
  const esIntegrado = !esGrupo && d.tipo_pago === "integrado";
  const tierCount = parseInt(
    (formData.get("tier_count") as string | null) ?? "0",
    10
  );
  if (esIntegrado && tierCount >= 0) {
    // Eliminar tarifas anteriores y re-insertar las actuales
    await supabase
      .from("service_price_tiers")
      .delete()
      .eq("service_id", serviceId);

    if (tierCount > 0) {
      const tiersToInsert = [];
      for (let i = 0; i < tierCount; i++) {
        const tipo = (formData.get(`tier_tipo_${i}`) as string | null)?.trim();
        if (!tipo) continue;
        const labelEs = (
          formData.get(`tier_label_es_${i}`) as string | null
        )?.trim();
        const labelEn = (
          formData.get(`tier_label_en_${i}`) as string | null
        )?.trim();
        const precio = parseNum(
          formData.get(`tier_precio_${i}`) as string | undefined
        );
        const orden = parseInt(
          (formData.get(`tier_orden_${i}`) as string | null) ?? String(i),
          10
        );
        if (precio === null || precio < 0) continue;
        const label_i18n: Record<string, string> = {};
        if (labelEs) label_i18n["es"] = labelEs;
        if (labelEn) label_i18n["en"] = labelEn;
        tiersToInsert.push({ service_id: serviceId, tipo, label_i18n, precio, orden });
      }
      if (tiersToInsert.length > 0) {
        const { error: errTiers } = await supabase
          .from("service_price_tiers")
          .insert(tiersToInsert);
        if (errTiers)
          return {
            error: `No se pudieron guardar las tarifas: ${errTiers.message}`,
          };
      }
    }
  } else if (!esIntegrado) {
    // Si el servicio ya no es integrado, borrar tiers huérfanos
    await supabase
      .from("service_price_tiers")
      .delete()
      .eq("service_id", serviceId);
  }

  // Guardar excepciones de stock por fecha (solo servicios integrados).
  // Upsert preserva 'reservados'; solo eliminamos fechas quitadas SIN reservas.
  if (esIntegrado) {
    const availCount = parseInt(
      (formData.get("avail_count") as string | null) ?? "0",
      10
    );
    const hoyStr = new Date().toISOString().slice(0, 10);
    const enviadas: { fecha: string; capacidad: number }[] = [];
    for (let i = 0; i < availCount; i++) {
      const fecha = (formData.get(`avail_fecha_${i}`) as string | null)?.trim();
      const capacidad = parseIntNull(
        formData.get(`avail_capacidad_${i}`) as string | null
      );
      if (!fecha || capacidad === null) continue;
      enviadas.push({ fecha, capacidad });
    }

    for (const row of enviadas) {
      const { error: errAvail } = await supabase
        .from("service_availability")
        .upsert(
          {
            service_id: serviceId,
            fecha: row.fecha,
            capacidad: row.capacidad,
            activo: true,
          },
          { onConflict: "service_id,fecha" }
        );
      if (errAvail)
        return { error: `No se pudo guardar el stock: ${errAvail.message}` };
    }

    // Borrar excepciones futuras retiradas del formulario que no tengan reservas.
    const { data: existentes } = await supabase
      .from("service_availability")
      .select("id, fecha, reservados")
      .eq("service_id", serviceId)
      .gte("fecha", hoyStr);
    const fechasEnviadas = new Set(enviadas.map((e) => e.fecha));
    const aBorrar = (existentes ?? [])
      .filter((e) => !fechasEnviadas.has(e.fecha) && e.reservados === 0)
      .map((e) => e.id);
    if (aBorrar.length > 0) {
      await supabase.from("service_availability").delete().in("id", aBorrar);
    }
  }

  revalidateTag(catalogCacheTag(ctx.currentTenant.slug), "max");
  revalidatePath("/panel/products");
  redirect("/panel/products");
}

export async function alternarVisibilidadServicio(
  id: string,
  activo: boolean
): Promise<void> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("services")
    .update({ activo })
    .eq("id", id)
    .eq("tenant_id", ctx.currentTenant.id);
  if (error) throw new Error(error.message);
  revalidateTag(catalogCacheTag(ctx.currentTenant.slug), "max");
  revalidatePath("/panel/products");
}

export async function cambiarEstadoServicio(
  id: string,
  estado: "borrador" | "publicado" | "despublicado"
): Promise<void> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("services")
    .update({ estado })
    .eq("id", id)
    .eq("tenant_id", ctx.currentTenant.id);
  if (error) throw new Error(error.message);
  revalidateTag(catalogCacheTag(ctx.currentTenant.slug), "max");
  revalidatePath("/panel/products");
}

export async function eliminarServicio(id: string): Promise<void> {
  const ctx = await requirePanelContext();
  assertCapacidad(ctx, "catalog.edit");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.currentTenant.id);
  if (error) throw new Error(error.message);
  revalidateTag(catalogCacheTag(ctx.currentTenant.slug), "max");
  revalidatePath("/panel/products");
}

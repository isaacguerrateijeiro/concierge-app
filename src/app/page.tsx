import Kiosk from "@/components/kiosk/Kiosk";
import { getCatalog } from "@/lib/catalog";

// El kiosko se renderiza en el servidor en cada visita (siempre datos frescos).
export const dynamic = "force-dynamic";

// Qué tenant carga este kiosko. Configurable por entorno, no hardcodeado.
const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? "prosegur";

export default async function Page() {
  const catalog = await getCatalog(TENANT_SLUG);
  return <Kiosk catalog={catalog} />;
}

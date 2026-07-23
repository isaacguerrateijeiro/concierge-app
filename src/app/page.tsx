import Kiosk from "@/components/kiosk/Kiosk";
import { getCatalog } from "@/lib/catalog";

// El kiosko se cachea y revalida periódicamente (ISR): se sirve al instante y
// resiste cortes de red, mientras Next refresca el catálogo en segundo plano.
export const revalidate = 60;

// Qué tenant carga este kiosko. Configurable por entorno, no hardcodeado.
const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? "prosegur";

export default async function Page() {
  const catalog = await getCatalog(TENANT_SLUG);
  return <Kiosk catalog={catalog} />;
}

import KioskNotice from "@/components/kiosk/KioskNotice";

// Estado de carga que Next.js muestra automáticamente mientras el servidor
// obtiene el catálogo. Evita una pantalla en blanco en el kiosko.
export default function Loading() {
  return (
    <KioskNotice
      eyebrow="Concierge"
      title="Preparando tu experiencia"
      message="Cargando el catálogo de servicios…"
      pulse
    />
  );
}

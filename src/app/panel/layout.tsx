import type { Metadata } from "next";
import "./panel.css";

export const metadata: Metadata = {
  title: "ConciergeOS · Panel",
  description: "Panel de administración de ConciergeOS",
};

// Layout raíz del panel: solo aporta los estilos. El layout protegido
// (panel/(protected)/layout.tsx) añade el shell y la guardia de sesión.
export default function PanelRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

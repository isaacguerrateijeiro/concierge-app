"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

// Si la URL trae ?print=1 (lo abre el kiosko al elegir "Imprimir"), dispara la
// impresión del navegador automáticamente al cargar el recibo.
export default function AutoPrint() {
  const params = useSearchParams();
  useEffect(() => {
    if (params.get("print") === "1") {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [params]);
  return null;
}

/** Resultado común de importadores (genérico, Big Bus, etc.). */
export interface ResultadoImportacion {
  estado: "ok" | "parcial" | "error";
  detectados: number;
  creados: number;
  actualizados: number;
  despublicados: number;
  errores: number;
  metodo: string;
  notas: string[];
}

/** Normaliza URL/ref de origen para comparar listados vs PDP. */
export function normalizeFuenteRef(ref: string): string {
  try {
    const u = new URL(ref);
    const path = u.pathname.replace(/\/+$/, "") || "";
    return `${u.protocol}//${u.host.toLowerCase()}${path}${u.search}${u.hash}`.toLowerCase();
  } catch {
    return ref.trim().toLowerCase();
  }
}

import Link from "next/link";
import { RANGOS, type RangoKey } from "@/lib/panel/rangos";

// Selector de rango basado en enlaces (?range=...): re-renderiza el server page.
export function RangeTabs({
  basePath,
  current,
}: {
  basePath: string;
  current: RangoKey;
}) {
  return (
    <div className="range">
      {RANGOS.map((r) => (
        <Link
          key={r.key}
          href={`${basePath}?range=${r.key}`}
          className={r.key === current ? "on" : ""}
        >
          {r.label}
        </Link>
      ))}
    </div>
  );
}

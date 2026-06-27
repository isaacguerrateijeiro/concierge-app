"use client";

import { usePathname } from "next/navigation";
import { titleForPath } from "@/app/panel/_components/nav";

export function Topbar() {
  const pathname = usePathname();
  const [title, sub] = titleForPath(pathname);

  return (
    <header className="topbar">
      <div className="tb-title">
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      <div className="tb-actions">
        <a className="btn btn-accent" href="/" target="_blank" rel="noreferrer">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Ver kiosko en vivo
        </a>
      </div>
    </header>
  );
}

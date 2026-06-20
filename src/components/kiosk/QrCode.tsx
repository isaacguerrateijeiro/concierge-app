"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// QR generado en el cliente a partir de un valor (normalmente la URL del
// recibo). Se renderiza como dataURL en una <img> para escanear desde el móvil.
export default function QrCode({
  value,
  size = 220,
}: {
  value: string;
  size?: number;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    QRCode.toDataURL(value, { margin: 1, width: size * 2, errorCorrectionLevel: "M" })
      .then((url) => {
        if (activo) setSrc(url);
      })
      .catch(() => {
        if (activo) setSrc(null);
      });
    return () => {
      activo = false;
    };
  }, [value, size]);

  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#fff",
        borderRadius: 16,
        padding: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="QR" width={size - 24} height={size - 24} />
      ) : null}
    </div>
  );
}

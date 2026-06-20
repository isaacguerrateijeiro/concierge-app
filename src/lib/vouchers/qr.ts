import QRCode from "qrcode";

// Genera un QR como SVG (string) para incrustar inline. SVG escala nítido en
// pantalla y en impresión, y no depende de fuentes ni de red. Es una función
// pura (sin estado), usable en servidor.
export async function qrSvg(valor: string): Promise<string> {
  return QRCode.toString(valor, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
  });
}

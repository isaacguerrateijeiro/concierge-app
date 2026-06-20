import { randomBytes, randomInt } from "node:crypto";

// ============================================================
// Generación de códigos y tokens de voucher (funciones puras).
//  - codigo: corto y legible para humanos (sin caracteres ambiguos).
//  - token: largo y aleatorio, infumable, para el QR y la URL pública.
// Sin "server-only" a propósito: se usan en servidor y se testean en Vitest.
// ============================================================

// Alfabeto sin caracteres ambiguos (sin 0/O, 1/I/L) para dictar/leer fácil.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// Código humano del tipo "ABCD-2345" (configurable en longitud por bloque).
export function generarCodigo(longitudBloque = 4, bloques = 2): string {
  const partes: string[] = [];
  for (let b = 0; b < bloques; b++) {
    let parte = "";
    for (let i = 0; i < longitudBloque; i++) {
      parte += ALFABETO[randomInt(ALFABETO.length)];
    }
    partes.push(parte);
  }
  return partes.join("-");
}

// Token url-safe (base64url) de alta entropía para el QR/canje.
export function generarToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

// Referencia corta del pedido (8 chars legibles, sin guion) para citar en
// SMS/soporte, p. ej. "ABCD2345".
export function generarReferencia(longitud = 8): string {
  let r = "";
  for (let i = 0; i < longitud; i++) {
    r += ALFABETO[randomInt(ALFABETO.length)];
  }
  return r;
}

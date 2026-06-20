import { test, expect } from "@playwright/test";

// Prueba de humo del flujo principal: el kiosko arranca en la pantalla de
// atracción y, al tocar el CTA, muestra la pantalla de servicios (Home).
test("muestra la atracción y navega a la pantalla de servicios", async ({ page }) => {
  await page.goto("/");

  const cta = page.getByRole("button", { name: "Toca para empezar" });
  await expect(cta).toBeVisible();

  // El CTA tiene animación continua (bounce), nunca queda "estable"; en el
  // kiosko real basta con tocarlo, así que forzamos el click en la prueba.
  await cta.click({ force: true });

  await expect(page.getByText("¿Qué te apetece hacer?")).toBeVisible();
});

// Flujo de carrito: añadir un servicio integrado, abrir el carrito y llegar al
// botón de pagar. No entramos en el iframe de Stripe (el pago se prueba a mano
// con tarjeta de test), así que la prueba no necesita claves de Stripe.
test("añade un servicio integrado al carrito y llega al botón de pagar", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Toca para empezar" }).click({ force: true });
  await expect(page.getByText("¿Qué te apetece hacer?")).toBeVisible();

  // "Fútbol Bernabéu" es un servicio integrado (65 €) del catálogo de Prosegur.
  await page.getByText("Fútbol Bernabéu").first().click();

  // Aparece la barra de carrito; la abrimos.
  const verCarrito = page.getByRole("button", { name: "Ver carrito" });
  await expect(verCarrito).toBeVisible();
  await verCarrito.click();

  // En la pantalla de carrito hay un total y un botón de pagar.
  await expect(page.getByText("Tu carrito")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pagar" })).toBeVisible();
});

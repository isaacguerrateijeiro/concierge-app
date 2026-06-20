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

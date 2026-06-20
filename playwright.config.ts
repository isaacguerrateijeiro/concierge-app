import { defineConfig, devices } from "@playwright/test";

// Configuración de pruebas E2E (extremo a extremo) del kiosko.
// Levanta la app en modo producción y la prueba con un navegador real.
// Requiere las variables de Supabase (.env.local) para construir el catálogo.
// Antes de la primera ejecución: `npx playwright install`.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

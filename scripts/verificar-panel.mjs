// Verificación end-to-end del panel: login real + RLS/helpers/RPC con sesión.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const txt = readFileSync(resolve(__dirname, "..", ".env.local"), "utf8");
for (const l of txt.split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const [, , email, password] = process.argv;

const c = createClient(url, anon, { auth: { persistSession: false } });

const { data: session, error: e1 } = await c.auth.signInWithPassword({ email, password });
if (e1) {
  console.error("LOGIN FALLO:", e1.message);
  process.exit(1);
}
console.log("✓ Login OK. user:", session.user.id);

const token = session.session.access_token;
const auth = createClient(url, anon, {
  auth: { persistSession: false },
  global: { headers: { Authorization: `Bearer ${token}` } },
});

const isAdmin = await auth.rpc("app_is_platform_admin");
console.log("✓ app_is_platform_admin:", isAdmin.data, isAdmin.error?.message ?? "");

const tenants = await auth.from("tenants").select("id, slug, nombre");
console.log("✓ tenants visibles:", tenants.data?.length, tenants.error?.message ?? "");

const tenantId = tenants.data?.[0]?.id;
const desde = new Date(Date.now() - 30 * 86400000).toISOString();
const hasta = new Date().toISOString();
const metrics = await auth.rpc("panel_metrics", { p_tenant: tenantId, p_desde: desde, p_hasta: hasta });
console.log("✓ panel_metrics:", JSON.stringify(metrics.data), metrics.error?.message ?? "");

const orders = await auth.from("orders").select("id, referencia, importe_total, estado").eq("tenant_id", tenantId);
console.log("✓ orders visibles:", orders.data?.length, orders.error?.message ?? "");

const services = await auth.from("services").select("id").eq("tenant_id", tenantId);
console.log("✓ services visibles:", services.data?.length, services.error?.message ?? "");

await c.auth.signOut();
console.log("HECHO");

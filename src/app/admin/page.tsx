import { esAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { iniciarSesionAdmin } from "./actions";
import AdminConnect, { type ProviderRow } from "./AdminConnect";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await esAdmin();

  if (!admin) {
    const sp = await searchParams;
    return <LoginForm error={sp?.error === "1"} />;
  }

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("providers")
    .select(
      "id, nombre, slug, stripe_account_id, stripe_payouts_activos, stripe_onboarding_estado, tenants(slug)"
    )
    .order("nombre");

  const providers: ProviderRow[] = (data ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    slug: p.slug,
    stripe_account_id: p.stripe_account_id,
    stripe_payouts_activos: p.stripe_payouts_activos,
    stripe_onboarding_estado: p.stripe_onboarding_estado,
    tenantSlug: (p.tenants as { slug: string } | null)?.slug ?? "—",
  }));

  return <AdminConnect providers={providers} />;
}

function LoginForm({ error }: { error: boolean }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
        background: "#F4F1EA",
        color: "#16140F",
      }}
    >
      <form
        action={iniciarSesionAdmin}
        style={{
          background: "#fff",
          padding: 32,
          borderRadius: 16,
          width: 360,
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ fontSize: 22, marginTop: 0 }}>Administración</h1>
        <p style={{ fontSize: 13, color: "#6b6657" }}>
          Introduce el token de administración para continuar.
        </p>
        <input
          type="password"
          name="token"
          placeholder="ADMIN_SETUP_TOKEN"
          autoComplete="off"
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid #cfcabc",
            fontSize: 15,
            boxSizing: "border-box",
          }}
        />
        {error && (
          <div style={{ color: "#b42318", fontSize: 13, marginTop: 10 }}>
            Token incorrecto.
          </div>
        )}
        <button
          type="submit"
          style={{
            marginTop: 16,
            width: "100%",
            background: "#16140F",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "12px 14px",
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          Entrar
        </button>
      </form>
    </main>
  );
}

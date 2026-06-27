import { LoginForm } from "@/app/panel/login/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destino = next && next.startsWith("/panel") ? next : "/panel";

  return (
    <div className="pnl">
      <div className="pnl-login">
        <div className="card">
          <div className="brand">
            <span className="mark">
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                <path
                  d="M3 9l9-6 9 6v10a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9z"
                  fill="#16140F"
                />
              </svg>
            </span>
            <h1>
              Concierge<em style={{ fontStyle: "italic" }}>OS</em>
            </h1>
          </div>
          <p
            style={{
              color: "#7a7060",
              fontSize: 13.5,
              marginBottom: 22,
            }}
          >
            Accede al panel de administración.
          </p>
          <LoginForm next={destino} />
        </div>
      </div>
    </div>
  );
}

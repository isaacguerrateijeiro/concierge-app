export function EnConstruccion({ titulo }: { titulo: string }) {
  return (
    <div className="panel">
      <div className="empty-note">
        <div style={{ fontSize: 32, marginBottom: 10 }}>🚧</div>
        <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 15 }}>
          {titulo}
        </div>
        <p style={{ marginTop: 6, maxWidth: 420, marginInline: "auto" }}>
          Esta sección se está construyendo en la siguiente sub-fase del panel.
        </p>
      </div>
    </div>
  );
}

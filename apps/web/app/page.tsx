import { BoardClient } from "./board-client";

async function getHealth(apiUrl: string) {
  try {
    const response = await fetch(`${apiUrl}/health`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return { status: "offline", timestamp: "indisponivel" };
    }

    return (await response.json()) as { status: string; timestamp: string };
  } catch {
    return { status: "offline", timestamp: "indisponivel" };
  }
}

export default async function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const health = await getHealth(apiUrl);

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">Kanban Platform</span>
        <div className="hero-grid">
          <div className="stack">
            <h1>Transforme a base em um board utilizavel.</h1>
            <p>
              A fundacao agora saiu do mock estatico: o frontend consulta o
              backend, mostra o board de demo e permite avancar cards entre as
              etapas do fluxo.
            </p>
            <div className="status-grid">
              <article className="glass status-card">
                <span className="tiny-label">Board</span>
                <strong className="metric">demo</strong>
              </article>
              <article className="glass status-card">
                <span className="tiny-label">Interacao</span>
                <strong className="metric">Move cards</strong>
              </article>
              <article className="glass status-card">
                <span className="tiny-label">Estado</span>
                <strong className="metric">Optimistic UI</strong>
              </article>
            </div>
          </div>

          <aside className="glass api-card">
            <span className="eyebrow">API status</span>
            <strong>{health.status}</strong>
            <p>
              A camada web usa o endpoint de health para validar conectividade
              antes de carregar o board real.
            </p>
            <code>updated_at: {health.timestamp}</code>
          </aside>
        </div>
      </section>

      <BoardClient apiUrl={apiUrl} boardId="demo" />
    </main>
  );
}

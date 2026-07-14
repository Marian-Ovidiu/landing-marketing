import Link from "next/link";

const BASE_URL = "http://localhost:3100";

const routes = [
  { href: "/", description: "Landing principale — Segnale" },
  { href: "/urls", description: "Indice completo delle route" },
  { href: "/concept/segnale", description: "Landing Segnale — route compatibile" },
  { href: "/crea-strategia", description: "Destinazione provvisoria del funnel" },
  { href: "/concept/page", description: "Concept C — pagina completa" },
  { href: "/concept/live", description: "Prototipo motion scroll-linked" },
  { href: "/concept/desktop-initial", description: "Desktop — stato iniziale" },
  { href: "/concept/desktop-final", description: "Desktop — stato finale" },
  { href: "/concept/mobile-initial", description: "Mobile — stato iniziale" },
  { href: "/concept/mobile-final", description: "Mobile — stato finale" },
];

export const metadata = {
  title: "Route disponibili — Browser Design Prototype",
};

export default function UrlsPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "96px 24px" }}>
      <p
        style={{
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--text-secondary)",
        }}
      >
        Browser Design Prototype · Concept C
      </p>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 44,
          fontWeight: 600,
          lineHeight: 1.1,
          margin: "16px 0 32px",
        }}
      >
        Route disponibili
      </h1>
      <ul style={{ listStyle: "none", display: "grid", gap: 12 }}>
        {routes.map((route) => (
          <li key={route.href}>
            <Link
              href={route.href}
              style={{
                display: "grid",
                gap: 5,
                padding: "16px 20px",
                background: "var(--surface-paper)",
                borderRadius: "var(--radius-plan-card)",
                boxShadow: "var(--shadow-fragment-resting)",
                color: "var(--text-primary)",
                textDecoration: "none",
              }}
            >
              <span style={{ fontSize: 17 }}>{`${BASE_URL}${route.href}`}</span>
              <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                {route.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

import Link from "next/link";

const states = [
  { href: "/concept/page", label: "http://localhost:3000/concept/page" },
  { href: "/concept/live", label: "★ Live — prototipo motion scroll-linked" },
  { href: "/concept/desktop-initial", label: "Desktop — stato iniziale (campo di frammenti)" },
  { href: "/concept/desktop-final", label: "Desktop — stato finale (il piano emerso)" },
  { href: "/concept/mobile-initial", label: "Mobile — stato iniziale (imbuto verticale)" },
  { href: "/concept/mobile-final", label: "Mobile — stato finale (pila nel pannello)" },
];

export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "96px 24px" }}>
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
        Dal rumore al piano
      </h1>
      <ul style={{ listStyle: "none", display: "grid", gap: 12 }}>
        {states.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              style={{
                display: "block",
                padding: "16px 20px",
                background: "var(--surface-paper)",
                borderRadius: "var(--radius-plan-card)",
                boxShadow: "var(--shadow-fragment-resting)",
                color: "var(--text-primary)",
                textDecoration: "none",
                fontSize: 17,
              }}
            >
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

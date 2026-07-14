// Direzione B «Segnale» — i sei pannelli informativi del "rumore".
// File parallelo a fragments.tsx: stesso contratto (una figure con aria-label
// per slot), stessi slot e stessa orchestrazione in HeroLive. Nessuna immagine,
// nessuna icona: solo contenuto reale del locale (Osteria da Rita).
// Il teal compare soltanto su dato critico / stato / opportunità
// (outputs/apple-direction.md §5, budget <5%).

function PanelShell({
  aria,
  label,
  className,
  children,
}: {
  aria: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className={`sig-panel${className ? ` ${className}` : ""}`} aria-label={aria}>
      <p className="sig-panel-label">{label}</p>
      {children}
    </figure>
  );
}

// slot "receipt" — Dati del locale
export function PanelDati() {
  return (
    <PanelShell aria="Pannello: dati del locale" label="Dati del locale">
      <dl className="sig-data">
        <div className="sig-data-row">
          <dt>Coperti</dt>
          <dd>30</dd>
        </div>
        <div className="sig-data-row">
          <dt>Scontrino medio</dt>
          <dd>24€</dd>
        </div>
        <div className="sig-data-row sig-data-row--critical">
          <dt>Martedì</dt>
          <dd>11 coperti</dd>
        </div>
      </dl>
    </PanelShell>
  );
}

// slot "review" — Recensioni
export function PanelRecensioni() {
  return (
    <PanelShell aria="Pannello: recensioni del locale" label="Recensioni">
      <p className="sig-review-score">
        <strong>4,7</strong> · 128 recensioni
      </p>
      <blockquote className="sig-quote">
        «Cena perfetta, ci hanno consigliato benissimo.»
      </blockquote>
      <p className="sig-author">— Giulia M.</p>
      <p className="sig-status sig-status--alert">Senza risposta · 10</p>
    </PanelShell>
  );
}

// slot "social" — Post
export function PanelPost() {
  return (
    <PanelShell aria="Pannello: ultimo post pubblicato" label="Post">
      <p className="sig-status sig-status--alert">Ultimo post · 92 giorni fa</p>
      <blockquote className="sig-quote">
        «Stasera tutto esaurito — grazie a chi è passato!»
      </blockquote>
    </PanelShell>
  );
}

// slot "note" — Problemi
export function PanelProblemi() {
  return (
    <PanelShell aria="Pannello: problemi aperti" label="Problemi">
      <ul className="sig-list">
        <li>martedì vuoto</li>
        <li>Instagram fermo</li>
        <li>recensioni senza risposta</li>
      </ul>
    </PanelShell>
  );
}

// slot "flyer" — Opportunità
export function PanelOpportunita() {
  return (
    <PanelShell aria="Pannello: opportunità individuate" label="Opportunità">
      <ul className="sig-list sig-list--teal">
        <li>università a 200 m</li>
        <li>fascia 18–20 scoperta</li>
        <li>aperitivo del giovedì</li>
      </ul>
    </PanelShell>
  );
}

// slot "polaroid" — Orari (mini settimana, martedì evidenziato)
const HOURS: Array<{ day: string; hours: string; gap?: boolean }> = [
  { day: "LUN", hours: "12–23" },
  { day: "MAR", hours: "12–20", gap: true },
  { day: "MER", hours: "12–23" },
  { day: "GIO", hours: "12–24" },
  { day: "VEN", hours: "12–24" },
  { day: "SAB", hours: "12–24" },
  { day: "DOM", hours: "12–16" },
];

export function PanelOrari() {
  return (
    <PanelShell aria="Pannello: orari settimanali del locale" label="Orari" className="sig-panel--orari">
      <ul className="sig-hours">
        {HOURS.map(({ day, hours, gap }) => (
          <li key={day} className={gap ? "sig-hours-row sig-hours-row--gap" : "sig-hours-row"}>
            <strong>{day}</strong>
            <span>{hours}</span>
          </li>
        ))}
      </ul>
      <p className="sig-hours-note">MAR · sala vuota dalle 20</p>
    </PanelShell>
  );
}

// mappa per HeroLive: stesse chiavi (e stesso ordine) di FRAGMENTS
export const PANELS = {
  receipt: PanelDati,
  review: PanelRecensioni,
  flyer: PanelOpportunita,
  social: PanelPost,
  note: PanelProblemi,
  polaroid: PanelOrari,
} as const;

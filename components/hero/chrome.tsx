import { copy, type HeroCopy, type Stage } from "./copy";

export function Nav({
  compact = false,
  content = copy,
}: {
  compact?: boolean;
  content?: HeroCopy;
}) {
  return (
    <header className="nav">
      <p className="nav-wordmark">{content.wordmark}</p>
      {!compact && (
        <nav className="nav-links" aria-label="Navigazione principale">
          {content.navLinks.map(({ label, href }) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

export function Ctas({
  emphasized = false,
  content = copy,
  onPrimaryClick,
}: {
  emphasized?: boolean;
  content?: HeroCopy;
  onPrimaryClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <div className={`cta-row${emphasized ? " cta-row--emphasized" : ""}`}>
      <a className="cta-primary" href={content.ctaPrimaryHref} onClick={onPrimaryClick}>
        {content.ctaPrimary}
      </a>
      <a className="cta-secondary" href={content.ctaSecondaryHref}>
        {content.ctaSecondary}
        <span className="cta-arrow" aria-hidden="true">
          →
        </span>
      </a>
    </div>
  );
}

// Il filtro narrativo: unico elemento glass della hero (backdrop-filter reale).
export function GlassPanel({ stage, children }: { stage: Stage; children?: React.ReactNode }) {
  return (
    <div className={`glass-panel glass-panel--${stage}`}>
      <div className="glass-panel-inner">{children}</div>
    </div>
  );
}

// Grana globale (hero-grain-overlay): feTurbulence statica, separata dalla grana cartacea.
export function GrainOverlay() {
  return (
    <svg className="grain-overlay" aria-hidden="true">
      <filter id="hero-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#hero-grain)" />
    </svg>
  );
}

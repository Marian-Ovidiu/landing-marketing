import Image from "next/image";

// I sei frammenti del "rumore": input reali del marketing quotidiano di un locale.
// Materiali cartacei: grana via .paper-grain (hero-paper-grain-overlay), ombre dai token.

export function Receipt() {
  return (
    <figure className="fragment" aria-label="Frammento: scontrino del locale">
      <div className="receipt-paper paper-grain">
        <p className="receipt-line receipt-line--head">Osteria da Rita</p>
        <p className="receipt-sep" aria-hidden="true">
          · · · · · · · · · · · ·
        </p>
        <p className="receipt-row">
          <span>2× Spritz</span>
          <span>8,00</span>
        </p>
        <p className="receipt-row">
          <span>1× Tagliere</span>
          <span>12,00</span>
        </p>
        <p className="receipt-sep" aria-hidden="true">
          · · · · · · · · · · · ·
        </p>
        <p className="receipt-row receipt-row--total">
          <span>Totale</span>
          <span>20,00</span>
        </p>
        <p className="receipt-line receipt-line--foot">Grazie, a presto</p>
      </div>
    </figure>
  );
}

function Star() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
      <path
        d="M10 1l2.7 5.6 6.1.9-4.4 4.3 1 6.1L10 15l-5.4 2.9 1-6.1L1.2 7.5l6.1-.9z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Review() {
  return (
    <figure className="fragment" aria-label="Frammento: recensione stampata">
      <div className="review-paper paper-grain">
        <div className="review-stars" role="img" aria-label="Valutazione: 5 stelle su 5">
          <Star />
          <Star />
          <Star />
          <Star />
          <Star />
        </div>
        <blockquote className="review-quote">
          «Cena perfetta, ci hanno consigliato benissimo. Torniamo di sicuro.»
        </blockquote>
        <figcaption className="review-author">— Giulia M.</figcaption>
      </div>
    </figure>
  );
}

export function Flyer() {
  return (
    <figure className="fragment" aria-label="Frammento: volantino dell’aperitivo">
      <div className="flyer-paper paper-grain">
        <span className="flyer-circle" aria-hidden="true" />
        <p className="flyer-title">
          Aperitivo
          <br />
          del giovedì
        </p>
        <p className="flyer-sub">
          dalle 18:00
          <br />
          calice + tagliere 10€
        </p>
        <p className="flyer-band">Via dei Sarti 12</p>
      </div>
    </figure>
  );
}

export function SocialPost() {
  return (
    <figure className="fragment" aria-label="Frammento: post social stampato e ritagliato">
      <div className="social-paper paper-grain">
        <div className="social-head">
          <span className="social-avatar" aria-hidden="true" />
          <p className="social-name">Osteria da Rita</p>
        </div>
        <span className="social-photo" aria-hidden="true" />
        <p className="social-text">Stasera tutto esaurito — grazie a chi è passato!</p>
      </div>
    </figure>
  );
}

export function NoteFragment() {
  return (
    <figure className="fragment" aria-label="Frammento: appunti a mano del gestore">
      <div className="note-paper paper-grain">
        <p className="note-line note-line--circled">
          chiedere le recensioni ai tavoli
          <svg
            className="note-ellipse"
            viewBox="0 0 200 40"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <ellipse
              cx="100"
              cy="20"
              rx="96"
              ry="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            />
          </svg>
        </p>
        <p className="note-line">rispondere a quella su Google</p>
        <p className="note-line">foto nuove del dehors??</p>
      </div>
    </figure>
  );
}

export function Polaroid() {
  return (
    <figure className="fragment" aria-label="Frammento: polaroid del locale">
      <div className="polaroid-frame">
        {/* finestra = maschera dell'effetto ambientale (attivo solo in /concept/live) */}
        <div className="polaroid-window">
          <Image
            className="polaroid-photo"
            src="/assets/hero-fragment-polaroid-photo-v3-640.webp"
            alt="Angolo di tavolo di trattoria visto dall’alto: cestino del pane, calici e olive"
            width={400}
            height={400}
            sizes="(max-width: 767px) 118px, 220px"
            preload
          />
          <span className="polaroid-light" aria-hidden="true" />
          <span className="polaroid-glint" aria-hidden="true" />
        </div>
      </div>
    </figure>
  );
}

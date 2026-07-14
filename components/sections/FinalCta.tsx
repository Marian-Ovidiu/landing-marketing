"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

// Sezione 04 — «La scena calma»: solo tipografia, CTA e aria.
// Nessuna timeline, nessun pin: un unico assestamento d'ingresso.

export function FinalCta() {
  const sectionRef = useRef<HTMLElement>(null);
  const [enter, setEnter] = useState<"idle" | "pending" | "done">("idle");

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (section.getBoundingClientRect().top < window.innerHeight) return; // già in vista
    setEnter("pending");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setEnter("done");
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  // anchor alla sezione 02: smooth solo senza reduced motion,
  // focus sulla heading della sezione senza rompere lo scroll
  const backToExample = (e: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("section-02-esempio-di-piano");
    const heading = document.getElementById("weekly-plan-title");
    if (!target) return; // fallback: comportamento nativo dell'anchor
    e.preventDefault();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <section
      id="section-04-cta-finale"
      className="final-cta"
      ref={sectionRef}
      data-enter={enter}
      aria-labelledby="final-cta-title"
    >
      <div className="final-cta-layout">
        <h2 id="final-cta-title">
          Il tuo locale ha già abbastanza cose da gestire.
          <br className="final-cta-break" />
          {" "}La strategia può essere <em className="final-cta-em">una in meno</em>.
        </h2>

        <div className="final-cta-actions">
          {/* Destinazione provvisoria documentata nella route: verrà sostituita
              dal flusso reale di creazione quando sarà disponibile. */}
          <a id="crea-strategia" className="final-cta-primary" href="/crea-strategia">
            Crea la strategia del tuo locale
          </a>
          <a
            className="final-cta-secondary"
            href="#section-02-esempio-di-piano"
            onClick={backToExample}
          >
            Rivedi l’esempio di piano
            <span className="final-cta-arrow" aria-hidden="true">↑</span>
          </a>
        </div>

        <p className="final-cta-micro">Racconti il locale · ricevi il piano · inizi lunedì</p>
      </div>

      <footer className="final-footer">
        <div className="final-footer-layout">
          <p>
            Marketing Strategy Generator — un piano concreto per piccoli ristoranti, bar e locali.
          </p>
        </div>
      </footer>
    </section>
  );
}

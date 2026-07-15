"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const usefulEvidence = [
  ["MARTEDÌ", "GIORNO DEBOLE"],
  ["UNIVERSITÀ", "PUBBLICO VICINO"],
  ["RECENSIONI", "AZIONE RIMANDATA"],
] as const;

function EditorialTrace() {
  return (
    <svg
      className="segnale-trace"
      viewBox="0 0 1248 620"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g className="segnale-trace-desktop">
        <path data-trace-first pathLength="1" d="M554 108 H592 L624 138" />
        <circle cx="554" cy="108" r="4" />
        <circle data-marker-useful cx="624" cy="138" r="4" />

        <path data-trace-center-base pathLength="1" d="M604 294 H754" />
        <path className="segnale-trace-teal" data-trace-center pathLength="1" d="M604 294 H754" />
        <circle data-marker-useful cx="604" cy="294" r="4" />
        <circle data-marker-useful cx="754" cy="294" r="4" />

        <path data-trace-final pathLength="1" d="M780 316 L820 346 V370" />
        <circle data-marker-decision cx="820" cy="370" r="4" />
      </g>

      <g className="segnale-trace-mobile">
        <path data-trace-first pathLength="1" d="M0 254 H378 L485 279" />
        <path
          className="segnale-trace-marker"
          d="M0 249.8 C7.9 249.8 14.3 251.7 14.3 254 C14.3 256.3 7.9 258.2 0 258.2 C-7.9 258.2 -14.3 256.3 -14.3 254 C-14.3 251.7 -7.9 249.8 0 249.8Z"
        />
        <path
          className="segnale-trace-marker"
          data-marker-useful
          d="M485 274.8 C492.9 274.8 499.3 276.7 499.3 279 C499.3 281.3 492.9 283.2 485 283.2 C477.1 283.2 470.7 281.3 470.7 279 C470.7 276.7 477.1 274.8 485 274.8Z"
        />

        <path data-trace-center-base pathLength="1" d="M485 389 H1177" />
        <path className="segnale-trace-teal" data-trace-center pathLength="1" d="M485 389 H1177" />
        <path
          className="segnale-trace-marker"
          data-marker-useful
          d="M1177 384.8 C1184.9 384.8 1191.3 386.7 1191.3 389 C1191.3 391.3 1184.9 393.2 1177 393.2 C1169.1 393.2 1162.7 391.3 1162.7 389 C1162.7 386.7 1169.1 384.8 1177 384.8Z"
        />
      </g>
    </svg>
  );
}

export function SegnaleHowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const isMobile = window.matchMedia("(max-width: 767px)").matches;
        const first = gsap.utils.toArray<SVGPathElement>(section.querySelectorAll("[data-trace-first]"));
        const centerBase = gsap.utils.toArray<SVGPathElement>(
          section.querySelectorAll("[data-trace-center-base]"),
        );
        const center = gsap.utils.toArray<SVGPathElement>(
          section.querySelectorAll("[data-trace-center]"),
        );
        const finalTrace = section.querySelector<SVGPathElement>(
          ".segnale-trace-desktop [data-trace-final]",
        );
        const usefulMarkers = gsap.utils.toArray<SVGElement>(
          section.querySelectorAll("[data-marker-useful]"),
        );
        const decisionMarker = section.querySelector<SVGElement>("[data-marker-decision]");
        const noise = gsap.utils.toArray<HTMLElement>(section.querySelectorAll("[data-noise]"));
        const evidence = gsap.utils.toArray<HTMLElement>(
          section.querySelectorAll("[data-evidence]"),
        );
        const reading = section.querySelector<HTMLElement>("[data-reading]");
        const decision = section.querySelector<HTMLElement>("[data-decision]");
        const detail = section.querySelector<HTMLElement>("[data-decision-detail]");
        const secondary = section.querySelector<HTMLElement>("[data-secondary-actions]");
        const decisionRule = section.querySelector<HTMLElement>("[data-decision-rule]");

        gsap.set(first, { strokeDasharray: 1, strokeDashoffset: 1 });
        gsap.set(centerBase, { strokeDasharray: 1, strokeDashoffset: 1 });
        gsap.set(center, { strokeDasharray: 1, strokeDashoffset: 1, opacity: 0 });
        gsap.set(finalTrace, { strokeDasharray: 1, strokeDashoffset: 1, opacity: 0.25 });
        gsap.set(usefulMarkers, {
          stroke: isMobile ? "var(--text-secondary)" : "var(--s01-line)",
        });
        gsap.set(decisionMarker, { stroke: "var(--s01-line)", opacity: 0.35 });
        gsap.set(noise, { opacity: 1 });
        gsap.set(evidence, { opacity: isMobile ? 0.68 : 0.62, y: 10 });
        gsap.set(reading, { opacity: 0.76 });
        gsap.set(decision, { opacity: isMobile ? 0.34 : 0.28 });
        gsap.set(detail, { opacity: isMobile ? 0.92 : 0.45 });
        gsap.set(secondary, { opacity: isMobile ? 0.78 : 0.2 });
        gsap.set(decisionRule, { scaleX: 0, transformOrigin: "left center" });

        const timeline = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.12,
            invalidateOnRefresh: true,
          },
        });

        timeline
          .to(first, { strokeDashoffset: 0.25, duration: 20 }, 0)
          .to(first, { strokeDashoffset: 0, duration: 20 }, 20)
          .to(noise, { opacity: isMobile ? 0.5 : 0.42, duration: 25 }, 20)
          .to(reading, { opacity: 1, duration: 25 }, 20)
          .to(centerBase, { strokeDashoffset: 0, duration: 20 }, 25);

        evidence.forEach((node, index) => {
          timeline.to(node, { opacity: 1, y: 0, duration: 14 }, 24 + index * 3);
        });

        timeline
          .to(center, { opacity: isMobile ? 0.95 : 0.9, strokeDashoffset: 0, duration: 6 }, 44)
          .to(usefulMarkers, { stroke: "var(--accent-primary)", duration: 5 }, 45)
          .to(decision, { opacity: isMobile ? 0.58 : 0.56, duration: 12 }, 38)
          .to(detail, { opacity: isMobile ? 0.92 : 1, duration: 12 }, 38)
          .to(secondary, { opacity: isMobile ? 0.78 : 0.45, duration: 12 }, 38)
          .to(finalTrace, { opacity: 0.7, strokeDashoffset: 0, duration: 15 }, 40)
          .to(decisionMarker, { opacity: 1, stroke: "var(--accent-primary)", duration: 10 }, 45)
          .to(decision, { opacity: 1, duration: 22 }, 50)
          .to(secondary, { opacity: isMobile ? 0.78 : 0.72, duration: 20 }, 58)
          .to(reading, { opacity: isMobile ? 0.56 : 0.78, duration: 22 }, 60)
          .to(noise, { opacity: isMobile ? 0.55 : 0.52, duration: 22 }, 70)
          .to(center, { opacity: isMobile ? 0.58 : 0.5, duration: 20 }, 70)
          .to(decisionRule, { scaleX: 1, duration: 28 }, 72);
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="section-01-come-funziona"
      className="segnale-how-it-works"
      ref={sectionRef}
      aria-labelledby="segnale-how-it-works-title"
    >
      <div className="segnale-how-it-works-sticky">
        <div className="segnale-how-it-works-inner">
          <header className="segnale-how-it-works-header">
            <p className="segnale-s01-kicker">PERCHÉ IL MARKETING RESTA INDIETRO</p>
            <h2 id="segnale-how-it-works-title">
              <span>Non ti serve un’altra</span>{" "}
              <span>lista di idee.</span>
            </h2>
            <p className="segnale-s01-intro">
              Ti serve sapere quale azione fare per prima, anche quando tra sala, recensioni e social tutto sembra urgente.
            </p>
          </header>

          <div className="segnale-story">
            <article className="segnale-source" aria-labelledby="segnale-source-title">
              <p className="segnale-s01-label">IL CONTESTO · OSTERIA DA RITA</p>
              <h3 id="segnale-source-title">
                Il martedì sera è <span>un deserto.</span>
              </h3>
              <div className="segnale-context">
                <p className="segnale-context-facts" data-noise>
                  <strong>TRATTORIA</strong>
                  <strong>30 COPERTI</strong>
                </p>
                <p className="segnale-context-place" data-noise>
                  dietro l’università
                </p>
                <div className="segnale-context-noise" data-noise>
                  <p>Instagram fermo da tre mesi.</p>
                  <p>Dieci recensioni aspettano una risposta.</p>
                </div>
              </div>
            </article>

            <article className="segnale-reading" data-reading aria-labelledby="segnale-reading-title">
              <h3 id="segnale-reading-title" className="segnale-s01-label">
                <span className="segnale-reading-label-desktop">
                  I SEGNALI DA LEGGERE
                </span>
                <span className="segnale-reading-label-mobile">LETTURA</span>
              </h3>
              <div className="segnale-evidence-list">
                {usefulEvidence.map(([first, second]) => (
                  <p data-evidence key={first}>
                    <strong>{first}</strong>
                    <span aria-hidden="true">·</span>
                    <strong>{second}</strong>
                  </p>
                ))}
              </div>
            </article>

            <article className="segnale-decision" data-decision aria-labelledby="segnale-decision-title">
              <p className="segnale-s01-label">LA PRIMA AZIONE</p>
              <h3 id="segnale-decision-title">Rimetti in ordine la scheda Google.</h3>
              <p className="segnale-decision-detail" data-decision-detail>
                Aggiorna manualmente foto, orari e menu · 2 ore · obiettivo: farti trovare da chi cerca in zona.
              </p>
              <span className="segnale-decision-rule" data-decision-rule aria-hidden="true" />
              <ul className="segnale-secondary-actions" data-secondary-actions>
                <li>Poi: prepara e pubblica manualmente le risposte alle recensioni.</li>
                <li>Questa settimana: prepara un motivo per venire il martedì.</li>
              </ul>
            </article>

            <EditorialTrace />
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { CreativeTheme } from "../theme";

const steps = [
  {
    number: "01",
    title: "Racconta il tuo locale",
    description:
      "Coperti, zona, giorni vuoti, cosa non riesci a seguire. Parole tue, senza gergo.",
  },
  {
    number: "02",
    title: "Il sistema trova priorità e opportunità",
    description:
      "Le tue frasi vengono lette e annotate: cosa pesa di più, cosa rende prima, cosa può aspettare.",
  },
  {
    number: "03",
    title: "Ricevi un piano ordinato",
    description:
      "Azioni numerate per impatto e tempo richiesto. Da fare, non da studiare.",
  },
] as const;

function StepHeading({ index }: { index: number }) {
  const step = steps[index];
  return (
    <header className="work-step-heading" data-step-heading={index + 1}>
      <span className="work-step-number" aria-hidden="true">
        {step.number}
      </span>
      <div>
        <h3>{step.title}</h3>
        <p>{step.description}</p>
      </div>
    </header>
  );
}

function ConnectorLine() {
  return (
    <svg
      className="work-connector"
      viewBox="0 0 660 720"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        className="work-connector-path work-connector-path--desktop"
        pathLength="1"
        d="M349 118 C367 179 354 234 365 283 C378 345 344 405 361 475 C369 512 358 565 365 610"
      />
      <path
        className="work-connector-path work-connector-path--mobile"
        pathLength="1"
        d="M33 60 L33 525"
      />
      <g className="work-connector-points">
        <circle cx="349" cy="118" r="5" />
        <circle cx="365" cy="283" r="5" />
        <circle cx="365" cy="610" r="5" />
      </g>
      <g className="work-connector-points-mobile">
        <circle cx="33" cy="60" r="5" />
        <circle cx="33" cy="250" r="5" />
        <circle cx="33" cy="525" r="5" />
      </g>
    </svg>
  );
}

// theme: fase preliminare Direzione B — oggi esiste solo "carta"; nella fase B
// la prop selezionerà i path SVG dei mark (tratti puliti vs cerchiature a mano).
export function HowItWorksSheet({ theme = "carta" }: { theme?: CreativeTheme }) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          desktop: "(min-width: 768px)",
          mobile: "(max-width: 767px)",
          motion: "(prefers-reduced-motion: no-preference)",
        },
        (media) => {
        const { mobile, motion } = media.conditions as {
          desktop: boolean;
          mobile: boolean;
          motion: boolean;
        };
        if (!motion) return;
        const connector = section.querySelector<SVGPathElement>(
          mobile ? ".work-connector-path--mobile" : ".work-connector-path--desktop",
        );
        const annotations = gsap.utils.toArray<HTMLElement>(
          section.querySelectorAll("[data-annotation]"),
        );
        const marks = gsap.utils.toArray<SVGPathElement>(
          section.querySelectorAll("[data-mark]"),
        );
        const plan = section.querySelector<HTMLElement>("[data-plan]");
        const stamp = section.querySelector<HTMLElement>("[data-stamp]");
        const headings = gsap.utils.toArray<HTMLElement>(
          section.querySelectorAll("[data-step-heading]"),
        );

        gsap.set([connector, ...marks], {
          attr: { "stroke-dasharray": 1, "stroke-dashoffset": 1 },
        });
        gsap.set(annotations, { opacity: 0, y: 7 });
        gsap.set(plan, { opacity: 0, y: 10 });
        gsap.set(stamp, { opacity: 0, scale: 1.06 });
        gsap.set(headings, { "--step-active": 0 });

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
          .to(headings[0], { "--step-active": 1, duration: 5 }, 0)
          .to(connector, { attr: { "stroke-dashoffset": 0.7 }, duration: 30 }, 0)
          .to(headings[0], { "--step-active": 0, duration: 5 }, 25)
          .to(headings[1], { "--step-active": 1, duration: 8 }, 27)
          .to(connector, { attr: { "stroke-dashoffset": 0.3 }, duration: 38 }, 30);

        annotations.forEach((annotation, index) => {
          timeline.to(
            annotation,
            { opacity: 1, y: 0, duration: 8, ease: "power1.out" },
            34 + index * 7,
          );
        });
        marks.forEach((mark, index) => {
          timeline.to(mark, { attr: { "stroke-dashoffset": 0 }, duration: 9 }, 32 + index * 7);
        });

        timeline
          .to(headings[1], { "--step-active": 0, duration: 5 }, 63)
          .to(headings[2], { "--step-active": 1, duration: 8 }, 65)
          .to(connector, { attr: { "stroke-dashoffset": 0 }, duration: 32 }, 68)
          .to(plan, { opacity: 1, y: 0, duration: 17, ease: "power1.out" }, 70)
          .to(stamp, { opacity: 1, scale: 1, duration: 13, ease: "power1.out" }, 84)
          .to(stamp, { scale: 0.995, duration: 3, ease: "power1.inOut" }, 97)
          .to(stamp, { scale: 1, duration: 3, ease: "power1.out" }, 100);
        },
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="section-01-come-funziona"
      className="how-it-works"
      data-theme={theme}
      ref={sectionRef}
      aria-labelledby="how-it-works-title"
    >
      <div className="how-it-works-sticky">
        <div className="how-it-works-header-layout">
          <header className="how-it-works-header">
            <p className="section-kicker">COME FUNZIONA</p>
            <h2 id="how-it-works-title">Tu racconti il locale. Al piano pensiamo noi.</h2>
            <p className="how-it-works-intro">
              Niente questionari infiniti: cinque minuti di parole tue, e il lavoro passa a noi.
            </p>
          </header>
        </div>

        <article className="work-sheet paper-grain" aria-label="Foglio operativo compilato">
          <div className="work-sheet-rule" aria-hidden="true" />
          <ConnectorLine />

          <section className="work-moment work-moment--one" aria-labelledby="work-step-1">
            <StepHeading index={0} />
            <div className="manager-notes">
              <p className="sheet-label">NOTE DEL GESTORE</p>
              <blockquote id="work-step-1">
                <p>
                  Trattoria, 30 coperti, <span className="annotated-phrase university">dietro l’università</span>.
                </p>
                <p>
                  <span className="annotated-phrase tuesday">Il martedì sera è un deserto</span>.
                </p>
                <p>Instagram fermo da tre mesi.</p>
                <p>
                  Recensioni: tante, ma <span className="annotated-phrase reviews">non rispondo mai</span>.
                </p>
              </blockquote>
              <svg className="annotation-marks" viewBox="0 0 330 162" aria-hidden="true">
                <path data-mark pathLength="1" d="M131 41 C174 31 244 33 278 42 C286 52 274 60 224 61 C176 62 137 58 131 41Z" />
                <path data-mark pathLength="1" d="M16 82 C91 77 202 79 282 83" />
                <path data-mark pathLength="1" d="M154 135 C195 126 282 127 315 137 C309 151 195 153 154 135Z" />
              </svg>
            </div>
          </section>

          <section className="work-moment work-moment--two" aria-labelledby="work-step-2">
            <StepHeading index={1} />
            <h3 id="work-step-2" className="sr-only">
              Annotazioni del sistema
            </h3>
            <div className="system-annotations">
              <span className="system-tag system-tag--audience" data-annotation>
                PUBBLICO VICINO · NON RAGGIUNTO
              </span>
              <span className="system-tag system-tag--day" data-annotation>
                OPPORTUNITÀ · GIORNO DEBOLE
              </span>
              <span className="system-tag system-tag--priority" data-annotation>
                PRIORITÀ 1 · ALTO IMPATTO · 45 MIN
              </span>
              <span className="system-hand-note" data-annotation>
                prima Google, poi Instagram
              </span>
              <svg className="annotation-arrows" viewBox="0 0 660 720" aria-hidden="true">
                <path data-mark pathLength="1" d="M165 225 C107 246 98 279 125 307" />
                <path data-mark pathLength="1" d="M125 307 l-3 -17 M125 307 l-15 -8" />
                <path data-mark pathLength="1" d="M492 323 C537 348 540 381 514 408" />
                <path data-mark pathLength="1" d="M514 408 l4 -16 M514 408 l15 -8" />
              </svg>
            </div>
          </section>

          <section className="work-moment work-moment--three" aria-labelledby="work-step-3">
            <StepHeading index={2} />
            <div className="plan-extract" data-plan>
              <p className="sheet-label">ESTRATTO DEL PIANO</p>
              <ol id="work-step-3">
                <li>Fatti trovare da chi ti passa davanti</li>
                <li>Trasforma le recensioni in prenotazioni</li>
                <li>Riempi il martedì con un motivo per venire</li>
              </ol>
            </div>
            <div className="plan-stamp" data-stamp aria-label="Piano pronto">
              <span>PIANO</span>
              <span>PRONTO</span>
            </div>
          </section>
        </article>
      </div>
    </section>
  );
}

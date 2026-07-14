"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./SegnaleDeliverableReveal.module.css";

const indexEntries = [
  ["I", "Strategia e priorità"],
  ["II", "Calendario operativo"],
  ["III", "Missione del giorno"],
  ["IV", "Idee e bozze operative"],
  ["V", "Recensioni e reputazione"],
  ["VI", "Attività e risultati"],
] as const;

const priorities = [
  ["1", "Scheda Google", "PRIORITÀ 1 · 2 ORE"],
  ["2", "Risposte alle recensioni", "PRIORITÀ 2 · 45 MIN"],
  ["3", "Martedì della casa", "PRIORITÀ 3 · 1 ORA"],
] as const;

const weekExtract = [
  ["LUN", "Scheda Google", "2H"],
  ["MAR", "Menu fisso 18€", "1H"],
  ["MER", "Recensioni", "45’"],
  ["GIO", "Post aperitivo", "30’"],
  ["DOM", "Tre numeri", "15’"],
] as const;

const indicators = [
  "Attività completate",
  "Coperti del martedì",
  "Recensioni nuove",
] as const;

export function SegnaleDeliverableReveal() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const surface = section.querySelector("[data-s03-surface]");
        const prioritiesArea = section.querySelector("[data-s03-priorities]");
        const weekArea = section.querySelector("[data-s03-week]");
        const indicatorsArea = section.querySelector("[data-s03-indicators]");
        const secondary = section.querySelector("[data-s03-secondary]");
        const indexPrimary = gsap.utils.toArray<HTMLElement>(
          section.querySelectorAll("[data-s03-index-primary]"),
        );
        const indexSecondary = gsap.utils.toArray<HTMLElement>(
          section.querySelectorAll("[data-s03-index-secondary]"),
        );
        const closing = section.querySelector("[data-s03-closing]");
        const orientationRule = section.querySelector("[data-s03-orientation-rule]");
        const closingRule = section.querySelector("[data-s03-closing-rule]");

        gsap.set(surface, { scale: 0.98, y: 8, transformOrigin: "50% 50%" });
        gsap.set(prioritiesArea, { opacity: 0.72 });
        gsap.set(weekArea, { opacity: 0.5 });
        gsap.set(indicatorsArea, { opacity: 0.48 });
        gsap.set(secondary, { opacity: 0.44 });
        gsap.set(indexPrimary, { opacity: 0.72 });
        gsap.set(indexSecondary, { opacity: 0.48 });
        gsap.set(closing, { opacity: 0.22, y: 8 });
        gsap.set([orientationRule, closingRule], {
          strokeDasharray: 1,
          strokeDashoffset: 1,
          opacity: 0,
        });

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
          // 0–30 · presenza: il sistema è già riconoscibile e si assesta.
          .to(surface, { scale: 1, y: 0, duration: 30 }, 0)
          // 30–68 · apertura: priorità e settimana acquistano pieno peso.
          .to([prioritiesArea, weekArea, ...indexPrimary], { opacity: 1, duration: 38 }, 30)
          // 58–84 · completamento: indicatori, indice e contenuti quieti.
          .to([indicatorsArea, ...indexSecondary], { opacity: 1, duration: 26 }, 58)
          .to(secondary, { opacity: 0.78, duration: 26 }, 58)
          .to(orientationRule, { strokeDashoffset: 0, opacity: 1, duration: 18 }, 60)
          // 78–100 · consegna: chiusa e regola finale, poi quiete.
          .to(closing, { opacity: 1, y: 0, duration: 22 }, 78)
          .to(closingRule, { strokeDashoffset: 0, opacity: 1, duration: 22 }, 78);
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="section-03-cosa-ricevi"
      className={styles.section}
      ref={sectionRef}
      aria-labelledby="segnale-s03-title"
    >
      <div className={styles.sticky}>
        <div className={styles.inner}>
          <header className={styles.header}>
            <p className={styles.kicker}>DENTRO SEGNALE</p>
            <h2 id="segnale-s03-title">
              Dalla strategia alla prossima azione,
              <br />
              in un unico posto.
            </h2>
            <p className={styles.intro}>
              Segnale conserva le informazioni inserite nel profilo del locale e organizza il lavoro in sei aree collegate.
            </p>
          </header>

          <ul className={styles.inventory} aria-label="Inventario delle aree operative">
            <li><strong>6</strong> aree operative</li>
            <li><strong>7</strong> giorni nell’esempio</li>
            <li><strong>3</strong> risultati da registrare</li>
          </ul>

          <article
            className={styles.surface}
            data-s03-surface
            aria-label="Piano operativo per Osteria da Rita, esempio dimostrativo"
          >
            <header className={styles.surfaceHeader}>
              <p>PIANO OPERATIVO · OSTERIA DA RITA · ESEMPIO DIMOSTRATIVO</p>
              <p>SEGNALE / 01</p>
            </header>

            <div className={styles.surfaceBody}>
              <ol className={styles.index} aria-label="Indice delle sei aree">
                {indexEntries.map(([num, title], index) => (
                  <li
                    key={num}
                    {...([0, 1, 5].includes(index)
                      ? { "data-s03-index-primary": "" }
                      : { "data-s03-index-secondary": "" })}
                  >
                    <span aria-hidden="true">{num}</span>
                    <span>{title}</span>
                  </li>
                ))}
              </ol>

              <div className={styles.editorialContent}>
                <section className={styles.priorities} data-s03-priorities aria-labelledby="s03-priorities-title">
                  <p className={styles.chapterLabel}>01 · STRATEGIA E PRIORITÀ</p>
                  <h3 id="s03-priorities-title">Prima ciò che conta.</h3>
                  <ol>
                    {priorities.map(([number, title, meta]) => (
                      <li key={number}>
                        <strong>{number}</strong>
                        <span>{title}</span>
                        <em>{meta}</em>
                      </li>
                    ))}
                  </ol>
                </section>

                <section className={styles.week} data-s03-week aria-labelledby="s03-week-title">
                  <p className={styles.chapterLabel} id="s03-week-title">02 · CALENDARIO OPERATIVO</p>
                  <ul>
                    {weekExtract.map(([day, action, time]) => (
                      <li key={day}>
                        <strong>{day}</strong>
                        <span>{action}</span>
                        <em>{time}</em>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className={styles.indicators} data-s03-indicators aria-labelledby="s03-indicators-title">
                  <p className={styles.chapterLabel} id="s03-indicators-title">06 · ATTIVITÀ E RISULTATI · RIEPILOGO BASE MANUALE</p>
                  <ul>
                    {indicators.map((indicator) => <li key={indicator}>{indicator}</li>)}
                  </ul>
                </section>

                <div className={styles.secondary} data-s03-secondary aria-label="Estratti delle altre aree">
                  <section aria-labelledby="s03-ideas-title">
                    <p className={styles.chapterLabel} id="s03-ideas-title">03 · MISSIONE DEL GIORNO</p>
                    <p>Rimetti in ordine la scheda Google · 2 ore</p>
                    <p>obiettivo + checklist + completamento manuale</p>
                  </section>
                  <section aria-labelledby="s03-google-title">
                    <p className={styles.chapterLabel} id="s03-google-title">04 · IDEE E BOZZE OPERATIVE</p>
                    <p>«Il martedì della casa: un menu, un prezzo…»</p>
                    <p>testi da rivedere prima di usarli</p>
                  </section>
                  <section aria-labelledby="s03-promos-title">
                    <p className={styles.chapterLabel} id="s03-promos-title">05 · RECENSIONI E REPUTAZIONE</p>
                    <p>Bozza: «Grazie della sincerità: il martedì ora…»</p>
                    <p>rileggi e pubblica manualmente</p>
                  </section>
                </div>
              </div>
            </div>

            <footer className={styles.colophon}>
              SEI AREE · UN PIANO OPERATIVO · UNA PROSSIMA AZIONE
            </footer>
          </article>

          <p className={styles.closing} data-s03-closing>
            Dal profilo del locale
            <br />
            {" "}
            alla missione del giorno:
            <br />
            {" "}
            la prossima azione resta in evidenza.
          </p>

          <svg
            className={styles.rules}
            viewBox="0 0 1440 900"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path data-s03-orientation-rule pathLength="1" d="M372 303 V325" />
            <path data-s03-closing-rule pathLength="1" d="M96 352 H268" />
          </svg>
        </div>
      </div>
    </section>
  );
}

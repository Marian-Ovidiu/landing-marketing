"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DECK_CARTA } from "./deck.config";
import { week, type Priority } from "./week.content";
import type { CreativeTheme } from "../theme";

// destinazioni di posa (x/y): geometria del tavolo, condivisa tra i temi.
// Le rotazioni (di pila e finali) vivono in deck.config.ts: variano per tema.
const DESKTOP_DESTINATIONS = [
  { x: 0.02, y: 0.05 },
  { x: 0.27, y: 0.16 },
  { x: 0.54, y: 0.06 },
  { x: 0.75, y: 0.29 },
  { x: 0.5, y: 0.46 },
  { x: 0.24, y: 0.59 },
  { x: 0.015, y: 0.71 },
];

const MOBILE_DESTINATIONS = [
  { x: 14, y: 42 },
  { x: 42, y: 124 },
  { x: 16, y: 206 },
  { x: 44, y: 288 },
  { x: 15, y: 370 },
  { x: 43, y: 452 },
  { x: 16, y: 534 },
];

const X_EASES = ["power1.inOut", "sine.inOut", "power2.inOut", "sine.in", "power1.inOut", "power2.in", "sine.inOut"];
const Y_EASES = ["power2.out", "sine.out", "power1.out", "power2.out", "sine.out", "power1.out", "power2.out"];

function PriorityStamp({ priority }: { priority: Priority }) {
  return (
    <span className={`deck-priority deck-priority--${priority}`} data-deck-stamp>
      <span>Priorità</span>
      <strong>{priority}</strong>
    </span>
  );
}

// fase preliminare Direzione B: il set attivo è sempre quello della Direzione A;
// la prop theme selezionerà il DeckMotionConfig quando esisterà il set "segnale".
const deckMotion = DECK_CARTA;

export function WeeklyDeck({ theme = "carta" }: { theme?: CreativeTheme }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [pinnedDay, setPinnedDay] = useState<string | null>(null);
  const [previewDay, setPreviewDay] = useState<string | null>(null);
  const [focusedDay, setFocusedDay] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const expandedDay = focusedDay ?? previewDay ?? pinnedDay;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

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
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (media) => {
          const { mobile, reduced } = media.conditions as {
            desktop: boolean;
            mobile: boolean;
            reduced: boolean;
          };
          const runway = section.querySelector<HTMLElement>(".deck-runway")!;
          const table = section.querySelector<HTMLElement>("[data-deck-table]")!;
          const cards = gsap.utils.toArray<HTMLElement>(section.querySelectorAll("[data-deck-card]"));
          const line = section.querySelector<SVGPathElement>(
            mobile ? ".deck-progress-path--mobile" : ".deck-progress-path--desktop",
          )!;
          const label = section.querySelector<HTMLElement>(".deck-count-label")!;
          const footer = section.querySelector<HTMLElement>(".weekly-deck-footer")!;

          const startX = (card: HTMLElement, index: number) =>
            table.clientWidth / 2 - card.offsetWidth / 2 + (index - 3) * (mobile ? 2.5 : 4);
          const startY = (card: HTMLElement, index: number) =>
            table.clientHeight * (mobile ? 0.42 : 0.4) - card.offsetHeight / 2 + index * (mobile ? 3.5 : 4.5);
          const finalX = (card: HTMLElement, index: number) => {
            const raw = mobile ? MOBILE_DESTINATIONS[index].x : table.clientWidth * DESKTOP_DESTINATIONS[index].x;
            return Math.min(table.clientWidth - card.offsetWidth - 10, Math.max(10, raw));
          };
          const finalY = (card: HTMLElement, index: number) => {
            const raw = mobile ? MOBILE_DESTINATIONS[index].y : table.clientHeight * DESKTOP_DESTINATIONS[index].y;
            return Math.min(table.clientHeight - card.offsetHeight - 10, Math.max(10, raw));
          };
          const finalRotation = (index: number) =>
            mobile ? deckMotion.finalRotations.mobile[index] : deckMotion.finalRotations.desktop[index];

          if (reduced) {
            cards.forEach((card, index) => {
              gsap.set(card, {
                x: () => finalX(card, index),
                y: () => finalY(card, index),
                rotation: finalRotation(index),
                opacity: 1,
                zIndex: 10 + index,
                "--deck-shadow": 1,
              });
              gsap.set(card.querySelector("[data-deck-stamp]"), { opacity: 1, scale: 1 });
            });
            gsap.set(line, { attr: { "stroke-dasharray": 1, "stroke-dashoffset": 0 } });
            gsap.set(label, { opacity: 0 });
            gsap.set(footer, { opacity: 1, y: 0 });
            return;
          }

          cards.forEach((card, index) => {
            gsap.set(card, {
              x: () => startX(card, index),
              y: () => startY(card, index),
              rotation: deckMotion.stackRotations[index],
              opacity: 1,
              zIndex: 20 - index,
              "--deck-shadow": 0,
            });
            gsap.set(card.querySelector("[data-deck-stamp]"), { opacity: 0, scale: deckMotion.stampScaleFrom });
          });
          gsap.set(line, { attr: { "stroke-dasharray": 1, "stroke-dashoffset": 1 } });
          gsap.set(footer, { opacity: 0, y: 8 });

          const timeline = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: runway,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.12,
              invalidateOnRefresh: true,
            },
          });

          const topCard = cards[0];
          const breatheLift = mobile ? deckMotion.breathe.lift.mobile : deckMotion.breathe.lift.desktop;
          timeline
            .to(topCard, { y: () => startY(topCard, 0) - breatheLift, rotation: deckMotion.stackRotations[0] + deckMotion.breathe.rotation, duration: 6, ease: "sine.inOut" }, 0)
            .to(topCard, { y: () => startY(topCard, 0), rotation: deckMotion.stackRotations[0], duration: 6, ease: "sine.inOut" }, 6)
            .to(label, { opacity: 0, y: -5, duration: 10, ease: "power1.out" }, 12)
            .to(line, { attr: { "stroke-dashoffset": 0 }, duration: 76 }, 12);

          cards.forEach((card, index) => {
            const start = 12 + index * (76 / 7);
            const duration = index === 6 ? 11 : 12.5;
            const riseDuration = duration * 0.3;
            const stamp = card.querySelector<HTMLElement>("[data-deck-stamp]");
            timeline.set(card, { zIndex: 30 + index }, start);
            timeline.to(card, { x: () => finalX(card, index), duration, ease: X_EASES[index] }, start);
            timeline.to(card, { y: () => startY(card, index) - (mobile ? deckMotion.rise.mobile : deckMotion.rise.desktop), duration: riseDuration, ease: "power2.out" }, start);
            timeline.to(card, { y: () => finalY(card, index), duration: duration - riseDuration, ease: Y_EASES[index] }, start + riseDuration);
            timeline.to(card, { rotation: finalRotation(index), duration, ease: "sine.inOut" }, start);
            timeline.to(card, { "--deck-shadow": 1, duration: 3, ease: "power1.in" }, start + duration * 0.7);
            timeline.to(stamp, { opacity: 1, scale: 1, duration: 2.2, ease: "power1.out" }, start + duration * 0.78);
          });

          timeline.to(footer, { opacity: 1, y: 0, duration: 12, ease: "power1.out" }, 88);
        },
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section id="section-02-esempio-di-piano" className="weekly-deck" data-theme={theme} ref={sectionRef} aria-labelledby="weekly-plan-title">
      <div className="weekly-plan-header-layout">
        <header className="weekly-plan-header">
          <p className="weekly-plan-kicker">ESEMPIO DI PIANO</p>
          <h2 id="weekly-plan-title">Una settimana all’Osteria da Rita.</h2>
          <p className="weekly-plan-context">Trenta coperti dietro l’università. Martedì vuoto, Instagram fermo, recensioni senza risposta — l’hai già vista nel rumore, qui sopra.</p>
          <p className="weekly-plan-disclaimer">ESEMPIO DIMOSTRATIVO · GENERATO SUL PROFILO DEL LOCALE</p>
        </header>
      </div>

      <div className="deck-runway">
        <div className="deck-sticky">
          <div className="deck-table" data-deck-table aria-label="Il mazzo della settimana">
            <p className="deck-count-label">7 AZIONI · 1 SETTIMANA</p>
            <svg className="deck-progress" viewBox="0 0 1180 820" preserveAspectRatio="none" aria-hidden="true">
              <path className="deck-progress-path deck-progress-path--desktop" pathLength="1" d="M160 115 C310 108 350 205 470 226 C610 250 700 110 835 125 C985 143 1015 285 940 345 C850 420 675 390 610 485 C535 596 330 548 270 655 C235 716 165 720 130 748" />
              <path className="deck-progress-path deck-progress-path--mobile" pathLength="1" d="M80 75 C145 105 195 130 115 168 C40 205 76 245 155 270 C220 294 198 335 110 360 C42 385 75 430 155 452 C215 470 195 520 108 540 C48 560 74 612 150 640" />
            </svg>

            <ol className="deck-cards">
              {week.map((item, index) => {
                const expanded = reducedMotion || expandedDay === item.id;
                const dayId = `weekly-day-${item.id}`;
                const actionId = `weekly-action-${item.id}`;
                const detailId = `weekly-detail-${item.id}`;
                const style = { "--deck-tab-x": `${12 + index * 22}px` } as CSSProperties;
                return (
                  <li
                    className={`deck-card-motion weekly-day${expanded ? " deck-card-motion--expanded" : ""}`}
                    data-deck-card
                    key={item.id}
                    style={style}
                  >
                    <h3 className="deck-day-tab" id={dayId} aria-label={item.day}>
                      <strong>{item.shortDay}</strong>
                      <span>{item.day}</span>
                    </h3>
                    <button
                      type="button"
                      className="deck-card weekly-card"
                      aria-expanded={expanded}
                      aria-controls={detailId}
                      aria-labelledby={`${dayId} ${actionId}`}
                      onClick={() => setPinnedDay((current) => (current === item.id ? null : item.id))}
                      onMouseEnter={() => setPreviewDay(item.id)}
                      onMouseLeave={() => setPreviewDay(null)}
                      onFocus={() => setFocusedDay(item.id)}
                      onBlur={() => setFocusedDay(null)}
                    >
                      <PriorityStamp priority={item.priority} />
                      <span className="deck-action-label">Azione</span>
                      <span className="deck-action" id={actionId}>{item.action}</span>
                      <span className="deck-meta">
                        <span><strong>Tempo</strong>{item.time}</span>
                        <span><strong>Canale</strong>{item.channel}</span>
                      </span>
                      <span className="weekly-detail deck-detail" id={detailId}>
                        <span><strong>Obiettivo</strong>{item.objective}</span>
                        <span><strong>Indicatore</strong>{item.indicator}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
          <footer className="weekly-deck-footer">
            <p className="weekly-plan-legend"><strong>Ogni azione indica:</strong> tempo richiesto · canale · obiettivo · indicatore da controllare.</p>
            <p className="weekly-plan-closing">Nessuna teoria: una lista di cose da fare, nell’ordine in cui rendono.</p>
          </footer>
        </div>
      </div>
    </section>
  );
}

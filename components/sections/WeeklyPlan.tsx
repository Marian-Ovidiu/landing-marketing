"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type Priority = 1 | 2 | 3;

interface PlanDay {
  id: string;
  day: string;
  priority: Priority;
  action: string;
  time: string;
  channel: string;
  objective: string;
  indicator: string;
}

const week: PlanDay[] = [
  {
    id: "lunedi",
    day: "Lunedì",
    priority: 1,
    action: "Rimetti in ordine la scheda Google",
    time: "2 ore",
    channel: "Google Business",
    objective: "farsi trovare da chi cerca “dove mangiare” in zona",
    indicator: "visualizzazioni della scheda a fine mese",
  },
  {
    id: "martedi",
    day: "Martedì",
    priority: 2,
    action: "Lancia “Il martedì della casa”: menu fisso a 18€",
    time: "1 ora per impostarlo",
    channel: "sala + cartello in vetrina",
    objective: "dare un motivo per venire nel giorno vuoto",
    indicator: "coperti del martedì, settimana su settimana",
  },
  {
    id: "mercoledi",
    day: "Mercoledì",
    priority: 1,
    action: "Rispondi alle ultime dieci recensioni",
    time: "45 minuti",
    channel: "Google",
    objective: "mostrare che qui qualcuno ascolta",
    indicator: "recensioni con risposta / totale",
  },
  {
    id: "giovedi",
    day: "Giovedì",
    priority: 2,
    action: "Pubblica l’aperitivo del giovedì",
    time: "30 minuti",
    channel: "Instagram",
    objective: "riempire la fascia 18–20 con chi esce dall’università",
    indicator: "prenotazioni del giovedì sera",
  },
  {
    id: "venerdi",
    day: "Venerdì",
    priority: 1,
    action: "Metti sui tavoli il bigliettino “Com’è andata?” con QR",
    time: "20 minuti di preparazione",
    channel: "sala",
    objective: "trasformare i clienti contenti in recensioni",
    indicator: "recensioni nuove a settimana",
  },
  {
    id: "sabato",
    day: "Sabato",
    priority: 3,
    action: "Dieci foto vere durante il servizio (dehors, piatti, sala piena)",
    time: "30 minuti",
    channel: "archivio contenuti",
    objective: "avere materiale tuo per le prossime tre settimane di post",
    indicator: "—",
  },
  {
    id: "domenica",
    day: "Domenica",
    priority: 1,
    action: "Guarda i tre numeri della settimana",
    time: "15 minuti",
    channel: "—",
    objective: "capire cosa ha funzionato prima di rifare il giro",
    indicator: "scheda Google · coperti del martedì · recensioni nuove",
  },
];

function PriorityStamp({ priority }: { priority: Priority }) {
  return (
    <span className={`weekly-priority weekly-priority--${priority}`} data-priority-stamp>
      <span>Priorità</span>
      <strong>{priority}</strong>
    </span>
  );
}

export function WeeklyPlan() {
  const sectionRef = useRef<HTMLElement>(null);
  const [pinnedDay, setPinnedDay] = useState<string | null>(null);
  const [previewDay, setPreviewDay] = useState<string | null>(null);
  const [focusedDay, setFocusedDay] = useState<string | null>(null);
  const expandedDay = focusedDay ?? previewDay ?? pinnedDay;

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          desktop: "(min-width: 1024px)",
          agenda: "(max-width: 1023px)",
          motion: "(prefers-reduced-motion: no-preference)",
        },
        (media) => {
          const { desktop, motion } = media.conditions as {
            desktop: boolean;
            agenda: boolean;
            motion: boolean;
          };
          if (!motion) return;

          const cards = gsap.utils.toArray<HTMLElement>(
            section.querySelectorAll("[data-weekly-card]"),
          );

          if (desktop) {
            const rotations = [-0.34, 0.22, -0.16, 0.38, -0.28, 0.14, -0.2];
            const timeline = gsap.timeline({
              paused: true,
              defaults: { ease: "power2.out" },
            });

            cards.forEach((card, index) => {
              const stamp = card.querySelector<HTMLElement>("[data-priority-stamp]");
              const start = index * 0.06;
              timeline.fromTo(
                card,
                { opacity: 0, y: 14, rotation: rotations[index] * -0.5 },
                { opacity: 1, y: 0, rotation: rotations[index], duration: 0.42 },
                start,
              );
              timeline.fromTo(
                stamp,
                { opacity: 0, scale: 1.12 },
                { opacity: 1, scale: 1, duration: 0.16, ease: "power1.out" },
                start + 0.32,
              );
            });

            ScrollTrigger.create({
              trigger: section.querySelector(".weekly-planner"),
              start: "top 82%",
              once: true,
              onEnter: () => timeline.play(),
            });
            return;
          }

          cards.forEach((card) => {
            const stamp = card.querySelector<HTMLElement>("[data-priority-stamp]");
            const timeline = gsap.timeline({
              paused: true,
              defaults: { ease: "power2.out" },
            });
            timeline
              .fromTo(card, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.34 })
              .fromTo(
                stamp,
                { opacity: 0, scale: 1.08 },
                { opacity: 1, scale: 1, duration: 0.15, ease: "power1.out" },
                0.24,
              );
            ScrollTrigger.create({
              trigger: card,
              start: "top 88%",
              once: true,
              onEnter: () => timeline.play(),
            });
          });
        },
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="section-02-esempio-di-piano"
      className="weekly-plan"
      ref={sectionRef}
      aria-labelledby="weekly-plan-title"
    >
      <div className="weekly-plan-header-layout">
        <header className="weekly-plan-header">
          <p className="weekly-plan-kicker">ESEMPIO DI PIANO</p>
          <h2 id="weekly-plan-title">Una settimana all’Osteria da Rita.</h2>
          <p className="weekly-plan-context">
            Trenta coperti dietro l’università. Martedì vuoto, Instagram fermo,
            recensioni senza risposta — l’hai già vista nel rumore, qui sopra.
          </p>
          <p className="weekly-plan-disclaimer">
            ESEMPIO DIMOSTRATIVO · GENERATO SUL PROFILO DEL LOCALE
          </p>
        </header>
      </div>

      <div className="weekly-planner paper-grain" aria-label="Planner operativo settimanale">
        <ol className="weekly-grid">
          {week.map((item) => {
            const expanded = expandedDay === item.id;
            const dayTitleId = `weekly-day-${item.id}`;
            const actionTitleId = `weekly-action-${item.id}`;
            const detailId = `weekly-detail-${item.id}`;

            return (
              <li className="weekly-day" key={item.id}>
                <h3 className="weekly-day-name" id={dayTitleId}>
                  {item.day}
                </h3>
                <div className="weekly-card-motion" data-weekly-card>
                  <button
                    className="weekly-card"
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={detailId}
                    aria-labelledby={`${dayTitleId} ${actionTitleId}`}
                    onClick={() => setPinnedDay((current) => (current === item.id ? null : item.id))}
                    onMouseEnter={() => setPreviewDay(item.id)}
                    onMouseLeave={() => setPreviewDay(null)}
                    onFocus={() => setFocusedDay(item.id)}
                    onBlur={() => setFocusedDay(null)}
                  >
                    <PriorityStamp priority={item.priority} />
                    <span className="weekly-action-label">Azione</span>
                    <span className="weekly-action" id={actionTitleId}>
                      {item.action}
                    </span>
                    <dl className="weekly-meta">
                      <div>
                        <dt>Tempo</dt>
                        <dd>{item.time}</dd>
                      </div>
                      <div>
                        <dt>Canale</dt>
                        <dd>{item.channel}</dd>
                      </div>
                    </dl>
                    <span className="weekly-detail" id={detailId}>
                      <span>
                        <strong>Obiettivo</strong>
                        {item.objective}
                      </span>
                      <span>
                        <strong>Indicatore</strong>
                        {item.indicator}
                      </span>
                    </span>
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <footer className="weekly-plan-footer">
        <p className="weekly-plan-legend">
          <strong>Ogni azione indica:</strong>{" "}
          tempo richiesto · canale · obiettivo · indicatore da controllare.
        </p>
        <p className="weekly-plan-closing">
          Nessuna teoria: una lista di cose da fare, nell’ordine in cui rendono.
        </p>
      </footer>
    </section>
  );
}

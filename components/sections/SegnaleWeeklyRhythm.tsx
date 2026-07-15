"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { week } from "./week.content";

// S02 Segnale — «Operational Rhythm» (art direction approvata in
// outputs/segnale-s02-art-direction.md). La settimana è una cadenza: una
// banda hairline a sette intervalli, tre masse tipografiche (preparazione /
// attivazione / verifica) e quattro giorni di mantenimento quieti.
// La fonte condivisa resta week.content.ts; le stringhe qui sotto sono la
// mappatura editoriale specifica di Segnale e non cambiano la Direzione A.

const guillemets = (value: string) => value.replaceAll("“", "«").replaceAll("”", "»");

const byId = (id: string) => week.find((item) => item.id === id)!;
const lun = byId("lunedi");

const [marLineOne, marLineTwo] = ["Prepara «Il martedì della casa»:", "menu fisso a 18€."];
const [domLineOne, domLineTwo] = ["Registra i tre numeri", "della settimana."];

// giorni di mantenimento: MER GIO VEN SAB (ordine reale della settimana)
const quietDays = [
  {
    ...byId("mercoledi"),
    wide: "10 RISPOSTE · 45 MIN",
    narrow: "45 MIN",
    mobileAction: "prepara e pubblica 10 risposte",
    mobileTime: "45 min",
    accessible:
      "Mercoledì: prepara, rileggi e pubblica manualmente dieci risposte alle recensioni. Durata 45 minuti. Obiettivo: rispondere con continuità. Risultato da registrare manualmente: recensioni a cui hai risposto.",
  },
  {
    ...byId("giovedi"),
    wide: "APERITIVO · 30 MIN",
    narrow: "30 MIN",
    mobileAction: "pubblica l’aperitivo",
    mobileTime: "30 min",
    accessible:
      "Giovedì: pubblica manualmente l’aperitivo su Instagram. Durata 30 minuti. Obiettivo: mostrare la proposta nella fascia 18–20. Risultato da registrare manualmente: richieste riferite all’iniziativa.",
  },
  {
    ...byId("venerdi"),
    wide: "QR RECENSIONI · 20 MIN",
    narrow: "20 MIN",
    mobileAction: "bigliettino recensioni con QR",
    mobileTime: "20 min",
    accessible:
      "Venerdì: prepara e metti sui tavoli il bigliettino per le recensioni con codice QR. Durata 20 minuti. Obiettivo: facilitare una recensione dopo il servizio. Risultato da registrare manualmente: recensioni nuove.",
  },
  {
    ...byId("sabato"),
    wide: "10 FOTO · 30 MIN",
    narrow: "30 MIN",
    mobileAction: "scatta 10 foto durante il servizio",
    mobileTime: "30 min",
    accessible:
      "Sabato: scatta manualmente dieci foto durante il servizio. Durata 30 minuti. Obiettivo: creare materiale per le attività di contenuto. Risultato da osservare: dieci foto utilizzabili.",
  },
];

const DAYS = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"] as const;

const MOBILE_SCENE_SHIFT = {
  initial: 10,
  preview: 6,
  settled: 0,
} as const;

// Un solo SVG strutturale: banda, tick, accenti e marker (aria-hidden).
// Gruppo desktop (viewBox 1248×590, banda y260, gradino y278 da x1070) e
// gruppo mobile (tre frammenti autonomi). Nessun testo.
function RhythmBand() {
  return (
    <svg
      className="segnale-s02-band"
      viewBox="0 0 1248 590"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g className="segnale-s02-band-desktop">
        <path data-band-base pathLength="1" d="M0 260 H1070 V278 H1248" />
        <path className="segnale-s02-tick" d="M178.3 257 V263 M356.6 257 V263 M534.9 257 V263 M713.1 257 V263 M891.4 257 V263" />
        <path className="segnale-s02-accent" data-accent-lun pathLength="1" d="M0 260 H84" />
        <path className="segnale-s02-accent" data-accent-mar pathLength="1" d="M178.3 260 H262" />
        <path className="segnale-s02-accent" data-accent-dom pathLength="1" d="M1070 278 H1154" />
        <circle data-marker-lun cx="8" cy="260" r="4" />
        <circle data-marker-mar cx="186" cy="260" r="4" />
        <circle data-marker-dom cx="1078" cy="278" r="4" />
      </g>

      {/* Coordinate mobile espresse nelle unità del viewBox condiviso
          (1248×590) e rese in un box da 350×548: x×3.5657, y×1.0766.
          I marker sono ellissi pre-compensate per restare cerchi da 4px. */}
      <g className="segnale-s02-band-mobile">
        <g data-timeline-lun>
          <path data-band-base pathLength="1" d="M0 24.8 H684.6" />
          <path className="segnale-s02-accent" data-accent-lun pathLength="1" d="M0 24.8 H170" />
          <ellipse data-marker-lun cx="21.4" cy="24.8" rx="14.3" ry="4.3" />
        </g>
        <g data-timeline-mar>
          <path data-band-base pathLength="1" d="M0 206.7 H755.9" />
          <path className="segnale-s02-accent" data-accent-mar pathLength="1" d="M0 206.7 H300" />
          <ellipse data-marker-mar cx="21.4" cy="206.7" rx="14.3" ry="4.3" />
        </g>
        <g data-timeline-dom>
          <path data-band-base pathLength="1" d="M0 464 H527.7" />
          <path className="segnale-s02-accent" data-accent-dom pathLength="1" d="M0 464 H420" />
          <ellipse data-marker-dom cx="21.4" cy="464" rx="14.3" ry="4.3" />
        </g>
      </g>
    </svg>
  );
}

export function SegnaleWeeklyRhythm() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const isMobile = window.matchMedia("(max-width: 767px)").matches;
        const sceneContrast = (anchor: number, primary: number, secondary: number) => ({
          "--s02-anchor-opacity": anchor,
          "--s02-primary-opacity": primary,
          "--s02-secondary-opacity": secondary,
        });
        const all = <T extends Element>(selector: string) =>
          gsap.utils.toArray<T>(section.querySelectorAll(selector));
        const mobileBand = section.querySelector<SVGSVGElement>(".segnale-s02-band");
        const bands = all<SVGPathElement>("[data-band-base]");
        const accents = {
          lun: all<SVGPathElement>("[data-accent-lun]"),
          mar: all<SVGPathElement>("[data-accent-mar]"),
          dom: all<SVGPathElement>("[data-accent-dom]"),
        };
        const markers = {
          lun: all<SVGCircleElement>("[data-marker-lun]"),
          mar: all<SVGCircleElement>("[data-marker-mar]"),
          dom: all<SVGCircleElement>("[data-marker-dom]"),
        };
        const mobileMarkers = {
          lun: all<SVGEllipseElement>(".segnale-s02-band-mobile [data-marker-lun]"),
          mar: all<SVGEllipseElement>(".segnale-s02-band-mobile [data-marker-mar]"),
          dom: all<SVGEllipseElement>(".segnale-s02-band-mobile [data-marker-dom]"),
        };
        const massLun = section.querySelector("[data-mass-lun]");
        const massMar = section.querySelector("[data-mass-mar]");
        const massDom = section.querySelector("[data-mass-dom]");
        const mobileSceneContent = (mass: Element | null) =>
          mass
            ? Array.from(
                mass.querySelectorAll<HTMLElement>(
                  ".segnale-s02-status, h3, .segnale-s02-result, .segnale-s02-meta, .segnale-s02-outcome",
                ),
              )
            : [];
        const mobileContent = {
          lun: isMobile ? mobileSceneContent(massLun) : [],
          mar: isMobile ? mobileSceneContent(massMar) : [],
          dom: isMobile ? mobileSceneContent(massDom) : [],
        };
        const mobileTimeline = {
          lun: isMobile ? all<SVGGElement>("[data-timeline-lun]") : [],
          mar: isMobile ? all<SVGGElement>("[data-timeline-mar]") : [],
          dom: isMobile ? all<SVGGElement>("[data-timeline-dom]") : [],
        };
        const mobileTimelineY = (cssPixels: number) => {
          const renderedHeight = mobileBand?.getBoundingClientRect().height ?? 0;
          const viewBoxHeight = mobileBand?.viewBox.baseVal.height ?? 0;
          return renderedHeight > 0 && viewBoxHeight > 0
            ? (cssPixels * viewBoxHeight) / renderedHeight
            : cssPixels;
        };
        const quiet = all<HTMLElement>("[data-quiet]");
        const dayStrong = {
          lun: all<HTMLElement>("[data-day-lun]"),
          mar: all<HTMLElement>("[data-day-mar]"),
          dom: all<HTMLElement>("[data-day-dom]"),
        };
        const closing = section.querySelector("[data-closing]");

        // Stato «settimana aperta»: nessun teal, banda non ancora disegnata,
        // masse presenti come ombre a dimensione piena (grammatica S01).
        gsap.set(bands, { strokeDasharray: 1, strokeDashoffset: 1 });
        gsap.set([...accents.lun, ...accents.mar, ...accents.dom], {
          strokeDasharray: 1,
          strokeDashoffset: 1,
        });
        gsap.set([...markers.lun, ...markers.mar, ...markers.dom], {
          stroke: "var(--s02-line)",
        });
        gsap.set([...mobileMarkers.lun, ...mobileMarkers.mar, ...mobileMarkers.dom], {
          fill: isMobile ? "var(--text-secondary)" : "var(--s02-line)",
        });
        if (isMobile) {
          gsap.set(massLun, {
            opacity: 1,
            ...sceneContrast(0.78, 0.52, 0.42),
          });
          gsap.set([massMar, massDom], {
            opacity: 1,
            ...sceneContrast(0.62, 0.36, 0.28),
          });
          gsap.set([...mobileContent.lun, ...mobileContent.mar, ...mobileContent.dom], {
            y: MOBILE_SCENE_SHIFT.initial,
          });
          gsap.set([...mobileTimeline.lun, ...mobileTimeline.mar, ...mobileTimeline.dom], {
            y: mobileTimelineY(MOBILE_SCENE_SHIFT.initial),
          });
        } else {
          gsap.set([massLun, massMar], { opacity: 0.3, y: 10 });
          gsap.set(massDom, { opacity: 0.3, y: 10 });
        }
        gsap.set(quiet, { opacity: isMobile ? 0.62 : 0.6 });
        gsap.set([...dayStrong.lun, ...dayStrong.mar, ...dayStrong.dom], { opacity: 0.62 });
        gsap.set(closing, { opacity: 0.12, y: 8 });

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
          // 0–15 · settimana aperta: la banda hairline si completa
          .to(bands, { strokeDashoffset: 0, duration: 15 }, 0)
          // 15–35 · preparazione: LUN si forma, poi il marker guadagna teal
          .to(
            massLun,
            isMobile
              ? { ...sceneContrast(1, 1, 1), duration: 20 }
              : { opacity: 1, y: 0, duration: 20 },
            15,
          )
          .to(accents.lun, { strokeDashoffset: 0, duration: 12 }, 20)
          .to(dayStrong.lun, { opacity: 1, duration: 10 }, 20)
          .to(markers.lun, { stroke: "var(--accent-primary)", duration: 3 }, 32)
          .to(mobileMarkers.lun, { fill: "var(--accent-primary)", duration: 3 }, 32)
          // 35–60 · attivazione: MAR si forma, i giorni quieti arretrano
          .to(
            massMar,
            isMobile
              ? { ...sceneContrast(1, 1, 1), duration: 25 }
              : { opacity: 1, y: 0, duration: 25 },
            35,
          )
          .to(accents.mar, { strokeDashoffset: 0, duration: 14 }, 40)
          .to(dayStrong.mar, { opacity: 1, duration: 10 }, 40)
          .to(quiet, { opacity: isMobile ? 0.5 : 0.42, duration: 25 }, 35)
          .to(
            massDom,
            isMobile
              ? { ...sceneContrast(0.66, 0.38, 0.3), duration: 22 }
              : { opacity: 0.45, y: 6, duration: 22 },
            36,
          )
          .to(markers.mar, { stroke: "var(--accent-primary)", duration: 3 }, 57)
          .to(mobileMarkers.mar, { fill: "var(--accent-primary)", duration: 3 }, 57)
          // 60–80 · verifica: DOM completa il gradino
          .to(
            massDom,
            isMobile
              ? { ...sceneContrast(1, 1, 1), duration: 20 }
              : { opacity: 1, y: 0, duration: 20 },
            60,
          )
          .to(accents.dom, { strokeDashoffset: 0, duration: 12 }, 64)
          .to(dayStrong.dom, { opacity: 1, duration: 10 }, 64)
          .to(markers.dom, { stroke: "var(--accent-primary)", duration: 3 }, 77)
          .to(mobileMarkers.dom, { fill: "var(--accent-primary)", duration: 3 }, 77)
          // 80–100 · piano eseguibile: i quieti risalgono, la chiusa si compie
          .to(quiet, { opacity: isMobile ? 0.6 : 0.58, duration: 15 }, 82)
          .to(closing, { opacity: 1, y: 0, duration: 16 }, 82);

        if (isMobile) {
          const shiftScene = (
            content: HTMLElement[],
            timelineGroup: SVGGElement[],
            y: number,
            duration: number,
            position: number,
          ) => {
            timeline
              .to(content, { y, duration }, position)
              .to(timelineGroup, { y: () => mobileTimelineY(y), duration }, position);
          };

          shiftScene(
            mobileContent.lun,
            mobileTimeline.lun,
            MOBILE_SCENE_SHIFT.settled,
            20,
            15,
          );
          shiftScene(
            mobileContent.mar,
            mobileTimeline.mar,
            MOBILE_SCENE_SHIFT.settled,
            25,
            35,
          );
          shiftScene(
            mobileContent.dom,
            mobileTimeline.dom,
            MOBILE_SCENE_SHIFT.preview,
            22,
            36,
          );
          shiftScene(
            mobileContent.dom,
            mobileTimeline.dom,
            MOBILE_SCENE_SHIFT.settled,
            20,
            60,
          );

          timeline
            .to(massLun, { ...sceneContrast(0.76, 0.54, 0.44), duration: 25 }, 35)
            .to(massLun, { ...sceneContrast(0.62, 0.46, 0.36), duration: 20 }, 60)
            .to(massMar, { ...sceneContrast(0.76, 0.54, 0.44), duration: 20 }, 60);
        }
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="section-02-esempio-di-piano"
      className="segnale-weekly-rhythm"
      ref={sectionRef}
      aria-labelledby="segnale-s02-title"
    >
      <div className="segnale-weekly-rhythm-sticky">
        <div className="segnale-weekly-rhythm-inner">
          <header className="segnale-s02-header">
            <p className="segnale-s02-kicker">COME FUNZIONA · ESEMPIO OSTERIA DA RITA</p>
            <h2 id="segnale-s02-title">Racconti il locale. Segnale organizza la settimana.</h2>
            <p className="segnale-s02-intro">
              Dal profilo alle missioni. Completi le attività e registri a mano pochi risultati nel riepilogo base.
            </p>
            <p className="segnale-s02-disclaimer">
              PROFILO → STRATEGIA → PIANO → MISSIONI → RISULTATI
            </p>
          </header>

          <div className="segnale-s02-field">
            <article className="segnale-s02-mass segnale-s02-mass--lun" data-mass-lun data-scene-kind="mission" aria-labelledby="segnale-s02-lun">
              <p className="segnale-s02-label">LUNEDÌ · PREPARAZIONE</p>
              <p className="segnale-s02-status" data-operational-status="da-preparare">DA PREPARARE</p>
              <h3 id="segnale-s02-lun" data-mission>{guillemets(lun.action)}.</h3>
              <p className="segnale-s02-result" data-objective>Obiettivo: farti trovare da chi cerca «dove mangiare» in zona.</p>
              <p className="segnale-s02-meta" data-meta-level="1">
                <span className="segnale-s02-meta-wide">2 ORE · SCHEDA GOOGLE · AGGIORNAMENTO MANUALE</span>
                <span className="segnale-s02-meta-mobile">2 ORE · SCHEDA GOOGLE</span>
              </p>
              <p className="segnale-s02-outcome" data-meta-level="2" data-outcome>
                <span className="segnale-s02-outcome-label">DA OSSERVARE</span>
                <span className="segnale-s02-outcome-value">Visualizzazioni scheda</span>
              </p>
            </article>

            <article className="segnale-s02-mass segnale-s02-mass--mar" data-mass-mar data-scene-kind="mission" aria-labelledby="segnale-s02-mar">
              <p className="segnale-s02-label">MARTEDÌ SERA · ATTIVAZIONE NEL GIORNO VUOTO</p>
              <p className="segnale-s02-status" data-operational-status="in-programma">IN PROGRAMMA</p>
              <h3 id="segnale-s02-mar" data-mission>
                <span>{marLineOne}</span> <span>{marLineTwo}</span>
              </h3>
              <p className="segnale-s02-result" data-objective>Obiettivo: dare un motivo per venire nel giorno che oggi resta vuoto.</p>
              <p className="segnale-s02-meta" data-meta-level="1">
                <span className="segnale-s02-meta-wide">1 ORA · SALA + CARTELLO IN VETRINA · OSSERVA I COPERTI</span>
                <span className="segnale-s02-meta-mobile">1 ORA · SALA + VETRINA</span>
              </p>
              <p className="segnale-s02-outcome" data-meta-level="2" data-outcome>
                <span className="segnale-s02-outcome-label">DA OSSERVARE</span>
                <span className="segnale-s02-outcome-value">Coperti del martedì</span>
              </p>
            </article>

            <ul className="segnale-s02-quiet-list" aria-label="Giorni di mantenimento">
              {quietDays.map((item) => (
                <li key={item.id} data-quiet data-meta-level="3" aria-label={item.accessible}>
                  <span className="segnale-s02-quiet-wide">{item.wide}</span>
                  <span className="segnale-s02-quiet-narrow">{item.narrow}</span>
                  <span className="segnale-s02-quiet-mobile">
                    <span className="segnale-s02-quiet-day">{item.shortDay}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="segnale-s02-quiet-action">{item.mobileAction}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="segnale-s02-quiet-time">{item.mobileTime}</span>
                  </span>
                </li>
              ))}
            </ul>

            <article className="segnale-s02-mass segnale-s02-mass--dom" data-mass-dom data-scene-kind="verification" aria-labelledby="segnale-s02-dom">
              <p className="segnale-s02-label">DOMENICA · VERIFICA</p>
              <p className="segnale-s02-status" data-operational-status="da-verificare">DA VERIFICARE</p>
              <h3 id="segnale-s02-dom" data-mission>
                <span>{domLineOne}</span> <span>{domLineTwo}</span>
              </h3>
              <p className="segnale-s02-result" data-objective>I risultati restano nel riepilogo per le verifiche successive.</p>
              <p className="segnale-s02-meta" data-meta-level="1">
                <span className="segnale-s02-meta-wide">15 MINUTI · INSERIMENTO MANUALE · RIEPILOGO BASE</span>
                <span className="segnale-s02-meta-mobile">15 MIN · RIEPILOGO BASE</span>
              </p>
              <p className="segnale-s02-outcome" data-meta-level="2" data-outcome>
                <span className="segnale-s02-outcome-label">DA REGISTRARE</span>
                <span className="segnale-s02-outcome-value">Scheda Google · coperti · recensioni nuove</span>
              </p>
            </article>

            <p className="segnale-s02-days" aria-hidden="true">
              {DAYS.map((day, index) => {
                const strong =
                  index === 0 ? { "data-day-lun": "" } : index === 1 ? { "data-day-mar": "" } : index === 6 ? { "data-day-dom": "" } : { "data-quiet": "" };
                return (
                  <span key={day} className={`segnale-s02-day segnale-s02-day--${index}`} {...strong}>
                    {day}
                  </span>
                );
              })}
            </p>

            <RhythmBand />
          </div>

          <footer className="segnale-s02-closing" data-closing>
            <p className="segnale-s02-total">Cinque ore e venti in tutta la settimana, nell’esempio.</p>
            <p className="segnale-s02-total-detail">
              Lun prepari · mar attivi · dom registri a mano.
            </p>
          </footer>
        </div>
      </div>
    </section>
  );
}

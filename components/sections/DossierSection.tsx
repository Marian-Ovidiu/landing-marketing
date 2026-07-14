"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

type Tone = "terracotta" | "brass" | "olive" | "ink";

interface DossierEntry {
  num: string;
  short: string;
  title: string;
  desc: string;
  tone: Tone;
}

// Copy integrale da outputs/page-copy.md §4 (indice + anteprime).
const ENTRIES: DossierEntry[] = [
  { num: "I", short: "PRI", title: "Priorità ordinate", desc: "Le cose da fare, in ordine di resa: impatto alto e tempo basso prima di tutto.", tone: "terracotta" },
  { num: "II", short: "CAL", title: "Calendario operativo", desc: "La settimana già distribuita: ogni azione ha il suo giorno e il suo tempo.", tone: "brass" },
  { num: "III", short: "IDEE", title: "Idee contenuto", desc: "Post pensati sul tuo locale, non ricette da copiare.", tone: "olive" },
  { num: "IV", short: "GOO", title: "Azioni Google e recensioni", desc: "La parte che rende di più e che nessuno ha voglia di fare. Preparata, basta eseguire.", tone: "ink" },
  { num: "V", short: "PROMO", title: "Promozioni mirate", desc: "Poche, con un perché: pensate sui tuoi giorni deboli e sul tuo pubblico.", tone: "terracotta" },
  { num: "VI", short: "IND", title: "Indicatori da controllare", desc: "Tre numeri a settimana, quindici minuti: abbastanza per capire se funziona.", tone: "brass" },
];

// Anteprime: contenuto reale in miniatura, impaginato — mai descrizioni astratte.
function PagePreview({ index }: { index: number }) {
  switch (index) {
    case 0:
      return (
        <ol className="page-priorities">
          <li><strong>1</strong><span>Scheda Google</span><em>alto impatto · 2 ore</em></li>
          <li><strong>2</strong><span>Risposte alle recensioni</span><em>alto impatto · 45 min</em></li>
          <li><strong>3</strong><span>Martedì della casa</span><em>impatto medio · 1 ora</em></li>
        </ol>
      );
    case 1:
      return (
        <ul className="page-calendar">
          <li><strong>LUN</strong><span>Scheda Google</span><em>2h</em></li>
          <li><strong>MER</strong><span>Risposte recensioni</span><em>45’</em></li>
          <li><strong>GIO</strong><span>Post aperitivo</span><em>30’</em></li>
        </ul>
      );
    case 2:
      return (
        <ul className="page-ideas">
          <li>
            <span className="page-idea-title">«Il martedì della casa: un menu, un prezzo, zero pensieri.»</span>
            <span className="page-idea-note">fisso in bacheca, poi ogni martedì</span>
          </li>
          <li>
            <span className="page-idea-title">«Chi cucina stasera: dietro il bancone con —»</span>
            <span className="page-idea-note">format ricorrente, uno al mese</span>
          </li>
        </ul>
      );
    case 3:
      return (
        <div className="page-google">
          <p className="page-draft-label">Bozza di risposta · recensione 3 stelle</p>
          <blockquote className="page-draft">«Grazie della sincerità: il martedì ora…»</blockquote>
          <ul className="page-checklist">
            <li><strong>orari</strong><em>✓</em></li>
            <li><strong>foto</strong><em>✓</em></li>
            <li><strong>menu</strong><em>da aggiornare</em></li>
          </ul>
        </div>
      );
    case 4:
      return (
        <ul className="page-promos">
          <li>
            <span className="page-promo-name">Martedì della casa</span>
            <span className="page-promo-meta"><strong>menu fisso 18€</strong><em>obiettivo: +10 coperti</em></span>
          </li>
          <li>
            <span className="page-promo-name">Merenda da Rita (16–18)</span>
            <span className="page-promo-meta"><strong>—</strong><em>per lo studio pomeridiano</em></span>
          </li>
        </ul>
      );
    default:
      return (
        <ul className="page-metrics">
          <li><span>Visualizzazioni scheda Google</span><strong>↑ atteso</strong><em>in 4 settimane</em></li>
          <li><span>Coperti del martedì</span><strong>confronto</strong><em>su 4 martedì</em></li>
          <li><span>Recensioni nuove / settimana</span><strong>obiettivo: 2+</strong><em>ogni domenica</em></li>
        </ul>
      );
  }
}

function DossierPageBody({ index }: { index: number }) {
  const entry = ENTRIES[index];
  return (
    <div className="dossier-page-content">
      <p className="page-head">Fascicolo · sezione {entry.num} — {entry.title}</p>
      <PagePreview index={index} />
      <p className="page-foot">Osteria da Rita · esempio dimostrativo</p>
    </div>
  );
}

function groupKeyNav(e: KeyboardEvent, idx: number, refs: Array<HTMLButtonElement | null>) {
  let target: number | null = null;
  if (e.key === "ArrowUp" || e.key === "ArrowLeft") target = Math.max(0, idx - 1);
  else if (e.key === "ArrowDown" || e.key === "ArrowRight") target = Math.min(ENTRIES.length - 1, idx + 1);
  else if (e.key === "Home") target = 0;
  else if (e.key === "End") target = ENTRIES.length - 1;
  if (target !== null) {
    e.preventDefault();
    refs[target]?.focus();
  }
}

export function DossierSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const indexRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState(0);
  const [exiting, setExiting] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);
  const [enter, setEnter] = useState<"idle" | "pending" | "done">("idle");

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // assestamento d'ingresso: una sola volta, mai in reduced motion
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const body = section.querySelector(".dossier-stage");
    if (!body) return;
    const rect = body.getBoundingClientRect();
    if (rect.top < window.innerHeight) return; // già in vista: niente entrata
    setEnter("pending");
    const io = new IntersectionObserver(
      (entriesIo) => {
        if (entriesIo.some((e) => e.isIntersecting)) {
          setEnter("done");
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(body);
    return () => io.disconnect();
  }, []);

  useEffect(() => () => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
  }, []);

  const select = (idx: number) => {
    if (idx === active) return;
    if (!reduced) {
      setExiting(active);
      if (exitTimer.current) clearTimeout(exitTimer.current);
      exitTimer.current = setTimeout(() => setExiting(null), 240);
    }
    setActive(idx);
  };

  const entry = ENTRIES[active];

  const renderControl = (
    i: number,
    refs: React.MutableRefObject<Array<HTMLButtonElement | null>>,
    className: string,
    children: ReactNode
  ) => (
    <button
      type="button"
      ref={(el) => { refs.current[i] = el; }}
      className={className + (active === i ? " is-active" : "")}
      aria-current={active === i ? "true" : undefined}
      tabIndex={active === i ? 0 : -1}
      onClick={() => select(i)}
      onKeyDown={(e) => groupKeyNav(e, i, refs.current)}
    >
      {children}
    </button>
  );

  return (
    <section
      id="section-03-cosa-ricevi"
      className="dossier-section"
      ref={sectionRef}
      aria-labelledby="dossier-title"
    >
      <div className="dossier-header-layout">
        <header className="dossier-header">
          <p className="section-kicker dossier-kicker">Cosa ricevi</p>
          <h2 id="dossier-title">Un fascicolo operativo, non una lezione di marketing.</h2>
          <p className="dossier-intro">
            Tutto quello che il generatore produce finisce in un unico fascicolo, diviso in sei sezioni. Sfoglialo.
          </p>
        </header>
      </div>

      <div className="dossier-stage" data-enter={enter}>
        {/* ---------- desktop: indice editoriale + fascicolo ---------- */}
        <div className="dossier-body dossier-body--desktop">
          <ol className="dossier-index" aria-label="Indice del fascicolo">
            {ENTRIES.map((item, i) => (
              <li key={item.num} className={`dossier-index-item tone-${item.tone}`}>
                {renderControl(
                  i,
                  indexRefs,
                  "dossier-index-button",
                  <>
                    <span className="index-numeral" aria-hidden="true">{item.num}</span>
                    <span className="index-main">
                      <span className="index-title-row">
                        <span className="index-title">{item.title}</span>
                        <span className="index-leader" aria-hidden="true" />
                      </span>
                      <span className="index-desc">{item.desc}</span>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ol>

          <div className="dossier-folder">
            <div className="dossier-tabs" aria-label="Linguette del fascicolo">
              {ENTRIES.map((item, i) => (
                <span key={item.num} className={`dossier-tab-slot tone-${item.tone}`}>
                  {renderControl(
                    i,
                    tabRefs,
                    "dossier-tab",
                    <>
                      <span className="tab-numeral" aria-hidden="true">{item.num}</span>
                      <span className="tab-short">{item.short}</span>
                      <span className="visually-hidden">{item.title}</span>
                    </>
                  )}
                </span>
              ))}
            </div>
            <div
              className="dossier-page"
              role="region"
              aria-label={`Sezione del fascicolo aperta: ${entry.title}`}
            >
              <DossierPageBody key={active} index={active} />
              {exiting !== null && (
                <div className="dossier-page-exit" aria-hidden="true">
                  <DossierPageBody index={exiting} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---------- mobile/tablet: pila di fascette ---------- */}
        <ol className="dossier-stack" aria-label="Le sei sezioni del fascicolo">
          {ENTRIES.map((item, i) => {
            const open = active === i;
            const buttonId = `fascetta-${item.num}`;
            const panelId = `fascetta-panel-${item.num}`;
            return (
              <li key={item.num} className={`fascetta-item tone-${item.tone}${open ? " is-open" : ""}`}>
                <h3 className="fascetta-heading">
                  <button
                    type="button"
                    id={buttonId}
                    className="fascetta"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => select(i)}
                  >
                    <span className="fascetta-numeral" aria-hidden="true">{item.num}</span>
                    <span className="fascetta-title">{item.title}</span>
                    <span className="fascetta-mark" aria-hidden="true">{open ? "—" : "+"}</span>
                  </button>
                </h3>
                <div id={panelId} className="fascetta-panel" role="region" aria-labelledby={buttonId}>
                  <div className="fascetta-panel-inner">
                    <div className="fascetta-page">
                      <DossierPageBody index={i} />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="dossier-footer-layout">
        <p className="dossier-closing">
          Sei sezioni, un solo fascicolo: il piano del tuo locale, pronto da aprire il lunedì.
        </p>
      </div>
    </section>
  );
}

"use client";

// Fase B3 — «Signal Thread»: linguaggio proprietario della Direzione B.
// Hairline che collegano i pannelli durante la convergenza (25–52% della
// corsa) seguendo il percorso logico Problemi → Orari → Recensioni → Dati →
// Opportunità → Sintesi; ogni segmento si carica di teal quando la sua fonte
// viene assorbita. Nel climax i rami secondari cedono al dato critico, poi
// l'intera rete lascia il campo alla singola uscita teal dell'Optical Aperture.
// Nessun tween proprio: il layer è una funzione pura del
// progress della timeline esistente (update() è chiamato dall'onUpdate di
// HeroLive), quindi deterministico e reversibile per costruzione. A progress
// 0 e dal 52% in poi è invisibile: il risultato resta libero da residui.
// In reduced motion HeroLive non crea la timeline, update() non viene mai
// chiamato e il layer resta invisibile.
// Gli endpoint seguono i centri correnti degli slot (layout + translate GSAP,
// invarianti rispetto a scale/rotation), così le linee restano agganciate ai
// pannelli in viaggio e non attraversano mai il canvas per intero.

import { forwardRef, useImperativeHandle, useRef } from "react";
import gsap from "gsap";
import { DESKTOP_SEGNALE, MOBILE_SEGNALE, type FragKey } from "./live.config";

export interface SignalThreadHandle {
  update(progress: number): void;
  refresh(): void;
}

// percorso logico delle connessioni; su mobile i nodi assenti (display:none)
// vengono saltati e la catena si richiude sui nodi visibili.
// B5: la catena NON termina più autonomamente nel pannello — l'ingresso
// nella sintesi è compito dei raggi della Optical Aperture, che proseguono
// gli stessi nodi dentro la lente (un solo gesto, un solo sistema).
const CHAIN: Array<FragKey | "panel"> = ["note", "polaroid", "review", "receipt", "flyer"];
const MAX_SEGMENTS = CHAIN.length - 1;

const APPEAR_START = 25; // le hairline nascono in sequenza tra 25 e ~43
const APPEAR_SPAN = 18;
const DRAW_UNITS = 7; // durata del tratteggio di un segmento
// il teal risale il segmento mentre la fonte viene assorbita: finestra dentro
// il viaggio (45%–85% della corsa del nodo), quando le linee sono ancora
// visibili sul canvas e non dietro il pannello ormai opaco
const TEAL_FROM = 0.45;
const TEAL_TO = 0.85;
const GATHER_AT = 70; // la rete confluisce nel filetto (70–86)
const GATHER_UNITS = 16;
const FADE_AT = 78; // dissolvenza completa entro 88
const FADE_UNITS = 10;
const FILETTO_INSET = 12; // margine del punto d'attracco sul filetto
const CLIMAX_SUBDUE_AT = 40;
const CLIMAX_SECONDARY_END = 46;
const CLIMAX_CRITICAL_FADE_AT = 48;
const CLIMAX_SILENCE_AT = 52;

interface Anchor {
  key: FragKey | "panel";
  el: HTMLElement;
  /** centro in coordinate canvas (solo layout: i transform sono letti a ogni frame) */
  x: number;
  y: number;
}

interface Segment {
  a: Anchor;
  b: Anchor;
  appear: number;
  /** finestra teal: dentro l'assorbimento del nodo sorgente */
  tealFrom: number;
  tealTo: number;
  base: SVGPathElement;
  signal: SVGPathElement;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const num = (v: string | number) => (typeof v === "number" ? v : parseFloat(v) || 0);

export const SignalThread = forwardRef<SignalThreadHandle>(function SignalThread(_props, ref) {
  const svgRef = useRef<SVGSVGElement>(null);
  const state = useRef<{
    segments: Segment[];
    panel: HTMLElement | null;
    panelTop: number;
    panelLeft: number;
    panelRight: number;
    progress: number;
  }>({ segments: [], panel: null, panelTop: 0, panelLeft: 0, panelRight: 0, progress: 0 });

  useImperativeHandle(ref, () => {
    const api: SignalThreadHandle = {
      refresh() {
        const svg = svgRef.current;
        const canvas = svg?.closest<HTMLElement>(".live-canvas");
        const stage = svg?.closest<HTMLElement>(".stage--live");
        if (!svg || !canvas || !stage) return;
        svg.setAttribute("viewBox", `0 0 ${canvas.offsetWidth} ${canvas.offsetHeight}`);

        const paths = Array.from(svg.querySelectorAll<SVGPathElement>("path"));
        paths.forEach((p) => {
          p.style.opacity = "0";
          p.style.strokeDasharray = "0 1";
        });

        const panel = stage.querySelector<HTMLElement>(".glass-panel--live");
        const field = stage.querySelector<HTMLElement>(".fragment-field");
        if (!panel) return;
        const s = state.current;
        s.panel = panel;
        s.panelTop = panel.offsetTop;
        s.panelLeft = panel.offsetLeft;
        s.panelRight = panel.offsetLeft + panel.offsetWidth;

        const isMobile = window.matchMedia("(max-width: 767px)").matches;
        const cfg = isMobile ? MOBILE_SEGNALE : DESKTOP_SEGNALE;

        const anchorOf = (key: FragKey | "panel"): Anchor | null => {
          if (key === "panel") {
            return {
              key,
              el: panel,
              x: panel.offsetLeft + panel.offsetWidth / 2,
              y: panel.offsetTop + panel.offsetHeight / 2,
            };
          }
          const slot = stage.querySelector<HTMLElement>(`[data-frag="${key}"]`);
          if (!slot || slot.offsetParent === null) return null; // nodo assente (mobile)
          const inField = slot.offsetParent === field;
          return {
            key,
            el: slot,
            x: (inField && field ? field.offsetLeft : 0) + slot.offsetLeft + slot.offsetWidth / 2,
            y: (inField && field ? field.offsetTop : 0) + slot.offsetTop + slot.offsetHeight / 2,
          };
        };

        const nodes = CHAIN.map(anchorOf).filter((a): a is Anchor => a !== null);
        const nSeg = Math.min(nodes.length - 1, MAX_SEGMENTS);
        const step = nSeg > 1 ? APPEAR_SPAN / (nSeg - 1) : 0;
        s.segments = [];
        for (let i = 0; i < nSeg; i++) {
          const base = paths[i * 2];
          const signal = paths[i * 2 + 1];
          if (!base || !signal) break;
          const src = nodes[i];
          const frag = src.key === "panel" ? undefined : cfg.frags.find((f) => f.key === src.key);
          const f0 = frag?.start ?? 25;
          const f1 = frag?.end ?? 55;
          s.segments.push({
            a: src,
            b: nodes[i + 1],
            appear: APPEAR_START + step * i,
            tealFrom: f0 + (f1 - f0) * TEAL_FROM,
            tealTo: f0 + (f1 - f0) * TEAL_TO,
            base,
            signal,
          });
        }
        api.update(s.progress);
      },

      update(progress: number) {
        const s = state.current;
        const u = progress * 100;
        // a riposo fuori dalla banda attiva non c'è nulla da ridisegnare
        // (dentro la banda si ricalcola anche a progress fermo: lo scrub
        // smussato assesta i transform dopo l'ultimo evento di scroll)
        if (progress === s.progress && (u < APPEAR_START || u >= CLIMAX_SILENCE_AT)) return;
        s.progress = progress;
        if (!s.panel || !s.segments.length) return;
        const gather = smooth(clamp01((u - GATHER_AT) / GATHER_UNITS));
        const fade = 1 - clamp01((u - FADE_AT) / FADE_UNITS);
        const panelY = s.panelTop + num(gsap.getProperty(s.panel, "y")) + 1;
        const dockX = (x: number) =>
          Math.min(s.panelRight - FILETTO_INSET, Math.max(s.panelLeft + FILETTO_INSET, x));

        for (const seg of s.segments) {
          const drawT = clamp01((u - seg.appear) / DRAW_UNITS);
          const isCritical = seg.a.key === "receipt";
          const climaxPresence = isCritical
            ? 1 - smooth(clamp01((u - CLIMAX_CRITICAL_FADE_AT) / (CLIMAX_SILENCE_AT - CLIMAX_CRITICAL_FADE_AT)))
            : 1 - smooth(clamp01((u - CLIMAX_SUBDUE_AT) / (CLIMAX_SECONDARY_END - CLIMAX_SUBDUE_AT)));
          if (drawT <= 0 || fade <= 0 || climaxPresence <= 0) {
            seg.base.style.opacity = "0";
            seg.signal.style.opacity = "0";
            continue;
          }
          const ax = seg.a.x + num(gsap.getProperty(seg.a.el, "x"));
          const ay = seg.a.y + num(gsap.getProperty(seg.a.el, "y"));
          const bx = seg.b.x + num(gsap.getProperty(seg.b.el, "x"));
          const by = seg.b.y + num(gsap.getProperty(seg.b.el, "y"));
          // confluenza: gli estremi migrano sulla retta del filetto
          const x1 = ax + (dockX(ax) - ax) * gather;
          const y1 = ay + (panelY - ay) * gather;
          const x2 = bx + (dockX(bx) - bx) * gather;
          const y2 = by + (panelY - by) * gather;
          const len = Math.hypot(x2 - x1, y2 - y1);
          const d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;

          const tealT = Math.min(drawT, clamp01((u - seg.tealFrom) / (seg.tealTo - seg.tealFrom)));
          seg.base.setAttribute("d", d);
          seg.base.style.strokeDasharray = `${(len * drawT).toFixed(1)} ${(len + 1).toFixed(1)}`;
          seg.base.style.opacity = String(fade * climaxPresence * (isCritical ? 0.55 : 1));
          seg.signal.setAttribute("d", d);
          seg.signal.style.strokeDasharray = `${(len * tealT).toFixed(1)} ${(len + 1).toFixed(1)}`;
          seg.signal.style.opacity = String(fade * climaxPresence);
        }
      },
    };
    return api;
  }, []);

  return (
    <svg ref={svgRef} className="signal-thread" aria-hidden="true" preserveAspectRatio="none">
      {Array.from({ length: MAX_SEGMENTS }).map((_, i) => (
        <g key={i}>
          <path className="thread-base" vectorEffect="non-scaling-stroke" style={{ opacity: 0 }} />
          <path className="thread-signal" vectorEffect="non-scaling-stroke" style={{ opacity: 0 }} />
        </g>
      ))}
    </svg>
  );
});

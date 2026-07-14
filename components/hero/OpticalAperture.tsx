"use client";

// Fase B5 — «Optical Aperture»: l'oggetto del brand Segnale (variante A, B4).
// Layer SVG montato DENTRO il pannello di sintesi (sopra .glass-panel-fill,
// sotto .glass-panel-inner), mascherato da un clipPath arrotondato dedicato:
// nessun overflow:hidden sul pannello. Gemello del SignalThread: nessun tween
// proprio, funzione pura del progress della timeline (update() dal ticker di
// HeroLive), quindi deterministico e reversibile per costruzione.
//
// Sistema unico col thread (B5 §4): la catena del thread connette i pannelli
// tra loro e NON termina più nel pannello; i raggi della lente partono dalle
// posizioni correnti degli stessi nodi (stessi dati, stessa geometria) e ne
// sono la prosecuzione dentro la lente: nodo → bordo sinistro → deviazione →
// fuoco F → UNA linea teal → filetto. Regola cromatica: prima del fuoco
// nessuna linea è teal; i tick di dispersione vivono solo sul bordo.
//
// Finestre (unità timeline 0–100, montaggio Sprint 3):
//   presenza 8–42 · selezione raggi 40–48 · picco 45–50 · rilascio 50–58.
// A progress 0 e ≥58% il layer è invisibile: la priorità 1 resta protagonista.
// Reduced motion: HeroLive non crea la timeline → mai aggiornato → invisibile.

import { forwardRef, useImperativeHandle, useRef } from "react";
import gsap from "gsap";
import { DESKTOP_SEGNALE, MOBILE_SEGNALE, type FragKey } from "./live.config";

export interface OpticalApertureHandle {
  update(progress: number): void;
  refresh(): void;
}

/* Geometria in unità desktop (pannello 480×500), come offset dal centro
   della lente; la scala s la adatta al pannello reale (mobile: 0.58). */
const ELLIPSE = { rx: 64, ry: 108, rot: -10 };
const F_OFF = { x: 140, y: -10 };
const AXIS = { x: 15, y: 105 };
// coppie entrata (bordo sx) / uscita (bordo dx) dei raggi
const RIM: Array<{ e: [number, number]; x: [number, number] }> = [
  { e: [-38, -65], x: [46, -43] },
  { e: [-60, -15], x: [62, -11] },
  { e: [-58, 17], x: [60, 13] },
  { e: [-42, 51], x: [48, 41] },
];
// ingresso dal basso (solo mobile: gli orari arrivano da destra-basso)
const RIM_BOT = { e: [10, 96] as [number, number], x: [42, 36] as [number, number] };
// tick di dispersione sul bordo d'ingresso: posizione + direzione (tangente)
const TICKS: Array<{ p: [number, number]; d: [number, number]; peak: number }> = [
  { p: [-43, -72], d: [-6, 9], peak: 0.42 }, // aqua ghiaccio
  { p: [-66, -15], d: [-6, 9], peak: 0.42 }, // cyan chiarissimo
  { p: [-49, 55], d: [-5, 9], peak: 0.42 }, // lime tenue
  { p: [-28, 87], d: [-4, 8], peak: 0.27 }, // presenza calda minima
];
// sorgenti dei raggi → indice della coppia bordo (RIM) o "bot"
const RAYS_DESKTOP: Array<{ key: FragKey; rim: number | "bot" }> = [
  { key: "social", rim: 0 },
  { key: "receipt", rim: 1 },
  { key: "note", rim: 2 },
  { key: "flyer", rim: 3 },
];
// mobile: solo nodi che si avvicinano da sinistra/basso — recensioni arriva
// da destra-alto e attraverserebbe la zona della priorità (vietato §7)
const RAYS_MOBILE: Array<{ key: FragKey; rim: number | "bot" }> = [
  { key: "receipt", rim: 1 },
  { key: "flyer", rim: 3 },
  { key: "polaroid", rim: "bot" },
];
const MOBILE_SCALE = 0.52;
const APERTURE_SILENCE_AT = 58;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const num = (v: string | number) => (typeof v === "number" ? v : parseFloat(v) || 0);

interface RayState {
  el: SVGPathElement;
  slot: HTMLElement;
  key: FragKey;
  /** centro base del nodo in coordinate canvas (solo layout) */
  base: { x: number; y: number };
  e: [number, number];
  x: [number, number];
  /** finestra di tratteggio sulla timeline */
  from: number;
  to: number;
}

export const OpticalAperture = forwardRef<OpticalApertureHandle>(function OpticalAperture(_props, ref) {
  const svgRef = useRef<SVGSVGElement>(null);
  const state = useRef<{
    panel: HTMLElement | null;
    w: number;
    h: number;
    cx: number;
    cy: number;
    s: number;
    panelLeft: number;
    panelTop: number;
    rays: RayState[];
    progress: number;
  }>({ panel: null, w: 0, h: 0, cx: 0, cy: 0, s: 1, panelLeft: 0, panelTop: 0, rays: [], progress: 0 });

  useImperativeHandle(ref, () => {
    const q = (sel: string) => svgRef.current?.querySelector<SVGElement>(sel) ?? null;

    const api: OpticalApertureHandle = {
      refresh() {
        const svg = svgRef.current;
        const panel = svg?.closest<HTMLElement>(".glass-panel--live");
        const stage = svg?.closest<HTMLElement>(".stage--live");
        if (!svg || !panel || !stage) return;
        const st = state.current;
        st.panel = panel;
        st.w = panel.offsetWidth;
        st.h = panel.offsetHeight;
        st.panelLeft = panel.offsetLeft;
        st.panelTop = panel.offsetTop;
        const isMobile = window.matchMedia("(max-width: 767px)").matches;
        // mobile: lente più in basso, nel vuoto che precede la priorità
        st.cx = st.w * 0.4375;
        st.cy = st.h * (isMobile ? 0.56 : 0.49);
        st.s = isMobile ? MOBILE_SCALE : Math.min(st.w / 480, st.h / 500);
        svg.setAttribute("viewBox", `0 0 ${st.w} ${st.h}`);
        const clip = q("#b5-aperture-clip rect");
        clip?.setAttribute("width", String(st.w));
        clip?.setAttribute("height", String(st.h));

        // tutto invisibile finché update non ridisegna
        svg.querySelectorAll<SVGElement>("[data-ap]").forEach((el) => {
          el.style.opacity = "0";
        });

        const cfg = isMobile ? MOBILE_SEGNALE : DESKTOP_SEGNALE;
        const defs = isMobile ? RAYS_MOBILE : RAYS_DESKTOP;
        const field = stage.querySelector<HTMLElement>(".fragment-field");
        const paths = Array.from(svg.querySelectorAll<SVGPathElement>(".ap-ray"));
        st.rays = [];
        defs.forEach((def, i) => {
          const el = paths[i];
          const slot = stage.querySelector<HTMLElement>(`[data-frag="${def.key}"]`);
          const frag = cfg.frags.find((f) => f.key === def.key);
          if (!el || !slot || slot.offsetParent === null || !frag) return;
          const inField = slot.offsetParent === field;
          const rim = def.rim === "bot" ? RIM_BOT : RIM[def.rim];
          const from = Math.max(25, frag.start + 8);
          st.rays.push({
            el,
            slot,
            key: def.key,
            base: {
              x: (inField && field ? field.offsetLeft : 0) + slot.offsetLeft + slot.offsetWidth / 2,
              y: (inField && field ? field.offsetTop : 0) + slot.offsetTop + slot.offsetHeight / 2,
            },
            e: rim.e,
            x: rim.x,
            from,
            to: Math.min(from + 12, 52),
          });
        });
        api.update(st.progress);
      },

      update(progress: number) {
        const st = state.current;
        const u = progress * 100;
        // fuori dalla banda attiva, a progress fermo, nulla da ridisegnare
        if (progress === st.progress && (u < 8 || u >= APERTURE_SILENCE_AT)) return;
        st.progress = progress;
        if (!st.panel || !svgRef.current) return;

        const ellipse = q(".ap-ellipse") as SVGEllipseElement | null;
        const axis = q(".ap-axis") as SVGLineElement | null;
        const focusDot = q(".ap-focus") as SVGCircleElement | null;
        const exit = q(".ap-exit") as SVGPathElement | null;
        const ticks = Array.from(svgRef.current.querySelectorAll<SVGLineElement>(".ap-tick"));
        if (!ellipse || !axis || !focusDot || !exit) return;

        const { cx, cy, s, w } = st;
        const px = (off: [number, number]) => [cx + off[0] * s, cy + off[1] * s] as const;
        const F = px([F_OFF.x, F_OFF.y]);
        const exitEnd = [w - 14, F[1] - 5] as const;

        if (u < 8 || u >= APERTURE_SILENCE_AT) {
          svgRef.current.querySelectorAll<SVGElement>("[data-ap]").forEach((el) => {
            el.style.opacity = "0";
          });
          return;
        }

        const pIn = clamp01((u - 8) / 12); // presenza 8–20
        const grow = clamp01((u - 25) / 17); // rinforzo 25–42
        const climaxIn = smooth(clamp01((u - 42) / 5));
        const climaxOut = 1 - smooth(clamp01((u - 49) / 5));
        const climaxPeak = Math.min(climaxIn, climaxOut);
        const lensRetreat = 1 - smooth(clamp01((u - 49) / 5));
        const rt = smooth(clamp01((u - 50) / 4)); // collasso leggibile 50–54
        const exitIn = smooth(clamp01((u - 48) / 4));
        const exitFade = 1 - smooth(clamp01((u - 55) / 3));

        // --- ellisse + asse: presenza, rinforzo, poi la lente SI CHIUDE sul
        // posto (mai in viaggio attraverso la zona delle schede); il moto
        // «verso il filetto» è affidato alla sola linea teal in uscita ---
        const eRx = lerp(ELLIPSE.rx, 84, rt) * s;
        const eRy = lerp(ELLIPSE.ry, 2, rt) * s;
        const eRot = lerp(ELLIPSE.rot, 0, rt);
        ellipse.setAttribute("cx", cx.toFixed(1));
        ellipse.setAttribute("cy", cy.toFixed(1));
        ellipse.setAttribute("rx", eRx.toFixed(1));
        ellipse.setAttribute("ry", eRy.toFixed(1));
        ellipse.setAttribute("transform", `rotate(${eRot.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})`);
        const ellipseBase = 0.15 * pIn + 0.11 * grow;
        ellipse.style.opacity = String(ellipseBase * lensRetreat + 0.14 * climaxPeak);

        axis.setAttribute("x1", (cx - AXIS.x * s * (1 - rt)).toFixed(1));
        axis.setAttribute("y1", (cy - AXIS.y * s * (1 - rt)).toFixed(1));
        axis.setAttribute("x2", (cx + AXIS.x * s * (1 - rt)).toFixed(1));
        axis.setAttribute("y2", (cy + AXIS.y * s * (1 - rt)).toFixed(1));
        const axisBase = 0.07 * pIn + 0.02 * grow;
        axis.style.opacity = String(axisBase * (1 - rt) * lensRetreat + 0.035 * climaxPeak);

        // --- raggi: prosecuzione dei nodi del thread dentro la lente ---
        const panelYNow = num(gsap.getProperty(st.panel, "y"));
        for (const ray of st.rays) {
          const t = clamp01((u - ray.from) / (ray.to - ray.from));
          const rayPresence =
            ray.key === "receipt"
              ? 1 - smooth(clamp01((u - 49) / 3))
              : ray.key === "flyer"
                ? 1 - smooth(clamp01((u - 41) / 8))
                : 1 - smooth(clamp01((u - 40) / 6));
          if (t <= 0 || rayPresence <= 0) {
            ray.el.style.opacity = "0";
            continue;
          }
          const nx = ray.base.x + num(gsap.getProperty(ray.slot, "x")) - st.panelLeft;
          const ny = ray.base.y + num(gsap.getProperty(ray.slot, "y")) - (st.panelTop + panelYNow);
          const E = px(ray.e);
          const X = px(ray.x);
          const len =
            Math.hypot(E[0] - nx, E[1] - ny) +
            Math.hypot(X[0] - E[0], X[1] - E[1]) +
            Math.hypot(F[0] - X[0], F[1] - X[1]);
          ray.el.setAttribute(
            "d",
            `M ${nx.toFixed(1)} ${ny.toFixed(1)} L ${E[0].toFixed(1)} ${E[1].toFixed(1)} L ${X[0].toFixed(1)} ${X[1].toFixed(1)} L ${F[0].toFixed(1)} ${F[1].toFixed(1)}`
          );
          ray.el.style.strokeDasharray = `${(len * t).toFixed(1)} ${(len + 1).toFixed(1)}`;
          ray.el.style.opacity = String(rayPresence);
        }

        // --- tick di dispersione: solo sul bordo, dentro la loro finestra ---
        ticks.forEach((tick, i) => {
          const def = TICKS[i];
          if (!def) return;
          const P = px(def.p);
          tick.setAttribute("x1", P[0].toFixed(1));
          tick.setAttribute("y1", P[1].toFixed(1));
          tick.setAttribute("x2", (P[0] + def.d[0] * s).toFixed(1));
          tick.setAttribute("y2", (P[1] + def.d[1] * s).toFixed(1));
          const presenceA = i === 0 ? 0.32 * pIn * (1 - smooth(clamp01((u - 42) / 2))) : 0;
          const tickPeak =
            smooth(clamp01((u - 43) / 3)) * (1 - smooth(clamp01((u - 48.5) / 2.5)));
          const focusA = i < 2 ? def.peak * tickPeak : 0;
          tick.style.opacity = String(Math.max(presenceA, focusA));
        });

        // --- fuoco ---
        focusDot.setAttribute("cx", F[0].toFixed(1));
        focusDot.setAttribute("cy", F[1].toFixed(1));
        focusDot.setAttribute("r", (2 * Math.max(s, 0.7)).toFixed(1));
        const focusIn = smooth(clamp01((u - 45) / 2));
        const focusOut = 1 - smooth(clamp01((u - 50) / 3));
        focusDot.style.opacity = String(0.9 * focusIn * focusOut);

        // --- linea teal in uscita: esce dal fuoco, si tende fino al bordo,
        // poi risale il margine destro e si salda al filetto (un filo continuo
        // che resta sempre nei margini: mai sotto le schede) ---
        const corner = [exitEnd[0], 1] as const;
        const len1 = Math.hypot(exitEnd[0] - F[0], exitEnd[1] - F[1]);
        const len2 = Math.hypot(corner[1] - exitEnd[1], 0);
        exit.setAttribute(
          "d",
          `M ${F[0].toFixed(1)} ${F[1].toFixed(1)} L ${exitEnd[0].toFixed(1)} ${exitEnd[1].toFixed(1)} L ${corner[0].toFixed(1)} ${corner[1].toFixed(1)}`
        );
        const drawn = len1 * exitIn + len2 * rt;
        exit.setAttribute("stroke-width", lerp(1.25, 2, rt).toFixed(2));
        exit.style.strokeDasharray = `${drawn.toFixed(1)} ${(len1 + len2 + 1).toFixed(1)}`;
        exit.style.opacity = String(exitIn * exitFade);
      },
    };
    return api;
  }, []);

  return (
    <svg ref={svgRef} className="optical-aperture" aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <clipPath id="b5-aperture-clip">
          <rect x="0" y="0" width="0" height="0" rx="16" />
        </clipPath>
      </defs>
      <g clipPath="url(#b5-aperture-clip)">
        <ellipse className="ap-ellipse" data-ap="" style={{ opacity: 0 }} />
        <line className="ap-axis" data-ap="" style={{ opacity: 0 }} />
        <path className="ap-ray" data-ap="" style={{ opacity: 0 }} />
        <path className="ap-ray" data-ap="" style={{ opacity: 0 }} />
        <path className="ap-ray" data-ap="" style={{ opacity: 0 }} />
        <path className="ap-ray" data-ap="" style={{ opacity: 0 }} />
        <line className="ap-tick ap-tick--aqua" data-ap="" style={{ opacity: 0 }} />
        <line className="ap-tick ap-tick--cyan" data-ap="" style={{ opacity: 0 }} />
        <line className="ap-tick ap-tick--lime" data-ap="" style={{ opacity: 0 }} />
        <line className="ap-tick ap-tick--warm" data-ap="" style={{ opacity: 0 }} />
        <circle className="ap-focus" data-ap="" style={{ opacity: 0 }} />
        <path className="ap-exit" data-ap="" style={{ opacity: 0 }} />
      </g>
    </svg>
  );
});

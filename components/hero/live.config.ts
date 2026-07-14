// Configurazione motion del prototipo live.
// Fase 04A: desktop (approvato — NON modificare i valori DESKTOP).
// Fase 04B: mobile refinement — coreografia autonoma.
// Coordinate in px sul canvas di riferimento: desktop 1440x1000, mobile 390x844
// (mobile con ancoraggi bottom per reggere 360x800 e 393x852).

export type FragKey = "receipt" | "review" | "flyer" | "social" | "note" | "polaroid";

export interface FragMotion {
  key: FragKey;
  /** livello di profondità per la micro-parallasse di scena 1 (1=vicino, 3=lontano) */
  depth: 1 | 2 | 3;
  /** rotazione residua massima in scena 1 (gradi) */
  drift: number;
  /** rotazione iniziale nel campo (gradi) */
  rot0: number;
  /** posizione di inizio/fine della convergenza sulla timeline 0-100 */
  start: number;
  end: number;
  /** traslazione totale verso la destinazione (px, canvas space) */
  dx: number;
  dy: number;
  /** ease separati su x e y: la coppia disegna la curva */
  easeX: string;
  easeY: string;
  scale: number;
  /** rotazione a fine convergenza (residui: piccola, assorbiti: 0) */
  rot: number;
  opacity: number;
  blur: number;
  /** lo scontrino ondeggia durante il viaggio */
  wobble?: boolean;
  /** destinazione relativa al centro del pannello (mobile): calcolata sui rect,
      niente coordinate assolute viewport. Se presente, dx/dy sono ignorati. */
  destFromPanel?: { x: number; y: number };
  /** destinazione relativa alle dimensioni del pannello. Usata sui viewport
      intermedi, dove pannello e canvas sono fluidi: 0.5 = metà dimensione. */
  destFromPanelRatio?: { x: number; y: number };
}

/** moto idle di un frammento a scroll 0 (layer interno, separato dallo scrub) */
export interface IdleMotion {
  x: number;
  y: number;
  rotation: number;
  duration: number;
  delay: number;
}

/** pointer parallax (scena 1): ampiezze e soglia di disattivazione */
export interface PointerParallax {
  /** traslazione massima (px) */
  ampPx: number;
  /** rotazione massima (gradi) */
  rotDeg: number;
  /** progress oltre il quale la parallax è disattivata e i drift rientrano */
  cutoff: number;
}

/** intro prospettica del pannello (desktop): stato iniziale e traguardi rotationY */
export interface PanelIntro {
  /** transformPerspective (px) */
  perspective: number;
  /** transformOrigin */
  origin: string;
  rotationYFrom: number;
  /** raggiunta nella finestra fillAt */
  rotationYMid: number;
  /** stabilizzazione in scena 4 (88) */
  rotationYEnd: number;
  scaleFrom: number;
}

/** Montaggio del payoff finale. È opzionale per lasciare intatta la
    Direzione A; Segnale lo usa per separare lettura del piano e invito. */
export interface FinalPayoff {
  /** attenuazione degli elementi secondari: [posizione, durata] */
  attentionAt: [number, number];
  /** presa di controllo della CTA primaria: [posizione, durata] */
  ctaAt: [number, number];
  /** gesto breve della freccia secondaria: [posizione, durata] */
  arrowAt: [number, number];
  ctaContrastFrom: number;
  ctaScale: number;
  headlineOpacity: number;
  leadOpacity: number;
  secondaryCtaOpacity: number;
  fragmentOpacityFactor: number;
}

/** Montaggio del climax centrale di Segnale. Mantiene coordinate e stagger
    del piano, ma separa selezione, fuoco e risultato in tre battute. */
export interface ClimaxMontage {
  /** livello massimo del fill prima che il risultato dia materia al pannello */
  panelFillHoldOpacity: number;
  /** completamento del fill: [posizione, durata] */
  panelResolveAt: [number, number];
  /** opacità minima della prima priorità nel frame esatto di ingresso */
  firstCardOpacityFrom: number;
  /** durata dell'ingresso ottico e dell'assestamento della prima priorità */
  firstCardOpacityDuration: number;
  firstCardMotionDuration: number;
}

export interface LiveConfig {
  runway: string;
  /** scrub: true = 1:1, numero = smoothing in secondi */
  scrub: boolean | number;
  invalidateOnRefresh: boolean;
  /** fine della scena 1 (campo) sulla timeline 0-100 */
  fieldEnd: number;
  /** micro-parallasse per profondità: y e x (px) */
  parallaxY: [number, number, number];
  parallaxX: [number, number, number];
  /** pannello: finestre [posizione, durata] sulla timeline */
  fillAt: [number, number];
  reflectAt: [number, number];
  captionAt: [number, number];
  /** opacità iniziale del fill */
  fillFrom: number;
  /** intro prospettica del pannello (desktop); assente = pannello piatto */
  panelIntro?: PanelIntro;
  /** il pannello cresce dal basso (mobile): scaleY iniziale */
  panelScaleY?: number;
  /** schede del piano */
  cardStarts: [number, number, number];
  cardY: number;
  cardRotX: number;
  cardScale?: number;
  /** blur aggiuntivo sui residui in scena 3: [posizione, incremento px] */
  residualBlurAt: [number, number];
  /** spostamento freccia CTA secondaria in scena 4 (px) */
  arrowX: number;
  /** montaggio finale dedicato; assente = invito legacy 88–100 */
  finalPayoff?: FinalPayoff;
  /** climax centrale dedicato; assente = montaggio legacy */
  climax?: ClimaxMontage;
  /** pointer parallax (solo desktop); assente = disattivata */
  pointer?: PointerParallax;
  /** moto idle per frammento a scroll 0 (chiavi = frags attivi) */
  idle: Partial<Record<FragKey, IdleMotion>>;
  /** primo indizio della card 1 durante la convergenza (mobile) */
  cardHint?: boolean;
  /** confini scene per il debug HUD: [fine campo, fine convergenza, fine piano] */
  sceneBounds: [number, number, number];
  frags: FragMotion[];
}

export const DESKTOP: LiveConfig = {
  runway: "+=260%",
  scrub: true,
  invalidateOnRefresh: false,
  fieldEnd: 15,
  parallaxY: [26, 52, 84],
  parallaxX: [0, 0, 0],
  fillAt: [15, 40],
  reflectAt: [30, 25],
  captionAt: [33, 20],
  fillFrom: 0.3,
  panelIntro: {
    perspective: 1100,
    origin: "50% 55%",
    rotationYFrom: -4,
    rotationYMid: -1.2,
    rotationYEnd: 0,
    scaleFrom: 0.965,
  },
  cardStarts: [55, 62, 69],
  cardY: 44,
  cardRotX: 8,
  residualBlurAt: [58, 2],
  arrowX: 6,
  pointer: { ampPx: 6, rotDeg: 0.6, cutoff: 0.28 },
  idle: {
    receipt: { x: 4.8, y: -12.4, rotation: 1.1, duration: 2.8, delay: 0.15 },
    review: { x: -3.6, y: 8.8, rotation: -0.7, duration: 3.6, delay: 0.7 },
    flyer: { x: 4.4, y: 11.6, rotation: 0.9, duration: 3.2, delay: 1.1 },
    polaroid: { x: -2.4, y: -6.8, rotation: -0.5, duration: 4.13, delay: 0.4 },
    social: { x: 3, y: -9.4, rotation: 0.64, duration: 3.8, delay: 1.45 },
    note: { x: -5.2, y: 12.4, rotation: -1.2, duration: 2.6, delay: 0.9 },
  },
  sceneBounds: [15, 55, 88],
  frags: [
    // residui riconoscibili (restano dietro il vetro)
    { key: "receipt", depth: 1, drift: 1.5, rot0: -5, start: 15, end: 50, dx: 579, dy: -104, easeX: "power1.inOut", easeY: "sine.in", scale: 0.75, rot: -7, opacity: 0.55, blur: 4, wobble: true },
    { key: "flyer", depth: 2, drift: 1.1, rot0: -3, start: 21, end: 53, dx: 520, dy: 36, easeX: "power2.in", easeY: "sine.inOut", scale: 0.8, rot: 8, opacity: 0.55, blur: 4 },
    { key: "polaroid", depth: 3, drift: 0.6, rot0: 4, start: 24, end: 55, dx: -103, dy: 457, easeX: "sine.inOut", easeY: "power2.in", scale: 0.8, rot: -3, opacity: 0.55, blur: 4 },
    // assorbiti quasi del tutto
    { key: "review", depth: 2, drift: 1.3, rot0: -2, start: 18, end: 51, dx: -255, dy: 403, easeX: "power1.in", easeY: "power2.inOut", scale: 0.7, rot: 0, opacity: 0.18, blur: 6 },
    { key: "social", depth: 1, drift: 1.4, rot0: -2.5, start: 27, end: 54, dx: 215, dy: 112, easeX: "sine.inOut", easeY: "power1.in", scale: 0.7, rot: 0, opacity: 0.18, blur: 6 },
    { key: "note", depth: 2, drift: 1.2, rot0: 3, start: 31, end: 55, dx: 525, dy: -98, easeX: "power2.inOut", easeY: "sine.out", scale: 0.7, rot: 0, opacity: 0.18, blur: 6 },
  ],
};

export const MOBILE: LiveConfig = {
  runway: "+=220%",
  scrub: 0.2, // smoothing leggero; su touch reale valutare 0.1 o true (vedi report)
  invalidateOnRefresh: true, // barra indirizzi mobile: ricalcola al refresh
  fieldEnd: 20,
  parallaxY: [10, 14, 16], // max 16px verticali
  parallaxX: [6, -8, 4], // max 8px orizzontali, direzioni alternate
  fillAt: [20, 38],
  reflectAt: [38, 18],
  captionAt: [45, 12],
  fillFrom: 0.2, // pannello già parzialmente visibile nello stato iniziale (0.16-0.24)
  panelScaleY: 0.55, // il vassoio cresce dal basso mentre sale verso il centro; abbastanza alto da intersecare il flyer già a riposo
  cardStarts: [58, 66, 74],
  cardY: 40,
  cardRotX: 3, // massimo 2-3 gradi su mobile
  cardScale: 0.985, // scale leggerissima
  residualBlurAt: [62, 0.5], // blur massimo residui: 4px (3.5 + 0.5)
  arrowX: 5,
  idle: {
    receipt: { x: 3.2, y: -12, rotation: 1.04, duration: 3.2, delay: 0.15 },
    review: { x: -2.8, y: 9.6, rotation: -0.72, duration: 4.2, delay: 0.8 },
    flyer: { x: 2.4, y: -11.2, rotation: 0.88, duration: 3.67, delay: 1.2 },
    polaroid: { x: -1.4, y: -6.4, rotation: -0.3, duration: 4.4, delay: 0.45 },
  },
  cardHint: true, // 46-56%: sagoma della card 1 come primo indizio del risultato
  sceneBounds: [20, 58, 88],
  frags: [
    // zig-zag sx/dx/sx/dx; blur differenziati: flyer e Polaroid restano leggibili.
    // Destinazioni relative al centro del pannello (rect-based, mai viewport assoluta).
    { key: "receipt", depth: 1, drift: 0.8, rot0: -4, start: 20, end: 50, dx: 0, dy: 0, destFromPanel: { x: -90, y: -70 }, easeX: "sine.inOut", easeY: "power1.in", scale: 0.74, rot: -6, opacity: 0.45, blur: 3.5, wobble: true },
    { key: "review", depth: 2, drift: 0.6, rot0: 2, start: 24, end: 52, dx: 0, dy: 0, destFromPanel: { x: 75, y: -40 }, easeX: "power1.inOut", easeY: "power1.in", scale: 0.76, rot: 0, opacity: 0.5, blur: 2 },
    { key: "flyer", depth: 3, drift: 0.4, rot0: -3, start: 30, end: 58, dx: 0, dy: 0, destFromPanel: { x: -25, y: 60 }, easeX: "sine.inOut", easeY: "power1.inOut", scale: 0.78, rot: -1, opacity: 0.55, blur: 1.5 },
    { key: "polaroid", depth: 3, drift: 0.25, rot0: 2.5, start: 34, end: 60, dx: 0, dy: 0, destFromPanel: { x: 82, y: 74 }, easeX: "sine.inOut", easeY: "power2.in", scale: 0.74, rot: 2, opacity: 0.52, blur: 2.5 },
  ],
};

/* ================= Direzione B «Segnale» =================
   Geometria e traiettorie restano condivise con la Direzione A. Sprint 3
   rimonta soltanto il climax centrale; Sprint 2 conserva il payoff con pila
   completa entro il 78%, handoff 80–88% e hold 88–100. */

const SEGNALE_FINAL_PAYOFF: FinalPayoff = {
  attentionAt: [80, 6],
  ctaAt: [82, 6],
  arrowAt: [82, 3],
  ctaContrastFrom: 0.92,
  ctaScale: 1.015,
  headlineOpacity: 0.68,
  leadOpacity: 0.62,
  secondaryCtaOpacity: 0.48,
  fragmentOpacityFactor: 0.45,
};

const SEGNALE_CLIMAX: ClimaxMontage = {
  panelFillHoldOpacity: 0.84,
  panelResolveAt: [50, 6],
  firstCardOpacityFrom: 0.34,
  firstCardOpacityDuration: 3,
  firstCardMotionDuration: 5,
};

export const DESKTOP_SEGNALE: LiveConfig = {
  runway: "+=260%",
  scrub: true,
  invalidateOnRefresh: false,
  fieldEnd: 15,
  parallaxY: [12, 20, 32],
  parallaxX: [0, 0, 0],
  fillAt: [15, 40],
  reflectAt: [50, 6],
  captionAt: [52, 4],
  fillFrom: 0.3,
  panelIntro: {
    perspective: 1100,
    origin: "50% 55%",
    rotationYFrom: 0, // pannello piatto: nessuna prospettiva 3D nel tema B
    rotationYMid: 0,
    rotationYEnd: 0,
    scaleFrom: 0.985,
  },
  cardStarts: [54, 60, 66],
  cardY: 28,
  cardRotX: 2,
  cardScale: 0.99,
  residualBlurAt: [58, 1],
  arrowX: 3,
  finalPayoff: SEGNALE_FINAL_PAYOFF,
  climax: SEGNALE_CLIMAX,
  pointer: { ampPx: 2, rotDeg: 0, cutoff: 0.28 },
  // polish B2: sole ampiezze ridotte (~0.6×), timing invariato — «gli elementi
  // respirano», non si muovono
  idle: {
    receipt: { x: 1.5, y: -3.8, rotation: 0.2, duration: 2.8, delay: 0.15 },
    review: { x: -1.1, y: 2.8, rotation: -0.12, duration: 3.6, delay: 0.7 },
    flyer: { x: 1.4, y: 3.6, rotation: 0.15, duration: 3.2, delay: 1.1 },
    polaroid: { x: -0.8, y: -2.2, rotation: -0.1, duration: 4.13, delay: 0.4 },
    social: { x: 1, y: -3, rotation: 0.12, duration: 3.8, delay: 1.45 },
    note: { x: -1.6, y: 3.8, rotation: -0.18, duration: 2.6, delay: 0.9 },
  },
  sceneBounds: [15, 55, 80],
  frags: [
    // residui riconoscibili ai bordi del pannello di sintesi
    { key: "receipt", depth: 1, drift: 0.4, rot0: -1.5, start: 15, end: 50, dx: 579, dy: -104, easeX: "power1.inOut", easeY: "sine.in", scale: 0.75, rot: -1, opacity: 0.4, blur: 2.5 },
    { key: "flyer", depth: 2, drift: 0.3, rot0: -1, start: 21, end: 53, dx: 520, dy: 36, easeX: "power2.in", easeY: "sine.inOut", scale: 0.8, rot: 1, opacity: 0.4, blur: 2.5 },
    { key: "polaroid", depth: 3, drift: 0.2, rot0: 1, start: 24, end: 55, dx: -103, dy: 457, easeX: "sine.inOut", easeY: "power2.in", scale: 0.8, rot: -0.5, opacity: 0.4, blur: 2.5 },
    // assorbiti quasi del tutto (fuori fuoco = fuori dal piano)
    { key: "review", depth: 2, drift: 0.3, rot0: -0.5, start: 18, end: 51, dx: -255, dy: 403, easeX: "power1.in", easeY: "power2.inOut", scale: 0.7, rot: 0, opacity: 0.1, blur: 3 },
    { key: "social", depth: 1, drift: 0.3, rot0: -0.75, start: 27, end: 54, dx: 215, dy: 112, easeX: "sine.inOut", easeY: "power1.in", scale: 0.7, rot: 0, opacity: 0.1, blur: 3 },
    { key: "note", depth: 2, drift: 0.3, rot0: 1, start: 31, end: 55, dx: 525, dy: -98, easeX: "power2.inOut", easeY: "sine.out", scale: 0.7, rot: 0, opacity: 0.1, blur: 3 },
  ],
};

/* Viewport intermedi 768–1439.
   La timeline è intenzionalmente identica a DESKTOP_SEGNALE: cambiano soltanto
   il sistema di coordinate delle destinazioni e l'invalidazione al resize.
   Gli offset normalizzati conservano la composizione finale approvata mentre
   il pannello interpola dimensioni e posizione via CSS. */
const INTERMEDIATE_DESTINATIONS: Record<FragKey, { x: number; y: number }> = {
  receipt: { x: -0.452, y: -0.112 },
  flyer: { x: 0.375, y: 0.15 },
  polaroid: { x: 0.035, y: 0.285 },
  review: { x: -0.104, y: -0.184 },
  social: { x: -0.208, y: -0.14 },
  note: { x: -0.042, y: 0 },
};

export const INTERMEDIATE_SEGNALE: LiveConfig = {
  ...DESKTOP_SEGNALE,
  invalidateOnRefresh: true,
  frags: DESKTOP_SEGNALE.frags.map((fragment) => ({
    ...fragment,
    destFromPanelRatio: INTERMEDIATE_DESTINATIONS[fragment.key],
  })),
};

export const MOBILE_SEGNALE: LiveConfig = {
  runway: "+=220%",
  scrub: 0.2,
  invalidateOnRefresh: true,
  fieldEnd: 20,
  parallaxY: [6, 8, 10],
  parallaxX: [3, -4, 2],
  fillAt: [20, 38],
  reflectAt: [50, 6],
  captionAt: [52, 4],
  fillFrom: 0.25,
  panelScaleY: 0.92, // il pannello cresce, non "spunta": salita + distensione minima
  cardStarts: [54, 60, 66],
  cardY: 24,
  cardRotX: 0,
  cardScale: 0.99,
  residualBlurAt: [62, 0.5],
  arrowX: 3,
  finalPayoff: SEGNALE_FINAL_PAYOFF,
  climax: SEGNALE_CLIMAX,
  // polish B2: sole ampiezze ridotte (~0.6×), timing invariato
  idle: {
    receipt: { x: 1, y: -3.8, rotation: 0.15, duration: 3.2, delay: 0.15 },
    review: { x: -0.9, y: 3, rotation: -0.12, duration: 4.2, delay: 0.8 },
    flyer: { x: 0.8, y: -3.4, rotation: 0.14, duration: 3.67, delay: 1.2 },
    polaroid: { x: -0.5, y: -2, rotation: -0.08, duration: 4.4, delay: 0.45 },
  },
  sceneBounds: [20, 58, 80],
  frags: [
    // stesse destinazioni rect-based e stesso stagger del tema A
    { key: "receipt", depth: 1, drift: 0.25, rot0: -1, start: 20, end: 50, dx: 0, dy: 0, destFromPanel: { x: -90, y: -70 }, easeX: "sine.inOut", easeY: "power1.in", scale: 0.74, rot: -0.5, opacity: 0.35, blur: 2.5 },
    { key: "review", depth: 2, drift: 0.2, rot0: 0.5, start: 24, end: 52, dx: 0, dy: 0, destFromPanel: { x: 75, y: -40 }, easeX: "power1.inOut", easeY: "power1.in", scale: 0.76, rot: 0, opacity: 0.4, blur: 1.5 },
    { key: "flyer", depth: 3, drift: 0.15, rot0: -0.75, start: 30, end: 58, dx: 0, dy: 0, destFromPanel: { x: -25, y: 60 }, easeX: "sine.inOut", easeY: "power1.inOut", scale: 0.78, rot: -0.25, opacity: 0.45, blur: 1 },
    { key: "polaroid", depth: 3, drift: 0.1, rot0: 0.75, start: 34, end: 60, dx: 0, dy: 0, destFromPanel: { x: 82, y: 74 }, easeX: "sine.inOut", easeY: "power2.in", scale: 0.74, rot: 0.5, opacity: 0.4, blur: 2 },
  ],
};

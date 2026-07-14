// Parametri motion del mazzo settimanale (sezione 02) che variano per
// direzione artistica — estratti da WeeklyDeck.tsx nella fase preliminare
// del theming (outputs/apple-component-mapping.md §3.11).
// Direzione A «carta»: valori approvati, identici agli hardcoded originali.
// La Direzione B «Segnale» aggiungerà qui il proprio set
// (outputs/apple-motion-adjustments.json §section02).

export interface DeckMotionConfig {
  /** rotazioni residue delle schede nella pila iniziale (una per scheda) */
  stackRotations: number[];
  /** rotazione finale di posa per scheda, per breakpoint */
  finalRotations: { desktop: number[]; mobile: number[] };
  /** sollevamento durante il viaggio (px, sottratto alla y di partenza) */
  rise: { desktop: number; mobile: number };
  /** respiro iniziale della prima scheda: alzata (px) e rotazione aggiunta (gradi) */
  breathe: { lift: { desktop: number; mobile: number }; rotation: number };
  /** scala di partenza del bollo priorità (si "timbra" verso 1) */
  stampScaleFrom: number;
}

export const DECK_CARTA: DeckMotionConfig = {
  stackRotations: [-0.9, 1.2, -1.4, 0.7, -0.35, 1.45, -0.6],
  finalRotations: {
    desktop: [-1.3, 1.1, -0.8, 1.5, -1.2, 1.7, -0.6],
    mobile: [-0.7, 0.65, -0.55, 0.8, -0.75, 0.9, -0.45],
  },
  rise: { desktop: 24, mobile: 12 },
  breathe: { lift: { desktop: 3, mobile: 2 }, rotation: 0.18 },
  stampScaleFrom: 1.12,
};

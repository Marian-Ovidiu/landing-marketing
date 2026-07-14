export interface HeroCopy {
  readonly wordmark: string;
  readonly navLinks: readonly { readonly label: string; readonly href: string }[];
  readonly headlineLines: readonly string[];
  readonly lead: string;
  readonly ctaPrimary: string;
  readonly ctaPrimaryHref: string;
  readonly ctaSecondary: string;
  readonly ctaSecondaryHref: string;
  readonly planCaption: string;
  readonly planCards: readonly {
    readonly n: number;
    readonly title: string;
    readonly detail: string;
  }[];
}

// Copy della Direzione A: resta invariato e continua a essere il default dei
// componenti condivisi della hero.
export const copy: HeroCopy = {
  wordmark: "Marketing Strategy Generator",
  navLinks: [
    { label: "Come funziona", href: "#section-01-come-funziona" },
    { label: "Esempi di piano", href: "#section-02-esempio-di-piano" },
  ],
  headlineLines: [
    "Una strategia marketing",
    "costruita sul tuo locale,",
    "non su un template.",
  ],
  lead: "Descrivi il tuo business e ricevi un piano concreto, prioritizzato e subito utilizzabile.",
  ctaPrimary: "Crea la strategia",
  ctaPrimaryHref: "/crea-strategia",
  ctaSecondary: "Guarda come funziona",
  ctaSecondaryHref: "#section-01-come-funziona",
  planCaption: "Il tuo piano — 3 priorità",
  planCards: [
    {
      n: 1,
      title: "Fatti trovare da chi passa davanti",
      detail: "Profilo Google aggiornato: foto, orari e menu — alto impatto · 2 ore",
    },
    {
      n: 2,
      title: "Trasforma le recensioni in prenotazioni",
      detail: "Rispondi alle ultime dieci e chiedila ai tavoli — 1 ora a settimana",
    },
    {
      n: 3,
      title: "Il post che riempie il giovedì",
      detail: "Programma l’aperitivo della settimana — 30 minuti",
    },
  ],
};

// Contratto editoriale Segnale: gli stessi slot visivi raccontano il prodotto
// operativo quotidiano senza estendere il perimetro del primo MVP.
export const segnaleCopy: HeroCopy = {
  wordmark: "Segnale",
  navLinks: [
    { label: "Come funziona", href: "#section-01-come-funziona" },
    { label: "Esempio di piano", href: "#section-02-esempio-di-piano" },
  ],
  headlineLines: ["Ogni giorno sai quale azione", "fare per prima."],
  lead:
    "Segnale trasforma il contesto del tuo locale in priorità, missioni quotidiane e un piano operativo da seguire nel tempo.",
  ctaPrimary: "Entra nell’Early Access",
  ctaPrimaryHref: "#section-04-cta-finale",
  ctaSecondary: "Guarda un esempio di piano",
  ctaSecondaryHref: "#section-02-esempio-di-piano",
  planCaption: "LA PROSSIMA AZIONE · OSTERIA DA RITA",
  planCards: [
    {
      n: 1,
      title: "Rimetti in ordine la scheda Google",
      detail: "Foto, orari e menu · 2 ore · obiettivo: farti trovare in zona",
    },
    {
      n: 2,
      title: "Rispondi alle ultime dieci recensioni",
      detail: "45 minuti · prepara, rileggi e pubblica manualmente",
    },
    {
      n: 3,
      title: "Prepara il martedì della casa",
      detail: "1 ora · obiettivo: dare un motivo per venire nel giorno debole",
    },
  ],
};

export type Stage = "initial" | "final";

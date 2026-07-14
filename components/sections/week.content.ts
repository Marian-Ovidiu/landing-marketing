// Contenuto reale della settimana (sezione 02) — unica fonte per entrambe le
// direzioni: il mazzo della Direzione A (WeeklyDeck) e il ritmo operativo
// della Direzione B «Segnale» (SegnaleWeeklyRhythm). Copy approvato in
// outputs/page-copy.md; estratto da WeeklyDeck.tsx nella fase S02-B2 senza
// alcuna variazione di contenuto.

export type Priority = 1 | 2 | 3;

export interface DeckDay {
  id: string;
  day: string;
  shortDay: string;
  priority: Priority;
  action: string;
  time: string;
  channel: string;
  objective: string;
  indicator: string;
}

export const week: DeckDay[] = [
  { id: "lunedi", day: "Lunedì", shortDay: "LUN", priority: 1, action: "Rimetti in ordine la scheda Google", time: "2 ore", channel: "Google Business", objective: "farsi trovare da chi cerca “dove mangiare” in zona", indicator: "visualizzazioni della scheda a fine mese" },
  { id: "martedi", day: "Martedì", shortDay: "MAR", priority: 2, action: "Lancia “Il martedì della casa”: menu fisso a 18€", time: "1 ora per impostarlo", channel: "sala + cartello in vetrina", objective: "dare un motivo per venire nel giorno vuoto", indicator: "coperti del martedì, settimana su settimana" },
  { id: "mercoledi", day: "Mercoledì", shortDay: "MER", priority: 1, action: "Rispondi alle ultime dieci recensioni", time: "45 minuti", channel: "Google", objective: "mostrare che qui qualcuno ascolta", indicator: "recensioni con risposta / totale" },
  { id: "giovedi", day: "Giovedì", shortDay: "GIO", priority: 2, action: "Pubblica l’aperitivo del giovedì", time: "30 minuti", channel: "Instagram", objective: "riempire la fascia 18–20 con chi esce dall’università", indicator: "prenotazioni del giovedì sera" },
  { id: "venerdi", day: "Venerdì", shortDay: "VEN", priority: 1, action: "Metti sui tavoli il bigliettino “Com’è andata?” con QR", time: "20 minuti di preparazione", channel: "sala", objective: "trasformare i clienti contenti in recensioni", indicator: "recensioni nuove a settimana" },
  { id: "sabato", day: "Sabato", shortDay: "SAB", priority: 3, action: "Dieci foto vere durante il servizio (dehors, piatti, sala piena)", time: "30 minuti", channel: "archivio contenuti", objective: "avere materiale tuo per le prossime tre settimane di post", indicator: "—" },
  { id: "domenica", day: "Domenica", shortDay: "DOM", priority: 1, action: "Guarda i tre numeri della settimana", time: "15 minuti", channel: "—", objective: "capire cosa ha funzionato prima di rifare il giro", indicator: "scheda Google · coperti del martedì · recensioni nuove" },
];

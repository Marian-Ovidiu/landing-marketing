import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, IBM_Plex_Mono, Caveat, Inter_Tight } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz", "SOFT", "WONK"],
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-hand",
});

// Direzione B «Segnale»: display del tema, consumato SOLO dallo scope
// [data-theme="segnale"] (`--font-display: var(--font-display-b)`).
// Font variabile: un unico file copre i pesi usati (560-650); niente preload
// perché serve soltanto alla landing Segnale (`/` e `/concept/segnale`), non
// alla Direzione A.
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-display-b",
  preload: false,
});

export const metadata: Metadata = {
  title: "Marketing Strategy Generator — Concept C",
  description:
    "Browser design prototype del Concept C «Dal rumore al piano»: stati statici della hero desktop e mobile.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="it"
      className={`${fraunces.variable} ${instrumentSans.variable} ${plexMono.variable} ${caveat.variable} ${interTight.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

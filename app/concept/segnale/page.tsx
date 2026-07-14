import { HeroLive } from "@/components/hero/HeroLive";
import { SegnaleHowItWorks } from "@/components/sections/SegnaleHowItWorks";
import { SegnaleWeeklyRhythm } from "@/components/sections/SegnaleWeeklyRhythm";
import { SegnaleDeliverableReveal } from "@/components/sections/SegnaleDeliverableReveal";
import { SegnaleFinalCta } from "@/components/sections/SegnaleFinalCta";
import "../live/live.css";
import "./theme-segnale.css";
import "./segnale-how-it-works.css";
import "./segnale-weekly-rhythm.css";

export const metadata = { title: "Segnale — Early Access" };

// S01–S04 usano rendering dedicati. La Direzione A continua a montare
// HowItWorksSheet/WeeklyDeck/DossierSection/FinalCta senza condividerne
// la presentazione.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="concept-page" data-theme="segnale">
      <HeroLive theme="segnale" debug={sp.debug === "1"} />
      <SegnaleHowItWorks />
      <SegnaleWeeklyRhythm />
      <SegnaleDeliverableReveal />
      <SegnaleFinalCta />
    </div>
  );
}

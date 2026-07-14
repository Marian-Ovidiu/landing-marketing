import { HeroLive } from "@/components/hero/HeroLive";
import { HowItWorksSheet } from "@/components/sections/HowItWorksSheet";
import { WeeklyDeck } from "@/components/sections/WeeklyDeck";
import { DossierSection } from "@/components/sections/DossierSection";
import { FinalCta } from "@/components/sections/FinalCta";
import "../live/live.css";
import "../page.css";
import "./section-02-deck.css";
import "./section-03.css";
import "./section-04.css";

export const metadata = {
  title: "Marketing Strategy Generator — Come funziona",
};

export default function Page() {
  return (
    <div className="concept-page">
      <HeroLive />
      <HowItWorksSheet />
      <WeeklyDeck />
      <DossierSection />
      <FinalCta />
    </div>
  );
}

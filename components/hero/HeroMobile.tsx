import { copy, type Stage } from "./copy";
import { Nav, Ctas, GlassPanel, GrainOverlay } from "./chrome";
import { Receipt, Review, Flyer } from "./fragments";
import { PlanStack } from "./plan";

// Stato statico della hero mobile (viewport di riferimento 390x844).
// Composizione a imbuto autonoma: headline → 3 frammenti a zig-zag →
// pannello quasi full-width → CTA. Non è il desktop rimpicciolito.

export function HeroMobile({ stage }: { stage: Stage }) {
  return (
    <main className={`stage stage--mobile stage--${stage}`}>
      <div className="hero-texture" aria-hidden="true" />
      <Nav compact />
      <section className="hero-copy">
        <h1 className="headline">{copy.headlineLines.join(" ")}</h1>
        <p className="lead">{copy.lead}</p>
      </section>

      {stage === "initial" && (
        <div aria-label="Il rumore del marketing quotidiano">
          <div className="slot slot--receipt">
            <Receipt />
          </div>
          <div className="slot slot--review">
            <Review />
          </div>
          <div className="slot slot--flyer">
            <Flyer />
          </div>
        </div>
      )}

      <GlassPanel stage={stage}>
        {stage === "final" ? (
          <PlanStack />
        ) : (
          <p className="plan-hint">Il tuo piano</p>
        )}
      </GlassPanel>
      <Ctas emphasized={stage === "final"} />
      <GrainOverlay />
    </main>
  );
}

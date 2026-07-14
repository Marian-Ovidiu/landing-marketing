import { copy, type Stage } from "./copy";
import { Nav, Ctas, GlassPanel, GrainOverlay } from "./chrome";
import { Receipt, Review, Flyer, SocialPost, NoteFragment, Polaroid } from "./fragments";
import { PlanStack } from "./plan";

// Stato statico della hero desktop (viewport di riferimento 1440x1000).
// initial: campo di frammenti asimmetrico, pannello in secondo piano tonale.
// final: frammenti assorbiti (2 residui sfocati dietro il vetro), pila emersa, CTA piena.

export function HeroDesktop({ stage }: { stage: Stage }) {
  return (
    <main className={`stage stage--desktop stage--${stage}`}>
      <div className="hero-texture" aria-hidden="true" />
      <Nav />
      <section className="hero-copy">
        <h1 className="headline">
          {copy.headlineLines[0]}
          <br />
          {copy.headlineLines[1]}
          <br />
          {copy.headlineLines[2]}
        </h1>
        <p className="lead">{copy.lead}</p>
        <Ctas emphasized={stage === "final"} />
      </section>

      {stage === "initial" ? (
        <div aria-label="Il rumore del marketing quotidiano">
          <div className="slot slot--review">
            <Review />
          </div>
          <div className="slot slot--polaroid">
            <Polaroid />
          </div>
          <div className="slot slot--social">
            <SocialPost />
          </div>
          <div className="slot slot--receipt">
            <Receipt />
          </div>
          <div className="slot slot--note">
            <NoteFragment />
          </div>
          <div className="slot slot--flyer">
            <Flyer />
          </div>
        </div>
      ) : (
        <div aria-hidden="true">
          <div className="slot slot--absorbed slot--absorbed-receipt">
            <Receipt />
          </div>
          <div className="slot slot--absorbed slot--absorbed-flyer">
            <Flyer />
          </div>
          <div className="slot slot--absorbed slot--absorbed-polaroid">
            <Polaroid />
          </div>
        </div>
      )}

      <GlassPanel stage={stage}>{stage === "final" && <PlanStack />}</GlassPanel>
      <GrainOverlay />
    </main>
  );
}

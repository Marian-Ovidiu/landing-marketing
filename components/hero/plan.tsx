import { copy, type HeroCopy } from "./copy";

// La pila del piano: tre schede DOM con testo e numeri serif reali.
// La scheda 1 porta il filetto terracotta come marcatore di priorità.

function PlanCard({ n, title, detail }: { n: number; title: string; detail: string }) {
  return (
    <li className={`plan-card paper-grain${n === 1 ? " plan-card--priority" : ""}`}>
      <span className="plan-card-number" aria-hidden="true">
        {n}
      </span>
      <div>
        <h2 className="plan-card-title">{title}</h2>
        <p className="plan-card-detail">{detail}</p>
      </div>
    </li>
  );
}

export function PlanStack({ content = copy }: { content?: HeroCopy }) {
  return (
    <div className="plan-stack">
      <p className="plan-caption">{content.planCaption}</p>
      <ol className="plan-list">
        {content.planCards.map((c) => (
          <PlanCard key={c.n} n={c.n} title={c.title} detail={c.detail} />
        ))}
      </ol>
    </div>
  );
}

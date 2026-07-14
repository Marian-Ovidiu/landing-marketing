import Link from "next/link";
import "./route.css";

export const metadata = {
  title: "Raccontaci il tuo locale — Marketing Strategy Generator",
  description: "Destinazione provvisoria del flusso guidato.",
};

export default function CreateStrategyPage() {
  return (
    <main className="create-strategy-page">
      <section className="create-strategy-sheet" aria-labelledby="create-strategy-title">
        <p className="create-strategy-kicker">Destinazione provvisoria</p>
        <h1 id="create-strategy-title">Raccontaci il tuo locale</h1>
        <p>Il flusso guidato verrà collegato qui.</p>
        <Link href="/concept/page">Torna alla landing</Link>
      </section>
    </main>
  );
}

import SegnalePage from "./concept/segnale/page";
import "./concept/concept.css";

export const metadata = {
  title: "Segnale — Early Access",
};

export default function Home({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  return <SegnalePage searchParams={searchParams} />;
}

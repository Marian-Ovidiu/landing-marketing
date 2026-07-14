import { HeroLive } from "@/components/hero/HeroLive";
import "./live.css";

export const metadata = { title: "Concept C — Prototipo motion live" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const sp = await searchParams;
  return <HeroLive debug={sp.debug === "1"} />;
}

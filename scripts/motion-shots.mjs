import { chromium, webkit } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = path.resolve(
  process.cwd(),
  "../runs/2026-07-10-marketing-strategy-generator/screenshots/motion"
);
const PROGRESS = [0, 0.15, 0.35, 0.55, 0.72, 0.88, 1];

mkdirSync(OUT, { recursive: true });
const consoleErrors = [];

async function captureSequence(browser, label, viewport) {
  const page = await browser.newPage({ viewport });
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${label}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => consoleErrors.push(`${label}: ${err.message}`));

  await page.goto(BASE + "/concept/live", { waitUntil: "networkidle" });
  await page.waitForTimeout(700); // font, immagini, ScrollTrigger refresh

  const maxScroll = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );
  if (maxScroll <= 0) {
    consoleErrors.push(`${label}: runway assente (maxScroll=${maxScroll})`);
  }

  for (const p of PROGRESS) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(maxScroll * p));
    await page.waitForTimeout(400); // scrub e paint assestati
    const pct = String(Math.round(p * 100)).padStart(3, "0");
    const file = path.join(OUT, `${label}-p${pct}.png`);
    await page.screenshot({ path: file });
    console.log("saved", file);
  }
  await page.close();
}

// Chromium: sequenza completa desktop + mobile
const cr = await chromium.launch();
await captureSequence(cr, "desktop", { width: 1440, height: 1000 });
await captureSequence(cr, "mobile", { width: 390, height: 844 });

// Reduced motion: verifica che lo stato finale sia visibile senza scroll
const rmPage = await cr.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
rmPage.on("pageerror", (err) => consoleErrors.push(`reduced: ${err.message}`));
await rmPage.goto(BASE + "/concept/live", { waitUntil: "networkidle" });
await rmPage.waitForTimeout(700);
await rmPage.screenshot({ path: path.join(OUT, "desktop-reduced-motion.png") });
console.log("saved", path.join(OUT, "desktop-reduced-motion.png"));
await rmPage.close();
await cr.close();

// WebKit (Safari): spot check ai punti critici del vetro (35% e 72%)
const wk = await webkit.launch();
const wkPage = await wk.newPage({ viewport: { width: 1440, height: 1000 } });
wkPage.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(`webkit: ${msg.text()}`);
});
wkPage.on("pageerror", (err) => consoleErrors.push(`webkit: ${err.message}`));
await wkPage.goto(BASE + "/concept/live", { waitUntil: "networkidle" });
await wkPage.waitForTimeout(900);
const wkMax = await wkPage.evaluate(
  () => document.documentElement.scrollHeight - window.innerHeight
);
for (const p of [0.35, 0.72]) {
  await wkPage.evaluate((y) => window.scrollTo(0, y), Math.round(wkMax * p));
  await wkPage.waitForTimeout(500);
  const pct = String(Math.round(p * 100)).padStart(3, "0");
  const file = path.join(OUT, `webkit-desktop-p${pct}.png`);
  await wkPage.screenshot({ path: file });
  console.log("saved", file);
}
await wkPage.close();
await wk.close();

if (consoleErrors.length) {
  console.error("CONSOLE ERRORS:\n" + consoleErrors.join("\n"));
  process.exit(1);
}
console.log("no console errors");

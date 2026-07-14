// QA visiva del theming: screenshot deterministici prima/dopo per confronto pixel.
// Uso: node scripts/theme-qa-shots.mjs <outDir>
// - full page in reduced motion (stato statico, niente idle/ambient);
// - stati mid-scroll con motion normale (scrub assestato, idle fermo perché
//   progress > 0, keyframes CSS congelate da animations:"disabled").
// Fallisce se compaiono errori console su qualunque pagina.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const OUT = path.resolve(process.argv[2] ?? "theme-qa-shots");
mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1440, height: 1000 };
const MOBILE = { width: 390, height: 844 };

const browser = await chromium.launch();
const consoleErrors = [];

function watch(page, label) {
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${label}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => consoleErrors.push(`${label}: ${err.message}`));
}

async function fullPageReduced(route, viewport, name) {
  const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const page = await context.newPage();
  watch(page, name);
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  console.log("saved", name);
  await context.close();
}

// scroll a una frazione della corsa totale del documento, poi viewport shot
async function scrolledShot(route, viewport, fraction, name) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  watch(page, name);
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.evaluate((f) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.round(max * f));
  }, fraction);
  await page.waitForTimeout(1100); // scrub smoothing + settle idle/drift
  await page.screenshot({
    path: path.join(OUT, `${name}.png`),
    animations: "disabled", // congela le keyframes CSS (ambient), non GSAP
  });
  console.log("saved", name);
  await context.close();
}

// full page, reduced motion: pagina completa e prototipo live
await fullPageReduced("/concept/page", DESKTOP, "page-desktop-reduced");
await fullPageReduced("/concept/page", MOBILE, "page-mobile-reduced");
await fullPageReduced("/concept/live", DESKTOP, "live-desktop-reduced");
await fullPageReduced("/concept/live", MOBILE, "live-mobile-reduced");

// motion normale: stati assestati lungo la pagina (hero, S01, S02, S03/S04)
for (const [i, f] of [0.06, 0.18, 0.38, 0.62, 0.85, 1].entries()) {
  await scrolledShot("/concept/page", DESKTOP, f, `page-desktop-scroll-${i}`);
}
for (const [i, f] of [0.06, 0.2, 0.45, 0.7, 1].entries()) {
  await scrolledShot("/concept/page", MOBILE, f, `page-mobile-scroll-${i}`);
}
// prototipo live: convergenza e piano
await scrolledShot("/concept/live", DESKTOP, 0.45, "live-desktop-scroll-mid");
await scrolledShot("/concept/live", DESKTOP, 0.95, "live-desktop-scroll-end");
await scrolledShot("/concept/live", MOBILE, 0.5, "live-mobile-scroll-mid");

await browser.close();

if (consoleErrors.length) {
  console.error("CONSOLE ERRORS:\n" + consoleErrors.join("\n"));
  process.exit(1);
}
console.log("no console errors");

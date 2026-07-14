import { chromium, webkit } from "playwright";
import { mkdirSync, renameSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = path.resolve(
  process.cwd(),
  "../runs/2026-07-10-marketing-strategy-generator/screenshots/motion"
);
const POINTS = [0, 0.2, 0.38, 0.5, 0.58, 0.72, 0.88, 1];
const SETTLE = 700; // scrub 0.2: attesa per il catch-up

mkdirSync(OUT, { recursive: true });
const consoleErrors = [];

function wire(page, label) {
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${label}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => consoleErrors.push(`${label}: ${err.message}`));
}

async function open(page, label, url = "/concept/live") {
  await page.goto(BASE + url, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const maxScroll = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );
  if (maxScroll <= 0) consoleErrors.push(`${label}: runway assente (maxScroll=${maxScroll})`);
  return maxScroll;
}

async function shot(page, maxScroll, p, file) {
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(maxScroll * p));
  await page.waitForTimeout(SETTLE);
  await page.screenshot({ path: path.join(OUT, file) });
  console.log("saved", file);
}

// ---------- 1. Chromium 390x844: sequenza completa ----------
const cr = await chromium.launch();
{
  const page = await cr.newPage({ viewport: { width: 390, height: 844 } });
  wire(page, "mobile-390");
  const max = await open(page, "mobile-390");
  for (const p of POINTS) {
    await shot(page, max, p, `mobile-p${String(Math.round(p * 100)).padStart(3, "0")}.png`);
  }

  // stress: scroll rapido avanti/indietro, entrata/uscita pin, stato di ritorno
  await page.evaluate((y) => window.scrollTo(0, y), max + 200);
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(max * 0.5));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(SETTLE + 300);
  await page.screenshot({ path: path.join(OUT, "mobile-p000-return.png") });
  console.log("saved mobile-p000-return.png (dopo scroll rapido avanti/indietro)");

  // CTA utilizzabili a fine pin
  await page.evaluate((y) => window.scrollTo(0, y), max);
  await page.waitForTimeout(SETTLE);
  await page.locator(".cta-primary").click({ timeout: 3000 });
  await page.locator(".cta-secondary").click({ timeout: 3000 });
  console.log("CTA primaria e secondaria cliccabili a fine corsa");

  // resize barra indirizzi simulata: cambio altezza viewport a metà corsa
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(max * 0.5));
  await page.waitForTimeout(SETTLE);
  await page.setViewportSize({ width: 390, height: 780 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "mobile-resize-780-p050.png") });
  console.log("saved mobile-resize-780-p050.png (viewport 844→780 a metà corsa)");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "mobile-resize-back-p050.png") });
  console.log("saved mobile-resize-back-p050.png (ritorno a 844)");
  await page.close();
}

// ---------- 2. Chromium 360x800: spot check ----------
{
  const page = await cr.newPage({ viewport: { width: 360, height: 800 } });
  wire(page, "mobile-360");
  const max = await open(page, "mobile-360");
  for (const p of [0, 0.58, 1]) {
    await shot(page, max, p, `mobile360-p${String(Math.round(p * 100)).padStart(3, "0")}.png`);
  }
  await page.close();
}

// ---------- 3. Debug HUD a 38% ----------
{
  const page = await cr.newPage({ viewport: { width: 390, height: 844 } });
  wire(page, "mobile-debug");
  const max = await open(page, "mobile-debug", "/concept/live?debug=1");
  await shot(page, max, 0.38, "mobile-debug-p038.png");
  await page.close();
}

// ---------- 4. Reduced motion ----------
{
  const page = await cr.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  wire(page, "mobile-reduced");
  await page.goto(BASE + "/concept/live", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, "mobile-reduced-motion.png") });
  console.log("saved mobile-reduced-motion.png");
  // CTA raggiungibile subito
  await page.locator(".cta-primary").click({ timeout: 3000 });
  console.log("reduced motion: CTA subito cliccabile");
  await page.close();
}

// ---------- 5. Video debug (registrazione Playwright, nessuna dipendenza extra) ----------
{
  const ctx = await cr.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: OUT, size: { width: 390, height: 844 } },
  });
  const page = await ctx.newPage();
  wire(page, "mobile-video");
  const max = await open(page, "mobile-video");
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round((max * i) / steps));
    await page.waitForTimeout(50);
  }
  await page.waitForTimeout(500);
  const video = page.video();
  await page.close();
  await ctx.close();
  if (video) {
    const p = await video.path();
    renameSync(p, path.join(OUT, "mobile-scroll-debug.webm"));
    console.log("saved mobile-scroll-debug.webm");
  }
}
await cr.close();

// ---------- 6. WebKit 390x844: spot check ----------
{
  const wk = await webkit.launch();
  const page = await wk.newPage({ viewport: { width: 390, height: 844 } });
  wire(page, "webkit-mobile");
  const max = await open(page, "webkit-mobile");
  for (const p of [0.38, 0.72]) {
    await shot(page, max, p, `webkit-mobile-p${String(Math.round(p * 100)).padStart(3, "0")}.png`);
  }
  await page.close();
  await wk.close();
}

if (consoleErrors.length) {
  console.error("CONSOLE ERRORS:\n" + consoleErrors.join("\n"));
  process.exit(1);
}
console.log("no console errors");

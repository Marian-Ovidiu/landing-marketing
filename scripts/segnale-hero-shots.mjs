// QA della hero Direzione B «Segnale» (/concept/segnale).
// Uso: node scripts/segnale-hero-shots.mjs <outDir>
// - screenshot desktop 0/35/72/100% e mobile 0/50/100% della corsa;
// - reduced motion desktop/mobile (full page);
// - smoke 1280/1024/360 + WebKit mobile;
// - verifiche: zero errori console, zero richieste /assets/ (texture,
//   Polaroid), nessun overflow orizzontale, reverse scroll + idle handoff;
// - inventario dei font caricati (Inter Tight: un solo file variabile atteso).

import { chromium, webkit } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const ROUTE = "/concept/segnale";
const OUT = path.resolve(process.argv[2] ?? "segnale-hero-shots");
mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1440, height: 1000 };
const MOBILE = { width: 390, height: 844 };

const errors = [];
const assetRequests = [];
const fontRequests = new Set();
let failures = 0;

function watch(page, label) {
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${label}: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/assets/")) assetRequests.push(`${label}: ${url}`);
    if (/\.woff2?(\?|$)/.test(url)) fontRequests.add(url.split("/").pop());
  });
}

async function assertNoOverflow(page, label) {
  const dims = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  if (dims.sw > dims.cw) {
    failures += 1;
    console.error(`OVERFLOW ${label}: scrollWidth ${dims.sw} > clientWidth ${dims.cw}`);
  }
}

async function scrollShot(browser, viewport, fraction, name, { fullPage = false, reduced = false } = {}) {
  const ctx = await browser.newContext({
    viewport,
    ...(reduced ? { reducedMotion: "reduce" } : {}),
  });
  const page = await ctx.newPage();
  watch(page, name);
  await page.goto(BASE + ROUTE, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  if (fraction > 0) {
    await page.evaluate((f) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.round(max * f));
    }, fraction);
    await page.waitForTimeout(1100); // scrub + settle
  }
  await assertNoOverflow(page, name);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage, animations: "disabled" });
  console.log("saved", name);
  await ctx.close();
}

const chromiumBrowser = await chromium.launch();

// --- screenshot richiesti ---
await scrollShot(chromiumBrowser, DESKTOP, 0, "segnale-desktop-000");
await scrollShot(chromiumBrowser, DESKTOP, 0.35, "segnale-desktop-035");
await scrollShot(chromiumBrowser, DESKTOP, 0.72, "segnale-desktop-072");
await scrollShot(chromiumBrowser, DESKTOP, 1, "segnale-desktop-100");
await scrollShot(chromiumBrowser, MOBILE, 0, "segnale-mobile-000");
await scrollShot(chromiumBrowser, MOBILE, 0.5, "segnale-mobile-050");
await scrollShot(chromiumBrowser, MOBILE, 1, "segnale-mobile-100");
await scrollShot(chromiumBrowser, DESKTOP, 0, "segnale-desktop-reduced", { fullPage: true, reduced: true });
await scrollShot(chromiumBrowser, MOBILE, 0, "segnale-mobile-reduced", { fullPage: true, reduced: true });

// --- smoke su viewport intermedi ---
await scrollShot(chromiumBrowser, { width: 1280, height: 800 }, 0.5, "segnale-smoke-1280");
await scrollShot(chromiumBrowser, { width: 1024, height: 768 }, 0.5, "segnale-smoke-1024");
await scrollShot(chromiumBrowser, { width: 360, height: 800 }, 0.5, "segnale-smoke-360");

// --- reverse scroll + idle handoff (come il test del tema A) ---
{
  const ctx = await chromiumBrowser.newContext({ viewport: DESKTOP });
  const page = await ctx.newPage();
  watch(page, "reverse-idle");
  await page.goto(BASE + ROUTE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1700);
  const floatState = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-fragment-float]")).map((node) => {
        const m = new DOMMatrixReadOnly(getComputedStyle(node).transform);
        return Math.abs(m.m41) + Math.abs(m.m42);
      })
    );
  const idle = await floatState();
  if (!idle.some((v) => v > 0.05)) {
    failures += 1;
    console.error("IDLE: nessun moto idle rilevato a scroll 0");
  }
  // avanti fino a fine corsa, poi ritorno esatto in cima
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight - window.innerHeight));
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const back = await page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-frag]")).map((node) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(node).transform);
      return { x: m.m41, y: m.m42 };
    })
  );
  if (!back.every(({ x, y }) => Math.abs(x) < 0.5 && Math.abs(y) < 0.5)) {
    failures += 1;
    console.error("REVERSE: gli slot non tornano allo stato iniziale", back);
  }
  await page.waitForTimeout(1500);
  const restarted = await floatState();
  if (!restarted.some((v) => v > 0.05)) {
    failures += 1;
    console.error("IDLE RESTART: l'idle non riparte dopo il ritorno in cima");
  }
  console.log("reverse scroll + idle handoff ok");
  await ctx.close();
}

await chromiumBrowser.close();

// --- WebKit mobile smoke ---
{
  const wk = await webkit.launch();
  const ctx = await wk.newContext({ viewport: MOBILE });
  const page = await ctx.newPage();
  watch(page, "webkit-mobile");
  await page.goto(BASE + ROUTE, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.round(max * 0.6));
  });
  await page.waitForTimeout(1100);
  await assertNoOverflow(page, "webkit-mobile");
  await page.screenshot({ path: path.join(OUT, "segnale-webkit-mobile.png"), animations: "disabled" });
  console.log("saved segnale-webkit-mobile");
  await ctx.close();
  await wk.close();
}

// --- verdetti ---
if (assetRequests.length) {
  failures += 1;
  console.error("ASSET RICHIESTI (attesi zero):\n" + assetRequests.join("\n"));
} else {
  console.log("zero richieste /assets/ (texture e Polaroid assenti)");
}
console.log("font richiesti:", [...fontRequests].join(", ") || "nessuno");
if (errors.length) {
  failures += 1;
  console.error("CONSOLE ERRORS:\n" + errors.join("\n"));
} else {
  console.log("no console errors");
}
process.exit(failures ? 1 : 0);

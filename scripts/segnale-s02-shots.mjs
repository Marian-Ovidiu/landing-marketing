// QA S02 Segnale — «Operational Rhythm» (fase S02-B2).
// Sequenze, transizione S01→S02, confronti mockup/live, breakpoint, DPR 2,
// reduced motion, reverse, WebKit, CLS/overflow e regressioni pixel-diff
// (S01 e Direzione A contro le catture della fase B1).
//
// BASE_URL: server di produzione (default 3100). REGRESSION_URL: stesso
// ambiente delle catture B1 (dev 3000) per un diff pulito.

import { chromium, webkit } from "playwright";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const REGRESSION_BASE = process.env.REGRESSION_URL ?? "http://localhost:3000";
const RUN = path.resolve("../runs/2026-07-10-marketing-strategy-generator");
const OUT = path.join(RUN, "screenshots/segnale-s02-operational-rhythm");
const B1_CURRENT = path.join(RUN, "screenshots/segnale-s02-art-direction/current");
const B1_ASSETS = path.join(RUN, "outputs/segnale-s02-art-direction-assets");

const dirs = Object.fromEntries(
  ["desktop", "mobile", "transition", "compare", "sequence", "qa", "qa/regression"].map((name) => [
    name,
    path.join(OUT, name),
  ]),
);
Object.values(dirs).forEach((dir) => mkdirSync(dir, { recursive: true }));

const errors = [];
const measurements = {};
let failures = 0;
const pct = (progress) => String(Math.round(progress * 100)).padStart(3, "0");

function watch(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${label}: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`${label}: ${error.message}`));
}

async function metrics(page, selector = "#section-02-esempio-di-piano") {
  return page.locator(selector).evaluate((section) => {
    const rect = section.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      height: rect.height,
      range: rect.height - window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      sticky: getComputedStyle(section.querySelector(".segnale-weekly-rhythm-sticky")).position,
    };
  });
}

async function scrollSection(page, sectionMetrics, progress) {
  await page.evaluate(
    (y) => window.scrollTo(0, Math.round(y)),
    sectionMetrics.top + sectionMetrics.range * progress,
  );
  await page.waitForTimeout(500);
}

async function state(page) {
  return page.locator("#section-02-esempio-di-piano").evaluate((section) => {
    const css = (selector) => getComputedStyle(section.querySelector(selector));
    return {
      band: css("[data-band-base]").strokeDashoffset,
      markerLun: css("[data-marker-lun]").stroke,
      markerMar: css("[data-marker-mar]").stroke,
      markerDom: css("[data-marker-dom]").stroke,
      massLun: css("[data-mass-lun]").opacity,
      massMar: css("[data-mass-mar]").opacity,
      massDom: css("[data-mass-dom]").opacity,
      massLunTransform: css("[data-mass-lun]").transform,
      quiet: css("[data-quiet]").opacity,
      closing: css("[data-closing]").opacity,
    };
  });
}

const chrome = await chromium.launch();

// ---------- sequenze desktop e mobile ----------

const DESKTOP_FRACTIONS = [0, 0.15, 0.35, 0.5, 0.6, 0.8, 1];
const MOBILE_FRACTIONS = [0, 0.5, 0.8, 1];

async function sequence(viewport, label, fractions, outDir) {
  const page = await chrome.newPage({ viewport });
  watch(page, label);
  await page.goto(`${BASE}/concept/segnale`, { waitUntil: "networkidle" });
  const m = await metrics(page);
  measurements[label] = m;
  if (m.scrollWidth > m.clientWidth) {
    failures += 1;
    console.error(`overflow ${label}: ${m.scrollWidth} > ${m.clientWidth}`);
  }
  const files = [];
  for (const progress of fractions) {
    await scrollSection(page, m, progress);
    const file = path.join(outDir, `${label}-${pct(progress)}.png`);
    await page.screenshot({ path: file, animations: "disabled" });
    files.push(file);
  }
  measurements[`${label}-final-state`] = await state(page);
  await page.close();
  return files;
}

const desktopFiles = await sequence({ width: 1440, height: 1000 }, "desktop", DESKTOP_FRACTIONS, dirs.desktop);
const mobileFiles = await sequence({ width: 390, height: 844 }, "mobile", MOBILE_FRACTIONS, dirs.mobile);

// strip di sequenza
execFileSync("magick", [
  ...desktopFiles.flatMap((f) => [f, "-thumbnail", "320x"]),
  "+append",
  path.join(dirs.sequence, "desktop-sequence-strip.png"),
]);
execFileSync("magick", [
  ...mobileFiles.flatMap((f) => [f, "-thumbnail", "240x"]),
  "+append",
  path.join(dirs.sequence, "mobile-sequence-strip.png"),
]);

// ---------- transizione S01 → S02 ----------

for (const [label, viewport, reveal] of [
  ["desktop", { width: 1440, height: 1000 }, 0.62],
  ["mobile", { width: 390, height: 844 }, 0.55],
]) {
  const page = await chrome.newPage({ viewport });
  watch(page, `transition-${label}`);
  await page.goto(`${BASE}/concept/segnale`, { waitUntil: "networkidle" });
  const m = await metrics(page);
  await page.evaluate((y) => window.scrollTo(0, Math.round(y)), m.top - viewport.height * reveal);
  await page.waitForTimeout(550);
  await page.screenshot({
    path: path.join(dirs.transition, `s01-to-s02-${label}.png`),
    animations: "disabled",
  });
  // ritorno S02→S01: risalendo, S01 deve ritrovare lo stato finale
  await scrollSection(page, m, 0.4);
  await page.evaluate((y) => window.scrollTo(0, Math.round(y)), m.top - viewport.height);
  await page.waitForTimeout(550);
  await page.screenshot({
    path: path.join(dirs.transition, `s02-back-to-s01-${label}.png`),
    animations: "disabled",
  });
  await page.close();
}

// ---------- confronto mockup B1 / live ----------

execFileSync("magick", [
  path.join(B1_ASSETS, "a-operational-rhythm-final-desktop.png"), "-thumbnail", "620x",
  path.join(dirs.desktop, "desktop-100.png"), "-thumbnail", "620x",
  "+append",
  path.join(dirs.compare, "mockup-vs-live-final-desktop.png"),
]);
execFileSync("magick", [
  path.join(B1_ASSETS, "a-operational-rhythm-middle-desktop.png"), "-thumbnail", "620x",
  path.join(dirs.desktop, "desktop-050.png"), "-thumbnail", "620x",
  "+append",
  path.join(dirs.compare, "mockup-vs-live-middle-desktop.png"),
]);
execFileSync("magick", [
  path.join(B1_ASSETS, "a-operational-rhythm-final-mobile.png"), "-thumbnail", "300x",
  path.join(dirs.mobile, "mobile-100.png"), "-thumbnail", "300x",
  "+append",
  path.join(dirs.compare, "mockup-vs-live-final-mobile.png"),
]);
// prova thumbnail: a scala francobollo si devono leggere tre masse, non un chart
execFileSync("magick", [
  path.join(B1_ASSETS, "a-operational-rhythm-final-desktop.png"), "-thumbnail", "288x200", "-gravity", "center", "-background", "#f9fafb", "-extent", "288x200",
  path.join(dirs.desktop, "desktop-100.png"), "-thumbnail", "288x200", "-gravity", "center", "-background", "#f9fafb", "-extent", "288x200",
  "+append",
  path.join(dirs.compare, "thumbnail-mockup-vs-live.png"),
]);

// ---------- breakpoint, DPR 2, reduced motion ----------

async function inspect(browser, label, viewport, options = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: options.deviceScaleFactor ?? 1,
    reducedMotion: options.reducedMotion ?? "no-preference",
  });
  const page = await context.newPage();
  watch(page, label);
  await page.addInitScript(() => {
    window.__s02Cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__s02Cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(`${BASE}/concept/segnale`, { waitUntil: "networkidle" });
  const m = await metrics(page);
  if (options.reducedMotion === "reduce") {
    await page.locator("#section-02-esempio-di-piano").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
  } else {
    await scrollSection(page, m, options.progress ?? 0.8);
  }
  const result = {
    ...m,
    state: await state(page),
    cls: await page.evaluate(() => window.__s02Cls),
    reducedMotion: options.reducedMotion ?? "no-preference",
    deviceScaleFactor: options.deviceScaleFactor ?? 1,
  };
  measurements[label] = result;
  if (result.scrollWidth > result.clientWidth) failures += 1;
  if (result.cls > 0.02) failures += 1;
  await page.screenshot({ path: path.join(dirs.qa, `${label}.png`), animations: "disabled" });
  await context.close();
}

for (const [label, viewport] of [
  ["chrome-1024x900", { width: 1024, height: 900 }],
  ["chrome-768x900", { width: 768, height: 900 }],
  ["chrome-390x844", { width: 390, height: 844 }],
  ["chrome-375x812", { width: 375, height: 812 }],
  ["chrome-360x800", { width: 360, height: 800 }],
]) {
  await inspect(chrome, label, viewport);
}
await inspect(chrome, "chrome-1440x1000-dpr2", { width: 1440, height: 1000 }, { deviceScaleFactor: 2 });
await inspect(chrome, "reduced-motion-1440x1000", { width: 1440, height: 1000 }, { reducedMotion: "reduce" });
await inspect(chrome, "reduced-motion-390x844", { width: 390, height: 844 }, { reducedMotion: "reduce" });

// ---------- reverse e refresh a metà ----------

{
  const page = await chrome.newPage({ viewport: { width: 1440, height: 1000 } });
  watch(page, "reverse");
  await page.goto(`${BASE}/concept/segnale`, { waitUntil: "networkidle" });
  const m = await metrics(page);
  for (const [from, to] of [
    [0.2, 0.55],
    [0.45, 0.85],
    [0, 1],
  ]) {
    await scrollSection(page, m, from);
    const before = await state(page);
    await scrollSection(page, m, to);
    await scrollSection(page, m, from);
    const after = await state(page);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      failures += 1;
      console.error(`reverse ${from}→${to}→${from} non deterministico`);
    }
  }
  await scrollSection(page, m, 0.45);
  await page.screenshot({ path: path.join(dirs.qa, "reverse-045-before.png"), animations: "disabled" });
  await scrollSection(page, m, 0.85);
  await scrollSection(page, m, 0.45);
  await page.screenshot({ path: path.join(dirs.qa, "reverse-045-after.png"), animations: "disabled" });

  // refresh a metà corsa
  await scrollSection(page, m, 0.5);
  const beforeRefresh = await state(page);
  await page.evaluate(() => window.location.reload());
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  await scrollSection(page, m, 0.5);
  const afterRefresh = await state(page);
  if (JSON.stringify(beforeRefresh) !== JSON.stringify(afterRefresh)) {
    failures += 1;
    console.error("refresh a metà non deterministico");
  }
  await page.close();
}

await chrome.close();

// ---------- WebKit ----------

const safari = await webkit.launch();
await inspect(safari, "webkit-390x844", { width: 390, height: 844 });
await safari.close();

// ---------- regressioni pixel-diff vs catture B1 (stesso ambiente dev) ----------

const regression = await chromium.launch();

async function recapture(viewport, label, capture) {
  const page = await regression.newPage({ viewport });
  watch(page, `regression-${label}`);
  await capture(page);
  await page.close();
}

async function s01States(page, label) {
  await page.goto(`${REGRESSION_BASE}/concept/segnale`, { waitUntil: "networkidle" });
  const m = await page.locator("#section-01-come-funziona").evaluate((s) => ({
    top: s.getBoundingClientRect().top + window.scrollY,
    range: s.getBoundingClientRect().height - window.innerHeight,
  }));
  for (const progress of [0, 0.5, 1]) {
    await page.evaluate((y) => window.scrollTo(0, Math.round(y)), m.top + m.range * progress);
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(dirs["qa/regression"], `segnale-${label}-s01-${pct(progress)}.png`),
      animations: "disabled",
    });
  }
}

async function deckStates(page, label) {
  await page.goto(`${REGRESSION_BASE}/concept/page`, { waitUntil: "networkidle" });
  const runway = await page.locator("#section-02-esempio-di-piano .deck-runway").evaluate((el) => ({
    top: el.getBoundingClientRect().top + window.scrollY,
    range: el.getBoundingClientRect().height - window.innerHeight,
  }));
  for (const [name, progress] of [["initial", 0.02], ["middle", 0.5], ["final", 0.98]]) {
    await page.evaluate((y) => window.scrollTo(0, Math.round(y)), runway.top + runway.range * progress);
    await page.waitForTimeout(700);
    await page.screenshot({
      path: path.join(dirs["qa/regression"], `direzione-a-s02-${label}-${name}.png`),
      animations: "disabled",
    });
  }
}

await recapture({ width: 1440, height: 1000 }, "desktop", (page) => s01States(page, "desktop"));
await recapture({ width: 390, height: 844 }, "mobile", (page) => s01States(page, "mobile"));
await recapture({ width: 1440, height: 1000 }, "desktop", (page) => deckStates(page, "desktop"));
await recapture({ width: 390, height: 844 }, "mobile", (page) => deckStates(page, "mobile"));
await regression.close();

const diffs = {};
function pixelDiff(name, before, after) {
  // la metrica di `magick compare` esce sempre su stderr (anche a exit 0)
  const result = spawnSync("magick", ["compare", "-metric", "RMSE", before, after, "null:"], {
    encoding: "utf8",
  });
  diffs[name] = (result.stderr ?? "").trim() || "errore";
  const normalized = parseFloat(/\(([\d.e-]+)\)/.exec(diffs[name])?.[1] ?? "1");
  if (normalized > 0.005) {
    failures += 1;
    console.error(`regressione ${name}: RMSE ${diffs[name]}`);
  }
}

for (const file of [
  "segnale-desktop-s01-000", "segnale-desktop-s01-050", "segnale-desktop-s01-100",
  "segnale-mobile-s01-000", "segnale-mobile-s01-050", "segnale-mobile-s01-100",
  "direzione-a-s02-desktop-initial", "direzione-a-s02-desktop-middle", "direzione-a-s02-desktop-final",
  "direzione-a-s02-mobile-initial", "direzione-a-s02-mobile-middle", "direzione-a-s02-mobile-final",
]) {
  pixelDiff(file, path.join(B1_CURRENT, `${file}.png`), path.join(dirs["qa/regression"], `${file}.png`));
}
measurements.regressionDiffs = diffs;

writeFileSync(path.join(dirs.qa, "measurements.json"), JSON.stringify(measurements, null, 2));

if (errors.length) {
  failures += 1;
  console.error(`console/page errors:\n${errors.join("\n")}`);
}
console.log(`S02 QA screenshots: ${OUT}`);
console.log(`console errors: ${errors.length}; failures: ${failures}`);
process.exit(failures ? 1 : 0);

// QA S01 Segnale — Editorial Tracing A2.
// Cattura stati, transizione, breakpoint, reduced motion, WebKit, DPR 2 e
// registra misure/spot-check deterministici senza dipendere dal runway hero.

import { chromium, webkit } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const OUT = path.resolve(
  process.argv[2] ??
    "../runs/2026-07-10-marketing-strategy-generator/screenshots/segnale-s01-editorial-tracing",
);
const dirs = Object.fromEntries(
  ["desktop", "mobile", "transition", "compare", "sequence", "qa"].map((name) => [
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

async function metrics(page) {
  return page.locator("#section-01-come-funziona").evaluate((section) => {
    const rect = section.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      height: rect.height,
      range: rect.height - window.innerHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      sticky: getComputedStyle(section.querySelector(".segnale-how-it-works-sticky")).position,
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
  return page.locator("#section-01-come-funziona").evaluate((section) => {
    const css = (selector) => getComputedStyle(section.querySelector(selector));
    return {
      noise: css("[data-noise]").opacity,
      evidence: css("[data-evidence]").opacity,
      evidenceTransform: css("[data-evidence]").transform,
      centerOpacity: css("[data-trace-center]").opacity,
      centerDash: css("[data-trace-center]").strokeDashoffset,
      markerStroke: css("[data-marker-useful]").stroke,
      decision: css("[data-decision]").opacity,
      detail: css("[data-decision-detail]").opacity,
      ruleTransform: css("[data-decision-rule]").transform,
    };
  });
}

async function captureSequence(browser, label, viewport, fractions, outDir) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  watch(page, label);
  await page.goto(`${BASE}/concept/segnale`, { waitUntil: "networkidle" });
  const sectionMetrics = await metrics(page);
  measurements[label] = sectionMetrics;
  if (sectionMetrics.scrollWidth > sectionMetrics.clientWidth) {
    failures += 1;
    console.error(`overflow ${label}: ${sectionMetrics.scrollWidth} > ${sectionMetrics.clientWidth}`);
  }
  for (const progress of fractions) {
    await scrollSection(page, sectionMetrics, progress);
    await page.screenshot({
      path: path.join(outDir, `${label}-${pct(progress)}.png`),
      animations: "disabled",
    });
  }
  await context.close();
}

async function inspect(browser, label, viewport, options = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: options.deviceScaleFactor ?? 1,
    reducedMotion: options.reducedMotion ?? "no-preference",
  });
  const page = await context.newPage();
  watch(page, label);
  await page.addInitScript(() => {
    window.__s01Cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__s01Cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(`${BASE}/concept/segnale`, { waitUntil: "networkidle" });
  const sectionMetrics = await metrics(page);
  if (options.reducedMotion === "reduce") {
    await page.locator("#section-01-come-funziona").scrollIntoViewIfNeeded();
  } else {
    await scrollSection(page, sectionMetrics, options.progress ?? 0.7);
  }
  const result = {
    ...sectionMetrics,
    state: await state(page),
    cls: await page.evaluate(() => window.__s01Cls),
    reducedMotion: options.reducedMotion ?? "no-preference",
    deviceScaleFactor: options.deviceScaleFactor ?? 1,
  };
  measurements[label] = result;
  if (result.scrollWidth > result.clientWidth) failures += 1;
  if (result.cls > 0.02) failures += 1;
  await page.screenshot({ path: path.join(dirs.qa, `${label}.png`), animations: "disabled" });
  await context.close();
}

const chrome = await chromium.launch();
await captureSequence(
  chrome,
  "desktop",
  { width: 1440, height: 1000 },
  [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1],
  dirs.desktop,
);
await captureSequence(
  chrome,
  "mobile",
  { width: 390, height: 844 },
  [0, 0.5, 0.7, 1],
  dirs.mobile,
);

// Transizione: il fondo viewport intercetta la testata S01 mentre la coda
// reale della hero resta ancora visibile nella parte alta.
for (const [label, viewport, reveal] of [
  ["desktop", { width: 1440, height: 1000 }, 0.65],
  ["mobile", { width: 390, height: 844 }, 0.25],
]) {
  const page = await chrome.newPage({ viewport });
  watch(page, `transition-${label}`);
  await page.goto(`${BASE}/concept/segnale`, { waitUntil: "networkidle" });
  const sectionMetrics = await metrics(page);
  await page.evaluate((y) => window.scrollTo(0, y), sectionMetrics.top - viewport.height * reveal);
  await page.waitForTimeout(550);
  await page.screenshot({
    path: path.join(dirs.transition, `hero-to-s01-${label}.png`),
    animations: "disabled",
  });
  await page.close();
}

for (const [label, viewport] of [
  ["1024x900", { width: 1024, height: 900 }],
  ["768x900", { width: 768, height: 900 }],
  ["390x844", { width: 390, height: 844 }],
  ["375x812", { width: 375, height: 812 }],
  ["360x800", { width: 360, height: 800 }],
]) {
  await inspect(chrome, `chrome-${label}`, viewport);
}
await inspect(chrome, "chrome-1440x1000-dpr2", { width: 1440, height: 1000 }, {
  deviceScaleFactor: 2,
});
await inspect(chrome, "reduced-motion-390x844", { width: 390, height: 844 }, {
  reducedMotion: "reduce",
});

// Reverse: confronto di tutte le proprietà ammesse dopo andata/ritorno.
{
  const page = await chrome.newPage({ viewport: { width: 1440, height: 1000 } });
  watch(page, "reverse");
  await page.goto(`${BASE}/concept/segnale`, { waitUntil: "networkidle" });
  const sectionMetrics = await metrics(page);
  for (const [from, to] of [
    [0.2, 0.6],
    [0.45, 0.85],
    [0, 1],
  ]) {
    await scrollSection(page, sectionMetrics, from);
    const before = await state(page);
    await scrollSection(page, sectionMetrics, to);
    await scrollSection(page, sectionMetrics, from);
    const after = await state(page);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      failures += 1;
      console.error(`reverse ${from}→${to}→${from} non deterministico`);
    }
  }
  await scrollSection(page, sectionMetrics, 0.45);
  await page.screenshot({ path: path.join(dirs.qa, "reverse-045-before.png"), animations: "disabled" });
  await scrollSection(page, sectionMetrics, 0.85);
  await scrollSection(page, sectionMetrics, 0.45);
  await page.screenshot({ path: path.join(dirs.qa, "reverse-045-after.png"), animations: "disabled" });
  await page.close();
}
await chrome.close();

const safari = await webkit.launch();
await inspect(safari, "webkit-390x844", { width: 390, height: 844 });
await safari.close();

writeFileSync(path.join(dirs.qa, "measurements.json"), JSON.stringify(measurements, null, 2));

if (errors.length) {
  failures += 1;
  console.error(`console/page errors:\n${errors.join("\n")}`);
}
console.log(`S01 screenshots: ${OUT}`);
console.log(`console errors: ${errors.length}; failures: ${failures}`);
process.exit(failures ? 1 : 0);

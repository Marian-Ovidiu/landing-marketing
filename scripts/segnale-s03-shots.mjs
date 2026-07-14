// QA S03 Segnale — Dark Editorial Reveal.
// Cattura stati, transizione, breakpoint, reduced motion, reverse, WebKit,
// contrasto/CLS/overflow e spot-check delle superfici congelate.

import { chromium, webkit } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const RUN = path.resolve("../runs/2026-07-10-marketing-strategy-generator");
const OUT = path.join(RUN, "screenshots/segnale-s03-dark-editorial");
const MOCKUPS = path.join(RUN, "screenshots/segnale-s03-art-direction/concept-a-dark-editorial-reveal");
const DIRS = Object.fromEntries(
  ["desktop", "mobile", "transition", "compare", "sequence", "qa"].map((name) => [name, path.join(OUT, name)]),
);
Object.values(DIRS).forEach((dir) => mkdirSync(dir, { recursive: true }));

const errors = [];
const measurements = {};
let failures = 0;
const pct = (value) => String(Math.round(value * 100)).padStart(3, "0");

function watch(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${label}: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`${label}: ${error.message}`));
}

async function sectionMetrics(page, selector = "#section-03-cosa-ricevi") {
  return page.locator(selector).evaluate((section) => {
    const rect = section.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      height: rect.height,
      range: rect.height - window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
}

async function moveTo(page, metrics, progress) {
  await page.evaluate((y) => window.scrollTo(0, Math.round(y)), metrics.top + metrics.range * progress);
  await page.waitForTimeout(550);
}

async function state(page) {
  return page.locator("#section-03-cosa-ricevi").evaluate((section) => {
    const css = (selector) => getComputedStyle(section.querySelector(selector));
    return {
      surface: css("[data-s03-surface]").transform,
      priorities: css("[data-s03-priorities]").opacity,
      week: css("[data-s03-week]").opacity,
      indicators: css("[data-s03-indicators]").opacity,
      secondary: css("[data-s03-secondary]").opacity,
      indexSecondary: css("[data-s03-index-secondary]").opacity,
      closing: css("[data-s03-closing]").opacity,
      orientation: css("[data-s03-orientation-rule]").strokeDashoffset,
      closingRule: css("[data-s03-closing-rule]").strokeDashoffset,
    };
  });
}

const chrome = await chromium.launch();

async function sequence(viewport, label, fractions, directory) {
  const context = await chrome.newContext({ viewport });
  const page = await context.newPage();
  watch(page, label);
  await page.goto(`${BASE}/concept/segnale`, { waitUntil: "networkidle" });
  const metrics = await sectionMetrics(page);
  measurements[label] = metrics;
  if (metrics.scrollWidth > metrics.clientWidth) failures += 1;
  const files = [];
  for (const progress of fractions) {
    await moveTo(page, metrics, progress);
    const file = path.join(directory, `${label}-${pct(progress)}.png`);
    await page.screenshot({ path: file, animations: "disabled" });
    files.push(file);
  }
  measurements[`${label}-final`] = await state(page);
  await context.close();
  return files;
}

const desktopFiles = await sequence(
  { width: 1440, height: 1000 },
  "desktop",
  [0, 0.2, 0.3, 0.5, 0.68, 0.84, 1],
  DIRS.desktop,
);
const mobileFiles = await sequence(
  { width: 390, height: 844 },
  "mobile",
  [0, 0.5, 0.84, 1],
  DIRS.mobile,
);

execFileSync("magick", [
  ...desktopFiles.flatMap((file) => [file, "-thumbnail", "300x"]),
  "+append",
  path.join(DIRS.sequence, "desktop-sequence-strip.png"),
]);
execFileSync("magick", [
  ...mobileFiles.flatMap((file) => [file, "-thumbnail", "220x"]),
  "+append",
  path.join(DIRS.sequence, "mobile-sequence-strip.png"),
]);

// Transizione reale: coda S02, taglio netto, inizio S03.
for (const [label, viewport, reveal] of [
  ["desktop", { width: 1440, height: 1000 }, 0.5],
  ["mobile", { width: 390, height: 844 }, 0.52],
]) {
  const page = await chrome.newPage({ viewport });
  watch(page, `transition-${label}`);
  await page.goto(`${BASE}/concept/segnale`, { waitUntil: "networkidle" });
  const metrics = await sectionMetrics(page);
  await page.evaluate((y) => window.scrollTo(0, Math.round(y)), metrics.top - viewport.height * reveal);
  await page.waitForTimeout(550);
  await page.screenshot({ path: path.join(DIRS.transition, `s02-to-s03-${label}.png`), animations: "disabled" });
  await page.close();
}

// Mockup vs live e thumbnail.
for (const [mockup, live, output] of [
  ["a-middle-desktop.png", "desktop-050.png", "mockup-vs-live-middle-desktop.png"],
  ["a-final-desktop.png", "desktop-100.png", "mockup-vs-live-final-desktop.png"],
  ["a-final-mobile.png", "mobile-100.png", "mockup-vs-live-final-mobile.png"],
]) {
  execFileSync("magick", [
    path.join(MOCKUPS, mockup), "-thumbnail", mockup.includes("mobile") ? "300x" : "620x",
    path.join(mockup.includes("mobile") ? DIRS.mobile : DIRS.desktop, live), "-thumbnail", mockup.includes("mobile") ? "300x" : "620x",
    "+append",
    path.join(DIRS.compare, output),
  ]);
}
execFileSync("magick", [
  path.join(MOCKUPS, "a-final-desktop.png"), "-thumbnail", "288x200", "-gravity", "center", "-background", "#171b1d", "-extent", "288x200",
  path.join(DIRS.desktop, "desktop-100.png"), "-thumbnail", "288x200", "-gravity", "center", "-background", "#171b1d", "-extent", "288x200",
  "+append",
  path.join(DIRS.compare, "thumbnail-mockup-vs-live.png"),
]);

async function inspect(browser, label, viewport, options = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: options.deviceScaleFactor ?? 1,
    reducedMotion: options.reducedMotion ?? "no-preference",
  });
  const page = await context.newPage();
  watch(page, label);
  await page.addInitScript(() => {
    window.__s03Cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__s03Cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(`${BASE}/concept/segnale`, { waitUntil: "networkidle" });
  const metrics = await sectionMetrics(page);
  if (options.reducedMotion === "reduce") {
    await page.locator("#section-03-cosa-ricevi").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
  } else {
    await moveTo(page, metrics, options.progress ?? 1);
  }
  const result = {
    ...metrics,
    state: await state(page),
    cls: await page.evaluate(() => window.__s03Cls),
    surfaceBox: await page.locator("[data-s03-surface]").evaluate((node) => node.getBoundingClientRect().toJSON()),
    typography: await page.locator("#section-03-cosa-ricevi").evaluate((section) => {
      const value = (selector) => {
        const style = getComputedStyle(section.querySelector(selector));
        return { fontSize: style.fontSize, lineHeight: style.lineHeight, color: style.color };
      };
      return {
        h2: value("h2"),
        chapter: value("[data-s03-priorities] h3"),
        row: value("[data-s03-priorities] li"),
        mono: value("[data-s03-priorities] em"),
      };
    }),
  };
  measurements[label] = result;
  if (result.scrollWidth > result.clientWidth || result.cls > 0.02) failures += 1;
  await page.screenshot({ path: path.join(DIRS.qa, `${label}.png`), animations: "disabled" });
  await context.close();
}

for (const [label, viewport] of [
  ["chrome-1024x900", { width: 1024, height: 900 }],
  ["chrome-768x900", { width: 768, height: 900 }],
  ["chrome-390x844", { width: 390, height: 844 }],
  ["chrome-375x812", { width: 375, height: 812 }],
  ["chrome-360x800", { width: 360, height: 800 }],
]) await inspect(chrome, label, viewport);
await inspect(chrome, "chrome-1440x1000-dpr2", { width: 1440, height: 1000 }, { deviceScaleFactor: 2 });
await inspect(chrome, "reduced-motion-1440x1000", { width: 1440, height: 1000 }, { reducedMotion: "reduce" });
await inspect(chrome, "reduced-motion-390x844", { width: 390, height: 844 }, { reducedMotion: "reduce" });

// Reverse e refresh a metà.
{
  const page = await chrome.newPage({ viewport: { width: 1440, height: 1000 } });
  watch(page, "reverse");
  await page.goto(`${BASE}/concept/segnale`, { waitUntil: "networkidle" });
  const metrics = await sectionMetrics(page);
  for (const [from, to] of [[0.2, 0.6], [0.45, 0.85], [0, 1]]) {
    await moveTo(page, metrics, from);
    const before = await state(page);
    await moveTo(page, metrics, to);
    await moveTo(page, metrics, from);
    if (JSON.stringify(before) !== JSON.stringify(await state(page))) failures += 1;
  }
  await moveTo(page, metrics, 0.45);
  await page.screenshot({ path: path.join(DIRS.qa, "reverse-045-before.png"), animations: "disabled" });
  await moveTo(page, metrics, 0.85);
  await moveTo(page, metrics, 0.45);
  await page.screenshot({ path: path.join(DIRS.qa, "reverse-045-after.png"), animations: "disabled" });
  await moveTo(page, metrics, 0.5);
  const beforeRefresh = await state(page);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(350);
  await moveTo(page, await sectionMetrics(page), 0.5);
  if (JSON.stringify(beforeRefresh) !== JSON.stringify(await state(page))) failures += 1;
  await page.close();
}

// Spot-check visivi delle superfici congelate e della Direzione A.
async function captureAt(selector, progress, route, file, viewport = { width: 1440, height: 1000 }) {
  const page = await chrome.newPage({ viewport });
  watch(page, `regression-${file}`);
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  const metrics = await sectionMetrics(page, selector);
  await moveTo(page, metrics, progress);
  await page.screenshot({ path: path.join(DIRS.qa, file), animations: "disabled" });
  await page.close();
}
await captureAt(".stage--live", 0.5, "/concept/segnale", "regression-hero-b5.png");
await captureAt("#section-01-come-funziona", 1, "/concept/segnale", "regression-s01.png");
await captureAt("#section-02-esempio-di-piano", 1, "/concept/segnale", "regression-s02.png");
await captureAt("#section-03-cosa-ricevi", 0, "/concept/page", "regression-direzione-a.png");

await chrome.close();

const safari = await webkit.launch();
await inspect(safari, "webkit-390x844", { width: 390, height: 844 });
await safari.close();

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((value) => parseInt(value, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function ratio(a, b) {
  const [bright, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (bright + 0.05) / (dark + 0.05);
}
measurements.contrast = {
  "dark/main": ratio("#171b1d", "#f2f4f3"),
  "dark/secondary": ratio("#171b1d", "#b5bdc0"),
  "paper/ink": ratio("#f2f3f1", "#1a1d20"),
  "paper/secondary": ratio("#f2f3f1", "#657075"),
};
writeFileSync(path.join(DIRS.qa, "measurements.json"), JSON.stringify(measurements, null, 2));
writeFileSync(path.join(DIRS.qa, "contrast-report.json"), JSON.stringify(measurements.contrast, null, 2));

if (errors.length) {
  failures += 1;
  console.error(errors.join("\n"));
}
console.log(`S03 screenshots: ${OUT}`);
console.log(`console errors: ${errors.length}; failures: ${failures}`);
process.exit(failures ? 1 : 0);

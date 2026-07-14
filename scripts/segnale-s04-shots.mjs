// QA S04 Segnale — Quiet Return.
// Screenshot produzione, focus/keyboard, contrasto, CLS, overflow, reduced
// motion, reverse e regressioni delle sezioni congelate.

import { chromium, webkit } from "playwright";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const RUN = path.resolve("../runs/2026-07-10-marketing-strategy-generator");
const OUT = path.join(RUN, "screenshots/segnale-s04-quiet-return");
const MOCKUPS = path.join(RUN, "screenshots/segnale-s04-art-direction/concept-a-quiet-return");
const BASELINE = path.join(RUN, "screenshots/segnale-s04-art-direction/current");
const DIRS = Object.fromEntries(
  ["desktop", "mobile", "transition", "compare", "full-tail", "qa", "qa/regression"].map((name) => [name, path.join(OUT, name)]),
);
Object.values(DIRS).forEach((dir) => mkdirSync(dir, { recursive: true }));

const errors = [];
const measurements = {};
let failures = 0;

function watch(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${label}: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`${label}: ${error.message}`));
}

async function metrics(page, selector) {
  return page.locator(selector).evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      height: rect.height,
      range: Math.max(0, rect.height - window.innerHeight),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
}

async function scrollTo(page, y, wait = 500) {
  await page.evaluate((value) => window.scrollTo(0, Math.round(value)), y);
  await page.waitForTimeout(wait);
}

async function s04State(page) {
  return page.locator("#section-04-cta-finale").evaluate((section) => {
    const css = (selector) => getComputedStyle(section.querySelector(selector));
    return {
      primaryOpacity: css("[data-s04-primary]").opacity,
      primaryTransform: css("[data-s04-primary]").transform,
      secondaryOpacity: css("[data-s04-secondary]").opacity,
      microcopyOpacity: css("[data-s04-microcopy]").opacity,
      ruleTransform: css("[data-s04-rule]").transform,
    };
  });
}

async function triggerY(page, progress) {
  const section = await metrics(page, "#section-04-cta-finale");
  const height = page.viewportSize().height;
  return section.top - height * 0.95 + height * 0.35 * progress;
}

const chrome = await chromium.launch();

async function captureDesktop() {
  const page = await chrome.newPage({ viewport: { width: 1440, height: 1000 } });
  watch(page, "desktop");
  await page.goto(`${BASE}/concept/segnale`, { waitUntil: "networkidle" });
  const s04 = await metrics(page, "#section-04-cta-finale");

  await scrollTo(page, s04.top - 500);
  await page.screenshot({ path: path.join(DIRS.transition, "s03-to-s04-desktop.png"), animations: "disabled" });

  await scrollTo(page, await triggerY(page, 0));
  await page.screenshot({ path: path.join(DIRS.desktop, "desktop-ingresso.png"), animations: "disabled" });

  await scrollTo(page, s04.top);
  await page.screenshot({ path: path.join(DIRS.desktop, "desktop-finale.png"), animations: "disabled" });

  await page.locator("[data-s04-primary]").focus();
  await page.screenshot({ path: path.join(DIRS.desktop, "desktop-focus-primaria.png"), animations: "disabled" });
  await page.locator("[data-s04-secondary]").focus();
  await page.screenshot({ path: path.join(DIRS.desktop, "desktop-focus-secondaria.png"), animations: "disabled" });

  measurements.desktop = {
    section: s04,
    state: await s04State(page),
    geometry: await page.locator("#section-04-cta-finale").evaluate((section) => {
      const box = (selector) => section.querySelector(selector).getBoundingClientRect().toJSON();
      const style = (selector) => {
        const css = getComputedStyle(section.querySelector(selector));
        return { fontSize: css.fontSize, lineHeight: css.lineHeight, color: css.color, background: css.backgroundColor };
      };
      return {
        brand: box("p"),
        heading: box("h2"),
        primary: box("[data-s04-primary]"),
        secondary: box("[data-s04-secondary]"),
        microcopy: box("[data-s04-microcopy]"),
        headingStyle: style("h2"),
        primaryStyle: style("[data-s04-primary]"),
      };
    }),
  };
  await page.close();
}

async function captureMobile() {
  const page = await chrome.newPage({ viewport: { width: 390, height: 844 } });
  watch(page, "mobile");
  await page.goto(`${BASE}/concept/segnale`, { waitUntil: "networkidle" });
  const s04 = await metrics(page, "#section-04-cta-finale");

  await scrollTo(page, s04.top - 438);
  await page.screenshot({ path: path.join(DIRS.transition, "s03-to-s04-mobile.png"), animations: "disabled" });
  await scrollTo(page, s04.top);
  await page.screenshot({ path: path.join(DIRS.mobile, "mobile-finale.png"), animations: "disabled" });
  await page.locator("[data-s04-primary]").focus();
  await page.screenshot({ path: path.join(DIRS.mobile, "mobile-focus.png"), animations: "disabled" });
  await page.screenshot({ path: path.join(DIRS.mobile, "mobile-cta-primo-viewport.png"), animations: "disabled" });

  measurements.mobile = { section: s04, state: await s04State(page) };
  await page.close();
}

await captureDesktop();
await captureMobile();

// Tail completo S03 + S04, usando clip reale della pagina.
for (const [label, viewport] of [
  ["desktop", { width: 1440, height: 1000 }],
  ["mobile", { width: 390, height: 844 }],
]) {
  const page = await chrome.newPage({ viewport });
  watch(page, `tail-${label}`);
  await page.goto(`${BASE}/concept/segnale`, { waitUntil: "networkidle" });
  const s03 = await metrics(page, "#section-03-cosa-ricevi");
  const s04 = await metrics(page, "#section-04-cta-finale");
  const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  await scrollTo(page, s04.top, 500);
  const temporary = path.join(DIRS.qa, `full-page-${label}-temporary.png`);
  await page.screenshot({ path: temporary, fullPage: true, animations: "disabled" });
  execFileSync("magick", [
    temporary,
    "-crop", `${viewport.width}x${Math.ceil(documentHeight - s03.top)}+0+${Math.floor(s03.top)}`,
    "+repage",
    path.join(DIRS["full-tail"], `s03-plus-s04-${label}.png`),
  ]);
  rmSync(temporary);
  await page.close();
}

// Mockup vs live e thumbnail.
execFileSync("magick", [
  path.join(MOCKUPS, "a-final-desktop.png"), "-thumbnail", "620x",
  path.join(DIRS.desktop, "desktop-finale.png"), "-gravity", "south", "-crop", "1440x900+0+0", "+repage", "-thumbnail", "620x",
  "+append", path.join(DIRS.compare, "mockup-vs-live-desktop.png"),
]);
execFileSync("magick", [
  path.join(MOCKUPS, "a-final-mobile.png"), "-thumbnail", "300x",
  path.join(DIRS.mobile, "mobile-finale.png"), "-thumbnail", "300x",
  "+append", path.join(DIRS.compare, "mockup-vs-live-mobile.png"),
]);
execFileSync("magick", [
  path.join(MOCKUPS, "a-final-desktop.png"), "-thumbnail", "288x180", "-gravity", "center", "-extent", "288x180",
  path.join(DIRS.desktop, "desktop-finale.png"), "-thumbnail", "288x180", "-gravity", "center", "-extent", "288x180",
  "+append", path.join(DIRS.compare, "thumbnail-mockup-vs-live.png"),
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
    window.__s04Cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__s04Cls += entry.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(`${BASE}/concept/segnale`, { waitUntil: "networkidle" });
  const section = await metrics(page, "#section-04-cta-finale");
  await scrollTo(page, section.top, 400);
  const result = await page.locator("#section-04-cta-finale").evaluate((node) => {
    const heading = node.querySelector("h2").getBoundingClientRect();
    const primary = node.querySelector("[data-s04-primary]").getBoundingClientRect();
    const secondary = node.querySelector("[data-s04-secondary]").getBoundingClientRect();
    const lineHeight = parseFloat(getComputedStyle(node.querySelector("h2")).lineHeight);
    return {
      sectionHeight: node.getBoundingClientRect().height,
      primaryTop: primary.top - node.getBoundingClientRect().top,
      primaryWidth: primary.width,
      primaryHeight: primary.height,
      secondaryHeight: secondary.height,
      headingLines: heading.height / lineHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      background: getComputedStyle(node).backgroundColor,
      backgroundImage: getComputedStyle(node).backgroundImage,
    };
  });
  result.cls = await page.evaluate(() => window.__s04Cls);
  result.state = await s04State(page);
  measurements[label] = result;
  if (result.scrollWidth > result.clientWidth || result.cls > 0.02 || result.primaryHeight < 44 || result.secondaryHeight < 44) failures += 1;
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

// Reverse/refresh e QA funzionale delle CTA.
{
  const page = await chrome.newPage({ viewport: { width: 1440, height: 1000 } });
  watch(page, "interaction");
  await page.goto(`${BASE}/concept/segnale`, { waitUntil: "networkidle" });
  for (const [from, to] of [[0.2, 0.8], [0.45, 1]]) {
    await scrollTo(page, await triggerY(page, from));
    const before = await s04State(page);
    await scrollTo(page, await triggerY(page, to));
    await scrollTo(page, await triggerY(page, from));
    if (JSON.stringify(before) !== JSON.stringify(await s04State(page))) failures += 1;
  }
  await scrollTo(page, await triggerY(page, 0.45));
  const beforeRefresh = await s04State(page);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await scrollTo(page, await triggerY(page, 0.45));
  if (JSON.stringify(beforeRefresh) !== JSON.stringify(await s04State(page))) failures += 1;

  await page.locator("#section-04-cta-finale").scrollIntoViewIfNeeded();
  await page.locator("[data-s04-primary]").focus();
  await page.keyboard.press("Tab");
  if (!(await page.locator("[data-s04-secondary]").evaluate((node) => node === document.activeElement))) failures += 1;
  await page.locator("[data-s04-secondary]").click();
  await page.waitForFunction(
    () => Math.abs(document.querySelector("#section-02-esempio-di-piano").getBoundingClientRect().top) < 12,
    null,
    { timeout: 2500 },
  );
  const navigation = await page.evaluate(() => ({
    hash: location.hash,
    focus: document.activeElement?.id,
    top: document.querySelector("#section-02-esempio-di-piano").getBoundingClientRect().top,
  }));
  measurements.navigation = navigation;
  if (navigation.hash !== "#section-02-esempio-di-piano" || navigation.focus !== "segnale-s02-title" || Math.abs(navigation.top) > 12) failures += 1;
  await page.close();
}

// Regressioni visive: catture delle superfici congelate e Direzione A.
async function regressionShot(route, selector, progress, file, viewport = { width: 1440, height: 1000 }) {
  const page = await chrome.newPage({ viewport });
  watch(page, `regression-${file}`);
  await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
  const section = await metrics(page, selector);
  await scrollTo(page, section.top + section.range * progress, 600);
  const output = path.join(DIRS["qa/regression"], file);
  await page.screenshot({ path: output, animations: "disabled" });
  await page.close();
  return output;
}
await regressionShot("/concept/segnale", ".stage--live", 0.5, "hero-b5.png");
await regressionShot("/concept/segnale", "#section-01-come-funziona", 1, "s01.png");
await regressionShot("/concept/segnale", "#section-02-esempio-di-piano", 1, "s02.png");
const s03Desktop = await regressionShot("/concept/segnale", "#section-03-cosa-ricevi", 1, "s03-desktop.png");
const s03Mobile = await regressionShot("/concept/segnale", "#section-03-cosa-ricevi", 1, "s03-mobile.png", { width: 390, height: 844 });
const directionA = await regressionShot("/concept/page", "#section-04-cta-finale", 0, "direzione-a-cta.png");

function pixelDiff(name, before, after) {
  const result = spawnSync("magick", ["compare", "-metric", "RMSE", before, after, "null:"], { encoding: "utf8" });
  const raw = (result.stderr ?? "").trim();
  const normalized = parseFloat(/\(([\d.e-]+)\)/.exec(raw)?.[1] ?? "1");
  measurements[`regression-${name}`] = { raw, normalized };
  if (normalized > 0.005) failures += 1;
}
pixelDiff("s03-desktop", path.join(BASELINE, "segnale-s03-final-desktop.png"), s03Desktop);
pixelDiff("s03-mobile", path.join(BASELINE, "segnale-s03-final-mobile.png"), s03Mobile);
pixelDiff("direzione-a", path.join(BASELINE, "direzione-a-cta-desktop.png"), directionA);

await chrome.close();

const safari = await webkit.launch();
await inspect(safari, "webkit-390x844", { width: 390, height: 844 });
await safari.close();

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((value) => parseInt(value, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
function contrast(a, b) {
  const [bright, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (bright + 0.05) / (dark + 0.05);
}
measurements.contrast = {
  "canvas/ink": contrast("#f9fafb", "#1a1d20"),
  "canvas/secondary": contrast("#f9fafb", "#5a6469"),
  "button/text": contrast("#1a1d20", "#ffffff"),
  "canvas/teal": contrast("#f9fafb", "#0b7a75"),
};
writeFileSync(path.join(DIRS.qa, "measurements.json"), JSON.stringify(measurements, null, 2));
writeFileSync(path.join(DIRS.qa, "contrast-report.json"), JSON.stringify(measurements.contrast, null, 2));

if (errors.length) {
  failures += 1;
  console.error(errors.join("\n"));
}
console.log(`S04 screenshots: ${OUT}`);
console.log(`console errors: ${errors.length}; failures: ${failures}`);
process.exit(failures ? 1 : 0);

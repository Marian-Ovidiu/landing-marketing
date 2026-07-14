import { chromium, webkit } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const OUT = path.resolve(
  process.cwd(),
  "../runs/2026-07-10-marketing-strategy-generator/screenshots/section-01",
);
mkdirSync(OUT, { recursive: true });

const errors = [];
const measurements = {};

function watch(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${label}: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`${label}: ${error.message}`));
}

async function settle(page) {
  await page.waitForTimeout(450);
}

async function sectionMetrics(page) {
  return page.locator("#section-01-come-funziona").evaluate((section) => ({
    top: section.getBoundingClientRect().top + window.scrollY,
    height: section.getBoundingClientRect().height,
    viewportHeight: window.innerHeight,
    viewportWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    stickyPosition: getComputedStyle(section.querySelector(".how-it-works-sticky")).position,
  }));
}

async function captureCheckpoints(browser, label, viewport) {
  const page = await browser.newPage({ viewport });
  watch(page, label);
  await page.goto(`${BASE}/concept/page`, { waitUntil: "networkidle" });
  await settle(page);
  const metrics = await sectionMetrics(page);
  measurements[label] = metrics;
  const range = metrics.height - metrics.viewportHeight;
  const checkpoints = [
    ["hero-end", metrics.top - metrics.viewportHeight],
    ["section-start", metrics.top],
    ["moment-01", metrics.top + range * 0.15],
    ["moment-02", metrics.top + range * 0.5],
    ["moment-03", metrics.top + range * 0.84],
    ["section-end", metrics.top + range],
  ];

  for (const [name, y] of checkpoints) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), Math.round(y));
    await settle(page);
    await page.screenshot({ path: path.join(OUT, `${label}-${name}.png`) });
  }

  for (const progress of [0.92, 0.48, 0.12, 0.76]) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), metrics.top + range * progress);
    await page.waitForTimeout(120);
  }
  await page.close();
}

async function inspectViewport(browser, label, viewport, reducedMotion = "no-preference") {
  const page = await browser.newPage({ viewport, reducedMotion });
  watch(page, label);
  await page.goto(`${BASE}/concept/page`, { waitUntil: "networkidle" });
  await settle(page);
  const metrics = await sectionMetrics(page);
  const sheet = await page.locator(".work-sheet").boundingBox();
  const stamp = await page.locator("[data-stamp]").evaluate((node) => ({
    opacity: getComputedStyle(node).opacity,
    transform: getComputedStyle(node).transform,
  }));
  measurements[label] = { ...metrics, sheet, stamp, reducedMotion };
  await page.close();
}

const chromiumBrowser = await chromium.launch();
await captureCheckpoints(chromiumBrowser, "desktop-1440x1000", { width: 1440, height: 1000 });
await captureCheckpoints(chromiumBrowser, "mobile-390x844", { width: 390, height: 844 });
await inspectViewport(chromiumBrowser, "tablet-1024x900", { width: 1024, height: 900 });
await inspectViewport(chromiumBrowser, "tablet-768x900", { width: 768, height: 900 });
await inspectViewport(chromiumBrowser, "mobile-360x800", { width: 360, height: 800 });
await inspectViewport(chromiumBrowser, "reduced-390x844", { width: 390, height: 844 }, "reduce");
await chromiumBrowser.close();

const webkitBrowser = await webkit.launch();
await inspectViewport(webkitBrowser, "webkit-mobile-390x844", { width: 390, height: 844 });
await webkitBrowser.close();

writeFileSync(path.join(OUT, "measurements.json"), JSON.stringify(measurements, null, 2));

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`checkpoint salvati in ${OUT}`);
console.log("nessun errore console o pageerror");

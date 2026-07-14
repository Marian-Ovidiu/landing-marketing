import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const root = path.resolve("../runs/2026-07-10-marketing-strategy-generator");
const sprint = path.join(root, "screenshots/sprint-6-s02-productization");
const before = path.join(sprint, "before");
const after = path.join(sprint, "after");
const compare = path.join(sprint, "compare");

mkdirSync(after, { recursive: true });
mkdirSync(compare, { recursive: true });

const browser = await chromium.launch();
const errors = [];
const measurements = {};

function watch(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${label}: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`${label}: ${error.message}`));
}

async function moveTo(page, progress) {
  const section = page.locator("#section-02-esempio-di-piano");
  const metrics = await section.evaluate((node) => ({
    top: node.getBoundingClientRect().top + window.scrollY,
    range: node.getBoundingClientRect().height - window.innerHeight,
  }));
  await page.evaluate((y) => window.scrollTo(0, Math.round(y)), metrics.top + metrics.range * progress);
  await page.waitForTimeout(450);
}

async function measure(section) {
  return section.evaluate((node) => {
    const one = (selector) => node.querySelector(selector);
    const all = (selector) => Array.from(node.querySelectorAll(selector));
    const rect = (element) => {
      const box = element.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom, width: box.width, height: box.height };
    };
    const textNodes = all("*").filter((element) => {
      const box = rect(element);
      return element.textContent?.trim() && box.width > 0 && box.height > 0;
    });
    const masses = all(".segnale-s02-mass");
    const quiet = all("[data-quiet]").filter((element) => rect(element).height > 0);
    const closing = one("[data-closing]");
    const field = one(".segnale-s02-field");
    return {
      visualViewport: {
        width: window.visualViewport?.width ?? window.innerWidth,
        height: window.visualViewport?.height ?? window.innerHeight,
      },
      innerHeight: rect(one(".segnale-weekly-rhythm-inner")).height,
      fieldHeight: rect(field).height,
      sceneHeights: masses.map((mass) => rect(mass).height),
      sceneGaps: [rect(masses[1]).top - rect(masses[0]).bottom, rect(masses[2]).top - rect(quiet.at(-1)).bottom],
      quietBlockHeight: rect(quiet.at(-1)).bottom - rect(quiet[0]).top,
      sundayToClosing: rect(closing).top - rect(masses[2]).bottom,
      closingBottom: rect(closing).bottom,
      minimumFont: Math.min(...textNodes.map((element) => Number.parseFloat(getComputedStyle(element).fontSize))),
      statusCount: all("[data-operational-status]").length,
      metadataLevels: [...new Set(all("[data-meta-level]").map((element) => element.dataset.metaLevel))].sort(),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

for (const viewport of [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
]) {
  const label = `${viewport.width}x${viewport.height}`;
  const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const page = await context.newPage();
  watch(page, `full-${label}`);
  await page.goto(`${baseUrl}/concept/segnale`, { waitUntil: "networkidle" });
  const section = page.locator("#section-02-esempio-di-piano");
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  measurements[label] = await measure(section);
  await section.locator(".segnale-weekly-rhythm-sticky").screenshot({
    path: path.join(after, `after-${label}-full.png`),
    animations: "disabled",
  });
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  watch(page, "motion-390x844");
  await page.goto(`${baseUrl}/concept/segnale`, { waitUntil: "networkidle" });
  for (const [name, progress] of [
    ["initial", 0],
    ["middle", 0.5],
    ["final", 1],
  ]) {
    await moveTo(page, progress);
    await page.screenshot({ path: path.join(after, `after-390x844-${name}.png`), animations: "disabled" });
  }

  await moveTo(page, 0.5);
  const middle = await page.locator("#section-02-esempio-di-piano").evaluate((node) =>
    Array.from(node.querySelectorAll("[data-operational-status]")).map((item) => getComputedStyle(item).opacity),
  );
  await moveTo(page, 0.85);
  await moveTo(page, 0.5);
  const reverse = await page.locator("#section-02-esempio-di-piano").evaluate((node) =>
    Array.from(node.querySelectorAll("[data-operational-status]")).map((item) => getComputedStyle(item).opacity),
  );
  measurements.reverse = { deterministic: JSON.stringify(middle) === JSON.stringify(reverse), middle, reverse };
  await page.screenshot({ path: path.join(after, "after-390x844-reverse-middle.png"), animations: "disabled" });

  await page.reload({ waitUntil: "networkidle" });
  await moveTo(page, 0.5);
  await page.screenshot({ path: path.join(after, "after-390x844-refresh-middle.png"), animations: "disabled" });
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  watch(page, "closeups");
  await page.goto(`${baseUrl}/concept/segnale`, { waitUntil: "networkidle" });
  const section = page.locator("#section-02-esempio-di-piano");
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  async function clip(name, selector, grow = 0) {
    const box = await section.locator(selector).boundingBox();
    await page.screenshot({
      path: path.join(after, `after-closeup-${name}.png`),
      animations: "disabled",
      clip: {
        x: Math.max(0, box.x),
        y: Math.max(0, box.y - grow),
        width: Math.min(390 - Math.max(0, box.x), box.width),
        height: Math.min(844 - Math.max(0, box.y - grow), box.height + grow),
      },
    });
  }

  await clip("line-lun", "[data-mass-lun]", 0);
  await clip("metadata-lun", "[data-mass-lun]", 0);
  await clip("scene-mar", "[data-mass-mar]", 0);
  await clip("scene-dom", "[data-mass-dom]", 0);
  await context.close();
}

{
  const context = await browser.newContext({
    viewport: { width: 390, height: 720 },
    screen: { width: 390, height: 844 },
    isMobile: true,
  });
  const page = await context.newPage();
  watch(page, "browser-chrome");
  await page.goto(`${baseUrl}/concept/segnale`, { waitUntil: "networkidle" });
  await moveTo(page, 1);
  await page.screenshot({ path: path.join(after, "after-390x720-browser-chrome-final.png"), animations: "disabled" });
  measurements.browserChrome = await page.locator("#section-02-esempio-di-piano").evaluate((section) => {
    const closing = section.querySelector("[data-closing]").getBoundingClientRect();
    return {
      visualHeight: window.visualViewport?.height ?? window.innerHeight,
      closingTop: closing.top,
      closingBottom: closing.bottom,
    };
  });
  await context.close();
}

for (const label of ["360x800", "390x844", "412x915"]) {
  execFileSync("magick", [
    path.join(before, `before-${label}-full.png`),
    path.join(after, `after-${label}-full.png`),
    "+append",
    path.join(compare, `compare-${label}-full.png`),
  ]);
}

for (const label of ["line-lun", "metadata-lun", "scene-mar", "scene-dom"]) {
  const beforePath = path.join(before, `before-closeup-${label}.png`);
  const afterPath = path.join(after, `after-closeup-${label}.png`);
  execFileSync("magick", [beforePath, afterPath, "+append", path.join(compare, `compare-closeup-${label}.png`)]);
}

writeFileSync(path.join(after, "measurements.json"), JSON.stringify({ measurements, errors }, null, 2));
await browser.close();

if (errors.length > 0) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exitCode = 1;
}

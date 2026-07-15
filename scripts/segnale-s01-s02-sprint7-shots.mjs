import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const root = path.resolve("../runs/2026-07-10-marketing-strategy-generator");
const sprint = path.join(root, "screenshots/sprint-7-s01-s02-contrast");
const before = path.join(sprint, "before");
const after = path.join(sprint, "after");
const compare = path.join(sprint, "compare");

mkdirSync(after, { recursive: true });
mkdirSync(compare, { recursive: true });

const browser = await chromium.launch();
const errors = [];
const measurements = { viewports: {} };

function watch(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${label}: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`${label}: ${error.message}`));
}

async function moveTo(page, selector, progress) {
  const section = page.locator(selector);
  const metrics = await section.evaluate((node) => ({
    top: node.getBoundingClientRect().top + window.scrollY,
    range: node.getBoundingClientRect().height - window.innerHeight,
  }));
  await page.evaluate((y) => window.scrollTo(0, Math.round(y)), metrics.top + metrics.range * progress);
  await page.waitForTimeout(450);
}

async function state(page, sectionSelector, kind) {
  return page.locator(sectionSelector).evaluate((section, sectionKind) => {
    const one = (selector) => section.querySelector(selector);
    const style = (selector) => getComputedStyle(one(selector));
    const effective = (selector) => {
      let element = one(selector);
      let opacity = 1;
      while (element && element !== section.parentElement) {
        opacity *= Number.parseFloat(getComputedStyle(element).opacity);
        element = element.parentElement;
      }
      return Number(opacity.toFixed(4));
    };

    if (sectionKind === "s01") {
      return {
        noise: effective("[data-noise]"),
        reading: effective("[data-reading]"),
        evidence: effective("[data-evidence]"),
        decision: effective("[data-decision]"),
        detail: effective("[data-decision-detail]"),
        secondary: effective("[data-secondary-actions]"),
        firstLine: {
          opacity: style(".segnale-trace-mobile [data-trace-first]").opacity,
          stroke: style(".segnale-trace-mobile [data-trace-first]").stroke,
        },
        center: style(".segnale-trace-mobile [data-trace-center]").opacity,
      };
    }

    const scene = (name) => ({
      status: effective(`[data-mass-${name}] [data-operational-status]`),
      title: effective(`[data-mass-${name}] h3`),
      secondary: effective(`[data-mass-${name}] [data-objective]`),
      meta: effective(`[data-mass-${name}] [data-meta-level="1"]`),
    });
    return {
      lun: scene("lun"),
      mar: scene("mar"),
      dom: scene("dom"),
      quiet: effective(".segnale-s02-quiet-mobile"),
      quietTime: effective(".segnale-s02-quiet-time"),
      line: {
        opacity: style(".segnale-s02-band-mobile [data-band-base]").opacity,
        stroke: style(".segnale-s02-band-mobile [data-band-base]").stroke,
      },
      markerLun: style(".segnale-s02-band-mobile [data-marker-lun]").fill,
    };
  }, kind);
}

async function geometry(page) {
  return page.evaluate(() => {
    const visibleText = Array.from(
      document.querySelectorAll("#section-01-come-funziona *, #section-02-esempio-di-piano *"),
    ).filter((element) => {
      const rect = element.getBoundingClientRect();
      return element.textContent?.trim() && rect.width > 0 && rect.height > 0;
    });
    return {
      visualViewport: {
        width: window.visualViewport?.width ?? window.innerWidth,
        height: window.visualViewport?.height ?? window.innerHeight,
      },
      minFont: Math.min(
        ...visibleText.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
      ),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

const s01Samples = [0, 0.45, 0.5, 0.75, 1];
const s02Samples = [0, 0.47, 0.62, 0.7, 1];

for (const viewport of [
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
]) {
  const label = `${viewport.width}x${viewport.height}`;
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  watch(page, label);
  await page.goto(`${baseUrl}/concept/segnale`, { waitUntil: "networkidle" });
  measurements.viewports[label] = { s01: {}, s02: {} };

  for (const progress of s01Samples) {
    await moveTo(page, "#section-01-come-funziona", progress);
    measurements.viewports[label].s01[progress] = await state(
      page,
      "#section-01-come-funziona",
      "s01",
    );
  }
  for (const progress of s02Samples) {
    await moveTo(page, "#section-02-esempio-di-piano", progress);
    measurements.viewports[label].s02[progress] = await state(
      page,
      "#section-02-esempio-di-piano",
      "s02",
    );
  }
  measurements.viewports[label].geometry = await geometry(page);

  if ([360, 390, 412].includes(viewport.width)) {
    for (const [name, selector, progress] of [
      ["s01-central", "#section-01-come-funziona", 0.5],
      ["s02-1-to-2", "#section-02-esempio-di-piano", 0.47],
      ["s02-2-to-3", "#section-02-esempio-di-piano", 0.7],
    ]) {
      await moveTo(page, selector, progress);
      await page.screenshot({
        path: path.join(after, `after-${label}-${name}.png`),
        animations: "disabled",
      });
    }
  }
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
  await moveTo(page, "#section-01-come-funziona", 0.5);
  const s01 = await state(page, "#section-01-come-funziona", "s01");
  await page.screenshot({
    path: path.join(after, "after-390x720-s01-central.png"),
    animations: "disabled",
  });
  await moveTo(page, "#section-02-esempio-di-piano", 0.47);
  const s02First = await state(page, "#section-02-esempio-di-piano", "s02");
  await moveTo(page, "#section-02-esempio-di-piano", 0.7);
  const s02Second = await state(page, "#section-02-esempio-di-piano", "s02");
  await page.screenshot({
    path: path.join(after, "after-390x720-s02-2-to-3.png"),
    animations: "disabled",
  });
  measurements.browserChrome = { s01, s02First, s02Second, geometry: await geometry(page) };
  await context.close();
}

{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  watch(page, "reverse-refresh");
  await page.goto(`${baseUrl}/concept/segnale`, { waitUntil: "networkidle" });

  await moveTo(page, "#section-01-come-funziona", 0.5);
  const s01Before = await state(page, "#section-01-come-funziona", "s01");
  await moveTo(page, "#section-01-come-funziona", 0.9);
  await moveTo(page, "#section-01-come-funziona", 0.5);
  const s01Reverse = await state(page, "#section-01-come-funziona", "s01");

  await moveTo(page, "#section-02-esempio-di-piano", 0.47);
  const s02Before = await state(page, "#section-02-esempio-di-piano", "s02");
  await moveTo(page, "#section-02-esempio-di-piano", 0.95);
  await moveTo(page, "#section-02-esempio-di-piano", 0.47);
  const s02Reverse = await state(page, "#section-02-esempio-di-piano", "s02");

  await page.reload({ waitUntil: "networkidle" });
  await moveTo(page, "#section-02-esempio-di-piano", 0.47);
  const s02Refresh = await state(page, "#section-02-esempio-di-piano", "s02");
  measurements.determinism = {
    s01Reverse: JSON.stringify(s01Before) === JSON.stringify(s01Reverse),
    s02Reverse: JSON.stringify(s02Before) === JSON.stringify(s02Reverse),
    s02Refresh: JSON.stringify(s02Before) === JSON.stringify(s02Refresh),
  };
  await context.close();
}

{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  watch(page, "reduced-motion");
  await page.goto(`${baseUrl}/concept/segnale`, { waitUntil: "networkidle" });
  for (const [name, selector] of [
    ["s01", "#section-01-come-funziona"],
    ["s02", "#section-02-esempio-di-piano"],
  ]) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await page.screenshot({
      path: path.join(after, `after-390x844-${name}-reduced.png`),
      animations: "disabled",
    });
  }
  measurements.reducedMotion = {
    s01: await state(page, "#section-01-come-funziona", "s01"),
    s02: await state(page, "#section-02-esempio-di-piano", "s02"),
  };
  await context.close();
}

for (const viewport of ["360x800", "390x844", "412x915"]) {
  for (const frame of ["s01-central", "s02-1-to-2", "s02-2-to-3"]) {
    execFileSync("magick", [
      path.join(before, `before-${viewport}-${frame}.png`),
      path.join(after, `after-${viewport}-${frame}.png`),
      "+append",
      path.join(compare, `compare-${viewport}-${frame}.png`),
    ]);
  }
}

writeFileSync(path.join(after, "measurements.json"), JSON.stringify({ measurements, errors }, null, 2));
await browser.close();

if (errors.length > 0) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exitCode = 1;
}

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const phase = process.argv[2] ?? "after";
if (!new Set(["before", "after"]).has(phase)) {
  throw new Error("Use: node scripts/segnale-s02-node-hotfix-shots.mjs before|after");
}

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const runRoot = path.resolve("../runs/2026-07-10-marketing-strategy-generator");
const hotfixRoot = path.join(runRoot, "screenshots/s02-node-hotfix");
const output = path.join(hotfixRoot, phase);
const compare = path.join(hotfixRoot, "compare");

mkdirSync(output, { recursive: true });
mkdirSync(compare, { recursive: true });

const browser = await chromium.launch();
const errors = [];
const measurements = { phase, viewports: {} };

function watch(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error" || message.text().includes("GSAP target")) {
      errors.push(`${label}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => errors.push(`${label}: ${error.message}`));
}

async function moveTo(page, progress) {
  const section = page.locator("#section-02-esempio-di-piano");
  const metrics = await section.evaluate((node) => ({
    top: node.getBoundingClientRect().top + window.scrollY,
    range: node.getBoundingClientRect().height - window.innerHeight,
  }));
  await page.evaluate(
    ({ top, range, progress: nextProgress }) =>
      window.scrollTo(0, Math.round(top + range * nextProgress)),
    { ...metrics, progress },
  );
  await page.waitForTimeout(450);
}

async function geometry(page) {
  return page.locator("#section-02-esempio-di-piano").evaluate((section) => {
    const field = section.querySelector(".segnale-s02-field");
    const fieldRect = field.getBoundingClientRect();
    const relative = (value) => Number((value - fieldRect.top).toFixed(3));
    const scene = (name) => {
      const mass = section.querySelector(`[data-mass-${name}]`);
      const label = mass.querySelector(".segnale-s02-label");
      const status = mass.querySelector("[data-operational-status]");
      const title = mass.querySelector("h3");
      const marker = section.querySelector(
        `.segnale-s02-band-mobile [data-marker-${name}]`,
      );
      const line = section.querySelector(
        `.segnale-s02-band-mobile [data-accent-${name}]`,
      );
      const labelRect = label.getBoundingClientRect();
      const statusRect = status.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      const markerRect = marker.getBoundingClientRect();
      const lineRect = line.getBoundingClientRect();
      const matrix = new DOMMatrixReadOnly(getComputedStyle(mass).transform);
      const contentMatrix = new DOMMatrixReadOnly(getComputedStyle(title).transform);
      const markerCenter = markerRect.top + markerRect.height / 2;
      const lineCenter = lineRect.top + lineRect.height / 2;

      return {
        labelTop: relative(labelRect.top),
        labelBottom: relative(labelRect.bottom),
        statusTop: relative(statusRect.top),
        statusBottom: relative(statusRect.bottom),
        titleTop: relative(titleRect.top),
        markerTop: relative(markerRect.top),
        markerCenter: relative(markerCenter),
        markerBottom: relative(markerRect.bottom),
        lineCenter: relative(lineCenter),
        labelToMarkerGap: Number((markerRect.top - labelRect.bottom).toFixed(3)),
        markerLineDelta: Number((markerCenter - lineCenter).toFixed(3)),
        massTranslateY: Number(matrix.f.toFixed(3)),
        contentTranslateY: Number(contentMatrix.f.toFixed(3)),
      };
    };

    return {
      lun: scene("lun"),
      mar: scene("mar"),
      dom: scene("dom"),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      visualViewport: {
        width: window.visualViewport?.width ?? window.innerWidth,
        height: window.visualViewport?.height ?? window.innerHeight,
      },
    };
  });
}

async function screenshot(page, filename) {
  await page.screenshot({
    path: path.join(output, filename),
    animations: "disabled",
  });
}

for (const viewport of [
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 390, height: 720, screenHeight: 844 },
]) {
  const label = `${viewport.width}x${viewport.height}`;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    screen: viewport.screenHeight
      ? { width: viewport.width, height: viewport.screenHeight }
      : undefined,
    isMobile: Boolean(viewport.screenHeight),
  });
  const page = await context.newPage();
  watch(page, `${phase}-${label}`);
  await page.goto(`${baseUrl}/concept/segnale`, { waitUntil: "networkidle" });
  measurements.viewports[label] = {
    postInit: await geometry(page),
    progress: {},
  };

  for (const progress of [0, 0.05, 0.1, 0.35, 0.6, 0.8]) {
    await moveTo(page, progress);
    measurements.viewports[label].progress[progress] = await geometry(page);
    if ([360, 390, 412].includes(viewport.width) && viewport.height !== 720) {
      if (progress === 0 || progress === 0.1) {
        await screenshot(page, `${phase}-${label}-progress-${progress === 0 ? "0" : "10"}.png`);
      }
    }
  }

  await moveTo(page, 0.05);
  const reverseBefore = await geometry(page);
  await moveTo(page, 0.82);
  await moveTo(page, 0.05);
  const reverseAfter = await geometry(page);

  await moveTo(page, 0);
  const refreshBeforeStart = await geometry(page);
  await page.reload({ waitUntil: "networkidle" });
  await moveTo(page, 0);
  const refreshAfterStart = await geometry(page);

  await moveTo(page, 0.5);
  const refreshBeforeMiddle = await geometry(page);
  await page.reload({ waitUntil: "networkidle" });
  await moveTo(page, 0.5);
  const refreshAfterMiddle = await geometry(page);

  measurements.viewports[label].determinism = {
    reverse: JSON.stringify(reverseBefore) === JSON.stringify(reverseAfter),
    refreshStart: JSON.stringify(refreshBeforeStart) === JSON.stringify(refreshAfterStart),
    refreshMiddle: JSON.stringify(refreshBeforeMiddle) === JSON.stringify(refreshAfterMiddle),
  };
  await context.close();
}

{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/concept/segnale`, { waitUntil: "networkidle" });
  await moveTo(page, 0);
  measurements.rawCssFirstRender = await geometry(page);
  await screenshot(page, `${phase}-390x844-raw-css.png`);
  await context.close();
}

{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  watch(page, `${phase}-reduced`);
  await page.goto(`${baseUrl}/concept/segnale`, { waitUntil: "networkidle" });
  await page.locator("#section-02-esempio-di-piano").scrollIntoViewIfNeeded();
  measurements.reducedMotion = await geometry(page);
  await screenshot(page, `${phase}-390x844-reduced.png`);
  await context.close();
}

for (const viewport of [
  { width: 768, height: 900 },
  { width: 1440, height: 1000 },
]) {
  const label = `${viewport.width}x${viewport.height}`;
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  watch(page, `${phase}-${label}`);
  await page.goto(`${baseUrl}/concept/segnale`, { waitUntil: "networkidle" });
  await moveTo(page, 0);
  measurements[label] = await geometry(page);
  await screenshot(page, `${phase}-${label}-progress-0.png`);
  await context.close();
}

if (phase === "after") {
  for (const viewport of ["360x800", "390x844", "412x915"]) {
    for (const state of ["0", "10"]) {
      execFileSync("magick", [
        path.join(hotfixRoot, "before", `before-${viewport}-progress-${state}.png`),
        path.join(output, `after-${viewport}-progress-${state}.png`),
        "+append",
        path.join(compare, `compare-${viewport}-progress-${state}.png`),
      ]);
    }
  }
}

writeFileSync(
  path.join(output, `${phase}-measurements.json`),
  JSON.stringify({ measurements, errors }, null, 2),
);
await browser.close();

if (errors.length > 0) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exitCode = 1;
}

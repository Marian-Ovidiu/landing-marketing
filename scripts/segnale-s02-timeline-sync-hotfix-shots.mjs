import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const phase = process.argv[2] ?? "after";
if (!new Set(["before", "after"]).has(phase)) {
  throw new Error("Use: node scripts/segnale-s02-timeline-sync-hotfix-shots.mjs before|after");
}

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const runRoot = path.resolve("../runs/2026-07-10-marketing-strategy-generator");
const hotfixRoot = path.join(runRoot, "screenshots/s02-timeline-sync-hotfix");
const output = path.join(hotfixRoot, phase);
const compare = path.join(hotfixRoot, "compare");

mkdirSync(output, { recursive: true });
mkdirSync(compare, { recursive: true });

const browser = await chromium.launch();
const errors = [];
const measurements = { phase, viewports: {} };

function watch(page, label) {
  page.on("console", (message) => {
    if (
      (message.type() === "error" && !message.text().includes("webpack-hmr")) ||
      message.text().includes("GSAP target")
    ) {
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
    const translateY = (element) =>
      Number(new DOMMatrixReadOnly(getComputedStyle(element).transform).f.toFixed(3));
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
      const timelineGroup = section.querySelector(
        `.segnale-s02-band-mobile [data-timeline-${name}]`,
      );
      const labelRect = label.getBoundingClientRect();
      const statusRect = status.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      const markerRect = marker.getBoundingClientRect();
      const lineRect = line.getBoundingClientRect();
      const markerCenter = markerRect.top + markerRect.height / 2;
      const lineCenter = lineRect.top + lineRect.height / 2;
      const statusCenter = statusRect.top + statusRect.height / 2;

      return {
        kicker: {
          top: relative(labelRect.top),
          bottom: relative(labelRect.bottom),
          translateY: translateY(label),
        },
        node: {
          top: relative(markerRect.top),
          center: relative(markerCenter),
          bottom: relative(markerRect.bottom),
        },
        line: {
          center: relative(lineCenter),
          dashOffset: getComputedStyle(line).strokeDashoffset,
        },
        status: {
          top: relative(statusRect.top),
          center: relative(statusCenter),
          bottom: relative(statusRect.bottom),
          translateY: translateY(status),
        },
        title: {
          top: relative(titleRect.top),
          translateY: translateY(title),
        },
        nodeLineDelta: Number((markerCenter - lineCenter).toFixed(3)),
        nodeStatusDelta: Number((markerCenter - statusCenter).toFixed(3)),
        kickerToNodeGap: Number((markerRect.top - labelRect.bottom).toFixed(3)),
        massTranslateY: translateY(mass),
        timelineTranslateY: timelineGroup ? translateY(timelineGroup) : 0,
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

function maxStateDelta(first, second) {
  if (typeof first === "number" && typeof second === "number") {
    return Math.abs(first - second);
  }
  if (typeof first === "string" && typeof second === "string") {
    const firstNumber = Number.parseFloat(first);
    const secondNumber = Number.parseFloat(second);
    if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) {
      return Math.abs(firstNumber - secondNumber);
    }
    return first === second ? 0 : Number.POSITIVE_INFINITY;
  }
  if (first && second && typeof first === "object" && typeof second === "object") {
    const keys = new Set([...Object.keys(first), ...Object.keys(second)]);
    return Math.max(...[...keys].map((key) => maxStateDelta(first[key], second[key])));
  }
  return first === second ? 0 : Number.POSITIVE_INFINITY;
}

const samples = [0, 0.05, 0.1, 0.15, 0.25, 0.35, 0.36, 0.475, 0.6, 0.7, 0.8];
const screenshotSamples = new Map([
  [0.15, "lun-start"],
  [0.25, "lun-mid"],
  [0.35, "lun-end"],
]);
const detailed390Samples = new Map([
  [0.35, "mar-start"],
  [0.475, "mar-mid"],
  [0.6, "mar-end-dom-start"],
  [0.7, "dom-mid"],
  [0.8, "dom-end"],
]);

for (const viewport of [
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 390, height: 720, screenHeight: 844 },
  { width: 768, height: 900 },
  { width: 1440, height: 1000 },
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

  for (const progress of samples) {
    await moveTo(page, progress);
    measurements.viewports[label].progress[progress] = await geometry(page);
    if ([360, 390, 412].includes(viewport.width) && viewport.height !== 720) {
      const state = screenshotSamples.get(progress);
      if (state) await screenshot(page, `${phase}-${label}-${state}.png`);
      if (viewport.width === 390) {
        const detailedState = detailed390Samples.get(progress);
        if (detailedState) {
          await screenshot(page, `${phase}-${label}-${detailedState}.png`);
        }
      }
    }
    if (progress === 0 && viewport.width >= 768) {
      await screenshot(page, `${phase}-${label}-progress-0.png`);
    }
  }

  await moveTo(page, 0.1);
  const reverseBefore = await geometry(page);
  await moveTo(page, 0.8);
  await moveTo(page, 0.1);
  const reverseAfter = await geometry(page);

  await moveTo(page, 0);
  const refreshBeforeStart = await geometry(page);
  await page.reload({ waitUntil: "networkidle" });
  await moveTo(page, 0);
  const refreshAfterStart = await geometry(page);

  await moveTo(page, 0.475);
  const refreshBeforeMiddle = await geometry(page);
  await page.reload({ waitUntil: "networkidle" });
  await moveTo(page, 0.475);
  const refreshAfterMiddle = await geometry(page);

  const determinismDelta = {
    reverse: maxStateDelta(reverseBefore, reverseAfter),
    refreshStart: maxStateDelta(refreshBeforeStart, refreshAfterStart),
    refreshMiddle: maxStateDelta(refreshBeforeMiddle, refreshAfterMiddle),
  };
  measurements.viewports[label].determinism = {
    reverse: determinismDelta.reverse <= 0.02,
    refreshStart: determinismDelta.refreshStart <= 0.02,
    refreshMiddle: determinismDelta.refreshMiddle <= 0.02,
    maxDelta: determinismDelta,
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

if (phase === "after") {
  for (const viewport of ["360x800", "390x844", "412x915"]) {
    for (const state of ["lun-start", "lun-mid", "lun-end"]) {
      execFileSync("magick", [
        path.join(hotfixRoot, "before", `before-${viewport}-${state}.png`),
        path.join(output, `after-${viewport}-${state}.png`),
        "+append",
        path.join(compare, `compare-${viewport}-${state}.png`),
      ]);
    }
  }

  for (const state of ["mar-start", "mar-mid", "mar-end-dom-start", "dom-mid", "dom-end"]) {
    execFileSync("magick", [
      path.join(hotfixRoot, "before", `before-390x844-${state}.png`),
      path.join(output, `after-390x844-${state}.png`),
      "+append",
      path.join(compare, `compare-390x844-${state}.png`),
    ]);
  }

  for (const viewport of ["768x900", "1440x1000"]) {
    execFileSync("magick", [
      path.join(runRoot, "screenshots/s02-node-hotfix/after", `after-${viewport}-progress-0.png`),
      path.join(output, `after-${viewport}-progress-0.png`),
      "+append",
      path.join(compare, `compare-${viewport}-progress-0.png`),
    ]);
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

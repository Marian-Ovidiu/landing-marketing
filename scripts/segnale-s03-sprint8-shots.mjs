// Sprint 8 — S03 mobile hierarchy visual and geometric QA.

import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const PHASE = process.argv[2] === "before" ? "before" : "after";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const RUN = path.resolve("../runs/2026-07-10-marketing-strategy-generator");
const ROOT = path.join(RUN, "screenshots/sprint-8-s03-mobile-hierarchy");
const OUT = path.join(ROOT, PHASE);
const DIRS = Object.fromEntries(
  ["full", "closeups", "sequence", "qa"].map((name) => [name, path.join(OUT, name)]),
);
Object.values(DIRS).forEach((directory) => mkdirSync(directory, { recursive: true }));

const browser = await chromium.launch();
const consoleErrors = [];
const results = { phase: PHASE, viewports: {}, interactions: {}, reducedMotion: {} };
let failures = 0;

function watch(page, label) {
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (message.text().includes("/_next/webpack-hmr")) return;
    consoleErrors.push(`${label}: ${message.text()}`);
  });
  page.on("pageerror", (error) => consoleErrors.push(`${label}: ${error.message}`));
}

async function sectionGeometry(page) {
  return page.locator("#section-03-cosa-ricevi").evaluate((section) => {
    const rect = section.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      height: rect.height,
      range: rect.height - window.innerHeight,
    };
  });
}

async function moveTo(page, progress, wait = 450) {
  const geometry = await sectionGeometry(page);
  await page.evaluate(
    ({ y }) => window.scrollTo(0, Math.round(y)),
    { y: geometry.top + geometry.range * progress },
  );
  if (wait) await page.waitForTimeout(wait);
}

async function motionState(page) {
  return page.locator("#section-03-cosa-ricevi").evaluate((section) => {
    const css = (selector) => getComputedStyle(section.querySelector(selector));
    return {
      surface: css("[data-s03-surface]").transform,
      priorities: css("[data-s03-priorities]").opacity,
      week: css("[data-s03-week]").opacity,
      indicators: css("[data-s03-indicators]").opacity,
      secondary: css("[data-s03-secondary]").opacity,
      closing: css("[data-s03-closing]").opacity,
      orientation: css("[data-s03-orientation-rule]").strokeDashoffset,
      closingRule: css("[data-s03-closing-rule]").strokeDashoffset,
    };
  });
}

async function audit(page) {
  return page.locator("#section-03-cosa-ricevi").evaluate((section) => {
    const root = document.documentElement;
    const paper = section.querySelector("[data-s03-surface]");
    const selectors = {
      heading: "h2",
      intro: "header > p:last-child",
      masthead: "[data-s03-surface] > header p:first-child",
      priorityLabel: "[data-s03-priorities] > p",
      priorityTitle: "[data-s03-priorities] h3",
      priorityRows: "[data-s03-priorities] li",
      priorityMeta: "[data-s03-priorities] li em",
      weekLabel: "[data-s03-week] > p",
      weekRows: "[data-s03-week] li",
      weekActions: "[data-s03-week] li span",
      indicatorLabel: "[data-s03-indicators] > p",
      indicators: "[data-s03-indicators] li",
      secondaryLabels: "[data-s03-secondary] .chapterLabel, [data-s03-secondary] > section > p:first-child",
      index: "[aria-label='Indice delle sei aree'] li",
      colophon: "[data-s03-surface] > footer",
      closing: "[data-s03-closing]",
    };

    const parseColor = (value) => {
      const match = value.match(/[\d.]+/g);
      return match ? match.slice(0, 4).map(Number) : [0, 0, 0, 1];
    };
    const luminance = ([r, g, b]) => {
      const values = [r, g, b].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
    };
    const contrast = (a, b) => {
      const [bright, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return Number(((bright + 0.05) / (dark + 0.05)).toFixed(2));
    };
    const effectiveOpacity = (node) => {
      let value = 1;
      let current = node;
      while (current && current !== section.parentElement) {
        value *= Number(getComputedStyle(current).opacity || 1);
        current = current.parentElement;
      }
      return Number(value.toFixed(3));
    };
    const paperColor = parseColor(getComputedStyle(paper).backgroundColor);
    const describe = (selector) => Array.from(section.querySelectorAll(selector)).map((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const color = parseColor(style.color);
      return {
        text: node.textContent.trim().replace(/\s+/g, " "),
        visible: style.display !== "none" && rect.width > 0 && rect.height > 0,
        fontSize: parseFloat(style.fontSize),
        lineHeight: parseFloat(style.lineHeight),
        fontWeight: style.fontWeight,
        letterSpacing: style.letterSpacing,
        color: style.color,
        opacity: effectiveOpacity(node),
        contrastOnPaper: contrast(color, paperColor),
        rect: {
          x: Number(rect.x.toFixed(2)),
          y: Number(rect.y.toFixed(2)),
          width: Number(rect.width.toFixed(2)),
          height: Number(rect.height.toFixed(2)),
        },
      };
    });
    const rect = (selector) => {
      const value = section.querySelector(selector).getBoundingClientRect();
      return {
        x: Number(value.x.toFixed(2)),
        y: Number(value.y.toFixed(2)),
        width: Number(value.width.toFixed(2)),
        height: Number(value.height.toFixed(2)),
        bottom: Number(value.bottom.toFixed(2)),
      };
    };
    const blocks = {
      surface: rect("[data-s03-surface]"),
      priorities: rect("[data-s03-priorities]"),
      week: rect("[data-s03-week]"),
      indicators: rect("[data-s03-indicators]"),
      secondary: rect("[data-s03-secondary]"),
      index: rect("[aria-label='Indice delle sei aree']"),
      colophon: rect("[data-s03-surface] > footer"),
    };
    const gap = (first, second) => Number((blocks[second].y - blocks[first].bottom).toFixed(2));
    const overlaps = [];
    const entries = Object.entries(blocks).filter(([key]) => key !== "surface");
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        const [aName, a] = entries[i];
        const [bName, b] = entries[j];
        const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
        const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
        if (width * height > 0.5) overlaps.push({ a: aName, b: bName, area: Number((width * height).toFixed(2)) });
      }
    }
    const paperRect = paper.getBoundingClientRect();
    const contained = Array.from(paper.querySelectorAll("h3, li, p, footer")).every((node) => {
      const value = node.getBoundingClientRect();
      if (getComputedStyle(node).display === "none" || value.width === 0 || value.height === 0) return true;
      return value.left >= paperRect.left - 1 && value.right <= paperRect.right + 1 && value.top >= paperRect.top - 1 && value.bottom <= paperRect.bottom + 1;
    });

    return {
      visualViewport: window.visualViewport
        ? { width: window.visualViewport.width, height: window.visualViewport.height }
        : null,
      document: { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth },
      surface: {
        ...blocks.surface,
        clientHeight: paper.clientHeight,
        scrollHeight: paper.scrollHeight,
        contained,
      },
      blocks,
      gaps: {
        prioritiesToWeek: gap("priorities", "week"),
        weekToIndicators: gap("week", "indicators"),
        indicatorsToSecondary: gap("indicators", "secondary"),
        secondaryToIndex: gap("secondary", "index"),
        indexToColophon: gap("index", "colophon"),
      },
      overlaps,
      styles: Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [key, describe(selector)])),
    };
  });
}

async function newPage(viewport, label, options = {}) {
  const context = await browser.newContext({
    viewport,
    screen: options.screen ?? viewport,
    reducedMotion: options.reducedMotion ?? "no-preference",
    deviceScaleFactor: options.deviceScaleFactor ?? 1,
  });
  const page = await context.newPage();
  watch(page, label);
  await page.goto(`${BASE}/concept/segnale`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.waitForTimeout(250);
  return { context, page };
}

const requiredViewports = [
  ["360x800", { width: 360, height: 800 }],
  ["375x812", { width: 375, height: 812 }],
  ["390x844", { width: 390, height: 844 }],
  ["393x873", { width: 393, height: 873 }],
  ["412x915", { width: 412, height: 915 }],
  ["390x720-chrome", { width: 390, height: 720 }],
  ["768x900", { width: 768, height: 900 }],
  ["1440x1000", { width: 1440, height: 1000 }],
];

for (const [label, viewport] of requiredViewports) {
  const { context, page } = await newPage(viewport, label);
  await moveTo(page, 1);
  const measured = await audit(page);
  measured.finalState = await motionState(page);
  results.viewports[label] = measured;
  if (measured.document.scrollWidth > measured.document.clientWidth) failures += 1;
  if (!measured.surface.contained || measured.overlaps.length) failures += 1;
  await page.screenshot({ path: path.join(DIRS.qa, `${label}-final.png`), animations: "disabled" });
  await context.close();
}

// Pixel control: removing every Sprint 8 media rule must not change 768/desktop.
results.desktopTabletControl = {};
for (const [label, viewport] of [
  ["768x900", { width: 768, height: 900 }],
  ["1440x1000", { width: 1440, height: 1000 }],
]) {
  const { context, page } = await newPage(viewport, `pixel-control-${label}`);
  await moveTo(page, 1, 700);
  const withSprint = path.join(DIRS.qa, `${label}-pixel-control-with-sprint8.png`);
  const withoutSprint = path.join(DIRS.qa, `${label}-pixel-control-without-sprint8.png`);
  await page.screenshot({ path: withSprint, animations: "disabled" });
  const removedRules = await page.evaluate(() => {
    let removed = 0;
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (let index = rules.length - 1; index >= 0; index -= 1) {
        const rule = rules[index];
        if (rule instanceof CSSMediaRule && rule.conditionText.includes("max-width: 767px")) {
          sheet.deleteRule(index);
          removed += 1;
        }
      }
    }
    return removed;
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: withoutSprint, animations: "disabled" });
  const metric = execFileSync("magick", ["compare", "-metric", "AE", withSprint, withoutSprint, "null:"] , {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  results.desktopTabletControl[label] = { removedRules, absoluteError: metric.trim() || "0" };
  await context.close();
}

for (const [label, viewport] of [
  ["360x800", { width: 360, height: 800 }],
  ["390x844", { width: 390, height: 844 }],
  ["412x915", { width: 412, height: 915 }],
]) {
  const { context, page } = await newPage(viewport, `full-${label}`);
  const files = [];
  for (const progress of [0, 0.3, 0.5, 0.68, 0.84, 1]) {
    await moveTo(page, progress);
    const file = path.join(DIRS.full, `${label}-${String(Math.round(progress * 100)).padStart(3, "0")}.png`);
    await page.screenshot({ path: file, animations: "disabled" });
    files.push(file);
  }
  execFileSync("magick", [
    ...files.flatMap((file) => [file, "-thumbnail", "220x"]),
    "+append",
    path.join(DIRS.sequence, `${label}-full-sequence.png`),
  ]);
  await context.close();
}

{
  const { context, page } = await newPage({ width: 390, height: 844 }, "closeups-390");
  const closeups = [
    [0.3, "priority", "[data-s03-priorities]"],
    [0.6, "calendar", "[data-s03-week]"],
    [0.84, "results", "[data-s03-indicators]"],
    [1, "lower", "[data-s03-secondary]"],
  ];
  for (const [progress, name, selector] of closeups) {
    await moveTo(page, progress);
    await page.locator(selector).screenshot({ path: path.join(DIRS.closeups, `390-${name}.png`), animations: "disabled" });
  }
  await moveTo(page, 1);
  const geometry = await sectionGeometry(page);
  await page.evaluate(
    (y) => window.scrollTo(0, Math.round(y)),
    geometry.top + geometry.range + 844 * 0.42,
  );
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(DIRS.closeups, "390-exit-to-s04.png"), animations: "disabled" });
  const sequenceFiles = [];
  for (const progress of [0.46, 0.5, 0.54, 0.58, 0.62]) {
    await moveTo(page, progress, 200);
    const file = path.join(DIRS.sequence, `390-consecutive-${String(Math.round(progress * 100)).padStart(3, "0")}.png`);
    await page.screenshot({ path: file, animations: "disabled" });
    sequenceFiles.push(file);
  }
  execFileSync("magick", [
    ...sequenceFiles.flatMap((file) => [file, "-thumbnail", "200x"]),
    "+append",
    path.join(DIRS.sequence, "390-consecutive-strip.png"),
  ]);
  await context.close();
}

// Reverse, jump/swipe and refresh at three points.
{
  const { context, page } = await newPage({ width: 390, height: 844 }, "interaction-390");
  await moveTo(page, 0.5);
  const initial = await motionState(page);
  await moveTo(page, 0.84);
  await moveTo(page, 0.5);
  const reversed = await motionState(page);
  results.interactions.reverse = { initial, reversed, deterministic: JSON.stringify(initial) === JSON.stringify(reversed) };
  if (!results.interactions.reverse.deterministic) failures += 1;

  await moveTo(page, 0.2, 0);
  await moveTo(page, 0.9, 550);
  results.interactions.rapidSwipe = { state: await motionState(page), audit: await audit(page) };

  results.interactions.refresh = {};
  for (const progress of [0.3, 0.58, 0.84]) {
    await moveTo(page, progress);
    const before = await motionState(page);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(250);
    await moveTo(page, progress);
    const after = await motionState(page);
    const deterministic = JSON.stringify(before) === JSON.stringify(after);
    results.interactions.refresh[progress] = { before, after, deterministic };
    if (!deterministic) failures += 1;
  }
  await context.close();
}

{
  const { context, page } = await newPage(
    { width: 390, height: 844 },
    "reduced-390",
    { reducedMotion: "reduce" },
  );
  await page.locator("#section-03-cosa-ricevi").scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  results.reducedMotion = { state: await motionState(page), audit: await audit(page) };
  await page.screenshot({ path: path.join(DIRS.qa, "390x844-reduced.png"), animations: "disabled" });
  await context.close();
}

await browser.close();
results.consoleErrors = consoleErrors;
results.failures = failures + (consoleErrors.length ? 1 : 0);
writeFileSync(path.join(OUT, "measurements.json"), JSON.stringify(results, null, 2));
console.log(`Sprint 8 ${PHASE}: ${OUT}`);
console.log(`console errors: ${consoleErrors.length}; failures: ${results.failures}`);
process.exit(results.failures ? 1 : 0);

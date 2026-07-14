import { chromium, webkit } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const OUT = path.resolve(process.cwd(), "../runs/2026-07-10-marketing-strategy-generator/screenshots/section-02");
mkdirSync(OUT, { recursive: true });

const errors = [];
const measurements = {};

function watch(page, label) {
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`${label}: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`${label}: ${error.message}`));
}

async function metrics(page) {
  return page.locator("#section-02-esempio-di-piano").evaluate((section) => {
    const sectionRect = section.getBoundingClientRect();
    const runwayRect = section.querySelector(".deck-runway").getBoundingClientRect();
    const axis = (selector) => document.querySelector(selector)?.getBoundingClientRect().left;
    return {
      sectionTop: sectionRect.top + scrollY,
      sectionHeight: sectionRect.height,
      runwayTop: runwayRect.top + scrollY,
      runwayHeight: runwayRect.height,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      axes: {
        hero: axis(".headline"),
        section01: axis(".how-it-works-header h2"),
        section02: axis(".weekly-plan-header h2"),
      },
    };
  });
}

async function captureSequence(browser, label, viewport) {
  const page = await browser.newPage({ viewport });
  watch(page, label);
  await page.goto(`${BASE}/concept/page`, { waitUntil: "networkidle" });
  const data = await metrics(page);
  measurements[label] = data;
  const range = data.runwayHeight - data.viewportHeight;

  const capture = async (name, progress) => {
    await page.evaluate((y) => scrollTo(0, y), data.runwayTop + range * progress);
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, `${label}-${name}.png`) });
  };

  await capture("mazzo-iniziale", 0);
  await capture("dopo-lunedi", 0.25);
  await capture("dopo-mercoledi", 0.47);
  await capture("dopo-venerdi", 0.69);
  await capture("settimana-completa", 0.98);
  // click a coordinate: niente scrollIntoView implicito, che riavvolgerebbe lo scrub
  const target = page.locator(".weekly-card").nth(2);
  const box = await target.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.4);
  await page.waitForTimeout(220);
  const expanded = await target.getAttribute("aria-expanded");
  if (expanded !== "true") errors.push(`${label}: scheda mercoledì non espansa dopo il click`);
  await page.screenshot({ path: path.join(OUT, `${label}-scheda-espansa.png`) });

  // Reverse completo: lo stato iniziale deve ricostituirsi senza salti.
  await page.evaluate((y) => scrollTo(0, y), data.runwayTop);
  await page.waitForTimeout(700);
  measurements[`${label}-reverse`] = await page.locator("[data-deck-card]").evaluateAll((cards) =>
    cards.map((card) => ({ opacity: getComputedStyle(card).opacity, transform: getComputedStyle(card).transform })),
  );
  await page.close();
}

async function inspect(browser, label, viewport, reducedMotion = "no-preference") {
  const page = await browser.newPage({ viewport, reducedMotion });
  watch(page, label);
  await page.goto(`${BASE}/concept/page`, { waitUntil: "networkidle" });
  const data = await metrics(page);
  const cards = await page.locator("[data-deck-card]").evaluateAll((nodes) =>
    nodes.map((node) => ({ opacity: getComputedStyle(node).opacity, rect: node.getBoundingClientRect().toJSON() })),
  );
  const details = await page.locator(".weekly-detail").evaluateAll((nodes) =>
    nodes.map((node) => ({ opacity: getComputedStyle(node).opacity, visibility: getComputedStyle(node).visibility })),
  );
  measurements[label] = { ...data, reducedMotion, cards, details };
  await page.close();
}

const chromiumBrowser = await chromium.launch();
await captureSequence(chromiumBrowser, "desktop", { width: 1440, height: 1000 });
await captureSequence(chromiumBrowser, "mobile", { width: 390, height: 844 });
await inspect(chromiumBrowser, "desktop-1024", { width: 1024, height: 900 });
await inspect(chromiumBrowser, "mobile-360", { width: 360, height: 800 });
await inspect(chromiumBrowser, "reduced-desktop", { width: 1440, height: 1000 }, "reduce");
await inspect(chromiumBrowser, "reduced-mobile", { width: 390, height: 844 }, "reduce");
await chromiumBrowser.close();

const webkitBrowser = await webkit.launch();
await inspect(webkitBrowser, "webkit-mobile", { width: 390, height: 844 });
await webkitBrowser.close();

writeFileSync(path.join(OUT, "deck-measurements.json"), JSON.stringify(measurements, null, 2));

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`checkpoint salvati in ${OUT}`);
console.log("nessun errore console o pageerror");

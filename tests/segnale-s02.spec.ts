import { expect, test } from "playwright/test";

// S02 Segnale — «Operational Rhythm» (fase S02-B2).
// Stessa disciplina di segnale-s01.spec.ts: stati, teal guadagnato,
// reverse/refresh deterministici, overflow, reduced motion.

const errors = new WeakMap<object, string[]>();

test.beforeEach(async ({ page }) => {
  const captured: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") captured.push(message.text());
  });
  page.on("pageerror", (error) => captured.push(error.message));
  errors.set(page, captured);
  await page.goto("/concept/segnale", { waitUntil: "networkidle" });
  await page.waitForTimeout(350);
});

test.afterEach(async ({ page }) => {
  expect(errors.get(page) ?? []).toEqual([]);
});

async function moveTo(page: import("playwright/test").Page, progress: number) {
  const section = page.locator("#section-02-esempio-di-piano");
  const metrics = await section.evaluate((node) => ({
    top: node.getBoundingClientRect().top + window.scrollY,
    range: node.getBoundingClientRect().height - window.innerHeight,
  }));
  await page.evaluate((y) => window.scrollTo(0, y), metrics.top + metrics.range * progress);
  await page.waitForTimeout(450);
}

async function visualState(page: import("playwright/test").Page) {
  return page.locator("#section-02-esempio-di-piano").evaluate((section) => {
    const style = (selector: string) => getComputedStyle(section.querySelector(selector)!);
    return {
      band: style("[data-band-base]").strokeDashoffset,
      accentLun: style("[data-accent-lun]").strokeDashoffset,
      accentDom: style("[data-accent-dom]").strokeDashoffset,
      markerLun: style("[data-marker-lun]").stroke,
      markerMar: style("[data-marker-mar]").stroke,
      markerDom: style("[data-marker-dom]").stroke,
      massLun: style("[data-mass-lun]").opacity,
      massLunTransform: style("[data-mass-lun]").transform,
      massMar: style("[data-mass-mar]").opacity,
      massDom: style("[data-mass-dom]").opacity,
      quiet: style("[data-quiet]").opacity,
      closing: style("[data-closing]").opacity,
    };
  });
}

const TEAL = "rgb(11, 122, 117)";

test("monta il rendering dedicato dopo S01 e conserva l'ordine DOM", async ({ page }) => {
  await expect(page.locator(".segnale-weekly-rhythm")).toHaveCount(1);
  await expect(page.locator(".weekly-deck")).toHaveCount(0);
  await expect(page.locator(".segnale-s02-band")).toHaveCount(1);
  await expect(page.locator(".segnale-s02-band text")).toHaveCount(0);

  const order = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("*"));
    return [
      "#section-01-come-funziona",
      "#section-02-esempio-di-piano",
      ".segnale-s02-header",
      "[data-mass-lun]",
      "[data-mass-mar]",
      ".segnale-s02-quiet-list li",
      "[data-mass-dom]",
      "[data-closing]",
    ].map((selector) => all.indexOf(document.querySelector(selector)!));
  });
  expect(order.every((value) => value >= 0)).toBe(true);
  expect(order).toEqual([...order].sort((a, b) => a - b));
});

test("settimana aperta senza teal, poi i tre marker lo guadagnano in ordine", async ({ page }) => {
  await moveTo(page, 0);
  const open = await visualState(page);
  expect(parseFloat(open.band)).toBeGreaterThan(0.9);
  expect(open.markerLun).not.toBe(TEAL);
  expect(open.markerMar).not.toBe(TEAL);
  expect(open.markerDom).not.toBe(TEAL);
  expect(Number(open.massLun)).toBeLessThan(0.35);
  expect(Number(open.closing)).toBeLessThan(0.15);

  await moveTo(page, 0.38);
  const preparazione = await visualState(page);
  expect(parseFloat(preparazione.band)).toBeLessThan(0.01);
  expect(Number(preparazione.massLun)).toBeGreaterThan(0.99);
  expect(preparazione.markerLun).toBe(TEAL);
  expect(preparazione.markerMar).not.toBe(TEAL);
  expect(preparazione.markerDom).not.toBe(TEAL);

  await moveTo(page, 0.62);
  const attivazione = await visualState(page);
  expect(Number(attivazione.massMar)).toBeGreaterThan(0.99);
  expect(attivazione.markerMar).toBe(TEAL);
  expect(attivazione.markerDom).not.toBe(TEAL);
  expect(Number(attivazione.quiet)).toBeLessThan(0.45);

  await moveTo(page, 1);
  const finale = await visualState(page);
  expect(finale.markerDom).toBe(TEAL);
  expect(Number(finale.massDom)).toBeGreaterThan(0.99);
  expect(Number(finale.quiet)).toBeGreaterThan(0.55);
  expect(Number(finale.closing)).toBeGreaterThan(0.99);
  expect(parseFloat(finale.accentDom)).toBeLessThan(0.01);
});

test("reverse e refresh a metà sono deterministici", async ({ page }) => {
  for (const [from, to] of [
    [0.2, 0.55],
    [0.45, 0.85],
  ] as const) {
    await moveTo(page, from);
    const before = await visualState(page);
    await moveTo(page, to);
    await moveTo(page, from);
    expect(await visualState(page)).toEqual(before);
  }

  await moveTo(page, 1);
  await moveTo(page, 0);
  const azzerato = await visualState(page);
  expect(azzerato.markerLun).not.toBe(TEAL);
  expect(Number(azzerato.massLun)).toBeLessThan(0.35);

  await moveTo(page, 0.5);
  const beforeRefresh = await visualState(page);
  await page.evaluate(() => window.location.reload());
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
  await moveTo(page, 0.5);
  expect(await visualState(page)).toEqual(beforeRefresh);
});

test("S01 resta intatta con S02 montata", async ({ page }) => {
  const s01 = page.locator("#section-01-come-funziona");
  await expect(s01).toHaveCount(1);
  await s01.evaluate((node) => {
    window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY + node.getBoundingClientRect().height - window.innerHeight);
  });
  await page.waitForTimeout(450);
  await expect(s01.locator("[data-decision]")).toHaveCSS("opacity", "1");
  const rule = await s01
    .locator("[data-decision-rule]")
    .evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).a);
  expect(rule).toBeGreaterThan(0.99);
});

test("non produce overflow ai breakpoint richiesti", async ({ browser, baseURL }) => {
  const viewports = [
    { width: 1440, height: 1000 },
    { width: 1024, height: 900 },
    { width: 768, height: 900 },
    { width: 390, height: 844 },
    { width: 375, height: 812 },
    { width: 360, height: 800 },
  ];
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
    const localPage = await context.newPage();
    await localPage.goto(`${baseURL}/concept/segnale`, { waitUntil: "networkidle" });
    const section = localPage.locator("#section-02-esempio-di-piano");
    const metrics = await section.evaluate((node) => ({
      top: node.getBoundingClientRect().top + window.scrollY,
      range: node.getBoundingClientRect().height - window.innerHeight,
    }));
    await localPage.evaluate((y) => window.scrollTo(0, y), metrics.top + metrics.range * 0.8);
    await localPage.waitForTimeout(450);
    const dimensions = await localPage.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    await context.close();
  }
});

test("reduced motion mostra il piano completo in flusso normale", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const localPage = await context.newPage();
  await localPage.goto(`${baseURL}/concept/segnale`, { waitUntil: "networkidle" });
  const section = localPage.locator("#section-02-esempio-di-piano");
  await expect(section.locator(".segnale-weekly-rhythm-sticky")).toHaveCSS("position", "relative");
  await expect(section.locator("[data-mass-lun]")).toHaveCSS("opacity", "1");
  await expect(section.locator("[data-closing]")).toHaveCSS("opacity", "1");
  const marker = await section
    .locator("[data-marker-mar]")
    .first()
    .evaluate((node) => getComputedStyle(node).stroke);
  expect(marker).toBe("rgb(11, 122, 117)");
  await expect(section.getByText("Cinque ore e venti", { exact: false })).toBeVisible();
  await context.close();
});

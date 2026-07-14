import { expect, test } from "playwright/test";

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
  const section = page.locator("#section-01-come-funziona");
  const metrics = await section.evaluate((node) => ({
    top: node.getBoundingClientRect().top + window.scrollY,
    range: node.getBoundingClientRect().height - window.innerHeight,
  }));
  await page.evaluate((y) => window.scrollTo(0, y), metrics.top + metrics.range * progress);
  await page.waitForTimeout(450);
}

async function visualState(page: import("playwright/test").Page) {
  return page.locator("#section-01-come-funziona").evaluate((section) => {
    const style = (selector: string) => getComputedStyle(section.querySelector(selector)!);
    const matrix = new DOMMatrixReadOnly(style("[data-decision-rule]").transform);
    return {
      noise: style("[data-noise]").opacity,
      evidence: style("[data-evidence]").opacity,
      evidenceTransform: style("[data-evidence]").transform,
      centerOpacity: style("[data-trace-center]").opacity,
      centerDash: style("[data-trace-center]").strokeDashoffset,
      markerStroke: style("[data-marker-useful]").stroke,
      decision: style("[data-decision]").opacity,
      detail: style("[data-decision-detail]").opacity,
      ruleScale: matrix.a,
    };
  });
}

test("usa il rendering Editorial Tracing dedicato e conserva l'ordine DOM", async ({ page }) => {
  await expect(page.locator(".segnale-how-it-works")).toHaveCount(1);
  await expect(page.locator(".how-it-works")).toHaveCount(0);
  await expect(page.locator(".segnale-trace")).toHaveCount(1);
  await expect(page.locator(".segnale-trace text")).toHaveCount(0);

  const order = await page.locator("#section-01-come-funziona").evaluate((section) => {
    const all = Array.from(section.querySelectorAll("*"));
    return [
      ".segnale-how-it-works-header",
      ".segnale-source h3",
      ".segnale-reading",
      ".segnale-decision h3",
      ".segnale-secondary-actions li",
    ].map((selector) => all.indexOf(section.querySelector(selector)!));
  });
  expect(order.every((value) => value >= 0)).toBe(true);
  expect(order).toEqual([...order].sort((a, b) => a - b));
});

test("Ascolto non mostra teal e Decisione completa la gerarchia", async ({ page }) => {
  await moveTo(page, 0);
  const initial = await visualState(page);
  expect(Number(initial.centerOpacity)).toBeLessThan(0.01);
  expect(initial.markerStroke).not.toBe("rgb(11, 122, 117)");
  expect(Number(initial.decision)).toBeLessThan(0.31);
  expect(initial.ruleScale).toBeLessThan(0.01);

  await moveTo(page, 0.7);
  const reading = await visualState(page);
  expect(Number(reading.centerOpacity)).toBeGreaterThan(0.75);
  expect(reading.markerStroke).toBe("rgb(11, 122, 117)");
  expect(Number(reading.noise)).toBeLessThan(0.5);
  expect(Number(reading.evidence)).toBeGreaterThan(0.95);

  await moveTo(page, 1);
  const final = await visualState(page);
  expect(Number(final.decision)).toBeGreaterThan(0.99);
  expect(Number(final.detail)).toBeGreaterThan(0.99);
  expect(final.ruleScale).toBeGreaterThan(0.99);
});

test("reverse e refresh a metà sono deterministici", async ({ page }) => {
  for (const [from, to] of [
    [0.2, 0.6],
    [0.45, 0.85],
  ] as const) {
    await moveTo(page, from);
    const before = await visualState(page);
    await moveTo(page, to);
    await moveTo(page, from);
    expect(await visualState(page)).toEqual(before);
  }

  await moveTo(page, 0.5);
  const beforeRefresh = await visualState(page);
  await page.evaluate(() => window.location.reload());
  await page.waitForLoadState("networkidle");
  // WebKit applica il ripristino nativo dello scroll in un task successivo al
  // load: attendiamo che si stabilizzi prima di imporre il checkpoint S01.
  await page.waitForTimeout(300);
  await moveTo(page, 0.5);
  expect(await visualState(page)).toEqual(beforeRefresh);
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
    await moveTo(localPage, 0.7);
    const dimensions = await localPage.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    await context.close();
  }
});

test("reduced motion mostra il finale completo in flusso normale", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const localPage = await context.newPage();
  await localPage.goto(`${baseURL}/concept/segnale`, { waitUntil: "networkidle" });
  const section = localPage.locator("#section-01-come-funziona");
  await expect(section.locator(".segnale-how-it-works-sticky")).toHaveCSS("position", "relative");
  await expect(section).toHaveCSS("height", /\d+px/);
  await expect(section.locator("[data-decision]")).toHaveCSS("opacity", "1");
  await expect(section.locator("[data-trace-center]").first()).toHaveCSS("opacity", "0.55");
  await expect(section.getByText("Aggiorna manualmente foto, orari e menu", { exact: false })).toBeVisible();
  await context.close();
});

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
    const effectiveOpacity = (selector: string) => {
      let element: Element | null = section.querySelector(selector);
      let opacity = 1;
      while (element && element !== section.parentElement) {
        opacity *= Number.parseFloat(getComputedStyle(element).opacity);
        element = element.parentElement;
      }
      return opacity;
    };
    const matrix = new DOMMatrixReadOnly(style("[data-decision-rule]").transform);
    return {
      noise: style("[data-noise]").opacity,
      noiseEffective: effectiveOpacity("[data-noise]"),
      reading: style("[data-reading]").opacity,
      evidence: style("[data-evidence]").opacity,
      evidenceEffective: effectiveOpacity("[data-evidence]"),
      evidenceTransform: style("[data-evidence]").transform,
      centerOpacity: style("[data-trace-center]").opacity,
      centerDash: style("[data-trace-center]").strokeDashoffset,
      markerStroke: style("[data-marker-useful]").stroke,
      decision: style("[data-decision]").opacity,
      decisionEffective: effectiveOpacity("[data-decision]"),
      detail: style("[data-decision-detail]").opacity,
      detailEffective: effectiveOpacity("[data-decision-detail]"),
      secondary: style("[data-secondary-actions]").opacity,
      secondaryEffective: effectiveOpacity("[data-secondary-actions]"),
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
  const isMobile = await page.evaluate(() => window.innerWidth < 768);
  await moveTo(page, 0);
  const initial = await visualState(page);
  expect(Number(initial.centerOpacity)).toBeLessThan(0.01);
  expect(initial.markerStroke).not.toBe("rgb(11, 122, 117)");
  expect(Number(initial.decision)).toBeCloseTo(isMobile ? 0.34 : 0.28, 2);
  expect(initial.detailEffective).toBeGreaterThanOrEqual(isMobile ? 0.3 : 0.12);
  expect(initial.secondaryEffective).toBeGreaterThanOrEqual(isMobile ? 0.25 : 0.05);
  expect(initial.ruleScale).toBeLessThan(0.01);

  await moveTo(page, 0.7);
  const reading = await visualState(page);
  expect(Number(reading.centerOpacity)).toBeGreaterThan(0.75);
  expect(reading.markerStroke).toBe("rgb(11, 122, 117)");
  expect(Number(reading.noise)).toBeLessThanOrEqual(isMobile ? 0.51 : 0.5);
  expect(Number(reading.evidence)).toBeGreaterThan(0.95);

  await moveTo(page, 1);
  const final = await visualState(page);
  expect(Number(final.decision)).toBeGreaterThan(0.99);
  expect(Number(final.detail)).toBeGreaterThan(isMobile ? 0.9 : 0.99);
  expect(final.ruleScale).toBeGreaterThan(0.99);
});

test("reverse e refresh a metà sono deterministici", async ({ page }) => {
  for (const [from, to] of [
    [0.2, 0.6],
    [0.45, 0.85],
    [0.1, 0.9],
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
    { width: 412, height: 915 },
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

test("mobile mantiene gerarchia e contrasto nelle transizioni S01", async ({ browser, baseURL }) => {
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 412, height: 915 },
    { width: 390, height: 720 },
  ]) {
    const context = await browser.newContext({ viewport });
    const localPage = await context.newPage();
    await localPage.goto(`${baseURL}/concept/segnale`, { waitUntil: "networkidle" });

    await moveTo(localPage, 0);
    const initial = await visualState(localPage);
    expect(initial.evidenceEffective).toBeGreaterThanOrEqual(0.5);
    expect(initial.decisionEffective).toBeGreaterThanOrEqual(0.33);
    expect(initial.detailEffective).toBeGreaterThanOrEqual(0.3);
    expect(initial.secondaryEffective).toBeGreaterThanOrEqual(0.25);

    await moveTo(localPage, 0.5);
    const central = await visualState(localPage);
    expect(Number(central.centerOpacity)).toBeGreaterThanOrEqual(0.9);
    expect(central.decisionEffective).toBeGreaterThanOrEqual(0.55);
    expect(central.detailEffective).toBeGreaterThanOrEqual(0.5);
    expect(central.secondaryEffective).toBeGreaterThanOrEqual(0.42);

    await moveTo(localPage, 1);
    const final = await visualState(localPage);
    expect(Number(final.reading)).toBeGreaterThanOrEqual(0.55);
    expect(Number(final.reading)).toBeLessThanOrEqual(0.57);
    expect(final.noiseEffective).toBeGreaterThanOrEqual(0.54);
    expect(final.decisionEffective).toBeGreaterThanOrEqual(0.99);
    expect(final.detailEffective).toBeGreaterThanOrEqual(0.91);
    expect(final.secondaryEffective).toBeGreaterThanOrEqual(0.77);

    const geometry = await localPage.locator("#section-01-come-funziona").evaluate((section) => {
      const visibleText = Array.from(section.querySelectorAll<HTMLElement>("*")).filter((element) => {
        const rect = element.getBoundingClientRect();
        return Boolean(element.textContent?.trim()) && rect.width > 0 && rect.height > 0;
      });
      const firstTrace = section.querySelector<SVGPathElement>(
        ".segnale-trace-mobile [data-trace-first]",
      )!;
      return {
        minFont: Math.min(...visibleText.map((element) => Number.parseFloat(getComputedStyle(element).fontSize))),
        traceStroke: getComputedStyle(firstTrace).stroke,
        traceOpacity: getComputedStyle(firstTrace).opacity,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(geometry.minFont).toBeGreaterThanOrEqual(10);
    expect(geometry.traceStroke).toBe("rgb(90, 100, 105)");
    expect(Number(geometry.traceOpacity)).toBeCloseTo(0.52, 2);
    expect(geometry.overflow).toBe(0);
    await context.close();
  }
});

test("Sprint 7 lascia invariato il contrasto S01 a 768px e desktop", async ({ browser, baseURL }) => {
  for (const viewport of [
    { width: 768, height: 900 },
    { width: 1440, height: 1000 },
  ]) {
    const context = await browser.newContext({ viewport });
    const localPage = await context.newPage();
    await localPage.goto(`${baseURL}/concept/segnale`, { waitUntil: "networkidle" });
    await moveTo(localPage, 0);
    const state = await visualState(localPage);
    expect(Number(state.decision)).toBeCloseTo(0.28, 2);
    expect(Number(state.detail)).toBeCloseTo(0.45, 2);
    expect(Number(state.secondary)).toBeCloseTo(0.2, 2);
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

import { expect, test, type Page } from "playwright/test";

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

async function moveTo(page: Page, progress: number) {
  const metrics = await page.locator("#section-03-cosa-ricevi").evaluate((node) => ({
    top: node.getBoundingClientRect().top + window.scrollY,
    range: node.getBoundingClientRect().height - window.innerHeight,
  }));
  await page.evaluate((y) => window.scrollTo(0, Math.round(y)), metrics.top + metrics.range * progress);
  await page.waitForTimeout(450);
}

async function state(page: Page) {
  return page.locator("#section-03-cosa-ricevi").evaluate((section) => {
    const css = (selector: string) => getComputedStyle(section.querySelector(selector)!);
    return {
      surface: css("[data-s03-surface]").transform,
      priorities: css("[data-s03-priorities]").opacity,
      week: css("[data-s03-week]").opacity,
      indicators: css("[data-s03-indicators]").opacity,
      secondary: css("[data-s03-secondary]").opacity,
      indexSecondary: css("[data-s03-index-secondary]").opacity,
      closing: css("[data-s03-closing]").opacity,
      orientation: css("[data-s03-orientation-rule]").strokeDashoffset,
      closingRule: css("[data-s03-closing-rule]").strokeDashoffset,
    };
  });
}

test("monta S03 dopo S02 come una sola superficie editoriale", async ({ page }) => {
  const section = page.locator("#section-03-cosa-ricevi");
  await expect(section).toHaveCount(1);
  await expect(section.locator("[data-s03-surface]")).toHaveCount(1);
  await expect(page.locator("#section-03-cosa-ricevi .dossier-section")).toHaveCount(0);
  await expect(section.locator("svg")).toHaveCount(1);
  await expect(section.locator("svg text")).toHaveCount(0);
  await expect(section.locator("button, [role=tab], img, video, canvas")).toHaveCount(0);

  const order = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("*"));
    return [
      "#section-02-esempio-di-piano",
      "#section-03-cosa-ricevi",
      "#section-03-cosa-ricevi header",
      "#section-03-cosa-ricevi [aria-label='Inventario delle aree operative']",
      "#section-03-cosa-ricevi [data-s03-surface]",
      "#section-03-cosa-ricevi [data-s03-priorities]",
      "#section-03-cosa-ricevi [data-s03-week]",
      "#section-03-cosa-ricevi [data-s03-indicators]",
      "#section-03-cosa-ricevi [data-s03-secondary]",
      "#section-03-cosa-ricevi [data-s03-closing]",
    ].map((selector) => all.indexOf(document.querySelector(selector)!));
  });
  expect(order.every((value) => value >= 0)).toBe(true);
  expect(order).toEqual([...order].sort((a, b) => a - b));
});

test("usa le sei aree e soltanto contenuti reali", async ({ page }) => {
  const section = page.locator("#section-03-cosa-ricevi");
  for (const label of [
    "Strategia e priorità",
    "Calendario operativo",
    "Missione del giorno",
    "Idee e bozze operative",
    "Recensioni e reputazione",
    "Attività e risultati",
  ]) {
    await expect(section.getByText(label, { exact: true }).first()).toBeAttached();
  }
  await expect(section.getByText("Scheda Google", { exact: true }).first()).toBeAttached();
  await expect(section.getByText("Menu fisso 18€", { exact: true })).toBeAttached();
  await expect(section.getByText("Recensioni nuove", { exact: true })).toBeAttached();
  await expect(section.getByText("rileggi e pubblica manualmente", { exact: true })).toBeAttached();
  await expect(section.getByText("RIEPILOGO BASE MANUALE", { exact: false })).toBeAttached();

  const text = await section.innerText();
  for (const forbidden of ["download", "esporta", "dashboard", "PDF", "condividi", "stampa"]) {
    expect(text.toLowerCase()).not.toContain(forbidden.toLowerCase());
  }
});

test("timeline conduce da presenza a consegna e resta deterministica", async ({ page }) => {
  await moveTo(page, 0);
  const presence = await state(page);
  expect(Number(presence.priorities)).toBeCloseTo(0.72, 1);
  expect(Number(presence.week)).toBeCloseTo(0.5, 1);
  expect(Number(presence.indicators)).toBeCloseTo(0.48, 1);
  expect(Number(presence.closing)).toBeLessThan(0.25);

  await moveTo(page, 0.7);
  const open = await state(page);
  expect(Number(open.priorities)).toBeGreaterThan(0.99);
  expect(Number(open.week)).toBeGreaterThan(0.99);
  expect(Number(open.indicators)).toBeGreaterThan(0.7);

  await moveTo(page, 1);
  const delivered = await state(page);
  expect(Number(delivered.indicators)).toBeGreaterThan(0.99);
  expect(Number(delivered.indexSecondary)).toBeGreaterThan(0.99);
  expect(Number(delivered.closing)).toBeGreaterThan(0.99);
  expect(parseFloat(delivered.orientation)).toBeLessThan(0.01);
  expect(parseFloat(delivered.closingRule)).toBeLessThan(0.01);

  for (const [from, to] of [[0.2, 0.6], [0.45, 0.85]] as const) {
    await moveTo(page, from);
    const before = await state(page);
    await moveTo(page, to);
    await moveTo(page, from);
    expect(await state(page)).toEqual(before);
  }

  await moveTo(page, 0.5);
  const beforeRefresh = await state(page);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(350);
  await moveTo(page, 0.5);
  expect(await state(page)).toEqual(beforeRefresh);
});

test("non produce overflow ai breakpoint richiesti", async ({ browser, baseURL }) => {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1024, height: 900 },
    { width: 768, height: 900 },
    { width: 390, height: 844 },
    { width: 375, height: 812 },
    { width: 360, height: 800 },
  ]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
    const localPage = await context.newPage();
    await localPage.goto(`${baseURL}/concept/segnale`, { waitUntil: "networkidle" });
    const section = localPage.locator("#section-03-cosa-ricevi");
    const metrics = await section.evaluate((node) => ({
      top: node.getBoundingClientRect().top + window.scrollY,
      range: node.getBoundingClientRect().height - window.innerHeight,
    }));
    await localPage.evaluate((y) => window.scrollTo(0, Math.round(y)), metrics.top + metrics.range);
    await localPage.waitForTimeout(450);
    const dimensions = await localPage.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    await expect(section.locator("[data-s03-surface]")).toBeInViewport();
    await context.close();
  }
});

test("reduced motion mostra la consegna completa in flusso", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const localPage = await context.newPage();
  await localPage.goto(`${baseURL}/concept/segnale`, { waitUntil: "networkidle" });
  const section = localPage.locator("#section-03-cosa-ricevi");
  await expect(section).toHaveCSS("height", "844px");
  await expect(section.locator("[data-s03-surface]")).toHaveCSS("transform", "none");
  await expect(section.locator("[data-s03-priorities]")).toHaveCSS("opacity", "1");
  await expect(section.locator("[data-s03-week]")).toHaveCSS("opacity", "1");
  await expect(section.locator("[data-s03-indicators]")).toHaveCSS("opacity", "1");
  await expect(section.locator("[data-s03-closing]")).toHaveCSS("opacity", "1");
  await expect(section.getByText("Dal profilo del locale", { exact: false }).first()).toBeAttached();
  await context.close();
});

test("il cambio S02→S03 è netto e le sezioni congelate restano montate", async ({ page }) => {
  for (const selector of [
    ".stage--live",
    "#section-01-come-funziona",
    "#section-02-esempio-di-piano",
    "#section-03-cosa-ricevi",
  ]) {
    await expect(page.locator(selector)).toHaveCount(1);
  }
  const colors = await page.evaluate(() => ({
    s02: getComputedStyle(document.querySelector("#section-02-esempio-di-piano")!).backgroundColor,
    s03: getComputedStyle(document.querySelector("#section-03-cosa-ricevi")!).backgroundColor,
    surface: getComputedStyle(document.querySelector("[data-s03-surface]")!).backgroundColor,
  }));
  expect(colors.s02).not.toBe(colors.s03);
  expect(colors.s03).toBe("rgb(23, 27, 29)");
  expect(colors.surface).toBe("rgb(242, 243, 241)");
});

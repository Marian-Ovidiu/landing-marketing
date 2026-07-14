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
      mobileMarkerLun: style(".segnale-s02-band-mobile [data-marker-lun]").fill,
      mobileMarkerMar: style(".segnale-s02-band-mobile [data-marker-mar]").fill,
      mobileMarkerDom: style(".segnale-s02-band-mobile [data-marker-dom]").fill,
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
  expect(open.mobileMarkerLun).not.toBe(TEAL);
  expect(open.mobileMarkerMar).not.toBe(TEAL);
  expect(open.mobileMarkerDom).not.toBe(TEAL);
  expect(Number(open.massLun)).toBeLessThan(0.35);
  expect(Number(open.closing)).toBeLessThan(0.15);

  await moveTo(page, 0.38);
  const preparazione = await visualState(page);
  expect(parseFloat(preparazione.band)).toBeLessThan(0.01);
  expect(Number(preparazione.massLun)).toBeGreaterThan(0.99);
  expect(preparazione.markerLun).toBe(TEAL);
  expect(preparazione.mobileMarkerLun).toBe(TEAL);
  expect(preparazione.markerMar).not.toBe(TEAL);
  expect(preparazione.mobileMarkerMar).not.toBe(TEAL);
  expect(preparazione.markerDom).not.toBe(TEAL);

  await moveTo(page, 0.62);
  const attivazione = await visualState(page);
  expect(Number(attivazione.massMar)).toBeGreaterThan(0.99);
  expect(attivazione.markerMar).toBe(TEAL);
  expect(attivazione.mobileMarkerMar).toBe(TEAL);
  expect(attivazione.markerDom).not.toBe(TEAL);
  expect(Number(attivazione.quiet)).toBeLessThan(0.45);

  await moveTo(page, 1);
  const finale = await visualState(page);
  expect(finale.markerDom).toBe(TEAL);
  expect(finale.mobileMarkerDom).toBe(TEAL);
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
    { width: 412, height: 915 },
    { width: 393, height: 873 },
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

test("S02 mobile ha tre scene editoriali leggibili nel visual viewport", async ({ browser, baseURL }) => {
  const viewports = [
    { width: 360, height: 800 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 393, height: 873 },
    { width: 412, height: 915 },
  ];

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const localPage = await context.newPage();
    await localPage.goto(`${baseURL}/concept/segnale`, { waitUntil: "networkidle" });
    const section = localPage.locator("#section-02-esempio-di-piano");
    const sectionMetrics = await section.evaluate((node) => ({
      top: node.getBoundingClientRect().top + window.scrollY,
      range: node.getBoundingClientRect().height - window.innerHeight,
    }));
    await localPage.evaluate((y) => window.scrollTo(0, y), sectionMetrics.top + sectionMetrics.range);
    await localPage.waitForTimeout(450);

    const rhythm = await section.evaluate((node) => {
      const one = (selector: string) => node.querySelector<HTMLElement>(selector)!;
      const all = (selector: string) => Array.from(node.querySelectorAll<HTMLElement>(selector));
      const rect = (element: Element) => element.getBoundingClientRect();
      const visibleTextSizes = all("*")
        .filter((element) => {
          const box = rect(element);
          const style = getComputedStyle(element);
          return Boolean(element.textContent?.trim()) && box.width > 0 && box.height > 0 && style.visibility !== "hidden";
        })
        .map((element) => parseFloat(getComputedStyle(element).fontSize));
      const scenes = all(".segnale-s02-mass");
      const quiet = all(".segnale-s02-quiet-list li");
      const titles = all(".segnale-s02-mass h3");
      const descriptions = all(".segnale-s02-result");
      const metadata = all(".segnale-s02-meta");
      const outcomes = all("[data-outcome]");
      const statuses = all("[data-operational-status]");
      const labels = all(".segnale-s02-label");
      const inner = one(".segnale-weekly-rhythm-inner");
      const sticky = one(".segnale-weekly-rhythm-sticky");
      const process = one(".segnale-s02-disclaimer");
      const closing = one(".segnale-s02-closing");
      const quietCopy = one(".segnale-s02-quiet-mobile");
      const mainMetaOpacity = parseFloat(getComputedStyle(metadata[0]).opacity);
      const quietOpacity = parseFloat(getComputedStyle(quiet[0]).opacity) * parseFloat(getComputedStyle(quietCopy).opacity);

      return {
        minVisibleFont: Math.min(...visibleTextSizes),
        visualViewport: {
          width: window.visualViewport?.width ?? window.innerWidth,
          height: window.visualViewport?.height ?? window.innerHeight,
        },
        innerHeight: rect(inner).height,
        stickyHeight: rect(sticky).height,
        closingBottom: rect(closing).bottom,
        stickyBottom: rect(sticky).bottom,
        processToFirst: rect(scenes[0]).top - rect(process).bottom,
        titleToDescription: titles.map((title, index) => rect(descriptions[index]).top - rect(title).bottom),
        descriptionToMeta: descriptions.map((description, index) => rect(metadata[index]).top - rect(description).bottom),
        metaToOutcome: metadata.map((meta, index) => rect(outcomes[index]).top - rect(meta).bottom),
        labelToStatus: statuses.map((status, index) => rect(status).top - rect(labels[index]).bottom),
        statusToTitle: statuses.map((status, index) => rect(titles[index]).top - rect(status).bottom),
        outcomeInsideScene: outcomes.map((outcome, index) => rect(scenes[index]).bottom - rect(outcome).bottom),
        ordered: [
          rect(scenes[0]).bottom < rect(scenes[1]).top,
          rect(scenes[1]).bottom < rect(quiet[0]).top,
          rect(quiet[0]).bottom <= rect(quiet[1]).top,
          rect(quiet[1]).bottom <= rect(quiet[2]).top,
          rect(quiet[2]).bottom <= rect(quiet[3]).top,
          rect(quiet[3]).bottom < rect(scenes[2]).top,
          rect(scenes[2]).bottom < rect(closing).top,
        ],
        statusCount: statuses.length,
        outcomeCount: outcomes.length,
        statusFontSizes: statuses.map((status) => parseFloat(getComputedStyle(status).fontSize)),
        metadataLevels: [...new Set(all("[data-meta-level]").map((item) => item.dataset.metaLevel))],
        mainMetaOpacity,
        quietOpacity,
        quietDisplay: getComputedStyle(quietCopy).display,
      };
    });

    expect(rhythm.minVisibleFont).toBeGreaterThanOrEqual(11);
    expect(rhythm.visualViewport.width).toBe(viewport.width);
    expect(rhythm.visualViewport.height).toBe(viewport.height);
    expect(rhythm.innerHeight).toBeLessThanOrEqual(rhythm.visualViewport.height);
    expect(rhythm.stickyHeight).toBeLessThanOrEqual(rhythm.visualViewport.height);
    expect(rhythm.closingBottom).toBeLessThanOrEqual(rhythm.stickyBottom);
    expect(rhythm.processToFirst).toBeGreaterThanOrEqual(32);
    expect(rhythm.titleToDescription.every((gap) => gap >= 9.5)).toBe(true);
    expect(rhythm.descriptionToMeta.every((gap) => gap >= 9.5)).toBe(true);
    expect(rhythm.metaToOutcome.every((gap) => gap >= 5.5)).toBe(true);
    expect(rhythm.labelToStatus.every((gap) => gap >= 2.5)).toBe(true);
    expect(rhythm.statusToTitle.every((gap) => gap >= 3.5)).toBe(true);
    expect(rhythm.outcomeInsideScene.every((gap) => gap >= 0)).toBe(true);
    expect(rhythm.ordered.every(Boolean)).toBe(true);
    expect(rhythm.statusCount).toBe(3);
    expect(rhythm.outcomeCount).toBe(3);
    expect(rhythm.statusFontSizes.every((size) => size >= 11)).toBe(true);
    expect(rhythm.metadataLevels.sort()).toEqual(["1", "2", "3"]);
    expect(rhythm.mainMetaOpacity).toBeGreaterThan(rhythm.quietOpacity);
    expect(rhythm.quietDisplay).toBe("inline-flex");
    await context.close();
  }
});

test("mobile espone stato, missione e risultato con tre soli livelli informativi", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const localPage = await context.newPage();
  await localPage.goto(`${baseURL}/concept/segnale`, { waitUntil: "networkidle" });
  const section = localPage.locator("#section-02-esempio-di-piano");
  const scenes = section.locator(".segnale-s02-mass");

  await expect(scenes).toHaveCount(3);
  await expect(section.locator("[data-operational-status]"))
    .toHaveText(["DA PREPARARE", "IN PROGRAMMA", "DA VERIFICARE"]);

  for (let index = 0; index < 3; index += 1) {
    const scene = scenes.nth(index);
    await expect(scene.locator("[data-mission]")).toBeVisible();
    await expect(scene.locator("[data-objective]")).toBeVisible();
    await expect(scene.locator('[data-meta-level="1"]')).toHaveCount(1);
    await expect(scene.locator('[data-meta-level="2"]')).toHaveCount(1);
  }

  const levels = await section.locator("[data-meta-level]").evaluateAll((nodes) =>
    [...new Set(nodes.map((node) => (node as HTMLElement).dataset.metaLevel))].sort(),
  );
  expect(levels).toEqual(["1", "2", "3"]);

  const sunday = section.locator('[data-scene-kind="verification"]');
  await expect(sunday).toHaveCount(1);
  await expect(sunday.locator(".segnale-s02-outcome-label")).toHaveText("DA REGISTRARE");
  await expect(sunday.locator(".segnale-s02-outcome-value")).toContainText("Scheda Google");
  await expect(sunday.locator(".segnale-s02-outcome-value")).toContainText("coperti");
  await expect(sunday.locator(".segnale-s02-outcome-value")).toContainText("recensioni nuove");

  await context.close();
});

test("linea mobile comunica avanzamento con nodi pieni, senza cambiare il montaggio", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const localPage = await context.newPage();
  await localPage.goto(`${baseURL}/concept/segnale`, { waitUntil: "networkidle" });
  const section = localPage.locator("#section-02-esempio-di-piano");

  const strokeWidths = await section.evaluate((node) => {
    const style = (selector: string) => getComputedStyle(node.querySelector(selector)!);
    return {
      base: style(".segnale-s02-band-mobile [data-band-base]").strokeWidth,
      active: style(".segnale-s02-band-mobile [data-accent-lun]").strokeWidth,
      marker: style(".segnale-s02-band-mobile [data-marker-lun]").strokeWidth,
    };
  });
  expect(strokeWidths).toEqual({ base: "1.4px", active: "2.4px", marker: "0px" });

  await moveTo(localPage, 0);
  expect((await visualState(localPage)).mobileMarkerLun).not.toBe(TEAL);
  await moveTo(localPage, 0.38);
  const prepared = await visualState(localPage);
  expect(prepared.mobileMarkerLun).toBe(TEAL);
  expect(prepared.mobileMarkerMar).not.toBe(TEAL);
  await moveTo(localPage, 0.62);
  const programmed = await visualState(localPage);
  expect(programmed.mobileMarkerMar).toBe(TEAL);
  expect(programmed.mobileMarkerDom).not.toBe(TEAL);
  await moveTo(localPage, 1);
  expect((await visualState(localPage)).mobileMarkerDom).toBe(TEAL);

  await context.close();
});

test("browser chrome ridotto lascia leggibile la chiusura della sezione", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 720 },
    screen: { width: 390, height: 844 },
    isMobile: true,
  });
  const localPage = await context.newPage();
  await localPage.goto(`${baseURL}/concept/segnale`, { waitUntil: "networkidle" });
  await moveTo(localPage, 1);

  const result = await localPage.locator("#section-02-esempio-di-piano").evaluate((section) => {
    const sticky = section.querySelector<HTMLElement>(".segnale-weekly-rhythm-sticky")!;
    const closing = section.querySelector<HTMLElement>("[data-closing]")!;
    const stickyRect = sticky.getBoundingClientRect();
    const closingRect = closing.getBoundingClientRect();
    return {
      visualHeight: window.visualViewport?.height ?? window.innerHeight,
      stickyHeight: stickyRect.height,
      closingTop: closingRect.top,
      closingBottom: closingRect.bottom,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });

  expect(result.visualHeight).toBe(720);
  expect(result.stickyHeight).toBe(800);
  expect(result.closingTop).toBeGreaterThanOrEqual(0);
  expect(result.closingBottom).toBeLessThanOrEqual(result.visualHeight);
  expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth);
  await context.close();
});

test("Sprint 6 non modifica la composizione a 768px", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 768, height: 900 } });
  const localPage = await context.newPage();
  await localPage.goto(`${baseURL}/concept/segnale`, { waitUntil: "networkidle" });
  const styles = await localPage.locator("#section-02-esempio-di-piano").evaluate((section) => {
    const style = (selector: string) => getComputedStyle(section.querySelector(selector)!);
    return {
      heading: style(".segnale-s02-header h2").fontSize,
      kicker: style(".segnale-s02-kicker").fontSize,
      meta: style(".segnale-s02-meta").fontSize,
      fieldMargin: style(".segnale-s02-field").marginTop,
      innerPadding: style(".segnale-weekly-rhythm-inner").padding,
      statusDisplay: style("[data-operational-status]").display,
      outcomeDisplay: style("[data-outcome]").display,
    };
  });
  expect(styles).toEqual({
    heading: "24px",
    kicker: "9px",
    meta: "10px",
    fieldMargin: "23px",
    innerPadding: "20px 20px 10px",
    statusDisplay: "none",
    outcomeDisplay: "none",
  });
  await context.close();
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
  const mobileMarker = await section
    .locator(".segnale-s02-band-mobile [data-marker-mar]")
    .evaluate((node) => getComputedStyle(node).fill);
  expect(mobileMarker).toBe("rgb(11, 122, 117)");
  await expect(section.locator("[data-operational-status]")).toHaveCount(3);
  await expect(section.locator("[data-outcome]")).toHaveCount(3);
  await expect(section.getByText("Cinque ore e venti", { exact: false })).toBeVisible();
  await context.close();
});

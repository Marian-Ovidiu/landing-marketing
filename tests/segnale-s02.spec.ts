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
    const effectiveOpacity = (selector: string) => {
      let element: Element | null = section.querySelector(selector);
      let opacity = 1;
      while (element && element !== section.parentElement) {
        opacity *= Number.parseFloat(getComputedStyle(element).opacity);
        element = element.parentElement;
      }
      return Number(opacity.toFixed(4));
    };
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
      massLun: effectiveOpacity("[data-mass-lun] h3"),
      massLunTransform: style("[data-mass-lun]").transform,
      massMar: effectiveOpacity("[data-mass-mar] h3"),
      massDom: effectiveOpacity("[data-mass-dom] h3"),
      statusLun: effectiveOpacity("[data-mass-lun] [data-operational-status]"),
      statusMar: effectiveOpacity("[data-mass-mar] [data-operational-status]"),
      statusDom: effectiveOpacity("[data-mass-dom] [data-operational-status]"),
      metaLun: effectiveOpacity('[data-mass-lun] [data-meta-level="1"]'),
      metaMar: effectiveOpacity('[data-mass-mar] [data-meta-level="1"]'),
      metaDom: effectiveOpacity('[data-mass-dom] [data-meta-level="1"]'),
      quiet: style("[data-quiet]").opacity,
      quietEffective: effectiveOpacity(".segnale-s02-quiet-mobile"),
      quietTimeEffective: effectiveOpacity(".segnale-s02-quiet-time"),
      closing: style("[data-closing]").opacity,
      baseLineOpacity: style(".segnale-s02-band-mobile [data-band-base]").opacity,
      baseLineStroke: style(".segnale-s02-band-mobile [data-band-base]").stroke,
    };
  });
}

async function nodeGeometry(page: import("playwright/test").Page) {
  return page.locator("#section-02-esempio-di-piano").evaluate((section) => {
    const field = section.querySelector<HTMLElement>(".segnale-s02-field")!;
    const fieldTop = field.getBoundingClientRect().top;
    const relative = (value: number) => Number((value - fieldTop).toFixed(3));
    const scene = (name: "lun" | "mar" | "dom") => {
      const mass = section.querySelector<HTMLElement>(`[data-mass-${name}]`)!;
      const label = mass.querySelector<HTMLElement>(".segnale-s02-label")!;
      const status = mass.querySelector<HTMLElement>("[data-operational-status]")!;
      const title = mass.querySelector<HTMLElement>("h3")!;
      const band = section.querySelector<SVGSVGElement>(".segnale-s02-band")!;
      const timelineGroup = section.querySelector<SVGGElement>(
        `.segnale-s02-band-mobile [data-timeline-${name}]`,
      )!;
      const marker = section.querySelector<SVGEllipseElement>(
        `.segnale-s02-band-mobile [data-marker-${name}]`,
      )!;
      const line = section.querySelector<SVGPathElement>(
        `.segnale-s02-band-mobile [data-accent-${name}]`,
      )!;
      const labelRect = label.getBoundingClientRect();
      const statusRect = status.getBoundingClientRect();
      const markerRect = marker.getBoundingClientRect();
      const lineRect = line.getBoundingClientRect();
      const markerCenter = markerRect.top + markerRect.height / 2;
      const lineCenter = lineRect.top + lineRect.height / 2;
      const statusCenter = statusRect.top + statusRect.height / 2;
      const timelineTranslateY = new DOMMatrixReadOnly(
        getComputedStyle(timelineGroup).transform,
      ).f;
      const bandRect = band.getBoundingClientRect();
      const svgScaleY = bandRect.height / band.viewBox.baseVal.height;
      const markerCenterWithoutGroupShift = bandRect.top + marker.cy.baseVal.value * svgScaleY;
      return {
        labelTop: relative(labelRect.top),
        markerCenter: relative(markerCenter),
        labelToMarkerGap: Number((markerRect.top - labelRect.bottom).toFixed(3)),
        markerLineDelta: Number((markerCenter - lineCenter).toFixed(3)),
        markerStatusDelta: Number((markerCenter - statusCenter).toFixed(3)),
        kickerTranslateY: Number(
          new DOMMatrixReadOnly(getComputedStyle(label).transform).f.toFixed(3),
        ),
        massTranslateY: Number(
          new DOMMatrixReadOnly(getComputedStyle(mass).transform).f.toFixed(3),
        ),
        contentTranslateY: Number(
          new DOMMatrixReadOnly(getComputedStyle(title).transform).f.toFixed(3),
        ),
        timelineTranslateY: Number(timelineTranslateY.toFixed(3)),
        timelineTranslateCssY: Number(
          (markerCenter - markerCenterWithoutGroupShift).toFixed(3),
        ),
      };
    };
    return {
      lun: scene("lun"),
      mar: scene("mar"),
      dom: scene("dom"),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
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
  const isMobile = await page.evaluate(() => window.innerWidth < 768);
  await moveTo(page, 0);
  const open = await visualState(page);
  expect(parseFloat(open.band)).toBeGreaterThan(0.9);
  expect(open.markerLun).not.toBe(TEAL);
  expect(open.markerMar).not.toBe(TEAL);
  expect(open.markerDom).not.toBe(TEAL);
  expect(open.mobileMarkerLun).not.toBe(TEAL);
  expect(open.mobileMarkerMar).not.toBe(TEAL);
  expect(open.mobileMarkerDom).not.toBe(TEAL);
  expect(Number(open.massLun)).toBeCloseTo(isMobile ? 0.52 : 0.3, 2);
  expect(Number(open.closing)).toBeLessThan(0.15);

  await moveTo(page, 0.38);
  const preparazione = await visualState(page);
  expect(parseFloat(preparazione.band)).toBeLessThan(0.01);
  expect(Number(preparazione.massLun)).toBeGreaterThan(isMobile ? 0.85 : 0.99);
  expect(preparazione.markerLun).toBe(TEAL);
  expect(preparazione.mobileMarkerLun).toBe(TEAL);
  expect(preparazione.markerMar).not.toBe(TEAL);
  expect(preparazione.mobileMarkerMar).not.toBe(TEAL);
  expect(preparazione.markerDom).not.toBe(TEAL);

  await moveTo(page, 0.62);
  const attivazione = await visualState(page);
  expect(Number(attivazione.massMar)).toBeGreaterThan(isMobile ? 0.9 : 0.99);
  expect(attivazione.markerMar).toBe(TEAL);
  expect(attivazione.mobileMarkerMar).toBe(TEAL);
  expect(attivazione.markerDom).not.toBe(TEAL);
  expect(Number(attivazione.quiet)).toBeLessThan(isMobile ? 0.52 : 0.45);

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
    [0.1, 0.9],
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
  const isMobile = await page.evaluate(() => window.innerWidth < 768);
  expect(Number(azzerato.massLun)).toBeCloseTo(isMobile ? 0.52 : 0.3, 2);

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
      const mainMetaOpacity = Math.max(
        ...metadata.map((item) => parseFloat(getComputedStyle(item).opacity)),
      );
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

test("hotfix sincronizza timeline e contenuto mobile sulla label operativa", async ({ browser, baseURL }) => {
  test.setTimeout(120_000);
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 412, height: 915 },
    { width: 390, height: 720, screenHeight: 844 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      screen: viewport.screenHeight
        ? { width: viewport.width, height: viewport.screenHeight }
        : undefined,
      isMobile: Boolean(viewport.screenHeight),
    });
    const localPage = await context.newPage();
    await localPage.goto(`${baseURL}/concept/segnale`, { waitUntil: "networkidle" });

    await moveTo(localPage, 0);
    const initial = await nodeGeometry(localPage);
    const baseline = {
      lun: initial.lun.markerStatusDelta,
      mar: initial.mar.markerStatusDelta,
      dom: initial.dom.markerStatusDelta,
    };

    for (const progress of [0, 0.05, 0.1]) {
      await moveTo(localPage, progress);
      const state = await nodeGeometry(localPage);
      for (const [name, scene] of [
        ["lun", state.lun],
        ["mar", state.mar],
        ["dom", state.dom],
      ] as const) {
        expect(scene.labelToMarkerGap).toBeGreaterThanOrEqual(13);
        expect(Math.abs(scene.markerLineDelta)).toBeLessThanOrEqual(0.01);
        // 1.75 px assorbe la baseline ottica preesistente del nodo MAR
        // (-1.608 px), mantenendola stabile a un quinto dell'altezza del nodo.
        expect(Math.abs(scene.markerStatusDelta)).toBeLessThanOrEqual(1.75);
        expect(Math.abs(scene.markerStatusDelta - baseline[name])).toBeLessThanOrEqual(0.02);
        expect(scene.kickerTranslateY).toBe(0);
        expect(scene.massTranslateY).toBe(0);
        expect(scene.contentTranslateY).toBeCloseTo(10, 1);
        expect(scene.timelineTranslateCssY).toBeCloseTo(10, 1);
        expect(
          Math.abs(scene.timelineTranslateCssY - scene.contentTranslateY),
        ).toBeLessThanOrEqual(0.02);
      }
      expect(state.overflow).toBe(0);
    }

    for (const [progress, name] of [
      [0.25, "lun"],
      [0.475, "mar"],
      [0.7, "dom"],
      [0.35, "lun"],
      [0.6, "mar"],
      [0.8, "dom"],
    ] as const) {
      await moveTo(localPage, progress);
      const state = await nodeGeometry(localPage);
      const active = state[name];
      expect(active.labelToMarkerGap).toBeGreaterThanOrEqual(3.5);
      expect(Math.abs(active.markerLineDelta)).toBeLessThanOrEqual(0.01);
      expect(Math.abs(active.markerStatusDelta - baseline[name])).toBeLessThanOrEqual(0.02);
      expect(active.kickerTranslateY).toBe(0);
      expect(active.massTranslateY).toBe(0);
      expect(
        Math.abs(active.timelineTranslateCssY - active.contentTranslateY),
      ).toBeLessThanOrEqual(0.02);
    }
    await context.close();
  }

  const cssContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false,
  });
  const cssPage = await cssContext.newPage();
  await cssPage.goto(`${baseURL}/concept/segnale`, { waitUntil: "networkidle" });
  const cssState = await nodeGeometry(cssPage);
  for (const scene of [cssState.lun, cssState.mar, cssState.dom]) {
    expect(scene.labelToMarkerGap).toBeGreaterThanOrEqual(3.5);
    expect(Math.abs(scene.markerLineDelta)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(scene.markerStatusDelta)).toBeLessThanOrEqual(1.75);
    expect(scene.kickerTranslateY).toBe(0);
    expect(scene.massTranslateY).toBe(0);
    expect(scene.contentTranslateY).toBe(0);
    expect(Math.abs(scene.timelineTranslateCssY)).toBeLessThanOrEqual(0.001);
  }
  await cssContext.close();
});

test("hotfix resta deterministico in reverse e refresh prima e durante S02", async ({ page }) => {
  await moveTo(page, 0.05);
  const beforeReverse = await nodeGeometry(page);
  await moveTo(page, 0.82);
  await moveTo(page, 0.05);
  expect(await nodeGeometry(page)).toEqual(beforeReverse);

  await moveTo(page, 0);
  const beforeStartRefresh = await nodeGeometry(page);
  await page.reload({ waitUntil: "networkidle" });
  await moveTo(page, 0);
  expect(await nodeGeometry(page)).toEqual(beforeStartRefresh);

  await moveTo(page, 0.5);
  const beforeMiddleRefresh = await nodeGeometry(page);
  await page.reload({ waitUntil: "networkidle" });
  await moveTo(page, 0.5);
  expect(await nodeGeometry(page)).toEqual(beforeMiddleRefresh);
});

test("mobile separa stato, titolo e dettagli senza fade globale", async ({ browser, baseURL }) => {
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
    expect(initial.statusLun).toBeGreaterThanOrEqual(0.77);
    expect(initial.massLun).toBeGreaterThanOrEqual(0.51);
    expect(initial.metaLun).toBeGreaterThanOrEqual(0.38);
    expect(initial.statusMar).toBeGreaterThanOrEqual(0.61);
    expect(initial.massMar).toBeGreaterThanOrEqual(0.35);
    expect(initial.metaMar).toBeGreaterThanOrEqual(0.25);
    expect(initial.quietEffective).toBeGreaterThanOrEqual(0.45);
    expect(initial.quietTimeEffective).toBeGreaterThanOrEqual(0.32);
    expect(initial.baseLineStroke).toBe("rgb(90, 100, 105)");
    expect(Number(initial.baseLineOpacity)).toBeCloseTo(0.52, 2);

    await moveTo(localPage, 0.47);
    const firstHandoff = await visualState(localPage);
    expect(firstHandoff.statusLun).toBeGreaterThanOrEqual(0.88);
    expect(firstHandoff.massLun).toBeGreaterThanOrEqual(0.78);
    expect(firstHandoff.statusMar).toBeGreaterThanOrEqual(0.77);
    expect(firstHandoff.massMar).toBeGreaterThanOrEqual(0.63);
    expect(firstHandoff.statusDom).toBeGreaterThanOrEqual(0.63);
    expect(firstHandoff.massDom).toBeGreaterThanOrEqual(0.36);
    expect(firstHandoff.metaDom).toBeGreaterThanOrEqual(0.26);

    await moveTo(localPage, 0.7);
    const secondHandoff = await visualState(localPage);
    expect(secondHandoff.massLun).toBeGreaterThanOrEqual(0.5);
    expect(secondHandoff.statusMar).toBeGreaterThanOrEqual(0.89);
    expect(secondHandoff.massMar).toBeGreaterThanOrEqual(0.79);
    expect(secondHandoff.statusDom).toBeGreaterThanOrEqual(0.79);
    expect(secondHandoff.massDom).toBeGreaterThanOrEqual(0.63);
    expect(secondHandoff.metaDom).toBeGreaterThanOrEqual(0.53);
    expect(secondHandoff.quietEffective).toBeGreaterThanOrEqual(0.36);
    expect(secondHandoff.quietTimeEffective).toBeGreaterThanOrEqual(0.26);

    await moveTo(localPage, 1);
    const final = await visualState(localPage);
    expect(final.statusLun).toBeCloseTo(0.62, 2);
    expect(final.massLun).toBeCloseTo(0.46, 2);
    expect(final.metaLun).toBeGreaterThanOrEqual(0.33);
    expect(final.statusMar).toBeCloseTo(0.76, 2);
    expect(final.massMar).toBeCloseTo(0.54, 2);
    expect(final.metaMar).toBeGreaterThanOrEqual(0.4);
    expect(final.statusDom).toBeGreaterThanOrEqual(0.99);
    expect(final.massDom).toBeGreaterThanOrEqual(0.99);
    expect(final.metaDom).toBeGreaterThanOrEqual(0.91);

    const geometry = await localPage.evaluate(() => ({
      minFont: Math.min(
        ...Array.from(
          document.querySelectorAll<HTMLElement>(
            "#section-01-come-funziona *, #section-02-esempio-di-piano *",
          ),
        )
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return Boolean(element.textContent?.trim()) && rect.width > 0 && rect.height > 0;
          })
          .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
      ),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(geometry.minFont).toBeGreaterThanOrEqual(10);
    expect(geometry.overflow).toBe(0);
    await context.close();
  }
});

test("Sprint 7 lascia invariato il contrasto S02 a 768px e desktop", async ({ browser, baseURL }) => {
  for (const viewport of [
    { width: 768, height: 900 },
    { width: 1440, height: 1000 },
  ]) {
    const context = await browser.newContext({ viewport });
    const localPage = await context.newPage();
    await localPage.goto(`${baseURL}/concept/segnale`, { waitUntil: "networkidle" });
    await moveTo(localPage, 0);
    const section = localPage.locator("#section-02-esempio-di-piano");
    const state = await section.evaluate((node) => {
      const mass = node.querySelector<HTMLElement>("[data-mass-lun]")!;
      const meta = node.querySelector<HTMLElement>(".segnale-s02-meta")!;
      const line = node.querySelector<SVGPathElement>("[data-band-base]")!;
      return {
        mass: getComputedStyle(mass).opacity,
        massTranslateY: new DOMMatrixReadOnly(getComputedStyle(mass).transform).f,
        titleTranslateY: new DOMMatrixReadOnly(
          getComputedStyle(mass.querySelector("h3")!).transform,
        ).f,
        meta: getComputedStyle(meta).opacity,
        anchorVar: getComputedStyle(mass).getPropertyValue("--s02-anchor-opacity"),
        lineStroke: getComputedStyle(line).stroke,
      };
    });
    expect(Number(state.mass)).toBeCloseTo(0.3, 2);
    expect(state.massTranslateY).toBeCloseTo(10, 2);
    expect(state.titleTranslateY).toBe(0);
    expect(Number(state.meta)).toBeCloseTo(1, 2);
    expect(state.anchorVar).toBe("");
    expect(state.lineStroke).toBe("rgb(207, 214, 217)");
    await context.close();
  }
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
  const reducedGeometry = await nodeGeometry(localPage);
  for (const scene of [reducedGeometry.lun, reducedGeometry.mar, reducedGeometry.dom]) {
    expect(scene.labelToMarkerGap).toBeGreaterThanOrEqual(3.5);
    expect(Math.abs(scene.markerLineDelta)).toBeLessThanOrEqual(0.01);
    expect(scene.massTranslateY).toBe(0);
    expect(scene.contentTranslateY).toBe(0);
  }
  await context.close();
});

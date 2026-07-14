import { expect, test } from "playwright/test";

const capturedConsoleErrors = new WeakMap<object, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  capturedConsoleErrors.set(page, errors);
  await page.goto("/concept/page", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  test.info().annotations.push({ type: "consoleErrors", description: JSON.stringify(errors) });
});

test.afterEach(async ({ page }) => {
  expect(capturedConsoleErrors.get(page) ?? []).toEqual([]);
});

test("mantiene le sezioni approvate in ordine senza contenuti successivi", async ({ page }) => {
  await expect(page.locator(".stage--live")).toHaveCount(1);
  await expect(page.locator("#section-01-come-funziona")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Tu racconti il locale. Al piano pensiamo noi." })).toBeVisible();
  await expect(page.getByText("PIANO", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Una settimana all’Osteria da Rita.")).toHaveCount(1);
  await expect(page.locator("#section-02-esempio-di-piano")).toHaveCount(1);
  await expect(page.locator("#section-03-cosa-ricevi")).toHaveCount(1);
  await expect(page.getByText("Un fascicolo operativo, non una lezione di marketing.")).toHaveCount(1);
  await expect(page.locator("#section-04-cta-finale")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: /La strategia può essere una in meno/ })
  ).toBeVisible();
});

test("non produce overflow orizzontale e resta reversibile", async ({ page }) => {
  const section = page.locator("#section-01-come-funziona");
  await section.scrollIntoViewIfNeeded();
  const start = await section.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
  const range = await section.evaluate((element) => element.scrollHeight - window.innerHeight);

  for (const progress of [0.05, 0.48, 0.86, 0.35, 0.95]) {
    await page.evaluate((y) => window.scrollTo(0, y), start + range * progress);
    await page.waitForTimeout(180);
  }

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test("reduced motion mostra il foglio completo senza sticky narrativo", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/concept/page`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const floatTransforms = await page.locator(".fragment-float-layer").evaluateAll((nodes) =>
    nodes.map((node) => getComputedStyle(node).transform)
  );
  expect(floatTransforms.every((transform) => transform === "none")).toBe(true);
  const section = page.locator("#section-01-come-funziona");
  await section.scrollIntoViewIfNeeded();
  await expect(page.locator("[data-stamp]")).toBeVisible();
  await expect(page.locator("[data-annotation]")).toHaveCount(4);
  await expect(page.locator("[data-plan]")).toBeVisible();
  await expect(page.locator(".how-it-works-sticky")).toHaveCSS("position", "relative");
  await context.close();
});

test("idle hero usa un layer separato e cede il controllo allo scroll", async ({ page }) => {
  const activeKeys = (await page.viewportSize())!.width < 768
    ? ["receipt", "review", "flyer", "polaroid"]
    : ["receipt", "review", "flyer", "polaroid", "social", "note"];

  await expect(page.locator(".fragment-scroll-layer")).toHaveCount(6);
  await expect(page.locator(".fragment-float-layer")).toHaveCount(6);
  await page.waitForTimeout(1700);

  const floatState = async () =>
    page.evaluate((keys) =>
      keys.map((key) => {
        const node = document.querySelector<HTMLElement>(`[data-fragment-float="${key}"]`)!;
        const matrix = new DOMMatrixReadOnly(getComputedStyle(node).transform);
        return {
          key,
          x: matrix.m41,
          y: matrix.m42,
          rotation: Math.atan2(matrix.m12, matrix.m11) * (180 / Math.PI),
        };
      }), activeKeys);

  const idle = await floatState();
  expect(idle.some(({ x, y, rotation }) => Math.abs(x) + Math.abs(y) + Math.abs(rotation) > 0.1)).toBe(true);

  await page.evaluate(() => window.scrollTo(0, 100));
  await page.waitForTimeout(350);
  const handedOff = await floatState();
  handedOff.forEach(({ x, y, rotation }) => {
    expect(Math.abs(x)).toBeLessThan(0.06);
    expect(Math.abs(y)).toBeLessThan(0.06);
    expect(Math.abs(rotation)).toBeLessThan(0.06);
  });

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);
  const restarted = await floatState();
  expect(restarted.some(({ x, y, rotation }) => Math.abs(x) + Math.abs(y) + Math.abs(rotation) > 0.1)).toBe(true);
});

test("il planner contiene sette giorni completi e una sola scheda aperta", async ({ page }) => {
  const section = page.locator("#section-02-esempio-di-piano");
  await section.scrollIntoViewIfNeeded();
  await expect(section).toBeVisible();
  await expect(section.locator(".weekly-day")).toHaveCount(7);

  // le interazioni si verificano sullo stato finale (settimana distribuita):
  // nel mazzo iniziale le carte sono impilate e si coprono per costruzione
  await section.locator(".deck-runway").evaluate((el) => {
    const r = el.getBoundingClientRect();
    window.scrollTo(0, r.top + window.scrollY + (r.height - window.innerHeight) * 0.98);
  });
  await page.waitForTimeout(700); // scrub 0.12: attesa di assestamento

  for (const day of ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"]) {
    await expect(section.getByRole("heading", { name: day, exact: true })).toBeVisible();
  }

  await expect(section.getByText("scheda Google · coperti del martedì · recensioni nuove")).toHaveCount(1);
  await expect(section.getByText("avere materiale tuo per le prossime tre settimane di post")).toHaveCount(1);

  const cards = section.locator(".weekly-card");
  await cards.nth(0).click();
  await expect(cards.nth(0)).toHaveAttribute("aria-expanded", "true");
  await cards.nth(1).click();
  await expect(cards.nth(0)).toHaveAttribute("aria-expanded", "false");
  await expect(cards.nth(1)).toHaveAttribute("aria-expanded", "true");

  await cards.nth(2).focus();
  await expect(cards.nth(2)).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Enter");
  await expect(cards.nth(2)).toHaveAttribute("aria-expanded", "true");
});

test("gli assi editoriali coincidono sui breakpoint desktop", async ({ page }) => {
  const viewport = page.viewportSize();
  test.skip(!viewport || viewport.width < 1024, "Verifica riservata ai breakpoint desktop");
  const lefts = await page.evaluate(() => ({
    hero: document.querySelector(".headline")!.getBoundingClientRect().left,
    section01: document.querySelector(".how-it-works-header h2")!.getBoundingClientRect().left,
    section02: document.querySelector(".weekly-plan-header h2")!.getBoundingClientRect().left,
    section03: document.querySelector(".dossier-header h2")!.getBoundingClientRect().left,
    section04: document.querySelector("#final-cta-title")!.getBoundingClientRect().left,
  }));
  expect(Math.abs(lefts.hero - lefts.section02)).toBeLessThanOrEqual(2);
  expect(Math.abs(lefts.section01 - lefts.section02)).toBeLessThanOrEqual(2);
  expect(Math.abs(lefts.section02 - lefts.section03)).toBeLessThanOrEqual(2);
  expect(Math.abs(lefts.section02 - lefts.section04)).toBeLessThanOrEqual(2);
});

test("il fascicolo mostra sei sezioni con contenuto reale e naviga da tastiera", async ({ page }) => {
  const section = page.locator("#section-03-cosa-ricevi");
  await section.scrollIntoViewIfNeeded();
  await expect(section).toBeVisible();
  const viewport = page.viewportSize();
  const isDesktop = !!viewport && viewport.width >= 1024;

  if (isDesktop) {
    const index = section.locator(".dossier-index-button");
    await expect(index).toHaveCount(6);
    await expect(section.locator(".dossier-tab")).toHaveCount(6);

    // stato iniziale: voce I attiva con anteprima reale
    await expect(index.nth(0)).toHaveAttribute("aria-current", "true");
    await expect(section.locator(".dossier-page")).toContainText("alto impatto · 2 ore");

    // click su voce III: contenuto vero, non descrizione astratta
    await index.nth(2).click();
    await expect(index.nth(2)).toHaveAttribute("aria-current", "true");
    await expect(section.locator(".dossier-page")).toContainText(
      "Il martedì della casa: un menu, un prezzo, zero pensieri."
    );

    // tastiera: frecce, Home/End, Enter
    await index.nth(2).focus();
    await page.keyboard.press("ArrowDown");
    await expect(section.locator(".dossier-index-button").nth(3)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(section.locator(".dossier-page")).toContainText("Grazie della sincerità: il martedì ora…");
    await page.keyboard.press("End");
    await expect(index.nth(5)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(section.locator(".dossier-page")).toContainText("Visualizzazioni scheda Google");
    await page.keyboard.press("Home");
    await expect(index.nth(0)).toBeFocused();

    // linguette raggiungibili e attive
    await section.locator(".dossier-tab").nth(1).click();
    await expect(section.locator(".dossier-tab").nth(1)).toHaveAttribute("aria-current", "true");
    await expect(section.locator(".dossier-page")).toContainText("Risposte recensioni");
  } else {
    const stack = section.locator(".dossier-stack");
    const fascette = section.locator(".fascetta");
    await expect(fascette).toHaveCount(6);
    // prima aperta di default, una sola alla volta
    await expect(fascette.nth(0)).toHaveAttribute("aria-expanded", "true");
    await fascette.nth(2).click();
    await expect(fascette.nth(2)).toHaveAttribute("aria-expanded", "true");
    await expect(fascette.nth(0)).toHaveAttribute("aria-expanded", "false");
    await expect(
      stack.getByText("Il martedì della casa: un menu, un prezzo, zero pensieri.")
    ).toBeVisible();
    await fascette.nth(5).click();
    await expect(fascette.nth(5)).toHaveAttribute("aria-expanded", "true");
    await expect(stack.getByText("Visualizzazioni scheda Google")).toBeVisible();
  }

  // chiusa presente
  await expect(section.getByText("Sei sezioni, un solo fascicolo", { exact: false })).toBeVisible();
});

test("il fascicolo non provoca layout shift al cambio pagina desktop", async ({ page }) => {
  const viewport = page.viewportSize();
  test.skip(!viewport || viewport.width < 1024, "Verifica riservata ai breakpoint desktop");
  const section = page.locator("#section-03-cosa-ricevi");
  await section.scrollIntoViewIfNeeded();
  // attende la fine dell'assestamento d'ingresso (translateY 8px, 320ms)
  await section.locator(".dossier-stage:not([data-enter='pending'])").waitFor();
  await page.waitForTimeout(400);

  // coordinate documento: il click può scrollare, il layout non deve muoversi
  const measure = () =>
    section.locator(".dossier-page").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top + window.scrollY, height: r.height };
    });
  const before = await measure();
  for (const i of [1, 3, 5, 0]) {
    await section.locator(".dossier-index-button").nth(i).click();
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(300);
  const after = await measure();
  expect(Math.abs(before.height - after.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(before.top - after.top)).toBeLessThanOrEqual(1);
});

test("la CTA finale chiude la pagina con azioni accessibili", async ({ page }) => {
  const section = page.locator("#section-04-cta-finale");
  await section.scrollIntoViewIfNeeded();
  await expect(section).toBeVisible();

  // heading fermo e leggibile, enfasi presente
  await expect(section.getByRole("heading", { name: /una in meno/ })).toBeVisible();

  // CTA primaria: destinazione provvisoria documentata, touch target ≥44px
  const primary = section.locator(".final-cta-primary");
  await expect(primary).toBeVisible();
  await expect(primary).toHaveText("Crea la strategia del tuo locale");
  await expect(primary).toHaveAttribute("href", "/crea-strategia");
  const box = await primary.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);

  // microcopy e footer minimale
  await expect(section.getByText("Racconti il locale · ricevi il piano · inizi lunedì")).toBeVisible();
  await expect(
    section.getByText("un piano concreto per piccoli ristoranti, bar e locali", { exact: false })
  ).toBeVisible();

  // secondaria: torna alla sezione 02 e porta il focus sulla heading
  const secondary = section.locator(".final-cta-secondary");
  await expect(secondary).toHaveAttribute("href", "#section-02-esempio-di-piano");
  await secondary.click();
  await expect(page.locator("#weekly-plan-title")).toBeFocused();
  await page.waitForTimeout(900); // smooth scroll in corso
  const sectionTop = await page
    .locator("#section-02-esempio-di-piano")
    .evaluate((el) => Math.abs(el.getBoundingClientRect().top));
  expect(sectionTop).toBeLessThanOrEqual(600); // in viaggio o arrivato verso S02

  // nessun overflow orizzontale a fine pagina
  const dims = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  expect(dims.sw).toBeLessThanOrEqual(dims.cw);
});

test("tutte le CTA primarie portano alla destinazione provvisoria", async ({ page }) => {
  await expect(page.locator(".stage--live .cta-primary")).toHaveAttribute("href", "/crea-strategia");
  await expect(page.locator(".final-cta-primary")).toHaveAttribute("href", "/crea-strategia");

  await page.goto("/crea-strategia", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Raccontaci il tuo locale" })).toBeVisible();
  await expect(page.getByText("Il flusso guidato verrà collegato qui.")).toBeVisible();
  await expect(page.getByText("Destinazione provvisoria")).toBeVisible();
  await expect(page.getByRole("link", { name: "Torna alla landing" })).toHaveAttribute(
    "href",
    "/",
  );
});

test("le runway hardening mantengono i valori approvati per breakpoint", async ({ browser, baseURL }) => {
  const cases = [
    { viewport: { width: 1440, height: 1000 }, s01: 2800, s02: 3000 },
    { viewport: { width: 768, height: 1024 }, s01: 2560, s02: 2867.2 },
    { viewport: { width: 390, height: 844 }, s01: 1856.8, s02: 2194.4 },
    { viewport: { width: 360, height: 800 }, s01: 1760, s02: 2080 },
  ];

  for (const item of cases) {
    const context = await browser.newContext({ viewport: item.viewport });
    const localPage = await context.newPage();
    await localPage.goto(`${baseURL}/concept/page`, { waitUntil: "networkidle" });
    const measured = await localPage.evaluate(() => ({
      s01: document.querySelector<HTMLElement>("#section-01-come-funziona")!.offsetHeight,
      s02: document.querySelector<HTMLElement>(".deck-runway")!.offsetHeight,
    }));
    expect(Math.abs(measured.s01 - item.s01)).toBeLessThanOrEqual(1);
    expect(Math.abs(measured.s02 - item.s02)).toBeLessThanOrEqual(1);
    await context.close();
  }
});

test("microtipografia e target mobile rispettano i floor di hardening", async ({ browser, baseURL }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 800 }]) {
    const context = await browser.newContext({ viewport });
    const localPage = await context.newPage();
    await localPage.goto(`${baseURL}/concept/page`, { waitUntil: "networkidle" });

    const violations = await localPage.evaluate(() => {
      const results: Array<{ text: string; size: number }> = [];
      for (const element of document.querySelectorAll<HTMLElement>("body *")) {
        if (element.children.length || !element.textContent?.trim()) continue;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const size = Number.parseFloat(style.fontSize);
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          size < 10
        ) {
          results.push({ text: element.textContent.trim(), size });
        }
      }
      return results;
    });
    expect(violations).toEqual([]);

    for (const selector of [
      ".stage--live .cta-primary",
      ".stage--live .cta-secondary",
      ".final-cta-primary",
      ".final-cta-secondary",
      ".fascetta",
    ]) {
      const target = localPage.locator(selector).first();
      const box = await target.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    await context.close();
  }
});

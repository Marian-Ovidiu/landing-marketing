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

async function triggerPosition(page: Page, progress: number) {
  const sectionTop = await page.locator("#section-04-cta-finale").evaluate(
    (node) => node.getBoundingClientRect().top + window.scrollY,
  );
  const start = sectionTop - page.viewportSize()!.height * 0.95;
  const end = sectionTop - page.viewportSize()!.height * 0.6;
  await page.evaluate((y) => window.scrollTo(0, Math.round(y)), start + (end - start) * progress);
  await page.waitForTimeout(450);
}

async function visualState(page: Page) {
  return page.locator("#section-04-cta-finale").evaluate((section) => {
    const css = (selector: string) => getComputedStyle(section.querySelector(selector)!);
    return {
      primaryOpacity: css("[data-s04-primary]").opacity,
      primaryTransform: css("[data-s04-primary]").transform,
      secondaryOpacity: css("[data-s04-secondary]").opacity,
      microcopyOpacity: css("[data-s04-microcopy]").opacity,
      ruleTransform: css("[data-s04-rule]").transform,
    };
  });
}

test("monta Quiet Return dopo S03 con copy e form Early Access approvati", async ({ page }) => {
  const section = page.locator("#section-04-cta-finale");
  await expect(section).toHaveCount(1);
  await expect(section.getByText("EARLY ACCESS", { exact: true })).toHaveCount(1);
  await expect(section.locator("h2")).toHaveText(
    "Il tuo locale ha già abbastanza cose da gestire. La strategia può essere una in meno.",
  );
  await expect(section.getByText("Segnale è in sviluppo.", { exact: false })).toBeAttached();
  await expect(section.locator("[data-s04-primary]")).toHaveText("Entra nell’Early Access");
  await expect(section.locator("[data-s04-primary]")).toHaveAttribute("type", "submit");
  await expect(section.locator("[data-s04-secondary]")).toHaveText("Rivedi l’esempio di piano");
  await expect(section.locator("[data-s04-secondary]")).toHaveAttribute(
    "href",
    "#section-02-esempio-di-piano",
  );
  await expect(section.locator("[data-s04-microcopy]")).toHaveText(
    "Ti contatteremo quando apriremo i primi accessi.",
  );
  await expect(section.locator("form")).toHaveCount(1);
  for (const label of ["Email", "Nome", "Nome del locale", "Città"]) {
    await expect(section.getByLabel(label, { exact: true })).toHaveAttribute("required", "");
  }

  const order = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("*"));
    return [
      "#section-03-cosa-ricevi",
      "#section-04-cta-finale",
      "#section-04-cta-finale h2",
      "#section-04-cta-finale form",
      "#section-04-cta-finale [data-s04-primary]",
      "#section-04-cta-finale [data-s04-secondary]",
      "#section-04-cta-finale [data-s04-microcopy]",
    ].map((selector) => all.indexOf(document.querySelector(selector)!));
  });
  expect(order).toEqual([...order].sort((a, b) => a - b));
});

test("usa un taglio netto, una sola primaria e nessuna estetica Direzione A", async ({ page }) => {
  const result = await page.evaluate(() => {
    const s03 = document.querySelector<HTMLElement>("#section-03-cosa-ricevi")!;
    const s04 = document.querySelector<HTMLElement>("#section-04-cta-finale")!;
    const style = getComputedStyle(s04);
    return {
      s03: getComputedStyle(s03).backgroundColor,
      s04: style.backgroundColor,
      image: style.backgroundImage,
      masks: `${style.maskImage}|${style.webkitMaskImage}`,
      buttons: s04.querySelectorAll("button").length,
      images: s04.querySelectorAll("img, video, canvas").length,
      cards: s04.querySelectorAll("[class*=card], [class*=panel]").length,
    };
  });
  expect(result.s03).toBe("rgb(23, 27, 29)");
  expect(result.s04).toBe("rgb(249, 250, 251)");
  expect(result.image).toBe("none");
  expect(result.masks).toBe("none|none");
  expect(result.buttons).toBe(1);
  expect(result.images).toBe(0);
  expect(result.cards).toBe(0);
  await expect(page.locator("#section-04-cta-finale [data-s04-primary]")).toHaveCount(1);
});

test("motion leggero è reversibile e la CTA resta cliccabile", async ({ page }) => {
  await triggerPosition(page, 0);
  const initial = await visualState(page);
  expect(Number(initial.primaryOpacity)).toBeCloseTo(0.72, 1);
  expect(Number(initial.secondaryOpacity)).toBeCloseTo(0.72, 1);
  await expect(page.locator("[data-s04-primary]")).toBeEnabled();

  await triggerPosition(page, 1);
  const final = await visualState(page);
  expect(Number(final.primaryOpacity)).toBeGreaterThan(0.99);
  expect(Number(final.secondaryOpacity)).toBeGreaterThan(0.99);
  expect(Number(final.microcopyOpacity)).toBeGreaterThan(0.99);

  await triggerPosition(page, 0.35);
  const before = await visualState(page);
  await triggerPosition(page, 0.85);
  await triggerPosition(page, 0.35);
  expect(await visualState(page)).toEqual(before);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await triggerPosition(page, 0.35);
  expect(await visualState(page)).toEqual(before);
});

test("secondaria aggiorna hash, focus e scroll; tab order resta lineare", async ({ page, browserName }) => {
  const section = page.locator("#section-04-cta-finale");
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  const primary = section.locator("[data-s04-primary]");
  const secondary = section.locator("[data-s04-secondary]");
  await primary.focus();
  await expect(primary).toBeFocused();
  if (browserName === "webkit") {
    // Mobile WebKit follows the host's Full Keyboard Access preference and can
    // skip links on Tab. DOM order is asserted above; focus the next link to
    // exercise the same activation, hash and focus-management path.
    await secondary.focus();
  } else {
    await page.keyboard.press("Tab");
  }
  await expect(secondary).toBeFocused();

  await secondary.press("Enter");
  await expect(page).toHaveURL(/#section-02-esempio-di-piano$/);
  await expect(page.locator("#segnale-s02-title")).toBeFocused();
  await expect.poll(async () => page.locator("#section-02-esempio-di-piano").evaluate(
    (node) => Math.abs(node.getBoundingClientRect().top),
  )).toBeLessThan(12);
});

test("form valida, porta il focus al primo errore e dichiara la modalità demo", async ({ page }) => {
  const section = page.locator("#section-04-cta-finale");
  const primary = page.locator("#section-04-cta-finale [data-s04-primary]");
  await primary.scrollIntoViewIfNeeded();
  await primary.click();
  await expect(section.getByLabel("Email", { exact: true })).toBeFocused();
  await expect(section.getByText("Controlla i campi indicati e riprova.")).toBeVisible();

  await section.getByLabel("Email", { exact: true }).fill("rita@example.it");
  await section.getByLabel("Nome", { exact: true }).fill("Rita");
  await section.getByLabel("Nome del locale", { exact: true }).fill("Osteria da Rita");
  await section.getByLabel("Città", { exact: true }).fill("Bologna");
  await primary.click();
  await expect(primary).toBeDisabled();
  await expect(primary).toHaveText("Invio in corso…");
  await expect(section.getByText("Modalità demo: validazione completata.", { exact: false })).toBeVisible();
  await expect(section.getByText("Nessun dato è stato inviato o salvato.", { exact: false })).toBeVisible();
  await expect(page).toHaveURL(/\/concept\/segnale(?:#.*)?$/);

  await primary.click();
  await expect(section.getByText("già stato verificato in questa sessione", { exact: false })).toBeVisible();
});

test("mobile mantiene form leggibile senza overflow", async ({ browser, baseURL }) => {
  for (const viewport of [
    { width: 768, height: 900 },
    { width: 390, height: 844 },
    { width: 375, height: 812 },
    { width: 360, height: 800 },
  ]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
    const localPage = await context.newPage();
    await localPage.goto(`${baseURL}/concept/segnale`, { waitUntil: "networkidle" });
    const section = localPage.locator("#section-04-cta-finale");
    await section.evaluate((node) => window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY));
    await localPage.waitForTimeout(400);
    const geometry = await section.evaluate((node) => {
      const sectionRect = node.getBoundingClientRect();
      const heading = node.querySelector("h2")!.getBoundingClientRect();
      const primary = node.querySelector("[data-s04-primary]")!.getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(node.querySelector("h2")!).lineHeight);
      return {
        primaryBottom: primary.bottom - sectionRect.top,
        primaryHeight: primary.height,
        headingLines: heading.height / lineHeight,
        sectionHeight: sectionRect.height,
        fields: Array.from(node.querySelectorAll("input")).map((input) => {
          const rect = input.getBoundingClientRect();
          return { left: rect.left, right: rect.right, width: rect.width };
        }),
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });
    expect(geometry.primaryBottom).toBeLessThan(geometry.sectionHeight);
    expect(geometry.primaryHeight).toBeGreaterThanOrEqual(56);
    expect(geometry.headingLines).toBeLessThanOrEqual(4.5);
    expect(geometry.fields).toHaveLength(4);
    expect(geometry.fields.every((field) => field.left >= 0 && field.right <= viewport.width)).toBe(true);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
    await context.close();
  }
});

test("reduced motion mostra il finale e usa scroll immediato", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const localPage = await context.newPage();
  await localPage.goto(`${baseURL}/concept/segnale`, { waitUntil: "networkidle" });
  const section = localPage.locator("#section-04-cta-finale");
  await expect(section.locator("[data-s04-primary]")).toHaveCSS("opacity", "1");
  await expect(section.locator("[data-s04-primary]")).toHaveCSS("transform", "none");
  await expect(section.locator("[data-s04-microcopy]")).toHaveCSS("opacity", "1");
  await section.locator("[data-s04-secondary]").click();
  await expect(localPage).toHaveURL(/#section-02-esempio-di-piano$/);
  await expect(localPage.locator("#segnale-s02-title")).toBeFocused();
  const top = await localPage.locator("#section-02-esempio-di-piano").evaluate(
    (node) => Math.abs(node.getBoundingClientRect().top),
  );
  expect(top).toBeLessThan(12);
  await context.close();
});

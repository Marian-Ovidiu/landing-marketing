import { expect, test, type Page } from "playwright/test";

const consoleErrors = new WeakMap<object, string[]>();
const SAMPLE_POINTS = [40, 42, 45, 48, 50, 52, 54, 56, 58, 60] as const;

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  consoleErrors.set(page, errors);
  await page.goto("/concept/segnale", { waitUntil: "networkidle" });
  await page.waitForTimeout(450);
});

test.afterEach(async ({ page }) => {
  expect(consoleErrors.get(page) ?? []).toEqual([]);
});

async function moveTo(page: Page, progress: number) {
  const geometry = await page.locator(".stage--live").evaluate((stage) => {
    const spacer = stage.parentElement!;
    return {
      top: spacer.getBoundingClientRect().top + window.scrollY,
      range: spacer.offsetHeight - window.innerHeight,
    };
  });
  // Il primo pixel uguale o successivo al campione evita di fotografare il
  // 53,99% sui runway che non sono divisibili esattamente per 100.
  await page.evaluate(
    ({ top, range, progress }) => window.scrollTo(0, Math.ceil(top + range * progress)),
    { ...geometry, progress: progress / 100 }
  );
  await page.waitForTimeout((await page.viewportSize())!.width < 768 ? 420 : 240);
}

async function climaxState(page: Page) {
  return page.locator(".stage--live").evaluate((stage) => {
    const opacity = (selector: string) => Number(getComputedStyle(stage.querySelector(selector)!).opacity);
    const opacities = (selector: string) =>
      Array.from(stage.querySelectorAll(selector), (node) => Number(getComputedStyle(node).opacity));
    const scale = (selector: string) => {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(stage.querySelector(selector)!).transform);
      return Math.hypot(matrix.a, matrix.b);
    };
    return {
      fill: opacity(".glass-panel-fill"),
      reflect: opacity(".glass-panel-reflect"),
      caption: opacity(".plan-caption"),
      cards: opacities(".plan-card"),
      criticalContext: opacities(
        '[data-frag="receipt"] .sig-data-row:not(.sig-data-row--critical)'
      ),
      criticalScale: scale(".sig-data-row--critical"),
      ellipse: opacity(".ap-ellipse"),
      focus: opacity(".ap-focus"),
      exit: opacity(".ap-exit"),
      rays: opacities(".ap-ray"),
      ticks: opacities(".ap-tick"),
      thread: opacities(".thread-signal"),
    };
  });
}

function compact(state: Awaited<ReturnType<typeof climaxState>>) {
  const rounded = (value: number) => Number(value.toFixed(3));
  return {
    fill: rounded(state.fill),
    reflect: rounded(state.reflect),
    caption: rounded(state.caption),
    cards: state.cards.map(rounded),
    ellipse: rounded(state.ellipse),
    focus: rounded(state.focus),
    exit: rounded(state.exit),
    rays: state.rays.map(rounded),
    ticks: state.ticks.map(rounded),
    thread: state.thread.map(rounded),
  };
}

test("monta il climax come dato critico → apertura → priorità 1", async ({ page }) => {
  await moveTo(page, 42);
  const selection = await climaxState(page);
  expect(Math.max(...selection.criticalContext)).toBeLessThan(0.45);
  expect(selection.criticalScale).toBeGreaterThan(1.02);
  expect(selection.cards[0]).toBeLessThan(0.01);

  await moveTo(page, 48);
  const peak = await climaxState(page);
  expect(peak.ellipse).toBeGreaterThan(0.38);
  expect(peak.focus).toBeGreaterThan(0.85);
  expect(peak.rays.filter((value) => value > 0.5)).toHaveLength(1);
  expect(peak.thread.filter((value) => value > 0.5)).toHaveLength(1);
  expect(peak.ticks.filter((value) => value > 0.1).length).toBeLessThanOrEqual(2);
  expect(peak.cards[0]).toBeLessThan(0.01);

  await moveTo(page, 52);
  const release = await climaxState(page);
  expect(Math.max(...release.rays)).toBeLessThan(0.01);
  expect(Math.max(...release.thread)).toBeLessThan(0.01);
  expect(release.exit).toBeGreaterThan(0.95);
  expect(release.ellipse + release.focus + release.exit).toBeGreaterThan(1.2);

  await moveTo(page, 54);
  const result = await climaxState(page);
  expect(result.cards[0]).toBeGreaterThanOrEqual(0.33);
  expect(result.caption).toBeGreaterThan(0.4);
  expect(result.exit).toBeGreaterThan(0.95);

  await moveTo(page, 56);
  const readable = await climaxState(page);
  expect(readable.cards[0]).toBeGreaterThan(0.95);
  expect(readable.cards[1]).toBeLessThan(0.01);
  expect(readable.exit).toBeGreaterThan(0.6);
  expect(Math.max(...readable.rays)).toBeLessThan(0.01);

  await moveTo(page, 58);
  const handoff = await climaxState(page);
  expect(handoff.cards[0]).toBeGreaterThan(0.99);
  expect(handoff.ellipse + handoff.focus + handoff.exit).toBeLessThan(0.01);
});

test("reverse, jump e refresh restano deterministici", async ({ page }) => {
  await moveTo(page, 48);
  const at48 = compact(await climaxState(page));
  await moveTo(page, 60);
  await moveTo(page, 48);
  expect(compact(await climaxState(page))).toEqual(at48);

  await moveTo(page, 40);
  await moveTo(page, 56);
  expect((await climaxState(page)).cards[0]).toBeGreaterThan(0.95);
  await moveTo(page, 48);
  expect(compact(await climaxState(page))).toEqual(at48);
  await moveTo(page, 60);
  expect((await climaxState(page)).cards[0]).toBeGreaterThan(0.99);

  for (const progress of [50, 54]) {
    await moveTo(page, progress);
    const before = compact(await climaxState(page));
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    await moveTo(page, progress);
    expect(compact(await climaxState(page))).toEqual(before);
  }
});

test("i dieci campioni non producono overflow o clipping visibile sui sette viewport", async ({
  browser,
  baseURL,
  isMobile,
}) => {
  test.skip(isMobile, "La matrice custom viene eseguita una volta dal progetto desktop.");

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1280, height: 800 },
    { width: 1024, height: 768 },
    { width: 900, height: 800 },
    { width: 768, height: 900 },
    { width: 390, height: 844 },
    { width: 360, height: 800 },
  ]) {
    const context = await browser.newContext({ viewport });
    const localPage = await context.newPage();
    const errors: string[] = [];
    localPage.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    localPage.on("pageerror", (error) => errors.push(error.message));
    await localPage.goto(`${baseURL}/concept/segnale`, { waitUntil: "networkidle" });
    await localPage.waitForTimeout(350);

    for (const progress of SAMPLE_POINTS) {
      await moveTo(localPage, progress);
      const geometry = await localPage.locator(".stage--live").evaluate((stage) => {
        const panel = stage.querySelector(".glass-panel--live")!.getBoundingClientRect();
        const visibleCards = Array.from(stage.querySelectorAll(".plan-card")).filter(
          (card) => Number(getComputedStyle(card).opacity) > 0.02
        );
        return {
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          panelInside:
            panel.left >= -0.5 &&
            panel.right <= window.innerWidth + 0.5 &&
            panel.top >= -0.5 &&
            panel.bottom <= window.innerHeight + 0.5,
          visibleCardsInside: visibleCards.every((card) => {
            const rect = card.getBoundingClientRect();
            return rect.top >= panel.top - 0.5 && rect.bottom <= panel.bottom + 0.5;
          }),
        };
      });
      expect(geometry).toEqual({ overflow: false, panelInside: true, visibleCardsInside: true });
    }

    await moveTo(localPage, 56);
    expect((await climaxState(localPage)).cards[0]).toBeGreaterThan(0.95);
    expect(errors).toEqual([]);
    await context.close();
  }
});

test("reduced motion mostra il piano finale senza residui del climax", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/concept/segnale`, { waitUntil: "networkidle" });
  await page.waitForTimeout(350);
  const state = await climaxState(page);
  expect(state.cards.every((opacity) => opacity > 0.99)).toBe(true);
  expect(state.fill).toBeGreaterThan(0.99);
  expect(state.reflect).toBeGreaterThan(0.99);
  expect(Math.max(...state.rays, ...state.ticks, ...state.thread)).toBeLessThan(0.01);
  expect(state.ellipse + state.focus + state.exit).toBeLessThan(0.01);
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  await context.close();
});

test("il climax non introduce CLS significativo", async ({ page }) => {
  const cls = await page.evaluate(async () => {
    let score = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<PerformanceEntry & { hadRecentInput: boolean; value: number }>) {
        if (!entry.hadRecentInput) score += entry.value;
      }
    });
    observer.observe({ type: "layout-shift", buffered: true });
    await new Promise((resolve) => window.setTimeout(resolve, 100));
    observer.disconnect();
    return score;
  });
  expect(cls).toBeLessThan(0.1);
});

import { expect, test, type Page } from "playwright/test";

const MOBILE_VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 393, height: 873 },
  { width: 412, height: 915 },
] as const;
const MOBILE_SAMPLE_POINTS = [40, 50, 54, 56, 66, 78, 85] as const;

async function moveTo(page: Page, progress: number) {
  const geometry = await page.locator(".stage--live").evaluate((stage) => {
    const spacer = stage.parentElement!;
    return {
      top: spacer.getBoundingClientRect().top + window.scrollY,
      range: spacer.offsetHeight - window.innerHeight,
    };
  });
  await page.evaluate(
    ({ top, range, progress }) =>
      window.scrollTo(0, Math.ceil(top + range * (progress / 100))),
    { ...geometry, progress }
  );
  await page.waitForTimeout(450);
}

function alphaFromColor(color: string) {
  const values = color.match(/[\d.]+/g)?.map(Number) ?? [];
  return values.length > 3 ? values[3] : 1;
}

async function composition(page: Page) {
  return page.locator(".stage--live").evaluate((stage) => {
    const rect = (selector: string) => stage.querySelector(selector)!.getBoundingClientRect();
    const headline = rect(".headline");
    const lead = rect(".lead");
    const visual = rect(".fragment-field");
    const panel = rect(".glass-panel--live");
    const list = rect(".plan-list");
    const primary = rect(".cta-primary");
    const secondary = rect(".cta-secondary");
    const cards = Array.from(stage.querySelectorAll<HTMLElement>(".plan-card"));
    const cardRects = cards.map((card) => card.getBoundingClientRect());
    const fragments = Array.from(
      stage.querySelectorAll<HTMLElement>(".fragment-field [data-frag]")
    )
      .filter((fragment) => getComputedStyle(fragment).display !== "none")
      .map((fragment) => fragment.getBoundingClientRect());
    const firstLine = document.createRange();
    firstLine.selectNodeContents(stage.querySelector(".headline span")!);

    let fragmentOverlap = 0;
    for (let first = 0; first < fragments.length; first += 1) {
      for (let second = first + 1; second < fragments.length; second += 1) {
        const width = Math.max(
          0,
          Math.min(fragments[first].right, fragments[second].right) -
            Math.max(fragments[first].left, fragments[second].left)
        );
        const height = Math.max(
          0,
          Math.min(fragments[first].bottom, fragments[second].bottom) -
            Math.max(fragments[first].top, fragments[second].top)
        );
        fragmentOverlap = Math.max(fragmentOverlap, width * height);
      }
    }

    return {
      headlineHeight: headline.height,
      firstHeadlineLineCount: firstLine.getClientRects().length,
      copyVisualGap: visual.top - lead.bottom,
      panelHeight: panel.height,
      panelCtaGap: primary.top - panel.bottom,
      stackCtaGap: primary.top - list.bottom,
      totalCardsHeight: cardRects.at(-1)!.bottom - cardRects[0].top,
      cardsInsidePanel: cardRects.every((card, index) => {
        const visible = Number(getComputedStyle(cards[index]).opacity) > 0.02;
        return !visible || (card.top >= panel.top - 0.5 && card.bottom <= panel.bottom + 0.5);
      }),
      panelInsideViewport: panel.top >= -0.5 && panel.bottom <= window.innerHeight + 0.5,
      ctaExitSpace: window.innerHeight - secondary.bottom,
      fragmentOverlap,
      cardOpacities: cards.map((card) => Number(getComputedStyle(card).opacity)),
      primaryBackground: getComputedStyle(stage.querySelector(".cta-primary")!).backgroundColor,
      minTitleSize: Math.min(
        ...Array.from(stage.querySelectorAll<HTMLElement>(".plan-card-title"), (title) =>
          Number.parseFloat(getComputedStyle(title).fontSize)
        )
      ),
      minDetailSize: Math.min(
        ...Array.from(stage.querySelectorAll<HTMLElement>(".plan-card-detail"), (detail) =>
          Number.parseFloat(getComputedStyle(detail).fontSize)
        )
      ),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      visualViewportHeight: window.visualViewport?.height ?? window.innerHeight,
    };
  });
}

async function motionSnapshot(page: Page) {
  return page.locator(".stage--live").evaluate((stage) => {
    const matrix = (node: Element) => {
      const value = new DOMMatrixReadOnly(getComputedStyle(node).transform);
      return [value.a, value.b, value.c, value.d, value.e, value.f].map((part) =>
        Number(part.toFixed(3))
      );
    };
    return {
      slots: Array.from(stage.querySelectorAll("[data-frag]"), matrix),
      panel: matrix(stage.querySelector(".glass-panel--live")!),
      cards: Array.from(stage.querySelectorAll(".plan-card"), (card) => ({
        matrix: matrix(card),
        opacity: Number(Number(getComputedStyle(card).opacity).toFixed(3)),
      })),
    };
  });
}

test("la composizione respira sui cinque preset mobile", async ({ browser, baseURL, isMobile }) => {
  test.skip(isMobile, "La matrice custom viene eseguita una volta dal progetto desktop.");

  for (const viewport of MOBILE_VIEWPORTS) {
    const context = await browser.newContext({
      viewport,
      screen: viewport,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${baseURL}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(450);

    const initial = await composition(page);
    expect(initial.firstHeadlineLineCount).toBe(1);
    expect(initial.headlineHeight).toBeLessThan(62);
    expect(initial.copyVisualGap).toBeGreaterThanOrEqual(17.5);
    expect(initial.panelHeight).toBeLessThanOrEqual(286);
    expect(initial.panelCtaGap).toBeGreaterThanOrEqual(38);
    expect(initial.fragmentOverlap).toBeLessThan(1);
    expect(initial.overflow).toBe(false);

    for (const progress of MOBILE_SAMPLE_POINTS) {
      await moveTo(page, progress);
      const sample = await composition(page);
      expect(sample.panelInsideViewport).toBe(true);
      expect(sample.cardsInsidePanel).toBe(true);
      expect(sample.panelCtaGap).toBeGreaterThanOrEqual(38);
      expect(sample.ctaExitSpace).toBeGreaterThanOrEqual(15.5);
      expect(sample.overflow).toBe(false);
    }

    await moveTo(page, 99.5);
    const final = await composition(page);
    expect(final.cardOpacities.every((opacity) => opacity > 0.99)).toBe(true);
    expect(final.totalCardsHeight).toBeGreaterThan(180);
    expect(final.totalCardsHeight).toBeLessThan(260);
    expect(final.cardsInsidePanel).toBe(true);
    expect(final.panelInsideViewport).toBe(true);
    expect(final.stackCtaGap).toBeGreaterThanOrEqual(120);
    expect(final.ctaExitSpace).toBeGreaterThanOrEqual(15.5);
    expect(final.minTitleSize).toBeGreaterThanOrEqual(14);
    expect(final.minDetailSize).toBeGreaterThanOrEqual(11);
    expect(alphaFromColor(final.primaryBackground)).toBeGreaterThanOrEqual(
      alphaFromColor(initial.primaryBackground) + 0.15
    );
    expect(final.overflow).toBe(false);
    expect(errors).toEqual([]);
    await context.close();
  }
});

test("il browser chrome ridotto conserva pannello, CTA e uscita", async ({ browser, baseURL, isMobile }) => {
  test.skip(isMobile, "Il visualViewport custom viene verificato una volta.");
  const context = await browser.newContext({
    viewport: { width: 390, height: 720 },
    screen: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(450);

  const initial = await composition(page);
  expect(initial.visualViewportHeight).toBe(720);
  expect(initial.copyVisualGap).toBeGreaterThanOrEqual(17.5);
  expect(initial.panelCtaGap).toBeGreaterThanOrEqual(38);
  expect(initial.overflow).toBe(false);

  await moveTo(page, 99.5);
  const final = await composition(page);
  expect(final.cardsInsidePanel).toBe(true);
  expect(final.panelInsideViewport).toBe(true);
  expect(final.ctaExitSpace).toBeGreaterThanOrEqual(15.5);
  expect(final.overflow).toBe(false);
  await context.close();
});

test("reverse, jump e refresh conservano lo stesso stato mobile", async ({
  browser,
  baseURL,
  isMobile,
}) => {
  test.skip(isMobile, "La sequenza mobile custom viene verificata una volta.");
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(450);

  await moveTo(page, 40);
  const at40 = await motionSnapshot(page);
  await moveTo(page, 56);
  await moveTo(page, 40);
  expect(await motionSnapshot(page)).toEqual(at40);
  await moveTo(page, 85);
  await moveTo(page, 40);
  expect(await motionSnapshot(page)).toEqual(at40);

  await moveTo(page, 56);
  const at56 = await motionSnapshot(page);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(450);
  await moveTo(page, 56);
  expect(await motionSnapshot(page)).toEqual(at56);
  await context.close();
});

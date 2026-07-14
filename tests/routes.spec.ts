import { expect, test } from "playwright/test";

const ROUTES = [
  "/",
  "/urls",
  "/concept/segnale",
  "/crea-strategia",
  "/concept/page",
  "/concept/live",
  "/concept/desktop-initial",
  "/concept/desktop-final",
  "/concept/mobile-initial",
  "/concept/mobile-final",
];

test("la root monta la landing Segnale e conserva la route precedente", async ({ page, request }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator('.concept-page[data-theme="segnale"]')).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Ogni giorno sai quale azione fare per prima." })).toBeVisible();
  await expect(page.locator("#section-04-cta-finale")).toHaveCount(1);

  const compatibilityRoute = await request.get("/concept/segnale");
  expect(compatibilityRoute.status()).toBe(200);
});

test("l'indice /urls elenca e risolve tutte le route", async ({ page, request }) => {
  await page.goto("/urls", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Route disponibili" })).toBeVisible();

  const links = page.locator("main a");
  await expect(links).toHaveCount(ROUTES.length);
  expect(await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")))).toEqual(
    ROUTES
  );

  for (const route of ROUTES) {
    await expect(page.getByText(`http://localhost:3100${route}`, { exact: true })).toHaveCount(1);
    expect((await request.get(route)).status()).toBe(200);
  }
});

test("la destinazione provvisoria torna alla nuova landing principale", async ({ page }) => {
  await page.goto("/crea-strategia", { waitUntil: "networkidle" });
  await expect(page.getByRole("link", { name: "Torna alla landing" })).toHaveAttribute("href", "/");
});

import { expect, test } from "playwright/test";

const forbiddenClaims = [
  "Marketing Strategy Generator",
  "Crea la strategia",
  "Crea la strategia del tuo locale",
  "far crescere il tuo locale",
  "assistente contestuale",
  "chat",
  "il piano si aggiorna",
  "giro successivo",
  "automaticamente",
  "integrazione Google",
  "pubblica per te",
  "risponde per te",
  "analisi avanzata",
  "ricevi ogni mattina",
  "inizi lunedì",
] as const;

test.beforeEach(async ({ page }) => {
  await page.goto("/concept/segnale", { waitUntil: "networkidle" });
  await page.waitForTimeout(350);
});

test("mappa il contratto editoriale sull’intera route Segnale", async ({ page }) => {
  const pageText = await page.locator("body").innerText();
  for (const claim of forbiddenClaims) {
    expect(pageText.toLocaleLowerCase("it")).not.toContain(claim.toLocaleLowerCase("it"));
  }

  await expect(page.locator(".stage--live h1")).toHaveText(
    "Ogni giorno sai quale azione fare per prima.",
  );
  await expect(page.locator(".stage--live .lead")).toHaveText(
    "Segnale trasforma il contesto del tuo locale in priorità, missioni quotidiane e un piano operativo da seguire nel tempo.",
  );
  await expect(page.locator(".stage--live .plan-caption")).toHaveText(
    "LA PROSSIMA AZIONE · OSTERIA DA RITA",
  );
  await expect(page.locator("#section-01-come-funziona h2")).toHaveText(
    "Non ti serve un’altra lista di idee.",
  );
  await expect(page.locator("#section-02-esempio-di-piano h2")).toHaveText(
    "Racconti il locale. Segnale organizza la settimana.",
  );
  await expect(page.locator("#section-02-esempio-di-piano")).toContainText(
    "PROFILO → STRATEGIA → PIANO → MISSIONI → RISULTATI",
  );
  await expect(page.locator("#section-03-cosa-ricevi [aria-label='Indice delle sei aree'] li")).toHaveCount(6);
});

test("le CTA Hero puntano alle sezioni approvate e la primaria porta il focus all’email", async ({ page }) => {
  const primary = page.locator(".stage--live .cta-primary");
  const secondary = page.locator(".stage--live .cta-secondary");
  await expect(primary).toHaveAttribute("href", "#section-04-cta-finale");
  await expect(secondary).toHaveAttribute("href", "#section-02-esempio-di-piano");

  await primary.click();
  await expect(page).toHaveURL(/#section-04-cta-finale$/);
  await expect(page.locator("#early-access-email")).toBeFocused();
  await expect.poll(async () => page.locator("#section-04-cta-finale").evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const closestPossibleTop = Math.max(0, window.innerHeight - rect.height);
    return Math.abs(rect.top - closestPossibleTop);
  })).toBeLessThan(12);
});

test("la Direzione A mantiene il copy e le destinazioni esistenti", async ({ page }) => {
  await page.goto("/concept/live", { waitUntil: "networkidle" });
  await expect(page.locator(".stage--live h1")).toHaveText(
    "Una strategia marketing costruita sul tuo locale, non su un template.",
  );
  await expect(page.locator(".stage--live .cta-primary")).toHaveText("Crea la strategia");
  await expect(page.locator(".stage--live .cta-primary")).toHaveAttribute(
    "href",
    "/crea-strategia",
  );
});

import { chromium, webkit } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const OUT = path.resolve(process.cwd(), "../runs/2026-07-10-marketing-strategy-generator/screenshots/section-03");
mkdirSync(OUT, { recursive: true });

const errors = [];
const measurements = {};

function watch(page, label) {
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${label}: ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
}

async function open(page, label) {
  await page.goto(`${BASE}/concept/page`, { waitUntil: "networkidle" });
  const section = page.locator("#section-03-cosa-ricevi");
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600); // assestamento d'ingresso
  measurements[label] = await page.evaluate(() => {
    const s = document.querySelector("#section-03-cosa-ricevi");
    const h2 = (sel) => document.querySelector(sel)?.getBoundingClientRect().left ?? null;
    return {
      sectionHeight: Math.round(s.getBoundingClientRect().height),
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      axes: { hero: h2(".headline"), s02: h2(".weekly-plan-header h2"), s03: h2(".dossier-header h2") },
    };
  });
  return section;
}

const shot = (page, name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("saved", name));

// ---------- desktop 1440 ----------
const cr = await chromium.launch();
{
  const page = await cr.newPage({ viewport: { width: 1440, height: 1000 } });
  watch(page, "desktop");
  const section = await open(page, "desktop-1440");
  await shot(page, "desktop-ingresso.png"); // voce I attiva di default
  await shot(page, "desktop-voce-I.png");
  await section.locator(".dossier-index-button").nth(2).click();
  await page.waitForTimeout(400);
  await shot(page, "desktop-voce-III.png");
  await section.locator(".dossier-index-button").nth(5).click();
  await page.waitForTimeout(400);
  await shot(page, "desktop-voce-VI.png");

  // focus tastiera visibile
  await section.locator(".dossier-index-button").nth(5).focus();
  await page.keyboard.press("Home");
  await page.waitForTimeout(200);
  await shot(page, "desktop-focus-tastiera.png");

  // cambio rapido tra tutte le voci (stabilità)
  for (const i of [1, 2, 3, 4, 5, 0, 5, 0]) {
    await section.locator(".dossier-index-button").nth(i).click();
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(400);

  // fine sezione: chiusa in vista
  await section.locator(".dossier-closing").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, "desktop-fine-sezione.png");
  await page.close();
}

// ---------- viewport intermedi: overflow + assi ----------
for (const [label, w, h] of [["1280", 1280, 900], ["1024", 1024, 768], ["768", 768, 900], ["360", 360, 800]]) {
  const page = await cr.newPage({ viewport: { width: w, height: h } });
  watch(page, `vw-${label}`);
  await open(page, `viewport-${label}`);
  await page.close();
}

// ---------- mobile 390x844 ----------
{
  const page = await cr.newPage({ viewport: { width: 390, height: 844 } });
  watch(page, "mobile");
  const section = await open(page, "mobile-390");
  await shot(page, "mobile-prima-fascetta.png"); // I aperta di default
  const fascette = section.locator(".fascetta");
  await fascette.nth(2).click();
  await page.waitForTimeout(140);
  await shot(page, "mobile-tra-due-aperture.png"); // transizione I→III in corso
  await page.waitForTimeout(400);
  await section.locator(".fascetta-item").nth(2).scrollIntoViewIfNeeded();
  await shot(page, "mobile-voce-III.png");
  await fascette.nth(5).click();
  await page.waitForTimeout(450);
  await section.locator(".fascetta-item").nth(5).scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await shot(page, "mobile-voce-VI.png");
  await section.locator(".dossier-closing").scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await shot(page, "mobile-fine-sezione.png");
  await page.close();
}

// ---------- reduced motion ----------
{
  const page = await cr.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  watch(page, "reduced");
  const section = await open(page, "reduced-1440");
  await section.locator(".dossier-index-button").nth(3).click();
  await page.waitForTimeout(120);
  const visible = await section.locator(".dossier-page").textContent();
  if (!visible?.includes("Grazie della sincerità")) errors.push("reduced: cambio pagina non istantaneo");
  await shot(page, "reduced-voce-IV.png");
  await page.close();
}
await cr.close();

// ---------- WebKit mobile ----------
{
  const wk = await webkit.launch();
  const page = await wk.newPage({ viewport: { width: 390, height: 844 } });
  watch(page, "webkit-mobile");
  const section = await open(page, "webkit-390");
  await section.locator(".fascetta").nth(2).click();
  await page.waitForTimeout(450);
  await shot(page, "webkit-mobile-voce-III.png");
  await page.close();
  await wk.close();
}

console.log(JSON.stringify(measurements, null, 2));
if (errors.length) {
  console.error("ERRORS:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("nessun errore console o pageerror");

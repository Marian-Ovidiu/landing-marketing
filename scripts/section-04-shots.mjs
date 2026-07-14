import { chromium, webkit } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const OUT = path.resolve(process.cwd(), "../runs/2026-07-10-marketing-strategy-generator/screenshots/section-04");
mkdirSync(OUT, { recursive: true });

const errors = [];
const measurements = {};

function watch(page, label) {
  page.on("console", (m) => { if (m.type() === "error") errors.push(`${label}: ${m.text()}`); });
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
}

async function measure(page, label) {
  measurements[label] = await page.evaluate(() => {
    const h2 = (sel) => document.querySelector(sel)?.getBoundingClientRect().left ?? null;
    const s = document.querySelector("#section-04-cta-finale");
    return {
      sectionHeight: Math.round(s.getBoundingClientRect().height),
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      primaryHeight: Math.round(document.querySelector(".final-cta-primary").getBoundingClientRect().height),
      axes: { s02: h2(".weekly-plan-header h2"), s03: h2(".dossier-header h2"), s04: h2("#final-cta-title") },
    };
  });
}

const shot = (page, name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("saved", name));

const cr = await chromium.launch();

// ---------- desktop 1440 ----------
{
  const page = await cr.newPage({ viewport: { width: 1440, height: 1000 } });
  watch(page, "desktop");
  await page.goto(`${BASE}/concept/page`, { waitUntil: "networkidle" });

  // transizione fascicolo → CTA (confine tra le sezioni)
  await page.evaluate(() => {
    const s = document.querySelector("#section-04-cta-finale");
    scrollTo(0, s.getBoundingClientRect().top + scrollY - innerHeight * 0.55);
  });
  await page.waitForTimeout(500);
  await shot(page, "desktop-transizione-s03-s04.png");

  // CTA completa (assestamento concluso)
  await page.locator("#section-04-cta-finale").scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await measure(page, "desktop-1440");
  await shot(page, "desktop-cta-completa.png");

  // focus tastiera sulla primaria
  await page.locator(".final-cta-primary").focus();
  await page.waitForTimeout(200);
  await shot(page, "desktop-focus-primaria.png");

  // fondo pagina / footer
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(400);
  await shot(page, "desktop-fondo-footer.png");

  // anchor di ritorno a S02: focus e arrivo
  await page.locator(".final-cta-secondary").click();
  await page.waitForTimeout(1600);
  const backOk = await page.evaluate(() => {
    const r = document.querySelector("#section-02-esempio-di-piano").getBoundingClientRect();
    return Math.abs(r.top) < 8 && document.activeElement?.id === "weekly-plan-title";
  });
  if (!backOk) errors.push("desktop: anchor di ritorno a S02 non atterra o non focalizza la heading");
  await page.close();
}

// ---------- viewport intermedi ----------
for (const [label, w, h] of [["1280", 1280, 900], ["1024", 1024, 768], ["768", 768, 900], ["360", 360, 800]]) {
  const page = await cr.newPage({ viewport: { width: w, height: h } });
  watch(page, `vw-${label}`);
  await page.goto(`${BASE}/concept/page`, { waitUntil: "networkidle" });
  await page.locator("#section-04-cta-finale").scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await measure(page, `viewport-${label}`);
  await page.close();
}

// ---------- mobile 390x844 ----------
{
  const page = await cr.newPage({ viewport: { width: 390, height: 844 } });
  watch(page, "mobile");
  await page.goto(`${BASE}/concept/page`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    const s = document.querySelector("#section-04-cta-finale");
    scrollTo(0, s.getBoundingClientRect().top + scrollY - 60);
  });
  await page.waitForTimeout(600);
  await measure(page, "mobile-390");
  await shot(page, "mobile-inizio-cta.png");

  await page.locator(".final-cta-actions").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await shot(page, "mobile-cta-completa.png");

  await page.locator(".final-cta-primary").focus();
  await page.waitForTimeout(200);
  await shot(page, "mobile-focus-touch.png");

  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(400);
  await shot(page, "mobile-fine-pagina.png");
  await page.close();
}

// ---------- reduced motion ----------
{
  const page = await cr.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  watch(page, "reduced");
  await page.goto(`${BASE}/concept/page`, { waitUntil: "networkidle" });
  await page.locator("#section-04-cta-finale").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const state = await page.evaluate(() => ({
    micro: getComputedStyle(document.querySelector(".final-cta-micro")).opacity,
    transform: getComputedStyle(document.querySelector(".final-cta-primary")).transform,
  }));
  if (state.micro !== "1") errors.push("reduced: microcopy non a opacità piena");
  if (state.transform !== "none" && !state.transform.includes("matrix(1, 0, 0, 1, 0, 0)"))
    errors.push("reduced: CTA primaria non nello stato finale");
  // anchor senza smooth scroll: arrivo immediato
  await page.locator(".final-cta-secondary").click();
  await page.waitForTimeout(200);
  const instant = await page.evaluate(() =>
    Math.abs(document.querySelector("#section-02-esempio-di-piano").getBoundingClientRect().top) < 8
  );
  if (!instant) errors.push("reduced: anchor non istantaneo");
  await shot(page, "reduced-ritorno-s02.png");
  await page.close();
}
await cr.close();

// ---------- WebKit mobile ----------
{
  const wk = await webkit.launch();
  const page = await wk.newPage({ viewport: { width: 390, height: 844 } });
  watch(page, "webkit-mobile");
  await page.goto(`${BASE}/concept/page`, { waitUntil: "networkidle" });
  await page.locator("#section-04-cta-finale").scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await shot(page, "webkit-mobile-cta.png");
  await page.close();
  await wk.close();
}

console.log(JSON.stringify(measurements, null, 2));
if (errors.length) {
  console.error("ERRORS:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("nessun errore console o pageerror");

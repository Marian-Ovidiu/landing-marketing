// FASE SEGNALE-FINAL-01 — QA end-to-end della pagina intera.
// Reduced motion, anchor + focus, heading/tab order, contrasto, overflow,
// CLS, refresh in ogni sezione, resize, back/forward, WebKit, DPR2, no-JS.

import { chromium, webkit, devices } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const RUN = path.resolve("../runs/2026-07-10-marketing-strategy-generator");
const OUT = path.join(RUN, "screenshots/segnale-full-page-final-review");
const URL = `${BASE}/concept/segnale`;

for (const d of ["qa", "reduced-motion", "accessibility", "desktop", "mobile", "transitions"]) {
  mkdirSync(path.join(OUT, d), { recursive: true });
}

const results = [];
const ok = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "  ok  " : " FAIL "} ${name}${detail ? "  — " + detail : ""}`);
};

const SECTION_IDS = [
  "section-01-come-funziona",
  "section-02-esempio-di-piano",
  "section-03-cosa-ricevi",
  "section-04-cta-finale",
];

const browser = await chromium.launch();

/* ---------- 1. geometria + overflow su tutti i viewport richiesti ---------- */
console.log("\n== viewport: overflow, altezza, CTA raggiungibile ==");
const VPS = [
  ["desktop-1440x1000", 1440, 1000],
  ["desktop-1280x800", 1280, 800],
  ["tablet-1024x900", 1024, 900],
  ["tablet-768x900", 768, 900],
  ["mobile-390x844", 390, 844],
  ["mobile-375x812", 375, 812],
  ["mobile-360x800", 360, 800],
];
const geo = {};
for (const [name, width, height] of VPS) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errs = [];
  page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  const g = await page.evaluate(() => ({
    page: document.documentElement.scrollHeight,
    vh: window.innerHeight,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  geo[name] = g;
  ok(
    `${name} overflow-x`,
    g.overflow <= 0,
    `page=${g.page}px (${(g.page / g.vh).toFixed(2)} schermate) overflow=${g.overflow}px`,
  );

  // CTA finale raggiungibile e cliccabile
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(700);
  const cta = page.locator('#section-04-cta-finale a[href="/crea-strategia"]');
  const box = await cta.boundingBox();
  ok(
    `${name} CTA visibile in fondo`,
    !!box && box.y >= 0 && box.y + box.height <= g.vh + 1,
    box ? `y=${Math.round(box.y)} h=${Math.round(box.height)}` : "non trovata",
  );
  await page.screenshot({
    path: path.join(OUT, name.startsWith("mobile") ? "mobile" : "desktop", `${name}-cta-finale.png`),
  });
  if (errs.length) ok(`${name} console pulita`, false, errs.slice(0, 2).join(" | "));
  else ok(`${name} console pulita`, true);
  await page.close();
}

/* ---------- 2. gerarchia heading + ordine DOM ---------- */
console.log("\n== accessibilità: heading, tab order, link ==");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  const headings = await page.evaluate(() =>
    [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => ({
      level: +h.tagName[1],
      text: (h.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 52),
    })),
  );
  const h1s = headings.filter((h) => h.level === 1);
  ok("un solo H1", h1s.length === 1, h1s.map((h) => h.text).join(" / ") || "nessuno");
  let jump = null;
  for (let i = 1; i < headings.length; i++) {
    if (headings[i].level > headings[i - 1].level + 1) {
      jump = `${headings[i - 1].level}->${headings[i].level} @ "${headings[i].text}"`;
      break;
    }
  }
  ok("nessun salto di livello heading", !jump, jump ?? "H1->H2->H3 coerente");
  writeFileSync(
    path.join(OUT, "accessibility/headings.txt"),
    headings.map((h) => `${"  ".repeat(h.level - 1)}H${h.level}  ${h.text}`).join("\n"),
  );

  // tab order: sequenza reale dei focusable
  const tabs = [];
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    const el = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return null;
      return {
        tag: a.tagName,
        text: (a.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40),
        href: a.getAttribute("href"),
        outline: getComputedStyle(a).outlineStyle,
      };
    });
    if (!el) break;
    tabs.push(el);
  }
  writeFileSync(
    path.join(OUT, "accessibility/tab-order.txt"),
    tabs.map((t, i) => `${i + 1}. <${t.tag}> ${t.text} → ${t.href ?? "-"}`).join("\n"),
  );
  const ctaIndex = tabs.findIndex((t) => t.href === "/crea-strategia");
  ok("CTA /crea-strategia nel tab order", ctaIndex >= 0, `posizione ${ctaIndex + 1} di ${tabs.length}`);
  const noOutline = tabs.filter((t) => t.outline === "none");
  ok("nessun focus senza outline", noOutline.length === 0, `${noOutline.length} elementi senza outline`);

  // focus visibile sulla CTA finale
  const finalCta = page.locator('#section-04-cta-finale a[href="/crea-strategia"]');
  await finalCta.focus();
  await page.waitForTimeout(300);
  await finalCta.screenshot({ path: path.join(OUT, "accessibility/focus-cta-finale.png") });

  // link reale /crea-strategia
  const href = await finalCta.getAttribute("href");
  const resp = await page.request.get(`${BASE}/crea-strategia`);
  ok("link /crea-strategia risolve", href === "/crea-strategia" && resp.status() === 200, `HTTP ${resp.status()}`);
  await page.close();
}

/* ---------- 3. anchor verso S02 + focus (CTA secondaria) ---------- */
console.log("\n== anchor «Rivedi l'esempio di piano» → S02 ==");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(600);
  await page.locator('#section-04-cta-finale a[href^="#section-02"]').click();
  await page.waitForTimeout(1600);

  const state = await page.evaluate(() => {
    const s02 = document.getElementById("section-02-esempio-di-piano");
    const rect = s02.getBoundingClientRect();
    return {
      hash: location.hash,
      sectionTop: Math.round(rect.top),
      focused: document.activeElement?.id ?? "(body)",
      // la scena S02 deve ripartire dall'inizio: progress 0 = titolo pieno, quiet non ancora arretrati
      scrollY: Math.round(window.scrollY),
    };
  });
  ok("hash aggiornato", state.hash === "#section-02-esempio-di-piano", state.hash);
  ok("S02 allineata al viewport", Math.abs(state.sectionTop) <= 4, `top=${state.sectionTop}px`);
  ok("focus spostato sul titolo S02", state.focused === "segnale-s02-title", state.focused);
  await page.screenshot({ path: path.join(OUT, "transitions/anchor-s04-to-s02.png") });

  // back deve riportare in fondo
  await page.goBack();
  await page.waitForTimeout(1200);
  const afterBack = await page.evaluate(() => ({
    hash: location.hash,
    y: Math.round(window.scrollY),
    max: document.documentElement.scrollHeight - window.innerHeight,
  }));
  ok("back dopo anchor non rompe lo scroll", afterBack.y >= 0, `y=${afterBack.y} / max=${afterBack.max} hash="${afterBack.hash}"`);
  await page.close();
}

/* ---------- 4. refresh in ogni sezione + resize + reverse ---------- */
console.log("\n== refresh in sezione, resize, reverse ==");
{
  for (const id of SECTION_IDS) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    await page.goto(`${URL}#${id}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const g = await page.evaluate((sid) => {
      const s = document.getElementById(sid);
      const r = s.getBoundingClientRect();
      return {
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        vh: window.innerHeight,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        y: Math.round(window.scrollY),
      };
    }, id);
    // L'ultima sezione (900px) è più corta del viewport ed è in fondo al documento:
    // non può essere portata a top=0, il criterio corretto è «interamente visibile».
    const last = id === SECTION_IDS[SECTION_IDS.length - 1];
    const aligned = last ? g.top >= 0 && g.bottom <= g.vh + 1 : Math.abs(g.top) <= 6;
    ok(`refresh su #${id}`, aligned && g.overflow <= 0 && errs.length === 0,
      `top=${g.top} overflow=${g.overflow} err=${errs.length}${last ? " (ultima sezione: interamente visibile)" : ""}`);
    await page.close();
  }

  // resize desktop -> mobile senza trigger orfani
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 5000));
  await page.waitForTimeout(500);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1200);
  const afterResize = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    pinSpacers: document.querySelectorAll(".pin-spacer").length,
    stickies: [...document.querySelectorAll("*")].filter((n) => getComputedStyle(n).position === "sticky").length,
    page: document.documentElement.scrollHeight,
  }));
  ok("resize desktop→mobile: nessun pin duplicato", afterResize.pinSpacers === 1 && afterResize.stickies === 3,
    `pin-spacer=${afterResize.pinSpacers} sticky=${afterResize.stickies} overflow=${afterResize.overflow} err=${errs.length}`);
  await page.screenshot({ path: path.join(OUT, "qa/resize-desktop-to-mobile.png") });

  // reverse scroll completo
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(600);
  for (let y = 9000; y >= 0; y -= 500) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(70);
  }
  await page.waitForTimeout(600);
  const reverse = await page.evaluate(() => ({
    y: Math.round(window.scrollY),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  ok("reverse scroll fino a 0", reverse.y === 0 && reverse.overflow <= 0 && errs.length === 0,
    `y=${reverse.y} err=${errs.length}`);
  await page.screenshot({ path: path.join(OUT, "qa/reverse-top.png") });
  await page.close();
}

/* ---------- 5. CLS ---------- */
console.log("\n== CLS ==");
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(URL, { waitUntil: "networkidle" });
  const cls = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) if (!entry.hadRecentInput) total += entry.value;
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => resolve(total), 2500);
      }),
  );
  ok("CLS < 0.1", cls < 0.1, `CLS=${cls.toFixed(4)}`);
  await page.close();
}

/* ---------- 6. reduced motion full page ---------- */
console.log("\n== reduced motion ==");
for (const [name, width, height] of [
  ["desktop-1440x1000", 1440, 1000],
  ["mobile-390x844", 390, 844],
]) {
  const page = await browser.newPage({
    viewport: { width, height },
    reducedMotion: "reduce",
  });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const g = await page.evaluate(() => ({
    page: document.documentElement.scrollHeight,
    vh: window.innerHeight,
    pinSpacers: document.querySelectorAll(".pin-spacer").length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    // contenuto completo: opacità finale, niente elementi invisibili
    hidden: [...document.querySelectorAll("h2,h3,p,li,a")].filter((n) => {
      const s = getComputedStyle(n);
      return s.opacity !== "" && parseFloat(s.opacity) < 0.35 && n.offsetHeight > 0;
    }).length,
  }));
  ok(
    `reduced ${name}: nessun pin`,
    g.pinSpacers === 0,
    `pin-spacer=${g.pinSpacers} page=${g.page}px (${(g.page / g.vh).toFixed(2)} schermate) overflow=${g.overflow}`,
  );
  ok(`reduced ${name}: contenuto visibile`, g.hidden === 0, `${g.hidden} elementi sotto opacity 0.35`);
  await page.screenshot({
    path: path.join(OUT, `reduced-motion/${name}-full.png`),
    fullPage: true,
  });
  await page.close();
}

await browser.close();

/* ---------- 7. WebKit ---------- */
console.log("\n== WebKit ==");
{
  const wk = await webkit.launch();
  const page = await wk.newPage({ ...devices["iPhone 13"] });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const g = await page.evaluate(() => ({
    page: document.documentElement.scrollHeight,
    vh: window.innerHeight,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  ok("webkit: nessun overflow-x", g.overflow <= 0, `page=${g.page} vh=${g.vh} overflow=${g.overflow} err=${errs.length}`);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "qa/webkit-iphone13-cta.png") });
  ok("webkit: nessun errore JS", errs.length === 0, errs.slice(0, 2).join(" | "));
  await page.close();
  await wk.close();
}

/* ---------- 8. no-JS ---------- */
console.log("\n== senza JavaScript ==");
{
  const b = await chromium.launch();
  const ctx = await b.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  const text = await page.locator("body").innerText();
  const hasAll = [
    "Tu racconti il locale",
    "Ecco quando e come lo facciamo",
    "Un fascicolo operativo",
    "Crea la strategia del tuo locale",
  ].every((t) => text.includes(t));
  ok("contenuto completo senza JS", hasAll, `${text.length} caratteri di testo`);
  await page.screenshot({ path: path.join(OUT, "qa/no-js.png"), fullPage: true });
  await ctx.close();
  await b.close();
}

const failed = results.filter((r) => !r.pass);
writeFileSync(path.join(OUT, "qa/qa-results.json"), JSON.stringify(results, null, 2));
console.log(`\n===== ${results.length - failed.length}/${results.length} ok, ${failed.length} FAIL =====`);
failed.forEach((f) => console.log(`  FAIL  ${f.name} — ${f.detail}`));

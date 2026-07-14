// Anchor / navigazione: click nav interna, load con hash, ritorno da /crea-strategia.
import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const URL = `${BASE}/concept/segnale`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const top = (id) =>
  page.evaluate((i) => Math.round(document.getElementById(i).getBoundingClientRect().top), id);

console.log("== A. click nav interna (pagina già caricata) ==");
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
for (const [label, id] of [
  ["Come funziona", "section-01-come-funziona"],
  ["Esempi di piano", "section-02-esempio-di-piano"],
]) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.locator(`a[href="#${id}"]`).first().click();
  await page.waitForTimeout(1500);
  const t = await top(id);
  console.log(`  click "${label}" → top=${t}px  ${Math.abs(t) <= 6 ? "ok" : "FUORI BERSAGLIO"}`);
}

console.log("\n== B. load diretto con hash (deep link / refresh) ==");
for (const id of [
  "section-01-come-funziona",
  "section-02-esempio-di-piano",
  "section-03-cosa-ricevi",
  "section-04-cta-finale",
]) {
  await page.goto(`${URL}#${id}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const t = await top(id);
  console.log(`  load #${id} → top=${t}px  ${Math.abs(t) <= 6 ? "ok" : "FUORI BERSAGLIO"}`);
}

console.log("\n== C. ritorno da /crea-strategia (back) ==");
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(700);
const before = await page.evaluate(() => Math.round(window.scrollY));
await page.locator('#section-04-cta-finale a[href="/crea-strategia"]').click();
await page.waitForLoadState("networkidle");
console.log(`  su /crea-strategia: ${page.url()}`);
await page.goBack();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1800);
const after = await page.evaluate(() => ({
  y: Math.round(window.scrollY),
  max: document.documentElement.scrollHeight - window.innerHeight,
  ctaTop: Math.round(
    document.querySelector('#section-04-cta-finale a[href="/crea-strategia"]').getBoundingClientRect().top,
  ),
}));
console.log(`  back → y=${after.y} (era ${before}, max ${after.max})  CTA top=${after.ctaTop}px`);
console.log(
  `  ${Math.abs(after.y - before) <= 120 ? "ok — torna dove eravamo" : "SCROLL RESTORATION FUORI POSTO (delta " + (after.y - before) + "px)"}`,
);

await browser.close();
